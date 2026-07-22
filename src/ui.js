// ══════════════════════════════════════════════════════════════════
// UI — DOM Updates, Score Display, Mode Switching, Sidebar
// ══════════════════════════════════════════════════════════════════

import { MEDALS, getMedal, nextMilestone } from './engine.js';

// ─── DOM REFERENCES ────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const elements = {
  questionNote: $('questionNote'),
  feedbackMsg: $('feedbackMsg'),
  promptText: $('promptText'),
  chordBtnRow: $('chordBtnRow'),
  playAgainBtn: $('playAgainBtn'),
  scoreNum: $('scoreNum'),
  streakNum: $('streakNum'),
  medalIcon: $('medalIcon'),
  medalName: $('medalName'),
  nextMedalNum: $('nextMedalNum'),
  streakDots: $('streakDots'),
  speedRunTimerStat: $('speedRunTimerStat'),
  speedRunTimer: $('speedRunTimer'),
  sidebar: $('sidebar'),
  sidebarToggle: $('sidebarToggle'),
  sidebarClose: $('sidebarClose'),
  themeToggle: $('themeToggle'),
  keyboardWrap: document.querySelector('.keyboard-wrap'),
};

// ─── SCORE & MEDAL DISPLAY ────────────────────────────────────────

export function updateScore(score, streak) {
  elements.scoreNum.textContent = score;
  elements.streakNum.textContent = streak;

  const medal = getMedal(streak);
  const iconEl = elements.medalIcon;
  const prev = iconEl.textContent;
  iconEl.textContent = medal.icon;
  elements.medalName.textContent = medal.name;

  if (prev !== medal.icon) {
    iconEl.classList.remove('pop');
    void iconEl.offsetWidth; // force reflow
    iconEl.classList.add('pop');
  }

  const next = nextMilestone(streak);
  elements.nextMedalNum.textContent = next;

  const milestones = [0, 10, 20, 30, 40];
  let bandStart = 0;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (streak >= milestones[i]) { bandStart = milestones[i]; break; }
  }
  const bandSize = next - bandStart;
  const progress = streak - bandStart;

  const dotsEl = elements.streakDots;
  dotsEl.innerHTML = '';
  for (let i = 0; i < Math.min(bandSize, 20); i++) {
    const d = document.createElement('div');
    d.className = 'dot' + (i < progress ? ' filled' : '') + (i === bandSize - 1 ? ' milestone' : '');
    dotsEl.appendChild(d);
  }
}

// ─── QUESTION AREA ────────────────────────────────────────────────

export function setQuestionNote(text, className = '') {
  elements.questionNote.textContent = text;
  elements.questionNote.className = 'question-note' + (className ? ' ' + className : '');
}

export function setPrompt(text) {
  elements.promptText.textContent = text;
}

export function setFeedback(text, className) {
  elements.feedbackMsg.textContent = text;
  elements.feedbackMsg.className = 'feedback-msg' + (className ? ' ' + className : '');
}

export function clearFeedback() {
  elements.feedbackMsg.textContent = '';
  elements.feedbackMsg.className = 'feedback-msg';
}

export function showPlayAgain(show) {
  elements.playAgainBtn.style.display = show ? 'inline-flex' : 'none';
}

export function showChordButtons(show) {
  elements.chordBtnRow.style.display = show ? 'flex' : 'none';
}

export function clearChordButtons() {
  document.querySelectorAll('.chord-btn').forEach(b => b.className = 'chord-btn');
}

export function setChordButtonState(qualityKey, state) {
  const btn = document.querySelector(`.chord-btn[data-quality="${qualityKey}"]`);
  if (btn) {
    if (state === 'selected-correct') btn.classList.add('selected-correct');
    else if (state === 'selected-wrong') btn.classList.add('selected-wrong');
    else if (state === 'reveal-correct') btn.classList.add('reveal-correct');
  }
}

// ─── SPEED RUN TIMER ──────────────────────────────────────────────

export function showSpeedRunTimer(show) {
  elements.speedRunTimerStat.style.display = show ? 'flex' : 'none';
}

export function updateSpeedRunTimer(seconds) {
  elements.speedRunTimer.textContent = seconds;
}

// ─── KEYBOARD LOCK ────────────────────────────────────────────────

export function setKeyboardLocked(locked) {
  if (locked) {
    elements.keyboardWrap.classList.add('locked-ui');
  } else {
    elements.keyboardWrap.classList.remove('locked-ui');
  }
}

// ─── MODE SWITCHING ────────────────────────────────────────────────

export function setupModeRadios(onModeChange) {
  document.querySelectorAll('input[name="trainingMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => onModeChange(e.target.value));
  });
}

export function setupNoteTypeRadios(onNoteTypeChange) {
  document.querySelectorAll('input[name="noteType"]').forEach(radio => {
    radio.addEventListener('change', (e) => onNoteTypeChange(e.target.value));
  });
}

export function setupInstrumentRadios(onInstrumentChange) {
  document.querySelectorAll('input[name="instrument"]').forEach(radio => {
    radio.addEventListener('change', (e) => onInstrumentChange(e.target.value));
  });
}

// ─── SIDEBAR & MOBILE ─────────────────────────────────────────────

export function setupSidebar() {
  // Toggle sidebar
  elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.remove('collapsed');
  });

  elements.sidebarClose.addEventListener('click', () => {
    elements.sidebar.classList.add('collapsed');
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 &&
        !elements.sidebar.contains(e.target) &&
        e.target !== elements.sidebarToggle &&
        !elements.sidebar.classList.contains('collapsed')) {
      elements.sidebar.classList.add('collapsed');
    }
  });
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────

export function setupThemeToggle() {
  // Load saved theme
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  elements.themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
  });
}

// ─── INIT ──────────────────────────────────────────────────────────

export function initUI() {
  setupSidebar();
  setupThemeToggle();
  updateScore(0, 0);
  showSpeedRunTimer(false);
  showPlayAgain(false);
  showChordButtons(false);
  clearFeedback();
}