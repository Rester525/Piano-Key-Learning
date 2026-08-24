// ═══════════════════════════════════════════════════════════════════
// ENGINE — Core Game Logic (FSM, Practice Model, Groups, Constants)
// ═══════════════════════════════════════════════════════════════════

// ─── CONSTANTS: Single source of truth ─────────────────────────────

// Semitone name tables (index → display name, no octave)
export const SEMI_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const SEMI_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Base frequencies for C4=0 offset (A4=440 reference)
export const BASE_FREQ = 261.6255653005986; // C4

// Chord quality definitions: name, semitone intervals from root
export const CHORD_QUALITIES = {
  major:      { name:'Major',      semis:[0,4,7]     },
  minor:      { name:'Minor',      semis:[0,3,7]     },
  diminished: { name:'Diminished', semis:[0,3,6]     },
  augmented:  { name:'Augmented',  semis:[0,4,8]     },
  dom7:       { name:'Dom 7',      semis:[0,4,7,10]  },
  maj7:       { name:'Major 7',    semis:[0,4,7,11]  },
};

export const INTERVAL_NAMES = {
  1:'Minor 2nd', 2:'Major 2nd', 3:'Minor 3rd', 4:'Major 3rd',
  5:'Perfect 4th', 6:'Tritone', 7:'Perfect 5th', 8:'Minor 6th',
  9:'Major 6th', 10:'Minor 7th', 11:'Major 7th', 12:'Octave',
};

// Chromatic note name sets for each noteType
export const CHROMATIC = {
  whole:  ['C','D','E','F','G','A','B'],
  sharps: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
  flats:  ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'],
  all:    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
};

// Black-key pairs: white-key indices where a black key sits between them.
export const BLACK_PAIRS = new Set([
  [0,2].join(','),   // C→D  (C#/Db)
  [2,4].join(','),   // D→E  (D#/Eb)
  [5,7].join(','),   // F→G  (F#/Gb)
  [7,9].join(','),   // G→A  (G#/Ab)
  [9,11].join(','),  // A→B  (A#/Bb)
]);

// Black-key semitone values for each white-key pair
export const BLACK_SEMI_MAP = {
  '0,2': 1,   // C#/Db
  '2,4': 3,   // D#/Eb
  '5,7': 6,   // F#/Gb
  '7,9': 8,   // G#/Ab
  '9,11': 10, // A#/Bb
};

// Groups defined as arrays of semitone offsets.
// C4 = offset 48. F3 = 41.
export const GROUPS = [
  { id:'cde',      label:'CDE',     semis:[48,50,52] },                    // C4 D4 E4
  { id:'fgab',     label:'FGAB',    semis:[53,55,57,59] },                 // F4 G4 A4 B4
  { id:'cdefgab',  label:'CDEFGAB', semis:[48,50,52,53,55,57,59] },       // C4..B4
  { id:'fgabcde',  label:'FGABCDE', semis:[41,43,45,47,48,50,52] },       // F3..E4
];

// ─── FSM: Finite State Machine ─────────────────────────────────────
export const State = Object.freeze({
  IDLE:            'IDLE',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  ANSWER_PENDING:  'ANSWER_PENDING',
});

let fsmState = State.IDLE;
let fsmPayload = {};
const pendingTimers = [];

/** Atomically change FSM state with optional payload, killing all dangling timers. */
export function transition(newState, payload = {}) {
  while (pendingTimers.length) clearTimeout(pendingTimers.pop());
  fsmState = newState;
  fsmPayload = Object.freeze({ ...payload });
}

export function getState() { return fsmState; }
export function getPayload() { return fsmPayload; }

/** Schedule a timeout that transition() will clean up on state change. */
export function scheduleTimer(fn, ms) {
  const id = setTimeout(() => {
    const idx = pendingTimers.indexOf(id);
    if (idx !== -1) pendingTimers.splice(idx, 1);
    fn();
  }, ms);
  pendingTimers.push(id);
  return id;
}

export function clearAllTimers() {
  while (pendingTimers.length) clearTimeout(pendingTimers.pop());
}

// ─── SEMITONE CONVERSIONS ──────────────────────────────────────────

/** semitone: absolute offset from C0. Returns frequency in Hz. */
export function semitoneToFreq(semitone) {
  return BASE_FREQ * Math.pow(2, (semitone - 48) / 12); // C4 = semitone 48
}

/** semitone → display name according to noteType (e.g. 49 → 'C#' for sharps) */
export function semitoneToDisplay(semitone, ntype) {
  const names = ntype === 'flats' ? SEMI_NAMES_FLAT : SEMI_NAMES_SHARP;
  return names[((semitone % 12) + 12) % 12];
}

/** semitone → full name with octave (e.g. 49 → 'C#4') */
export function semitoneToNote(semitone, ntype) {
  const oct = Math.floor(semitone / 12);
  return semitoneToDisplay(semitone, ntype) + oct;
}

/** True if two semitones are the same pitch class, ignoring octave (C4 == C5). */
export function samePitchClass(a, b) {
  return ((a % 12) + 12) % 12 === ((b % 12) + 12) % 12;
}

// ─── GROUP / KEYBOARD DATA (semitone-based) ────────────────────────

/** Build the flat list of playable semitones for a group + noteType. */
export function getPlayableSemis(group, ntype) {
  const result = [];
  const allowedNames = CHROMATIC[ntype];
  for (let i = 0; i < group.semis.length; i++) {
    const semi = group.semis[i];
    const display = semitoneToDisplay(semi, ntype);
    if (allowedNames.includes(display)) result.push(semi);
    // Check for black key between this and next note
    if (i < group.semis.length - 1) {
      const pair = [semi % 12, group.semis[i + 1] % 12].sort((a,b)=>a-b).join(',');
      if (BLACK_PAIRS.has(pair) && ntype !== 'whole') {
        const blackSemi = semi + (BLACK_SEMI_MAP[pair] - (semi % 12));
        const blackDisplay = semitoneToDisplay(blackSemi, ntype);
        if (allowedNames.includes(blackDisplay)) result.push(blackSemi);
      }
    }
  }
  return result;
}

// ─── PRACTICE MODEL: Weighted Question Selection ────────────────────

/**
 * Tracks per-item performance for weighted random selection.
 * Key: semitone (for notes/intervals) or qualityKey string (for chords).
 * Value: { attempts: number, correct: number, lastSeen: timestamp }
 */
export const practiceModel = new Map();

export function getOrCreateRecord(key) {
  if (!practiceModel.has(key)) {
    practiceModel.set(key, { attempts: 0, correct: 0, lastSeen: 0 });
  }
  return practiceModel.get(key);
}

export function recordAttempt(key, wasCorrect) {
  const rec = getOrCreateRecord(key);
  rec.attempts++;
  if (wasCorrect) rec.correct++;
  rec.lastSeen = Date.now();
}

/**
 * Weighted random selection from an array of keys.
 * Weight = 1 / (1 + successRate * 4).
 * Mastered items (100% correct) get weight ~0.2; never-seen items get weight 1.0.
 */
export function weightedPick(keys, avoidKey) {
  if (keys.length === 0) return null;

  // Compute weights
  const weights = keys.map(key => {
    if (key === avoidKey && keys.length > 1) return 0; // avoid repeat
    const rec = practiceModel.get(key);
    if (!rec || rec.attempts === 0) return 1.0;
    const successRate = rec.correct / rec.attempts;
    return 1.0 / (1.0 + successRate * 4.0);
  });

  // Weighted random selection
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return keys[0]; // fallback

  let r = Math.random() * totalWeight;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

// ─── SHUFFLE-BAG GROUP SELECTION ───────────────────────────────────

let groupBag = [];   // shuffled pool of group indices
let groupBagIdx = 0;
let lastPickedIdx = -1; // track last picked across cycles for no-repeat

/** Return the next group, ensuring full-cycle fairness and no consecutive repeats. */
export function pickNextGroup() {
  if (groupBag.length === 0 || groupBagIdx >= groupBag.length) {
    // Build a new shuffled bag
    groupBag = [0, 1, 2, 3];
    // Fisher-Yates shuffle
    for (let i = groupBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupBag[i], groupBag[j]] = [groupBag[j], groupBag[i]];
    }
    // Ensure first item of new bag ≠ last item of previous cycle
    if (lastPickedIdx >= 0 && groupBag.length > 1 && groupBag[0] === lastPickedIdx) {
      // Swap first with any other
      const swapIdx = 1 + Math.floor(Math.random() * (groupBag.length - 1));
      [groupBag[0], groupBag[swapIdx]] = [groupBag[swapIdx], groupBag[0]];
    }
    groupBagIdx = 0;
  }
  const gIdx = groupBag[groupBagIdx++];
  lastPickedIdx = gIdx;
  return GROUPS[gIdx];
}

// ─── MEDALS ────────────────────────────────────────────────────────

export const MEDALS = [
  { at:0,  icon:'🎹', name:'Beginner' },
  { at:10, icon:'🥉', name:'Bronze'   },
  { at:20, icon:'🥈', name:'Silver'   },
  { at:30, icon:'🥇', name:'Gold'     },
  { at:40, icon:'🏆', name:'Platinum' },
];

export const getMedal = (s) => [...MEDALS].reverse().find(m => s >= m.at) || MEDALS[0];
export const nextMilestone = (s) => (MEDALS.find(m => m.at > s) || MEDALS[MEDALS.length - 1]).at;

// ─── SPEED RUN ─────────────────────────────────────────────────────

export let speedRunStartTime = null;
export let speedRunTimeLeft = 60;
let speedRunRAF = null;
let speedRunOnTick = null;
let speedRunOnEnd = null;

function speedRunTick() {
  const elapsed = (performance.now() - speedRunStartTime) / 1000;
  const remaining = Math.ceil(60 - elapsed);
  if (remaining <= 0) {
    speedRunTimeLeft = 0;
    speedRunOnTick(0);
    const end = speedRunOnEnd;
    stopSpeedRunTimer();
    end();
    return;
  }
  if (remaining !== speedRunTimeLeft) {
    speedRunTimeLeft = remaining;
    speedRunOnTick(remaining);
  }
  speedRunRAF = requestAnimationFrame(speedRunTick);
}

export function startSpeedRunTimer(onTick, onEnd) {
  stopSpeedRunTimer();
  speedRunStartTime = performance.now();
  speedRunTimeLeft = 60;
  speedRunOnTick = onTick;
  speedRunOnEnd = onEnd;
  speedRunRAF = requestAnimationFrame(speedRunTick);
}

export function stopSpeedRunTimer() {
  if (speedRunRAF) {
    cancelAnimationFrame(speedRunRAF);
    speedRunRAF = null;
  }
  speedRunStartTime = null;
  speedRunOnTick = null;
  speedRunOnEnd = null;
}

export function getSpeedRunTimeLeft() {
  return speedRunTimeLeft;
}