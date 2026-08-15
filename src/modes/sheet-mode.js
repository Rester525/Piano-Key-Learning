// ═══════════════════════════════════════════════════════════════════
// SHEET MODE — Play a melody from sheet music.
// Notes turn green (correct) or red (wrong) as you play them.
// Input: MIDI, on-screen keyboard, or microphone (pitch detection).
// ═══════════════════════════════════════════════════════════════════

import { SONGS, getSong } from '../songs.js';
import { renderMelody } from '../sheet-music.js';
import { startPitchDetection, stopPitchDetection } from '../pitch-detector.js';

const SONG_KEY = 'pkl_sheet_song';

let song = null;
let currentIndex = 0;
let completed = new Set();     // indices played correctly (green)
let wrongFlash = null;         // index just played wrong (red) — clears on next correct
let micEnabled = false;
let _context = null;

const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];

function whiteKeysInRange(minSemi, maxSemi) {
  const keys = [];
  for (let s = minSemi; s <= maxSemi; s++) {
    if (WHITE_PC.includes(((s % 12) + 12) % 12)) keys.push(s);
  }
  return keys;
}

function pitchClass(semi) {
  return ((semi % 12) + 12) % 12;
}

/** Render the current sheet state to the staff canvas. */
async function renderSheet() {
  if (!song || !_context) return;
  const states = song.notes.map((_, i) => {
    if (i === wrongFlash) return 'wrong';           // just played wrong — red
    if (completed.has(i)) return 'correct';          // played right — green
    return 'pending';
  });
  await renderMelody('staffCanvas', song.notes, states, _context.noteType, currentIndex);
}

/** Highlight the key for the next note on the on-screen keyboard. */
function highlightNextKey(semitone) {
  document.querySelectorAll('.white-key, .black-key').forEach(k => k.classList.remove('sheet-next'));
  const el = document.querySelector(`[data-semitone="${semitone}"]`);
  if (el) el.classList.add('sheet-next');
}

/** Build an on-screen keyboard spanning the song's note range. */
function buildSongKeyboard() {
  if (!_context || !song) return;
  const min = Math.min(...song.notes);
  const max = Math.max(...song.notes);
  const semis = whiteKeysInRange(min - 2, max + 2);
  const group = { id: 'sheet', label: 'Sheet', semis };
  _context.buildKeyboard(group, _context.noteType);
  highlightNextKey(song.notes[currentIndex]);
}

function updateProgressUI() {
  if (!_context) return;
  const el = document.getElementById('sheetProgress');
  if (el) el.textContent = `${completed.size}/${song.notes.length}`;
}

// ─── PUBLIC API ────────────────────────────────────────────────────

/** Enter sheet mode. Resets to the stored (or first) song. */
export async function startSheetMode(context) {
  _context = context;
  const storedId = localStorage.getItem(SONG_KEY);
  song = getSong(storedId);
  currentIndex = 0;
  completed = new Set();
  wrongFlash = null;
  micEnabled = false;

  // Sheet mode always shows the staff, regardless of the show-sheet toggle
  const wrap = document.getElementById('staffWrap');
  if (wrap) wrap.classList.remove('hidden');

  buildSongKeyboard();
  await renderSheet();
  updateProgressUI();

  context.setPrompt('Play the highlighted note on the sheet 🎼');
  context.setQuestionNote('?');
  context.clearFeedback();
  context.showPlayAgain(false);
  context.showChordButtons(false);
  context.showSpeedRunTimer(false);

  syncSongSelect();
}

/** Leave sheet mode — stop mic, clear state. */
export function stopSheetMode() {
  if (micEnabled) disableMic();
  song = null;
  _context = null;
  completed = new Set();
  currentIndex = 0;
  wrongFlash = null;
}

/** Pick a song by id (from the controls dropdown). */
export async function selectSong(context, songId) {
  _context = context;
  localStorage.setItem(SONG_KEY, songId);
  song = getSong(songId);
  currentIndex = 0;
  completed = new Set();
  wrongFlash = null;
  buildSongKeyboard();
  await renderSheet();
  updateProgressUI();
  context.setFeedback('', '');
}

/** Handle a played note (from MIDI, on-screen key, or mic). */
export async function handleSheetAnswer(context, semitone) {
  if (!song || currentIndex >= song.notes.length) return;

  const expected = song.notes[currentIndex];
  const correct = pitchClass(semitone) === pitchClass(expected);

  if (correct) {
    completed.add(currentIndex);
    wrongFlash = null;
    context.playDing(expected, 0.5);
    currentIndex++;

    if (currentIndex >= song.notes.length) {
      context.setFeedback('🎉 Song complete! Great job!', 'correct');
      context.setQuestionNote('✓');
      context.streak++;
    } else {
      context.setFeedback('Correct! ✨', 'correct');
    }
    context.score++;
  } else {
    wrongFlash = currentIndex;
    context.playDing(semitone, 0.3); // play what they actually played
    context.setFeedback('Not quite — try again', 'wrong');
    context.streak = 0;
  }

  highlightNextKey(song.notes[currentIndex] ?? null);
  await renderSheet();
  updateProgressUI();
  context.updateScore(context.score, context.streak);
}

/** Play the entire melody once through. */
export function playSheetMelody(context) {
  if (!song) return;
  context.ensureAudioContext().then(() => {
    song.notes.forEach((semi, i) => {
      context.scheduleTimer(() => context.playDing(semi, 0.5), i * 450);
    });
  });
}

// ─── MIC INPUT ─────────────────────────────────────────────────────

async function enableMic() {
  if (micEnabled) return;
  const ok = await startPitchDetection((semi) => {
    if (_context && song) handleSheetAnswer(_context, semi);
  });
  if (ok) {
    micEnabled = true;
    updateMicButton();
  } else {
    _context?.setFeedback('Microphone unavailable — check permissions', 'wrong');
  }
}

function disableMic() {
  stopPitchDetection();
  micEnabled = false;
  updateMicButton();
}

export function toggleMic(context) {
  _context = context;
  if (micEnabled) disableMic();
  else enableMic();
}

export function isMicEnabled() {
  return micEnabled;
}

function updateMicButton() {
  const btn = document.getElementById('sheetMicBtn');
  if (btn) {
    btn.classList.toggle('active', micEnabled);
    btn.textContent = micEnabled ? '🎤 Mic: On' : '🎤 Mic: Off';
  }
}

/** Sync the song dropdown to the current selection. */
function syncSongSelect() {
  const select = document.getElementById('sheetSongSelect');
  if (!select) return;
  select.innerHTML = '';
  SONGS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
  select.value = song ? song.id : SONGS[0].id;
}
