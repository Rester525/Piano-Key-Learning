// ═══════════════════════════════════════════════════════════════════
// CURRICULUM — Lesson Progression System
// Pattern: pure compute, localStorage CRUD, level gating
// ═══════════════════════════════════════════════════════════════════

const CURRICULUM_KEY = 'pkl_curriculum';

// ─── LEVEL DEFINITIONS ──────────────────────────────────────────────

export const LEVELS = [
  {
    id: 'cde',
    name: 'Level 1 — CDE',
    mode: 'noteReading',
    groupId: 'cde',
    noteType: 'whole',
    minAttempts: 10,
    accuracyThreshold: 0.80,
    description: 'Learn the notes C, D, and E on the piano.',
  },
  {
    id: 'fgab',
    name: 'Level 2 — FGAB',
    mode: 'noteReading',
    groupId: 'fgab',
    noteType: 'whole',
    minAttempts: 10,
    accuracyThreshold: 0.80,
    description: 'Learn the notes F, G, A, and B.',
  },
  {
    id: 'cdefgab',
    name: 'Level 3 — Full Octave',
    mode: 'noteReading',
    groupId: 'cdefgab',
    noteType: 'whole',
    minAttempts: 15,
    accuracyThreshold: 0.80,
    description: 'Master all 7 white keys from C4 to B4.',
  },
  {
    id: 'accidentals',
    name: 'Level 4 — Sharps & Flats',
    mode: 'noteReading',
    groupId: 'cdefgab',
    noteType: 'all',
    minAttempts: 20,
    accuracyThreshold: 0.75,
    description: 'Add black keys — learn all 12 chromatic notes.',
  },
  {
    id: 'intervals',
    name: 'Level 5 — Intervals',
    mode: 'intervals',
    groupId: 'cdefgab',
    noteType: 'whole',
    minAttempts: 15,
    accuracyThreshold: 0.75,
    description: 'Train your ear to recognize intervals between notes.',
  },
  {
    id: 'chords',
    name: 'Level 6 — Chords',
    mode: 'chords',
    groupId: null,
    noteType: 'whole',
    minAttempts: 15,
    accuracyThreshold: 0.75,
    description: 'Identify chord qualities — Major, Minor, Dim, Aug, Dom7, Maj7.',
  },
];

// ─── PERSISTENCE ────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(CURRICULUM_KEY)) ?? {}; }
  catch { return {}; }
}

function persist(data) {
  localStorage.setItem(CURRICULUM_KEY, JSON.stringify(data));
}

/** Create a fresh progress entry for a level. */
function freshEntry(unlocked) {
  return { attempts: 0, correct: 0, unlocked, completed: false };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────

/** Get progress for all levels, filling in defaults for unseen levels. */
export function getProgress() {
  const data = load();
  const progress = {};
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    const existing = data[level.id];
    if (existing) {
      progress[level.id] = { ...existing };
    } else {
      // First level always unlocked; others locked until prev completed
      progress[level.id] = freshEntry(i === 0);
    }
  }
  return progress;
}

/** Record an attempt for a level. Returns updated entry. */
export function recordAttempt(levelId, wasCorrect) {
  const data = load();
  const entry = data[levelId] || freshEntry(LEVELS.findIndex(l => l.id === levelId) === 0);
  entry.attempts++;
  if (wasCorrect) entry.correct++;

  const level = LEVELS.find(l => l.id === levelId);
  if (level) {
    const accuracy = entry.attempts > 0 ? entry.correct / entry.attempts : 0;
    if (entry.attempts >= level.minAttempts && accuracy >= level.accuracyThreshold) {
      entry.completed = true;
      // Unlock next level
      const idx = LEVELS.findIndex(l => l.id === levelId);
      if (idx >= 0 && idx < LEVELS.length - 1) {
        const nextId = LEVELS[idx + 1].id;
        const nextEntry = data[nextId] || freshEntry(false);
        nextEntry.unlocked = true;
        data[nextId] = nextEntry;
      }
    }
  }

  data[levelId] = entry;
  persist(data);
  return entry;
}

/** Check if a level is unlocked. */
export function isLevelUnlocked(levelId) {
  const progress = getProgress();
  return progress[levelId]?.unlocked ?? false;
}

/** Check if a level is completed. */
export function isLevelCompleted(levelId) {
  const progress = getProgress();
  return progress[levelId]?.completed ?? false;
}

/** Get the first unlocked-but-incomplete level (the "current" level). */
export function getCurrentLevel() {
  const progress = getProgress();
  for (const level of LEVELS) {
    const p = progress[level.id];
    if (p && p.unlocked && !p.completed) return level;
  }
  // All complete — return last level
  return LEVELS[LEVELS.length - 1];
}

/** Get level definition by ID. */
export function getLevelById(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

/** Get the index of a level. */
export function getLevelIndex(levelId) {
  return LEVELS.findIndex(l => l.id === levelId);
}

/** Reset all curriculum progress. */
export function resetProgress() {
  persist({});
}
