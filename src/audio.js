// ═══════════════════════════════════════════════════════════════════
// AUDIO — Web Audio API with Self-Cleaning Voices
// ═══════════════════════════════════════════════════════════════════

import { semitoneToFreq } from './engine.js';

// AudioContext — lazy init to avoid autoplay policy issues
let AC = null;
let currentInstrument = 'sine';

function getAudioContext() {
  if (!AC) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    AC = new Ctor();
    // Resume on first interaction (required by Safari/iOS)
    const resume = () => {
      if (AC.state === 'suspended') AC.resume();
      document.removeEventListener('click', resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click', resume, { once: true });
    document.addEventListener('touchstart', resume, { once: true });
  }
  return AC;
}

export function setInstrument(instrument) {
  currentInstrument = instrument;
}

export function getInstrument() {
  return currentInstrument;
}

// ─── SELF-CLEANING VOICE FACTORY ──────────────────────────────────

/**
 * Create a scheduled voice that self-disconnects on completion.
 * Returns an object you can discard — GC collects nodes after onended.
 *
 * config:
 *   freq: number          — oscillator frequency (Hz)
 *   type: OscillatorType  — waveform (default 'sine')
 *   startTime: number     — AudioContext.currentTime + offset
 *   duration: number      — total lifetime in seconds
 *   attack: number        — attack ramp in seconds (default 0.005, min 0.005)
 *   peak: number          — peak gain (0–1, default 0.5)
 *   decay: number         — decay start time relative to startTime
 *   sustain: number       — sustain level after decay
 *   release: number       — release ramp duration at end
 *   destination: AudioNode — where to connect (default AC.destination)
 */
function createVoice(config) {
  const ctx = getAudioContext();
  const {
    freq,
    type = 'sine',
    startTime,
    duration,
    attack = 0.005,
    peak = 0.5,
    decay = 0.08,
    sustain = 0.3,
    release = 0.3,
    destination = ctx.destination,
  } = config;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  // Enforce minimum 5ms attack ramp to prevent audible clicks
  const safeAttack = Math.max(attack, 0.005);
  const decayStart = startTime + safeAttack;
  const sustainStart = startTime + safeAttack + decay;
  const releaseStart = startTime + duration - release;
  const endTime = startTime + duration + 0.1;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, decayStart);
  gain.gain.exponentialRampToValueAtTime(peak * sustain, sustainStart);
  gain.gain.setValueAtTime(peak * sustain, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(endTime);

  // Self-cleanup: when oscillator stops, disconnect the whole chain
  osc.onended = () => {
    gain.disconnect();
    osc.disconnect();
  };

  return { osc, gain };
}

// ─── INSTRUMENT WAVEFORMS ──────────────────────────────────────────

function getWaveformForInstrument() {
  switch (currentInstrument) {
    case 'piano': return 'triangle';  // softer, more piano-like
    case 'guitar': return 'sawtooth'; // richer harmonics
    case 'sine':
    default: return 'sine';
  }
}

// ─── HIGH-LEVEL AUDIO FUNCTIONS ────────────────────────────────────

/** Simple sine ding — the immediate feedback on key press. */
export function playDing(semitone, vol = 0.5) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  createVoice({
    freq: semitoneToFreq(semitone),
    type: getWaveformForInstrument(),
    startTime: t,
    duration: 1.5,
    attack: 0.02,
    peak: vol,
    decay: 0.28,
    sustain: 0.4,
    release: 1.2,
  });
}

/** Harp-like pluck: composite sine partials with fast decay. */
function harpPluck(freq, startT, vol) {
  const partials = [[1, 1.0], [2, 0.35], [3, 0.15], [4, 0.07]];
  partials.forEach(([n, amp]) => {
    createVoice({
      freq: freq * n,
      startTime: startT,
      duration: 0.55,
      attack: 0.005,
      peak: amp * vol,
      decay: 0.08,
      sustain: 0.3,
      release: 0.47,
    });
  });
}

export function playMajorEnsemble(semitone) {
  const freq = semitoneToFreq(semitone);
  const t = getAudioContext().currentTime;
  [0, 2, 4, 5, 7, 9, 11, 12].forEach((semi, i) =>
    harpPluck(freq * Math.pow(2, semi / 12), t + i * (0.55 / 8), 0.0715)
  );
}

export function playMinorEnsemble(semitone) {
  const freq = semitoneToFreq(semitone) || 880;
  const t = getAudioContext().currentTime;
  [0, -3, -6, -9, -12].forEach((semi, i) =>
    harpPluck(freq * Math.pow(2, semi / 12), t + i * 0.25, 0.06)
  );
}

export function playPerfectCadence() {
  const t = getAudioContext().currentTime;
  [1200, 1600, 2000].forEach((freq, i) => {
    createVoice({
      freq,
      type: 'triangle',
      startTime: t + i * 0.08,
      duration: 0.4,
      attack: 0.01,
      peak: 0.12,
      decay: 0.02,
      sustain: 1.0,
      release: 0.38,
    });
  });
}

export function playDiminishedResolution() {
  const t = getAudioContext().currentTime;
  // Fdim7
  harpPluck(174.61, t, 0.07);
  harpPluck(207.65, t + 0.10, 0.07);
  harpPluck(246.94, t + 0.20, 0.07);
  harpPluck(293.66, t + 0.30, 0.07);
  // C major resolution
  harpPluck(261.63, t + 0.52, 0.08);
  harpPluck(329.63, t + 0.64, 0.08);
  harpPluck(392.00, t + 0.76, 0.08);
}

/** Play root then interval note with 700ms gap */
export function intervalsPlayAudio(rootSemitone, targetSemitone, scheduleTimer) {
  playDing(rootSemitone);
  scheduleTimer(() => playDing(targetSemitone), 700);
}

/** Play all chord tones with 20ms stagger — each voice self-cleans */
export async function playChord(rootSemitone, qualityKey) {
  const { CHORD_QUALITIES } = await import('./engine.js');
  const ctx = getAudioContext();
  const q = CHORD_QUALITIES[qualityKey];
  if (!q) return;
  if (ctx.state === 'suspended') await ctx.resume();
  const t = ctx.currentTime;
  const vol = 0.35 / q.semis.length;
  q.semis.forEach((semi, i) => {
    createVoice({
      freq: semitoneToFreq(rootSemitone + semi),
      type: getWaveformForInstrument(),
      startTime: t + i * 0.020,
      duration: 2.0,
      attack: 0.01,
      peak: vol,
      decay: 0.11,
      sustain: 0.4,
      release: 1.88,
    });
  });
}

/** Resume AudioContext if suspended */
export async function ensureAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}