// ═══════════════════════════════════════════════════════════════════
// CUSTOM-SETS — Practice Set Storage & Filtering
// Pattern: tunedown-theory storage.js — localStorage CRUD with custom flag
// ═══════════════════════════════════════════════════════════════════

const SETS_KEY = 'pkl_custom_sets';

function load() {
  try { return JSON.parse(localStorage.getItem(SETS_KEY)) ?? []; }
  catch { return []; }
}

function persist(data) {
  localStorage.setItem(SETS_KEY, JSON.stringify(data));
}

/**
 * @typedef {Object} PracticeSet
 * @property {string} name
 * @property {string} mode - 'noteReading' | 'earTraining' | 'intervals' | 'chords'
 * @property {number[]} items - semitone values (notes) or quality keys (chords)
 * @property {boolean} custom - true for user-created
 */

/** Get all sets, built-in first then custom. */
export function getSets() {
  const BUILTIN = [
    { name: 'All Notes (C4–B4)', mode: 'noteReading', items: [48,50,52,53,55,57,59] },
    { name: 'All Notes (F3–E4)', mode: 'noteReading', items: [41,43,45,47,48,50,52] },
    { name: 'CDE Only',        mode: 'noteReading', items: [48,50,52] },
    { name: 'FGAB Only',       mode: 'noteReading', items: [53,55,57,59] },
    { name: 'All Modes',       mode: 'intervals',   items: [] },
    { name: 'All Qualities',   mode: 'chords',      items: ['major','minor','diminished','augmented','dom7','maj7'] },
  ];
  return [...BUILTIN, ...load()];
}

/** Save a custom set (upserts by name). */
export function saveSet(set) {
  const sets = load().filter(s => s.name !== set.name);
  persist([...sets, { ...set, custom: true }]);
}

/** Delete a custom set by name. */
export function deleteSet(name) {
  persist(load().filter(s => s.name !== name));
}

/**
 * Filter a practice pool against an active set.
 * @param {number[]} pool - full pool of playable semitones
 * @param {PracticeSet|null} activeSet
 * @returns {number[]} filtered pool (or original if no set)
 */
export function filterPool(pool, activeSet) {
  if (!activeSet || !activeSet.items || activeSet.items.length === 0) return pool;
  return pool.filter(s => activeSet.items.includes(s));
}

/**
 * Get available sets for a specific mode.
 * @param {string} mode
 * @returns {PracticeSet[]}
 */
export function getSetsForMode(mode) {
  return getSets().filter(s => s.mode === mode || s.mode === 'all');
}
