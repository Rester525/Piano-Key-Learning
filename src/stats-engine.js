// ═══════════════════════════════════════════════════════════════════
// STATS-ENGINE — Session Recording & Statistics Computation
// Pattern: tunedown-theory storage.js (localStorage CRUD) +
//          engine.js (pure compute, no DOM)
// ═══════════════════════════════════════════════════════════════════

const SESSIONS_KEY = 'pkl_sessions';
const MAX_SESSIONS = 500;
const MAX_QUESTIONS_PER_SESSION = 500;

// ─── SESSION CRUD ──────────────────────────────────────────────────

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) ?? []; }
  catch { return []; }
}

function persistSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/** Start a new session. Returns the session object for mutation. */
export function startSession(mode) {
  const session = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    mode,
    startedAt: Date.now(),
    questions: [],
    score: 0,
    streak: 0,
    maxStreak: 0,
    endedAt: null,
  };
  return session;
}

/**
 * Record a single question attempt in a live session.
 * @param {Object} session - mutable session object from startSession()
 * @param {Object} question - { correctAnswer (string key), chosenAnswer, wasCorrect, responseTimeMs }
 */
export function recordQuestion(session, question) {
  if (session.questions.length >= MAX_QUESTIONS_PER_SESSION) return;
  session.questions.push({
    ...question,
    timestamp: Date.now(),
  });
  if (question.wasCorrect) {
    session.score++;
    session.streak++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
  } else {
    session.streak = 0;
  }
}

/** Finalize and persist a session. */
export function endSession(session) {
  session.endedAt = Date.now();
  const sessions = loadSessions();
  sessions.push(session);
  // Trim old sessions
  if (sessions.length > MAX_SESSIONS) {
    sessions.splice(0, sessions.length - MAX_SESSIONS);
  }
  persistSessions(sessions);
  return session;
}

// ─── COMPUTED STATISTICS ────────────────────────────────────────────

/** Get all sessions, most recent first. */
export function getSessions() {
  return loadSessions().reverse();
}

/** Total questions answered across all sessions. */
export function getTotalQuestions(sessions) {
  let total = 0;
  for (const s of sessions) total += s.questions.length;
  return total;
}

/** Overall accuracy (0–1), or null if no questions. */
export function getOverallAccuracy(sessions) {
  let correct = 0;
  let total = 0;
  for (const s of sessions) {
    for (const q of s.questions) {
      total++;
      if (q.wasCorrect) correct++;
    }
  }
  return total === 0 ? null : correct / total;
}

/** Accuracy per mode: { noteReading: 0.85, earTraining: 0.72, ... } */
export function getAccuracyByMode(sessions) {
  const byMode = {};
  for (const s of sessions) {
    if (!byMode[s.mode]) byMode[s.mode] = { correct: 0, total: 0 };
    for (const q of s.questions) {
      byMode[s.mode].total++;
      if (q.wasCorrect) byMode[s.mode].correct++;
    }
  }
  const result = {};
  for (const [mode, data] of Object.entries(byMode)) {
    result[mode] = data.total > 0 ? data.correct / data.total : null;
  }
  return result;
}

/** Accuracy per note key (semitone or qualityKey): { '48': 0.9, 'major': 0.75, ... } */
export function getAccuracyByKey(sessions) {
  const byKey = {};
  for (const s of sessions) {
    for (const q of s.questions) {
      if (!byKey[q.correctAnswer]) byKey[q.correctAnswer] = { correct: 0, total: 0 };
      byKey[q.correctAnswer].total++;
      if (q.wasCorrect) byKey[q.correctAnswer].correct++;
    }
  }
  const result = {};
  for (const [key, data] of Object.entries(byKey)) {
    result[key] = data.total > 0 ? data.correct / data.total : null;
  }
  return result;
}

/** Best streak across all sessions. */
export function getBestStreak(sessions) {
  let best = 0;
  for (const s of sessions) {
    if (s.maxStreak > best) best = s.maxStreak;
  }
  return best;
}

/** Total sessions completed. */
export function getSessionCount(sessions) {
  return sessions.length;
}

/** Sessions in the last N days. */
export function getRecentSessions(sessions, days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter(s => s.startedAt >= cutoff);
}

/** Sessions for a specific mode. */
export function getSessionsByMode(sessions, mode) {
  return sessions.filter(s => s.mode === mode);
}

/** Get a streak timeline: array of {date: 'YYYY-MM-DD', sessions: N, avgAccuracy: 0.X}. */
export function getDailySummary(sessions, days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(s => s.startedAt >= cutoff);
  const byDay = {};
  for (const s of recent) {
    const date = new Date(s.startedAt).toISOString().slice(0, 10);
    if (!byDay[date]) byDay[date] = { sessions: 0, totalQ: 0, correctQ: 0 };
    byDay[date].sessions++;
    for (const q of s.questions) {
      byDay[date].totalQ++;
      if (q.wasCorrect) byDay[date].correctQ++;
    }
  }
  return Object.entries(byDay)
    .map(([date, d]) => ({
      date,
      sessions: d.sessions,
      avgAccuracy: d.totalQ > 0 ? d.correctQ / d.totalQ : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Clear all session data. */
export function clearAllSessions() {
  persistSessions([]);
}
