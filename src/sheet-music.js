// ═══════════════════════════════════════════════════════════════════
// SHEET-MUSIC — VexFlow Staff Notation Renderer
// Lazy-loads VexFlow 5.x from CDN. Renders notes, intervals, chords.
// ═══════════════════════════════════════════════════════════════════

import { semitoneToDisplay } from './engine.js';

const VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js';

/** @type {object|null} Cached VexFlow module */
let VF = null;

/**
 * Lazily load VexFlow. Returns the module (cached after first call).
 * The CJS build is UMD-wrapped: a browser `import()` of it returns an empty
 * namespace and attaches VexFlow to `window.VexFlow` as a side effect.
 */
async function loadVexFlow() {
  if (VF) return VF;
  await import(VEXFLOW_CDN);
  VF = (typeof window !== 'undefined' && window.VexFlow) ||
       (typeof globalThis !== 'undefined' && globalThis.VexFlow);
  if (!VF) throw new Error('VexFlow failed to load');
  return VF;
}

// ─── SEMITONE → VEXFLOW NOTE NAME ────────────────────────────────────

/**
 * Convert a semitone offset (C4=48) to a VexFlow note string like "c/4", "c#/4".
 * @param {number} semitone - absolute semitone (C0=0)
 * @param {string} noteType - 'sharps' | 'flats' | 'whole' | 'all'
 * @returns {string} e.g. "c/4", "d#/4"
 */
function semitoneToVF(semitone, noteType) {
  const noteNames = noteType === 'flats'
    ? ['c','db','d','eb','e','f','gb','g','ab','a','bb','b']
    : ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
  // VexFlow's key intValue for 'c/4' is 48 = the app's C4=48 convention.
  // So octave = floor(semitone/12) maps directly (C4 → 'c/4').
  const octave = Math.floor(semitone / 12);
  const pc = ((semitone % 12) + 12) % 12;
  return noteNames[pc] + '/' + Math.max(0, octave);
}

// ─── RENDER FUNCTIONS ────────────────────────────────────────────────

/**
 * Render a single note on a staff.
 * @param {string} canvasId - canvas element ID
 * @param {number} semitone - absolute semitone
 * @param {string} noteType - 'sharps' | 'flats' | 'whole' | 'all'
 * @param {string} [color] - optional note color (e.g. '#22c55e' for correct)
 */
export async function renderNote(canvasId, semitone, noteType, color) {
  const VF = await loadVexFlow();
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const vfNote = semitoneToVF(semitone, noteType);
  if (!vfNote) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
  const ctx = renderer.getContext();

  const stave = new VF.Stave(10, 40, 380);
  stave.addClef('treble').setContext(ctx).draw();

  const note = new VF.StaveNote({ keys: [vfNote], duration: 'q' });
  if (color) note.setStyle({ fillStyle: color, strokeStyle: color });

  VF.Formatter.FormatAndDraw(ctx, stave, [note]);
}

/**
 * Render two notes (interval) on a staff.
 */
export async function renderInterval(canvasId, rootSemitone, targetSemitone, noteType) {
  const VF = await loadVexFlow();
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const rootVF = semitoneToVF(rootSemitone, noteType);
  const targetVF = semitoneToVF(targetSemitone, noteType);
  if (!rootVF || !targetVF) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
  const ctx = renderer.getContext();

  const stave = new VF.Stave(10, 40, 380);
  stave.addClef('treble').setContext(ctx).draw();

  const rootNote = new VF.StaveNote({ keys: [rootVF], duration: 'q' });
  const targetNote = new VF.StaveNote({ keys: [targetVF], duration: 'q' });

  VF.Formatter.FormatAndDraw(ctx, stave, [rootNote, targetNote]);
}

/**
 * Render a chord (stacked notes) on a staff.
 */
export async function renderChord(canvasId, semitones, noteType, color) {
  const VF = await loadVexFlow();
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const vfNotes = semitones.map(s => semitoneToVF(s, noteType)).filter(Boolean);
  if (vfNotes.length === 0) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
  const ctx = renderer.getContext();

  const stave = new VF.Stave(10, 40, 380);
  stave.addClef('treble').setContext(ctx).draw();

  const note = new VF.StaveNote({ keys: vfNotes, duration: 'q' });
  if (color) note.setStyle({ fillStyle: color, strokeStyle: color });

  VF.Formatter.FormatAndDraw(ctx, stave, [note]);
}

/**
 * Clear the staff canvas.
 */
export function clearStaff(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── MELODY RENDER (Sheet Music mode) ───────────────────────────────

// Colors matching the app's design tokens
const NOTE_COLORS = {
  pending: '#b0b8c4',   // muted grey — not yet played
  correct: '#2ecc71',   // green
  wrong:   '#e74c3c',   // red
  current: '#7c6af7',   // accent purple — the note to play next
};

/**
 * Render a full melody as sheet music, one stave line per N notes.
 * Each note is colored by its state: 'pending' | 'correct' | 'wrong'.
 * The note at `currentIndex` is highlighted as 'current'.
 *
 * @param {string} canvasId
 * @param {number[]} notes - absolute semitones (C4=48)
 * @param {string[]} states - per-note state ('pending'|'correct'|'wrong')
 * @param {string} noteType - 'sharps'|'flats'|'whole'|'all'
 * @param {number} currentIndex - index of the note to highlight
 */
export async function renderMelody(canvasId, notes, states, noteType, currentIndex) {
  const VF = await loadVexFlow();
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const NOTES_PER_LINE = 7;
  const STAVE_WIDTH = 380;
  const STAVE_HEIGHT = 130;
  const PADDING = 10;

  const lineCount = Math.ceil(notes.length / NOTES_PER_LINE);
  const totalWidth = STAVE_WIDTH + PADDING * 2;
  const totalHeight = lineCount * STAVE_HEIGHT + PADDING * 2;

  canvas.width = totalWidth;
  canvas.height = totalHeight;
  canvas.style.width = totalWidth + 'px';
  canvas.style.height = totalHeight + 'px';

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(totalWidth, totalHeight);
  const ctx = renderer.getContext();

  for (let line = 0; line < lineCount; line++) {
    const start = line * NOTES_PER_LINE;
    const lineNotes = notes.slice(start, start + NOTES_PER_LINE);
    const y = PADDING + line * STAVE_HEIGHT;

    const stave = new VF.Stave(PADDING, y, STAVE_WIDTH);
    stave.addClef('treble').setContext(ctx).draw();

    const vfStaveNotes = lineNotes.map((semi, i) => {
      const globalIdx = start + i;
      const vfNote = semitoneToVF(semi, noteType);
      const isCurrent = globalIdx === currentIndex;
      // Precedence: wrong (red) > correct (green) > current (purple) > pending
      const state = (states[globalIdx] === 'wrong' || states[globalIdx] === 'correct')
        ? states[globalIdx]
        : (isCurrent ? 'current' : 'pending');

      const note = new VF.StaveNote({ keys: [vfNote], duration: 'q' });
      const color = NOTE_COLORS[state] || NOTE_COLORS.pending;
      note.setStyle({ fillStyle: color, strokeStyle: color });
      return note;
    });

    VF.Formatter.FormatAndDraw(ctx, stave, vfStaveNotes);
  }
}
