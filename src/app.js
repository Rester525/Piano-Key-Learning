// ═══════════════════════════════════════════════════════════════════
// APP — Main Application Entry Point
// ═══════════════════════════════════════════════════════════════════

import { State, transition, getState, scheduleTimer, clearAllTimers,
         GROUPS, pickNextGroup, getPlayableSemis, weightedPick,
         semitoneToDisplay, practiceModel, recordAttempt,
         MEDALS, getMedal, nextMilestone,
         INTERVAL_NAMES, CHORD_QUALITIES, CHROMATIC,
         startSpeedRunTimer, stopSpeedRunTimer, getSpeedRunTimeLeft } from './engine.js';

import { playDing, playMajorEnsemble, playMinorEnsemble, playPerfectCadence,
         playDiminishedResolution, intervalsPlayAudio, playChord,
         ensureAudioContext, setInstrument, getInstrument } from './audio.js';

import { buildKeyboard, clearHighlights, setKeyboardLocked,
         pressKey, highlightAnswer, getGroupById, getDefaultGroup } from './keyboard.js';

import { updateScore, setQuestionNote, setPrompt, setFeedback, clearFeedback,
         showPlayAgain, showChordButtons, clearChordButtons, setChordButtonState,
         showSpeedRunTimer, updateSpeedRunTimer, setKeyboardLocked as uiSetKeyboardLocked,
         setupModeRadios, setupNoteTypeRadios, setupInstrumentRadios,
         setupSidebar, setupThemeToggle, initUI } from './ui.js';

import { startNoteReadingMode, handleNoteReadingAnswer } from './modes/modes.js';
import { startEarTrainingMode, handleEarTrainingAnswer, replayEarTraining } from './modes/modes.js';
import { startIntervalsMode, handleIntervalsAnswer, replayIntervals } from './modes/modes.js';
import { startChordsMode, handleChordsAnswer, replayChord } from './modes/modes.js';
import { startSpeedRunMode, handleSpeedRunAnswer } from './modes/modes.js';

// ─── GLOBAL STATE ──────────────────────────────────────────────────

let activeMode = 'noteReading';
let noteType = 'whole';
let currentGroup = GROUPS[2];
let currentSemitone = null;
let currentRootSemitone = null;
let currentChordQuality = '';
let currentChordSemis = [];
let currentInterval = null;
let score = 0;
let streak = 0;

// ─── CONTEXT OBJECT FOR MODES ──────────────────────────────────────

const context = {
  // State getters/setters
  get activeMode() { return activeMode; },
  set activeMode(v) { activeMode = v; },
  get noteType() { return noteType; },
  set noteType(v) { noteType = v; },
  get currentGroup() { return currentGroup; },
  set currentGroup(v) { currentGroup = v; },
  get currentSemitone() { return currentSemitone; },
  set currentSemitone(v) { currentSemitone = v; },
  get currentRootSemitone() { return currentRootSemitone; },
  set currentRootSemitone(v) { currentRootSemitone = v; },
  get currentChordQuality() { return currentChordQuality; },
  set currentChordQuality(v) { currentChordQuality = v; },
  get currentChordSemis() { return currentChordSemis; },
  set currentChordSemis(v) { currentChordSemis = v; },
  get currentInterval() { return currentInterval; },
  set currentInterval(v) { currentInterval = v; },
  get score() { return score; },
  set score(v) { score = v; },
  get streak() { return streak; },
  set streak(v) { streak = v; },

  // Engine functions
  State,
  transition,
  getState,
  scheduleTimer,
  clearAllTimers,
  GROUPS,
  pickNextGroup,
  getPlayableSemis,
  weightedPick,
  semitoneToDisplay,
  practiceModel,
  recordAttempt,
  MEDALS,
  getMedal,
  nextMilestone,
  INTERVAL_NAMES,
  CHORD_QUALITIES,
  CHROMATIC,
  startSpeedRunTimer,
  stopSpeedRunTimer,
  getSpeedRunTimeLeft,

  // Audio functions
  playDing,
  playMajorEnsemble,
  playMinorEnsemble,
  playPerfectCadence,
  playDiminishedResolution,
  intervalsPlayAudio,
  playChord,
  ensureAudioContext,
  setInstrument,
  getInstrument,

  // Keyboard functions
  buildKeyboard,
  clearHighlights,
  setKeyboardLocked,
  pressKey,
  highlightAnswer,
  getGroupById,
  getDefaultGroup,

  // UI functions
  updateScore,
  setQuestionNote,
  setPrompt,
  setFeedback,
  clearFeedback,
  showPlayAgain,
  showChordButtons,
  clearChordButtons,
  setChordButtonState,
  showSpeedRunTimer,
  updateSpeedRunTimer,
  setKeyboardLocked: uiSetKeyboardLocked,
};

// ─── MODE SWITCHING ────────────────────────────────────────────────

async function switchMode(newMode) {
  clearAllTimers();
  stopSpeedRunTimer();
  transition(State.IDLE);
  await ensureAudioContext();

  activeMode = newMode;
  score = 0;
  streak = 0;
  updateScore(0, 0);

  setQuestionNote('?');
  clearFeedback();
  setKeyboardLocked(false);
  showChordButtons(false);
  showSpeedRunTimer(false);

  switch (activeMode) {
    case 'noteReading':
      setPrompt('Tap the key …');
      showPlayAgain(false);
      await startNoteReadingMode(context);
      break;
    case 'earTraining':
      setPrompt('Listen, then tap the key …');
      showPlayAgain(true);
      setQuestionNote('🔊');
      currentGroup = GROUPS[2];
      buildKeyboard(currentGroup, noteType);
      scheduleTimer(() => startEarTrainingMode(context), 400);
      break;
    case 'intervals':
      setPrompt('From … tap the note you hear');
      showPlayAgain(true);
      setQuestionNote('?');
      await startIntervalsMode(context);
      break;
    case 'chords':
      setPrompt('What chord quality?');
      showPlayAgain(true);
      setQuestionNote('?');
      await startChordsMode(context);
      break;
    case 'speedRun':
      setPrompt('Speed Run — 60 seconds!');
      showPlayAgain(false);
      setQuestionNote('?');
      await startSpeedRunMode(context);
      break;
    default:
      setPrompt('Coming soon …');
      showPlayAgain(false);
      setKeyboardLocked(true);
      currentGroup = GROUPS[2];
      buildKeyboard(currentGroup, noteType);
      break;
  }
}

function handleNoteTypeChange(newNoteType) {
  clearAllTimers();
  stopSpeedRunTimer();
  transition(State.IDLE);
  score = 0;
  streak = 0;
  updateScore(0, 0);

  // Update the note type state
  noteType = newNoteType;

  switch (activeMode) {
    case 'noteReading':
      startNoteReadingMode(context);
      break;
    case 'earTraining':
      currentGroup = GROUPS[2];
      buildKeyboard(currentGroup, noteType);
      scheduleTimer(() => startEarTrainingMode(context), 300);
      break;
    case 'intervals':
      startIntervalsMode(context);
      break;
    case 'chords':
      startChordsMode(context);
      break;
    case 'speedRun':
      startSpeedRunMode(context);
      break;
    default:
      currentGroup = GROUPS[2];
      buildKeyboard(currentGroup, noteType);
      break;
  }
}

function handleInstrumentChange(instrument) {
  setInstrument(instrument);
}

// ─── ANSWER HANDLING ───────────────────────────────────────────────

// Debounce guard: prevent click+touchstart double-fire on mobile
let _lastKeyTimestamp = 0;
let _lastKeySemitone = null;

function handleKeyClick(chosenSemitone, keyEl) {
  const now = Date.now();
  if (chosenSemitone === _lastKeySemitone && now - _lastKeyTimestamp < 300) return;
  _lastKeyTimestamp = now;
  _lastKeySemitone = chosenSemitone;
  handleKeyAnswer(chosenSemitone, keyEl);
}

function handleKeyAnswer(chosenSemitone, keyEl) {
  // Chord mode: keyboard acts as hint — play note, don't score
  if (activeMode === 'chords') {
    const st = getState();
    if (st === State.QUESTION_ACTIVE || st === State.ANSWER_PENDING) {
      playDing(chosenSemitone);
    }
    return;
  }

  // Speed run mode
  if (activeMode === 'speedRun') {
    handleSpeedRunAnswer(context, chosenSemitone, keyEl);
    return;
  }

  // Guard: only accept answers in QUESTION_ACTIVE state
  if (getState() !== State.QUESTION_ACTIVE) return;

  switch (activeMode) {
    case 'noteReading':
      handleNoteReadingAnswer(context, chosenSemitone, keyEl);
      break;
    case 'earTraining':
      handleEarTrainingAnswer(context, chosenSemitone, keyEl);
      break;
    case 'intervals':
      handleIntervalsAnswer(context, chosenSemitone, keyEl);
      break;
  }
}

function handleChordAnswer(qualityKey, btnEl) {
  if (getState() !== State.QUESTION_ACTIVE) return;
  handleChordsAnswer(context, qualityKey, btnEl);
}

// ─── PLAY AGAIN / REPLAY ───────────────────────────────────────────

function handlePlayAgain() {
  const modeAtClick = activeMode;
  ensureAudioContext().then(() => {
    if (activeMode !== modeAtClick) return;
    switch (modeAtClick) {
      case 'intervals':
        replayIntervals(context);
        break;
      case 'chords':
        replayChord(context);
        break;
      case 'earTraining':
        replayEarTraining(context);
        break;
      default:
        if (currentSemitone !== null) playDing(currentSemitone);
        break;
    }
  });
}

// ─── EVENT LISTENERS ───────────────────────────────────────────────

function setupEventListeners() {
  // Keyboard clicks
  document.addEventListener('click', (e) => {
    const key = e.target.closest('.white-key, .black-key.clickable');
    if (key && key.dataset.semitone) {
      handleKeyClick(Number(key.dataset.semitone), key);
    }
  });

  // Touch events for mobile
  document.addEventListener('touchstart', (e) => {
    const key = e.target.closest('.white-key, .black-key.clickable');
    if (key && key.dataset.semitone) {
      e.preventDefault();
      handleKeyClick(Number(key.dataset.semitone), key);
    }
  }, { passive: false });

  // Chord buttons
  document.querySelectorAll('.chord-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeMode !== 'chords') return;
      if (getState() !== State.QUESTION_ACTIVE) return;
      handleChordAnswer(btn.dataset.quality, btn);
    });
  });

  // Play again button
  document.getElementById('playAgainBtn').addEventListener('click', handlePlayAgain);

  // Mode radios
  setupModeRadios(switchMode);

  // Note type radios
  setupNoteTypeRadios(handleNoteTypeChange);

  // Instrument radios
  setupInstrumentRadios(handleInstrumentChange);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcut);
}

function handleKeyboardShortcut(e) {
  // Don't trigger shortcuts when typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case ' ':
    case 'Enter':
      // Play Again — respect FSM state guard
      if (document.getElementById('playAgainBtn').style.display !== 'none') {
        const st = getState();
        if (st === State.QUESTION_ACTIVE || st === State.ANSWER_PENDING) {
          e.preventDefault();
          handlePlayAgain();
        }
      }
      break;
    case 'ArrowLeft':
      // Previous group (Note Reading mode)
      if (activeMode === 'noteReading') {
        e.preventDefault();
        // Could implement group navigation here
      }
      break;
    case 'ArrowRight':
      // Next group (Note Reading mode)
      if (activeMode === 'noteReading') {
        e.preventDefault();
        // Could implement group navigation here
      }
      break;
    case 'Escape':
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('collapsed');
      }
      break;
    case 't':
    case 'T':
      // Toggle theme
      document.getElementById('themeToggle').click();
      break;
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
      // Chord quality shortcuts (Chords mode)
      if (activeMode === 'chords' && getState() === State.QUESTION_ACTIVE) {
        const qualities = ['major', 'minor', 'diminished', 'augmented', 'dom7', 'maj7'];
        const idx = Number(e.key) - 1;
        if (qualities[idx]) {
          const btn = document.querySelector(`.chord-btn[data-quality="${qualities[idx]}"]`);
          if (btn) handleChordAnswer(qualities[idx], btn);
        }
      }
      break;
  }
}

// ─── MIDI INPUT ─────────────────────────────────────────────────────

function setupMIDI() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then(midi => {
    midi.inputs.forEach(input => {
      input.onmidimessage = (msg) => {
        const [status, note, velocity] = msg.data;
        // Note On (0x90 + channel 0-15, velocity > 0)
        if (status >= 0x90 && status <= 0x9F && velocity > 0) {
          const appSemi = note - 12; // MIDI middle C=60 → app C4=48
          const keyEl = document.querySelector(`[data-semitone="${appSemi}"]`);
          handleKeyAnswer(appSemi, keyEl);
        }
      };
    });
  }).catch(() => {
    // Safari, mobile, or permission denied — silent fail
  });
}

// ─── INIT ──────────────────────────────────────────────────────────

async function init() {
  // initUI already calls setupSidebar() and setupThemeToggle() internally
  initUI();
  setupEventListeners();
  setupMIDI();

  // Initial mode
  await switchMode('noteReading');
}

// Start the app
init();