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
  topBarToggle: $('topBarToggle'),
  sidebarClose: $('sidebarClose'),
  topBarThemeToggle: $('topBarThemeToggle'),
  topBarInstrument: $('topBarInstrument'),
  midiDot: $('midiDot'),
  midiDeviceSelect: $('midiDeviceSelect'),
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
  const viewport = document.getElementById('keyboardViewport');
  if (!viewport) return;
  if (locked) viewport.classList.add('locked-ui');
  else viewport.classList.remove('locked-ui');
}

// ─── MIDI STATUS INDICATOR ────────────────────────────────────────

/**
 * Update the top-bar MIDI indicator dot.
 * @param {'unsupported'|'disconnected'|'connected'} status
 */
export function setMIDIStatus(status) {
  const dot = elements.midiDot;
  dot.classList.remove('connected', 'unsupported');
  if (status === 'connected') {
    dot.classList.add('connected');
    dot.title = 'MIDI keyboard connected';
  } else if (status === 'unsupported') {
    dot.classList.add('unsupported');
    dot.title = 'MIDI requires Chrome/Edge — not supported in Safari';
  } else {
    dot.title = 'MIDI keyboard not detected';
  }
}

// ─── MIDI DEVICE SELECTOR ─────────────────────────────────────────

/**
 * Populate the MIDI device <select> with the given devices.
 * @param {{id:string, name:string}[]} devices
 * @param {string} selectedId — id to preselect ('' = all devices)
 */
export function setMIDIDevices(devices, selectedId = '') {
  const select = elements.midiDeviceSelect;
  if (!select) return;
  const prev = selectedId || select.value;
  select.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = '— All devices —';
  select.appendChild(allOpt);

  devices.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    select.appendChild(opt);
  });

  // Preserve selection if it still exists; otherwise fall back to "all"
  const exists = devices.some(d => d.id === prev);
  select.value = exists ? prev : '';
}

/** Get the currently selected MIDI device id ('' = all devices). */
export function getSelectedMIDIDevice() {
  const select = elements.midiDeviceSelect;
  return select ? select.value : '';
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

export function setupLearningMethodRadios(onMethodChange) {
  document.querySelectorAll('input[name="learningMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => onMethodChange(e.target.value));
  });
}

// ─── SIDEBAR & MOBILE ─────────────────────────────────────────────

export function setupSidebar() {
  // Toggle sidebar from top bar hamburger
  elements.topBarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('collapsed');
  });

  elements.sidebarClose.addEventListener('click', () => {
    elements.sidebar.classList.add('collapsed');
  });

  // Close sidebar on outside click
  document.addEventListener('click', (e) => {
    if (!elements.sidebar.classList.contains('collapsed') &&
        !elements.sidebar.contains(e.target) &&
        e.target !== elements.topBarToggle &&
        !elements.topBarToggle.contains(e.target)) {
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

  elements.topBarThemeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
  });
}

export function setupInstrumentSelect(onChange) {
  if (elements.topBarInstrument) {
    elements.topBarInstrument.addEventListener('change', (e) => onChange(e.target.value));
  }
}

// ─── INIT ──────────────────────────────────────────────────────────

export function initUI() {
  setupSidebar();
  setupThemeToggle();
  setupStatsDashboard();
  setupCustomSets();
  updateScore(0, 0);
  showSpeedRunTimer(false);
  showPlayAgain(false);
  showChordButtons(false);
  clearFeedback();
}

// ─── CUSTOM PRACTICE SETS ──────────────────────────────────────────

let activePracticeSet = null;

export function getActivePracticeSet() { return activePracticeSet; }

function setupCustomSets() {
  const select = document.getElementById('practiceSetSelect');
  const openLink = document.getElementById('openCustomSetEditor');
  const modal = document.getElementById('customSetModal');
  const cancelBtn = document.getElementById('cancelCustomSetBtn');
  const saveBtn = document.getElementById('saveCustomSetBtn');

  if (!select || !openLink) return;

  // Lazy-load custom-sets module
  import('./custom-sets.js').then(({ getSets, saveSet }) => {

    function populateSelect() {
      const sets = getSets();
      select.innerHTML = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '— Auto (all) —';
      defaultOpt.selected = !activePracticeSet;
      select.appendChild(defaultOpt);
      sets.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.custom ? '📝 ' + s.name : s.name;
        if (activePracticeSet && activePracticeSet.name === s.name) opt.selected = true;
        select.appendChild(opt);
      });
    }

    populateSelect();

    select.addEventListener('change', () => {
      const name = select.value;
      if (!name) { activePracticeSet = null; return; }
      const sets = getSets();
      activePracticeSet = sets.find(s => s.name === name) || null;
    });

    openLink.addEventListener('click', () => {
      if (!modal) return;
      document.getElementById('customSetNameInput').value = '';
      modal.classList.remove('hidden');
    });

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (saveBtn && modal) {
      saveBtn.addEventListener('click', () => {
        const name = document.getElementById('customSetNameInput').value.trim();
        const mode = document.getElementById('customSetModeSelect').value;
        if (!name) { alert('Enter a set name.'); return; }

        // For now, create with empty items — user edits later or uses as-is
        // Chord mode gets all qualities; note modes get C4–B4 range
        const items = mode === 'chords'
          ? ['major','minor','diminished','augmented','dom7','maj7']
          : [48,50,52,53,55,57,59];

        saveSet({ name, mode, items });
        activePracticeSet = { name, mode, items, custom: true };
        populateSelect();
        modal.classList.add('hidden');
      });
    }
  });
}

// ─── STATS DASHBOARD ───────────────────────────────────────────────

function setupStatsDashboard() {
  const openBtn = document.getElementById('sidebarStatsBtn');
  const closeBtn = document.getElementById('statsCloseBtn');
  const dashboard = document.getElementById('statsDashboard');
  const body = document.getElementById('statsBody');

  if (!openBtn || !closeBtn || !dashboard || !body) return;

  openBtn.addEventListener('click', () => {
    // Lazy-load stats module on first open
    import('./stats-ui.js').then(({ renderDashboard }) => {
      renderDashboard(body);
      dashboard.classList.remove('hidden');
    });
  });

  closeBtn.addEventListener('click', () => {
    dashboard.classList.add('hidden');
  });
}

// ─── CURRICULUM PANEL ───────────────────────────────────────────────

export function setupCurriculumPanel() {
  const panel = document.getElementById('curriculumPanel');
  const closeBtn = document.getElementById('curriculumCloseBtn');
  const levelsContainer = document.getElementById('curriculumLevels');

  if (!panel || !closeBtn || !levelsContainer) return;

  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  // Render levels lazily on first open
  let rendered = false;
  return {
    show() {
      panel.classList.remove('hidden');
      if (!rendered) {
        renderCurriculumLevels(levelsContainer);
        rendered = true;
      } else {
        // Re-render to reflect updated progress
        renderCurriculumLevels(levelsContainer);
      }
    },
    hide() {
      panel.classList.add('hidden');
    },
    refresh() {
      renderCurriculumLevels(levelsContainer);
    },
  };
}

function renderCurriculumLevels(container) {
  import('./curriculum.js').then(({ LEVELS, getProgress }) => {
    const progress = getProgress();
    container.innerHTML = '';

    LEVELS.forEach((level, i) => {
      const p = progress[level.id] || { attempts: 0, correct: 0, unlocked: i === 0, completed: false };
      const acc = p.attempts > 0 ? Math.round((p.correct / p.attempts) * 100) : 0;
      const isActive = p.unlocked && !p.completed;
      const isDone = p.completed;

      const card = document.createElement('div');
      card.className = 'curriculum-level' + (isDone ? ' done' : '') + (isActive ? ' active' : '') + (!p.unlocked ? ' locked' : '');

      const icon = document.createElement('span');
      icon.className = 'curriculum-level-icon';
      icon.textContent = isDone ? '✅' : isActive ? '▶️' : '🔒';

      const info = document.createElement('div');
      info.className = 'curriculum-level-info';

      const name = document.createElement('span');
      name.className = 'curriculum-level-name';
      name.textContent = level.name;

      const desc = document.createElement('span');
      desc.className = 'curriculum-level-desc';
      desc.textContent = level.description;

      info.appendChild(name);
      info.appendChild(desc);

      const bar = document.createElement('div');
      bar.className = 'curriculum-level-bar';
      const fill = document.createElement('div');
      fill.className = 'curriculum-level-fill' + (isDone ? ' done' : '');
      const targetPct = Math.min(100, Math.round((p.attempts / level.minAttempts) * 100));
      fill.style.width = isDone ? '100%' : targetPct + '%';
      bar.appendChild(fill);

      const stats = document.createElement('span');
      stats.className = 'curriculum-level-stats';
      stats.textContent = isDone
        ? `${p.correct}/${p.attempts} correct · ${acc}%`
        : `${p.attempts}/${level.minAttempts} attempts · ${acc}% accuracy`;

      card.appendChild(icon);
      card.appendChild(info);
      card.appendChild(bar);
      card.appendChild(stats);

      // Add connector between levels
      if (i < LEVELS.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'curriculum-connector' + (isDone ? ' done' : '');
        container.appendChild(connector);
      }

      container.appendChild(card);
    });
  });
}