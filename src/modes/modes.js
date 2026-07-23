// ══════════════════════════════════════════════════════════════════
// MODES — Game Mode Implementations
// ══════════════════════════════════════════════════════════════════

import { GROUPS, semitoneToDisplay, INTERVAL_NAMES, CHORD_QUALITIES, CHROMATIC } from '../engine.js';

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

  const next = weightedPick(pool, context.currentSemitone);
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
  const next = weightedPick(pool, context.currentSemitone);
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
    root = weightedPick(pool);
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
    root = weightedPick(pool);
    qualityKey = weightedPick(qKeys);
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

  const next = weightedPick(pool, context.currentSemitone);
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
  updateScore(context.score, context.streak);

  const modeSnapshot = activeMode;
  scheduleTimer(() => {
    if (modeSnapshot === 'speedRun' && getSpeedRunTimeLeft() > 0) startSpeedRunMode(context);
  }, 800); // Faster pace for speed run
}
