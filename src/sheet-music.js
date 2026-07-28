// ═══════════════════════════════════════════════════════════════════
// SHEET-MUSIC — VexFlow Staff Notation Renderer
// Lazy-loads VexFlow 5.x from CDN. Renders notes, intervals, chords.
// ═══════════════════════════════════════════════════════════════════

import { semitoneToDisplay } from './engine.js';

const VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@5.1.0/build/cjs/vexflow.js';

/** @type {object|null} Cached VexFlow module */
let VF = null;

/** Lazily load VexFlow. Returns the module (cached after first call). */
async function loadVexFlow() {
  if (VF) return VF;
  VF = await import(VEXFLOW_CDN);
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
  const octave = Math.floor(semitone / 12) - 1; // VexFlow uses C4 = c/4, C0=0 → c/0? Actually MIDI C4=60, app C4=48, so octave = Math.floor(48/12)-1 = 3. VF expects c/4 for middle C.
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

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vfNote = semitoneToVF(semitone, noteType);
  if (!vfNote) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
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

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rootVF = semitoneToVF(rootSemitone, noteType);
  const targetVF = semitoneToVF(targetSemitone, noteType);
  if (!rootVF || !targetVF) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
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

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vfNotes = semitones.map(s => semitoneToVF(s, noteType)).filter(Boolean);
  if (vfNotes.length === 0) return;

  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  renderer.resize(400, 140);
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
