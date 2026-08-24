// ═══════════════════════════════════════════════════════════════════
// STATS-UI — Statistics Dashboard Rendering
// Pattern: tunedown-theory ui.js — DOM APIs only, zero innerHTML
// ═══════════════════════════════════════════════════════════════════

import {
  getSessions, getTotalQuestions, getOverallAccuracy,
  getAccuracyByMode, getBestStreak, getSessionCount,
  clearAllSessions,
} from './stats-engine.js';

const MODE_LABELS = {
  noteReading: 'Note Reading',
  earTraining: 'Ear Training',
  intervals: 'Intervals',
  chords: 'Chords',
  speedRun: 'Speed Run',
};

// ─── RENDER ────────────────────────────────────────────────────────

export function renderDashboard(container) {
  container.textContent = ''; // clear

  const sessions = getSessions();
  const totalSessions = getSessionCount(sessions);
  const totalQuestions = getTotalQuestions(sessions);
  const overallAcc = getOverallAccuracy(sessions);
  const bestStreak = getBestStreak(sessions);
  const byMode = getAccuracyByMode(sessions);

  if (totalSessions === 0) {
    const empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'No sessions yet. Start practicing to see your stats!';
    container.appendChild(empty);
    return;
  }

  // ── Summary Cards ──
  const summary = document.createElement('div');
  summary.className = 'stats-summary';

  const cards = [
    { label: 'Sessions', value: String(totalSessions) },
    { label: 'Questions', value: String(totalQuestions) },
    { label: 'Accuracy', value: overallAcc !== null ? Math.round(overallAcc * 100) + '%' : '—' },
    { label: 'Best Streak', value: String(bestStreak) },
  ];

  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'stats-card';
    const val = document.createElement('div');
    val.className = 'stats-card-value';
    val.textContent = c.value;
    const lbl = document.createElement('div');
    lbl.className = 'stats-card-label';
    lbl.textContent = c.label;
    card.appendChild(val);
    card.appendChild(lbl);
    summary.appendChild(card);
  });

  container.appendChild(summary);

  // ── Accuracy by Mode ──
  if (Object.keys(byMode).length > 0) {
    const modeSection = document.createElement('div');
    modeSection.className = 'stats-section';

    const modeLabel = document.createElement('div');
    modeLabel.className = 'stats-section-label';
    modeLabel.textContent = 'ACCURACY BY MODE';
    modeSection.appendChild(modeLabel);

    const modeBars = document.createElement('div');
    modeBars.className = 'stats-mode-bars';

    Object.entries(byMode).forEach(([mode, acc]) => {
      const row = document.createElement('div');
      row.className = 'stats-mode-row';

      const name = document.createElement('div');
      name.className = 'stats-mode-name';
      name.textContent = MODE_LABELS[mode] || mode;

      const barWrap = document.createElement('div');
      barWrap.className = 'stats-bar-wrap';

      const bar = document.createElement('div');
      bar.className = 'stats-bar';
      const pct = acc !== null ? Math.round(acc * 100) : 0;
      bar.style.width = pct + '%';

      const num = document.createElement('div');
      num.className = 'stats-bar-num';
      num.textContent = acc !== null ? pct + '%' : '—';

      barWrap.appendChild(bar);
      row.appendChild(name);
      row.appendChild(barWrap);
      row.appendChild(num);
      modeBars.appendChild(row);
    });

    modeSection.appendChild(modeBars);
    container.appendChild(modeSection);
  }

  // ── Recent Sessions ──
  const recent = sessions.slice(0, 10);
  if (recent.length > 0) {
    const recentSection = document.createElement('div');
    recentSection.className = 'stats-section';

    const recentLabel = document.createElement('div');
    recentLabel.className = 'stats-section-label';
    recentLabel.textContent = 'RECENT SESSIONS';
    recentSection.appendChild(recentLabel);

    const list = document.createElement('div');
    list.className = 'stats-session-list';

    recent.forEach(s => {
      const row = document.createElement('div');
      row.className = 'stats-session-row';

      const modeCell = document.createElement('div');
      modeCell.className = 'stats-session-mode';
      modeCell.textContent = MODE_LABELS[s.mode] || s.mode;

      const scoreCell = document.createElement('div');
      scoreCell.className = 'stats-session-score';
      scoreCell.textContent = `${s.score}/${s.questions.length}`;

      const accCell = document.createElement('div');
      accCell.className = 'stats-session-acc';
      const sAcc = s.questions.length > 0
        ? Math.round((s.score / s.questions.length) * 100) + '%'
        : '—';
      accCell.textContent = sAcc;

      const streakCell = document.createElement('div');
      streakCell.className = 'stats-session-streak';
      streakCell.textContent = `🔥 ${s.maxStreak}`;

      const dateCell = document.createElement('div');
      dateCell.className = 'stats-session-date';
      dateCell.textContent = formatDate(s.startedAt);

      row.appendChild(modeCell);
      row.appendChild(scoreCell);
      row.appendChild(accCell);
      row.appendChild(streakCell);
      row.appendChild(dateCell);
      list.appendChild(row);
    });

    recentSection.appendChild(list);
    container.appendChild(recentSection);
  }

  // ── Footer ──
  const footer = document.createElement('div');
  footer.className = 'stats-footer';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'stats-clear-btn';
  clearBtn.textContent = 'Clear all data';
  clearBtn.addEventListener('click', () => {
    if (confirm('Delete all practice history? This cannot be undone.')) {
      clearAllSessions();
      renderDashboard(container);
    }
  });
  footer.appendChild(clearBtn);
  container.appendChild(footer);
}

function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
