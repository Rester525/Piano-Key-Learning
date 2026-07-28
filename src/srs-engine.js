// ═══════════════════════════════════════════════════════════════════
// SRS-ENGINE — Spaced Repetition (SM-2) Algorithm
// Pattern: tunedown-theory engine.js — pure compute, no DOM
// ═══════════════════════════════════════════════════════════════════

const SRS_KEY = 'pkl_srs_data';

// ─── PERSISTENCE ───────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(SRS_KEY)) ?? {}; }
  catch { return {}; }
}

function persist(data) {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

/**
 * SM-2 item record. Keyed by item identifier (semitone string or qualityKey).
 * @typedef {Object} SRSItem
 * @property {number} n — repetition count
 * @property {number} ef — ease factor (default 2.5, min 1.3)
 * @property {number} interval — days until next review
 * @property {number} due — timestamp (ms) when item is due
 * @property {number} lastReviewed — timestamp of last review
 */

// ─── CORE SM-2 FUNCTIONS ───────────────────────────────────────────

/**
 * Grade a response and update SM-2 data.
 * @param {string} key — item identifier
 * @param {number} grade — 0 (complete blackout) to 5 (perfect recall)
 * @returns {SRSItem} updated item
 */
export function gradeItem(key, grade) {
  const data = load();
  const item = data[key] || createItem();

  if (grade >= 3) {
    // Correct response
    if (item.n === 0) {
      item.interval = 1;       // 1 day
    } else if (item.n === 1) {
      item.interval = 6;       // 6 days
    } else {
      item.interval = Math.round(item.interval * item.ef);
    }
    item.n++;
  } else {
    // Incorrect response — reset
    item.n = 0;
    item.interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  item.ef = item.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (item.ef < 1.3) item.ef = 1.3;

  item.due = Date.now() + item.interval * 24 * 60 * 60 * 1000;
  item.lastReviewed = Date.now();

  data[key] = item;
  persist(data);
  return item;
}

/** Create a fresh SM-2 item. */
function createItem() {
  return { n: 0, ef: 2.5, interval: 0, due: 0, lastReviewed: 0 };
}

// ─── ITEM SELECTION ────────────────────────────────────────────────

/**
 * Get all SM-2 items for a set of keys.
 * Missing keys get default (never-reviewed) values.
 */
export function getItems(keys) {
  const data = load();
  return keys.map(key => data[key] || createItem());
}

/**
 * Select the next item to practice using SRS priority.
 * Priority order:
 *   1. Overdue items (most overdue first)
 *   2. Due items (random among due)
 *   3. New items (never reviewed)
 *   4. Future items (soonest due first — cram mode)
 *
 * @param {string[]} keys — available item keys
 * @param {string} [avoidKey] — key to exclude (avoid immediate repeat)
 * @returns {string} selected key
 */
export function selectSRSItem(keys, avoidKey) {
  if (keys.length === 0) return null;
  const now = Date.now();
  const data = load();

  const candidates = keys
    .filter(k => k !== avoidKey || keys.length === 1)
    .map(key => ({ key, item: data[key] || createItem() }));

  if (candidates.length === 0) return keys[0];

  // Tier 1: Overdue items (due < now)
  const overdue = candidates.filter(c => c.item.due > 0 && c.item.due < now);
  if (overdue.length > 0) {
    // Most overdue first
    overdue.sort((a, b) => a.item.due - b.item.due);
    return overdue[0].key;
  }

  // Tier 2: New items (never reviewed)
  const newItems = candidates.filter(c => c.item.due === 0 && c.item.n === 0);
  if (newItems.length > 0) {
    return newItems[Math.floor(Math.random() * newItems.length)].key;
  }

  // Tier 3: Due items (due is today or past) — random
  const due = candidates.filter(c => c.item.due > 0 && c.item.due <= now + 3600000); // within 1 hour
  if (due.length > 0) {
    return due[Math.floor(Math.random() * due.length)].key;
  }

  // Tier 4: Future items — soonest first (cram mode)
  candidates.sort((a, b) => (a.item.due || Infinity) - (b.item.due || Infinity));
  return candidates[0].key;
}

/**
 * Get a summary of review load.
 * @param {string[]} keys
 * @returns {{ total: number, due: number, new: number, overdue: number }}
 */
export function getSRSLoad(keys) {
  const data = load();
  const now = Date.now();
  let due = 0, isNew = 0, overdue = 0;

  for (const key of keys) {
    const item = data[key];
    if (!item || (item.n === 0 && item.due === 0)) {
      isNew++;
    } else if (item.due < now) {
      overdue++;
    } else if (item.due <= now + 24 * 60 * 60 * 1000) {
      due++;
    }
  }

  return { total: keys.length, due, new: isNew, overdue };
}

// ─── ADMIN ─────────────────────────────────────────────────────────

/** Reset all SRS data. */
export function resetSRS() {
  persist({});
}

/** Export SRS data as JSON. */
export function exportSRS() {
  return JSON.stringify(load());
}

/** Import SRS data from JSON. */
export function importSRS(json) {
  try {
    const data = JSON.parse(json);
    if (typeof data === 'object' && data !== null) {
      persist(data);
      return true;
    }
  } catch {}
  return false;
}
