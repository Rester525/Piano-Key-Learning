// ══════════════════════════════════════════════════════════════════
// MODES — Game Mode Implementations
// ══════════════════════════════════════════════════════════════════

import { GROUPS, semitoneToDisplay, INTERVAL_NAMES, CHORD_QUALITIES, CHROMATIC } from '../engine.js';
import { selectSRSItem, gradeItem } from '../srs-engine.js';
import { LEVELS, getCurrentLevel, getProgress, recordAttempt as recordCurriculumAttempt, isLevelCompleted } from '../curriculum.js';

// ─── SRS DISPATCH HELPERS ──────────────────────────────────────────

/** Pick next item using either weighted random or SRS based on learningMethod. */
function pickNextItem(pool, avoidKey, context) {
  if (context.learningMethod === 'srs') {
    const keys = pool.map(String);
    const avoid = avoidKey != null ? String(avoidKey) : undefined;
    const selected = context.selectSRSItem(keys, avoid);
    return selected != null ? Number(selected) : pool[0];
  }
  return context.weightedPick(pool, avoidKey);
}

/** Record SRS grade (5=perfect, 0=complete blackout) if SRS mode is active. */
function recordGradeIfSRS(itemKey, correct, context) {
  if (context.learningMethod === 'srs') {
    context.gradeItem(String(itemKey), correct ? 5 : 0);
  }
}

// ─── NOTE READING MODE ────────────────────────────────────────────

export async function startNoteReadingMode(context) {
  const { noteType, scheduleTimer, transition, State, weightedPick, getPlayableSemis,
          pickNextGroup, buildKeyboard, clearHighlights, clearFeedback, setQuestionNote } = context;

  transition(State.QUESTION_ACTIVE);
  clearHighlights();

  const group = pickNextGroup();
  context.currentGroup = group;
  buildKeyboard(group, noteType);

  clearFeedback();
  setQuestionNote('?');

  const pool = getPlayableSemis(group, noteType);
  if (pool.length === 0) {
    pool.push(...group.semis);
  }

  const next = pickNextItem(pool, context.currentSemitone, context);
  context.currentSemitone = next;

  setQuestionNote(semitoneToDisplay(context.currentSemitone, noteType));
}

export async function handleNoteReadingAnswer(context, chosenSemitone, keyEl) {
  const { noteType, getState, State, transition, scheduleTimer, semitoneToDisplay,
          recordAttempt, updateScore, currentSemitone, activeMode,
          ensureAudioContext, playDing, playMajorEnsemble, playMinorEnsemble,
          pressKey, highlightAnswer, setQuestionNote, setFeedback } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  const correct = chosenSemitone === currentSemitone;

  await ensureAudioContext();
  playDing(chosenSemitone);

  scheduleTimer(() => {
    if (correct) playMajorEnsemble(chosenSemitone);
    else playMinorEnsemble(chosenSemitone);
  }, 200);

  pressKey(keyEl);
  highlightAnswer(currentSemitone, chosenSemitone, correct);

  setQuestionNote(semitoneToDisplay(chosenSemitone, noteType), correct ? 'correct' : 'wrong');

  if (correct) {
    const praise = ['Brilliant! ✨','Perfect! 🎵','Nice work! 🌟','Excellent! 🎶','Keep it up! 🔥','Superb! 🎼'];
    setFeedback(praise[Math.floor(Math.random() * praise.length)], 'correct');
    context.score++;
    context.streak++;
  } else {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const correctDisplay = semitoneToDisplay(currentSemitone, noteType);
    setFeedback(`The answer was ${correctDisplay} (you tapped ${chosenDisplay})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentSemitone, correct);
  recordGradeIfSRS(currentSemitone, correct, context);
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'noteReading') startNoteReadingMode(context);
  }, 1500);
}

// ─── EAR TRAINING MODE ────────────────────────────────────────────

export async function startEarTrainingMode(context) {
  const { noteType, scheduleTimer, transition, State, weightedPick, getPlayableSemis,
          buildKeyboard, clearHighlights, clearFeedback, setQuestionNote, setFeedback,
          playDing, ensureAudioContext } = context;

  transition(State.QUESTION_ACTIVE);
  clearHighlights();

  context.currentGroup = GROUPS[2];
  buildKeyboard(context.currentGroup, noteType);

  clearFeedback();
  setQuestionNote('🔊');
  setFeedback('Tap the key you heard');

  const pool = getPlayableSemis(context.currentGroup, noteType);
  const next = pickNextItem(pool, context.currentSemitone, context);
  context.currentSemitone = next;

  await ensureAudioContext();
  scheduleTimer(() => playDing(context.currentSemitone), 200);
}

export async function handleEarTrainingAnswer(context, chosenSemitone, keyEl) {
  const { noteType, getState, State, transition, scheduleTimer, semitoneToDisplay,
          recordAttempt, updateScore, currentSemitone, activeMode,
          ensureAudioContext, playDing, playPerfectCadence, playDiminishedResolution,
          pressKey, highlightAnswer, setQuestionNote, setFeedback } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  const correct = chosenSemitone === currentSemitone;

  await ensureAudioContext();
  playDing(chosenSemitone);

  scheduleTimer(() => {
    if (correct) playPerfectCadence();
    else playDiminishedResolution();
  }, 200);

  pressKey(keyEl);
  highlightAnswer(currentSemitone, chosenSemitone, correct);

  setQuestionNote(semitoneToDisplay(chosenSemitone, noteType), correct ? 'correct' : 'wrong');

  if (correct) {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const praise = ['Brilliant! ✨','Perfect! 🎵','Nice work! 🌟','Excellent! 🎶','Keep it up! 🔥','Superb! 🎼'];
    setFeedback(`${chosenDisplay} — ${praise[Math.floor(Math.random() * praise.length)]}`, 'correct');
    context.score++;
    context.streak++;
  } else {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const correctDisplay = semitoneToDisplay(currentSemitone, noteType);
    setFeedback(`The answer was ${correctDisplay} (you tapped ${chosenDisplay})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentSemitone, correct);
  recordGradeIfSRS(currentSemitone, correct, context);
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'earTraining') startEarTrainingMode(context);
  }, 1500);
}

export function replayEarTraining(context) {
  const { currentSemitone, playDing, ensureAudioContext } = context;
  ensureAudioContext().then(() => playDing(currentSemitone));
}

// ─── INTERVALS MODE ────────────────────────────────────────────────

export async function startIntervalsMode(context) {
  const { noteType, scheduleTimer, transition, State, weightedPick, getPlayableSemis,
          buildKeyboard, clearHighlights, clearFeedback, setQuestionNote, setPrompt,
          semitoneToDisplay, intervalsPlayAudio, ensureAudioContext } = context;

  transition(State.QUESTION_ACTIVE);
  clearHighlights();

  context.currentGroup = GROUPS[2];
  buildKeyboard(context.currentGroup, noteType);

  clearFeedback();
  setQuestionNote('?');

  const pool = getPlayableSemis(context.currentGroup, noteType);
  if (pool.length < 2) {
    context.currentSemitone = pool[0] || 48;
    context.currentRootSemitone = pool[0] || 48;
    return;
  }

  let root, target, interval;
  for (let attempts = 0; attempts < 100; attempts++) {
    root = pickNextItem(pool, null, context);
    interval = 1 + Math.floor(Math.random() * 12);
    target = root + interval;
    if (pool.includes(target) && target !== root) break;
    if (attempts === 99) {
      root = pool[0];
      target = pool[1] || pool[0];
      interval = ((target - root + 12) % 12) || 12;
    }
  }

  context.currentRootSemitone = root;
  context.currentSemitone = target;
  context.currentInterval = interval;

  setPrompt(`From ${semitoneToDisplay(root, noteType)}, tap the note you hear`);
  setQuestionNote(semitoneToDisplay(root, noteType));

  await ensureAudioContext();
  intervalsPlayAudio(root, target, scheduleTimer);
}

export async function handleIntervalsAnswer(context, chosenSemitone, keyEl) {
  const { noteType, getState, State, transition, scheduleTimer, semitoneToDisplay,
          recordAttempt, updateScore,
          currentSemitone, currentRootSemitone, currentInterval, activeMode,
          ensureAudioContext, playDing, playMajorEnsemble, playMinorEnsemble,
          pressKey, highlightAnswer, setQuestionNote, setFeedback } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  const correct = chosenSemitone === currentSemitone;

  await ensureAudioContext();
  playDing(chosenSemitone);

  scheduleTimer(() => {
    if (correct) playMajorEnsemble(chosenSemitone);
    else playMinorEnsemble(chosenSemitone);
  }, 200);

  pressKey(keyEl);
  highlightAnswer(currentSemitone, chosenSemitone, correct);

  setQuestionNote(semitoneToDisplay(chosenSemitone, noteType), correct ? 'correct' : 'wrong');

  if (correct) {
    const intervalName = INTERVAL_NAMES[currentInterval] || 'Interval';
    const praise = ['Brilliant! ✨','Perfect! 🎵','Nice work! 🌟','Excellent! 🎶','Keep it up! 🔥','Superb! 🎼'];
    setFeedback(`${intervalName} — ${praise[Math.floor(Math.random() * praise.length)]}`, 'correct');
    context.score++;
    context.streak++;
  } else {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const correctDisplay = semitoneToDisplay(currentSemitone, noteType);
    setFeedback(`The answer was ${correctDisplay} (you tapped ${chosenDisplay})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentRootSemitone + '_' + currentSemitone, correct);
  recordGradeIfSRS(currentRootSemitone + '_' + currentSemitone, correct, context);
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'intervals') startIntervalsMode(context);
  }, 1500);
}

export function replayIntervals(context) {
  const { currentRootSemitone, currentSemitone, intervalsPlayAudio, ensureAudioContext, scheduleTimer } = context;
  ensureAudioContext().then(() => intervalsPlayAudio(currentRootSemitone, currentSemitone, scheduleTimer));
}

// ─── CHORDS MODE ──────────────────────────────────────────────────

export async function startChordsMode(context) {
  const { scheduleTimer, transition, State, weightedPick,
          buildKeyboard, clearFeedback, setQuestionNote, setPrompt,
          clearChordButtons, showChordButtons, playChord, ensureAudioContext,
          semitoneToDisplay } = context;

  transition(State.QUESTION_ACTIVE);

  clearChordButtons();
  showChordButtons(true);

  context.currentGroup = GROUPS[2];
  buildKeyboard(context.currentGroup, context.noteType);

  clearFeedback();
  setQuestionNote('?');
  setPrompt('What chord quality?');

  // Full chromatic pool — chords need all 12 notes
  const pool = [];
  for (let s = 0; s < 12; s++) pool.push(48 + s);

  const qKeys = Object.keys(CHORD_QUALITIES);

  let root, qualityKey, chordSemis;
  for (let attempts = 0; attempts < 100; attempts++) {
    root = pickNextItem(pool, null, context);
    qualityKey = pickNextItem(qKeys, null, context);
    chordSemis = CHORD_QUALITIES[qualityKey].semis.map(s => root + s);
    if (chordSemis.every(s => pool.includes(s))) break;
    if (attempts === 99) {
      root = 48;
      qualityKey = 'major';
      chordSemis = [48, 52, 55];
    }
  }

  context.currentRootSemitone = root;
  context.currentChordQuality = qualityKey;
  context.currentChordSemis = chordSemis;

  setQuestionNote(semitoneToDisplay(root, context.noteType));

  await ensureAudioContext();
  playChord(root, qualityKey);
}

export async function handleChordsAnswer(context, qualityKey, btnEl) {
  const { getState, State, transition, scheduleTimer, noteType, semitoneToDisplay,
          recordAttempt, updateScore,
          currentChordQuality, currentChordSemis,
          ensureAudioContext, playPerfectCadence, playDiminishedResolution,
          setQuestionNote, setFeedback, showChordButtons } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  await ensureAudioContext();

  const correct = qualityKey === currentChordQuality;
  const q = CHORD_QUALITIES[currentChordQuality];
  const noteNames = currentChordSemis.map(s => semitoneToDisplay(s, noteType)).join(' ');

  if (correct) {
    btnEl.classList.add('selected-correct');
    setQuestionNote(semitoneToDisplay(context.currentRootSemitone, noteType), 'correct');
    playPerfectCadence();
    setFeedback(`${q.name} — ${noteNames} ✨`, 'correct');
    context.score++;
    context.streak++;
  } else {
    btnEl.classList.add('selected-wrong');
    document.querySelectorAll('.chord-btn').forEach(b => {
      if (b.dataset.quality === currentChordQuality) b.classList.add('reveal-correct');
    });
    playDiminishedResolution();
    const chosenName = CHORD_QUALITIES[qualityKey]?.name || qualityKey;
    setFeedback(`That's ${chosenName} — correct is ${q.name} (${noteNames})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentChordQuality, correct);
  recordGradeIfSRS(currentChordQuality, correct, context);
  updateScore(context.score, context.streak);

  scheduleTimer(() => {
    showChordButtons(false);
    startChordsMode(context);
  }, 2000);
}

export function replayChord(context) {
  const { currentRootSemitone, currentChordQuality, playChord, ensureAudioContext } = context;
  ensureAudioContext().then(() => playChord(currentRootSemitone, currentChordQuality));
}

// ─── SPEED RUN MODE ───────────────────────────────────────────────

export async function startSpeedRunMode(context) {
  const { noteType, scheduleTimer, transition, State, weightedPick, getPlayableSemis,
          pickNextGroup, buildKeyboard, clearHighlights, clearFeedback, setQuestionNote,
          showPlayAgain, showChordButtons, showSpeedRunTimer, updateSpeedRunTimer,
          startSpeedRunTimer, semitoneToDisplay,
          ensureAudioContext, playDing, playMajorEnsemble, playMinorEnsemble } = context;

  transition(State.QUESTION_ACTIVE);
  clearHighlights();

  const group = pickNextGroup();
  context.currentGroup = group;
  buildKeyboard(group, noteType);

  clearFeedback();
  setQuestionNote('?');
  showPlayAgain(false);
  showChordButtons(false);

  showSpeedRunTimer(true);

  startSpeedRunTimer(
    (seconds) => updateSpeedRunTimer(seconds),
    () => endSpeedRun(context)
  );

  const pool = getPlayableSemis(group, noteType);
  if (pool.length === 0) pool.push(...group.semis);

  const next = pickNextItem(pool, context.currentSemitone, context);
  context.currentSemitone = next;

  setQuestionNote(semitoneToDisplay(context.currentSemitone, noteType));
}

function endSpeedRun(context) {
  const { State, transition, updateScore, score, streak,
          setPrompt, setFeedback, showSpeedRunTimer, stopSpeedRunTimer } = context;

  transition(State.IDLE);
  stopSpeedRunTimer();
  showSpeedRunTimer(false);

  setPrompt(`Time's up! Final score: ${score}`);
  setFeedback(`Streak: ${streak} — Play again to beat your record!`, 'correct');
  updateScore(score, streak);
}

export async function handleSpeedRunAnswer(context, chosenSemitone, keyEl) {
  const { noteType, getState, State, transition, scheduleTimer, semitoneToDisplay,
          recordAttempt, updateScore, currentSemitone, activeMode,
          getSpeedRunTimeLeft,
          ensureAudioContext, playDing, playMajorEnsemble, playMinorEnsemble,
          pressKey, highlightAnswer, setQuestionNote, setFeedback } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  if (getSpeedRunTimeLeft() <= 0) return;
  transition(State.ANSWER_PENDING);

  const correct = chosenSemitone === currentSemitone;

  await ensureAudioContext();
  playDing(chosenSemitone);

  scheduleTimer(() => {
    if (correct) playMajorEnsemble(chosenSemitone);
    else playMinorEnsemble(chosenSemitone);
  }, 200);

  pressKey(keyEl);
  highlightAnswer(currentSemitone, chosenSemitone, correct);

  setQuestionNote(semitoneToDisplay(chosenSemitone, noteType), correct ? 'correct' : 'wrong');

  if (correct) {
    const praise = ['Brilliant! ✨','Perfect! 🎵','Nice work! 🌟','Excellent! 🎶','Keep it up! 🔥','Superb! 🎼'];
    setFeedback(praise[Math.floor(Math.random() * praise.length)], 'correct');
    context.score++;
    context.streak++;
  } else {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const correctDisplay = semitoneToDisplay(currentSemitone, noteType);
    setFeedback(`The answer was ${correctDisplay} (you tapped ${chosenDisplay})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentSemitone, correct);
  recordGradeIfSRS(currentSemitone, correct, context);
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'speedRun' && getSpeedRunTimeLeft() > 0) startSpeedRunMode(context);
  }, 800); // Faster pace for speed run
}

// ══════════════════════════════════════════════════════════════════
// KEYBOARD MODE — Free Play 88-Key Piano
// ══════════════════════════════════════════════════════════════════

export async function startKeyboardMode(context) {
  const { buildFullKeyboard, buildMinimap, transition, State,
          setPrompt, setQuestionNote, clearFeedback,
          showPlayAgain, showChordButtons, showSpeedRunTimer,
          ensureAudioContext, playDing } = context;

  transition(State.IDLE);

  // Hide question UI
  setQuestionNote('');
  setPrompt('🎹 Free Play — tap any key');
  clearFeedback();
  showPlayAgain(false);
  showChordButtons(false);
  showSpeedRunTimer(false);

  // Show minimap
  const minimap = document.getElementById('keyboardMinimapWrap');
  if (minimap) minimap.style.display = 'block';

  // Build 88-key keyboard + minimap
  buildFullKeyboard();
  buildMinimap();

  // Set up minimap slider
  setupMinimapSlider();

  // Scroll to start (A0 — lowest note, far left)
  const viewport = document.getElementById('keyboardViewport');
  const thumb = document.getElementById('minimapThumb');
  if (viewport) viewport.scrollLeft = 0;
  if (thumb) thumb.style.left = '0%';

  await ensureAudioContext();
}

function setupMinimapSlider() {
  const slider = document.getElementById('minimapSlider');
  const thumb = document.getElementById('minimapThumb');
  const viewport = document.getElementById('keyboardViewport');
  if (!slider || !viewport) return;

  let dragging = false;

  function updateFromClientX(clientX) {
    const rect = slider.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    thumb.style.left = `${pct * 100}%`;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollLeft = pct * maxScroll;
  }

  slider.addEventListener('mousedown', (e) => {
    dragging = true;
    updateFromClientX(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  });

  document.addEventListener('mouseup', () => { dragging = false; });

  // Sync thumb with scroll
  viewport.addEventListener('scroll', () => {
    if (dragging) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    if (maxScroll <= 0) return;
    thumb.style.left = `${(viewport.scrollLeft / maxScroll) * 100}%`;
  });

  // Touch support
  slider.addEventListener('touchstart', (e) => {
    dragging = true;
    updateFromClientX(e.touches[0].clientX);
  });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    updateFromClientX(e.touches[0].clientX);
  });
  document.addEventListener('touchend', () => { dragging = false; });
}

export function handleKeyboardAnswer(context, chosenSemitone, keyEl) {
  // Free play — ensure audio is running, then play the note
  const { ensureAudioContext, playDing, pressKey } = context;
  // Force-resume the audio context on every key press
  ensureAudioContext().then(() => {
    playDing(chosenSemitone);
    if (keyEl) pressKey(keyEl, 200);
  }).catch(() => {
    // Even if resume fails, try playing (browser may allow it)
    playDing(chosenSemitone);
  });
}

// ══════════════════════════════════════════════════════════════════
// CURRICULUM MODE — Level-Gated Progression
// ══════════════════════════════════════════════════════════════════

/** Track whether we just completed a level (for celebration UI). */
let _curriculumJustCompleted = false;

export function curriculumJustCompleted() { return _curriculumJustCompleted; }
export function clearCurriculumCompletion() { _curriculumJustCompleted = false; }

export async function startCurriculumMode(context) {
  const { noteType, scheduleTimer, transition, State, pickNextGroup,
          buildKeyboard, clearHighlights, clearFeedback, setQuestionNote, setPrompt,
          showPlayAgain, showChordButtons, clearChordButtons,
          getPlayableSemis, semitoneToDisplay, CHORD_QUALITIES,
          ensureAudioContext, playChord } = context;

  transition(State.QUESTION_ACTIVE);
  clearHighlights();

  const level = getCurrentLevel();
  const groupId = level.groupId || 'cdefgab';
  const nt = level.noteType || 'whole';

  // Build keyboard from group
  const { GROUPS } = await import('../engine.js');
  const group = GROUPS.find(g => g.id === groupId) || GROUPS[2];
  context.currentGroup = group;
  buildKeyboard(group, nt);

  clearFeedback();
  setQuestionNote('?');
  showPlayAgain(false);
  showChordButtons(false);

  const progress = getProgress();
  const p = progress[level.id] || { attempts: 0, correct: 0 };
  const acc = p.attempts > 0 ? Math.round((p.correct / p.attempts) * 100) : 0;
  setPrompt(`${level.name} — ${p.attempts}/${level.minAttempts} attempts · ${acc}%`);

  // Generate question based on level mode
  if (level.mode === 'chords') {
    await _startCurriculumChords(context, group, nt);
  } else if (level.mode === 'intervals') {
    await _startCurriculumIntervals(context, group, nt);
  } else {
    // noteReading (Levels 1-4)
    await _startCurriculumNoteReading(context, group, nt);
  }
}

async function _startCurriculumNoteReading(context, group, nt) {
  const { getPlayableSemis, pickNextItem, semitoneToDisplay, setQuestionNote } = context;
  const pool = getPlayableSemis(group, nt);
  if (pool.length === 0) pool.push(...group.semis);
  const next = pickNextItem(pool, context.currentSemitone, context);
  context.currentSemitone = next;
  setQuestionNote(semitoneToDisplay(context.currentSemitone, nt));
}

async function _startCurriculumIntervals(context, group, nt) {
  const { getPlayableSemis, pickNextItem, semitoneToDisplay, setQuestionNote, setPrompt,
          intervalsPlayAudio, scheduleTimer, ensureAudioContext } = context;

  const pool = getPlayableSemis(group, nt);
  if (pool.length < 2) {
    context.currentSemitone = pool[0] || 48;
    context.currentRootSemitone = pool[0] || 48;
    return;
  }

  let root, target, interval;
  for (let attempts = 0; attempts < 100; attempts++) {
    root = pickNextItem(pool, null, context);
    interval = 1 + Math.floor(Math.random() * 12);
    target = root + interval;
    if (pool.includes(target) && target !== root) break;
    if (attempts === 99) {
      root = pool[0];
      target = pool[1] || pool[0];
      interval = ((target - root + 12) % 12) || 12;
    }
  }

  context.currentRootSemitone = root;
  context.currentSemitone = target;
  context.currentInterval = interval;

  setPrompt(`From ${semitoneToDisplay(root, nt)}, tap the note you hear`);
  setQuestionNote(semitoneToDisplay(root, nt));

  await ensureAudioContext();
  intervalsPlayAudio(root, target, scheduleTimer);
}

async function _startCurriculumChords(context, group, nt) {
  const { pickNextItem, showChordButtons, clearChordButtons, setQuestionNote, setPrompt,
          semitoneToDisplay, CHORD_QUALITIES, ensureAudioContext, playChord } = context;

  clearChordButtons();
  showChordButtons(true);

  // Full chromatic pool for chords
  const pool = [];
  for (let s = 0; s < 12; s++) pool.push(48 + s);

  const qKeys = Object.keys(CHORD_QUALITIES);

  let root, qualityKey, chordSemis;
  for (let attempts = 0; attempts < 100; attempts++) {
    root = pickNextItem(pool, null, context);
    qualityKey = pickNextItem(qKeys, null, context);
    chordSemis = CHORD_QUALITIES[qualityKey].semis.map(s => root + s);
    if (chordSemis.every(s => pool.includes(s))) break;
    if (attempts === 99) {
      root = 48;
      qualityKey = 'major';
      chordSemis = [48, 52, 55];
    }
  }

  context.currentRootSemitone = root;
  context.currentChordQuality = qualityKey;
  context.currentChordSemis = chordSemis;

  setQuestionNote(semitoneToDisplay(root, nt));
  setPrompt('What chord quality?');

  await ensureAudioContext();
  playChord(root, qualityKey);
}

export async function handleCurriculumAnswer(context, chosenSemitone, keyEl) {
  const { getState, State, transition, scheduleTimer, noteType, semitoneToDisplay,
          recordAttempt, updateScore, activeMode,
          ensureAudioContext, playDing, playMajorEnsemble, playMinorEnsemble,
          playPerfectCadence, playDiminishedResolution,
          pressKey, highlightAnswer, setQuestionNote, setFeedback,
          showChordButtons, clearChordButtons } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  const level = getCurrentLevel();
  const correct = chosenSemitone === context.currentSemitone;

  await ensureAudioContext();
  playDing(chosenSemitone);

  scheduleTimer(() => {
    if (correct) {
      if (level.mode === 'chords') playPerfectCadence();
      else playMajorEnsemble(chosenSemitone);
    } else {
      if (level.mode === 'chords') playDiminishedResolution();
      else playMinorEnsemble(chosenSemitone);
    }
  }, 200);

  if (keyEl) pressKey(keyEl);
  highlightAnswer(context.currentSemitone, chosenSemitone, correct);

  setQuestionNote(semitoneToDisplay(chosenSemitone, noteType), correct ? 'correct' : 'wrong');

  // Record attempt to both practice model and curriculum
  recordAttempt(context.currentSemitone, correct);
  const updatedEntry = recordCurriculumAttempt(level.id, correct);

  if (correct) {
    const praise = ['Brilliant! ✨', 'Perfect! 🎵', 'Nice work! 🌟', 'Excellent! 🎶', 'Keep it up! 🔥', 'Superb! 🎼'];
    setFeedback(praise[Math.floor(Math.random() * praise.length)], 'correct');
    context.score++;
    context.streak++;
  } else {
    const chosenDisplay = semitoneToDisplay(chosenSemitone, noteType);
    const correctDisplay = semitoneToDisplay(context.currentSemitone, noteType);
    setFeedback(`The answer was ${correctDisplay} (you tapped ${chosenDisplay})`, 'wrong');
    context.streak = 0;
  }

  updateScore(context.score, context.streak);

  // Check if level was just completed
  if (updatedEntry.completed && updatedEntry.attempts === (context._prevAttempts || 0) + 1) {
    _curriculumJustCompleted = true;
  }

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'curriculum') startCurriculumMode(context);
  }, 1500);
}

export async function handleCurriculumChordsAnswer(context, qualityKey, btnEl) {
  const { getState, State, transition, scheduleTimer, noteType, semitoneToDisplay,
          recordAttempt, updateScore, activeMode,
          ensureAudioContext, playPerfectCadence, playDiminishedResolution,
          setQuestionNote, setFeedback, showChordButtons,
          currentChordQuality, currentChordSemis } = context;

  if (getState() !== State.QUESTION_ACTIVE) return;
  transition(State.ANSWER_PENDING);

  await ensureAudioContext();

  const correct = qualityKey === currentChordQuality;
  const { CHORD_QUALITIES } = await import('../engine.js');
  const q = CHORD_QUALITIES[currentChordQuality];
  const noteNames = currentChordSemis.map(s => semitoneToDisplay(s, noteType)).join(' ');

  if (correct) {
    btnEl.classList.add('selected-correct');
    setQuestionNote(semitoneToDisplay(context.currentRootSemitone, noteType), 'correct');
    playPerfectCadence();
    setFeedback(`${q.name} — ${noteNames} ✨`, 'correct');
    context.score++;
    context.streak++;
  } else {
    btnEl.classList.add('selected-wrong');
    document.querySelectorAll('.chord-btn').forEach(b => {
      if (b.dataset.quality === currentChordQuality) b.classList.add('reveal-correct');
    });
    playDiminishedResolution();
    const chosenName = CHORD_QUALITIES[qualityKey]?.name || qualityKey;
    setFeedback(`That's ${chosenName} — correct is ${q.name} (${noteNames})`, 'wrong');
    context.streak = 0;
  }

  recordAttempt(currentChordQuality, correct);
  recordCurriculumAttempt(getCurrentLevel().id, correct);
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    showChordButtons(false);
    if (modeSnapshot === 'curriculum') startCurriculumMode(context);
  }, 2000);
}
