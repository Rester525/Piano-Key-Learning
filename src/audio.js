// ═══════════════════════════════════════════════════════════════════
// AUDIO — Web Audio API with Pre-Rendered Waveform Buffers
// Uses AudioBufferSourceNode + playbackRate instead of OscillatorNode
// to eliminate per-note allocation overhead and GC pressure.
// ═══════════════════════════════════════════════════════════════════

import { semitoneToFreq, CHORD_QUALITIES } from './engine.js';

// AudioContext — lazy init to avoid autoplay policy issues
let AC = null;
let currentInstrument = 'sine';

function getAudioContext() {
  // Recreate if context was closed (tab background / system sleep)
  if (!AC || AC.state === 'closed') {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    AC = new Ctor();
    // Invalidate waveform cache so it rebuilds against the new context
    waveformBuffers = null;
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

// ─── PRE-RENDERED WAVEFORM BUFFERS ──────────────────────────────────

let waveformBuffers = null; // { sine: AudioBuffer, triangle: AudioBuffer, sawtooth: AudioBuffer }
const VOICE_BUFFER_DURATION = 1; // 1-second buffers — any frequency via playbackRate

function ensureWaveformBuffers() {
  if (waveformBuffers) return waveformBuffers;
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const len = VOICE_BUFFER_DURATION * sampleRate;

  const makeBuffer = (phaseFn) => {
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = phaseFn(i / len);
    }
    return buf;
  };

  waveformBuffers = {
    sine:     makeBuffer((p) => Math.sin(2 * Math.PI * p)),
    triangle: makeBuffer((p) => 2 * Math.abs(2 * (p - Math.floor(p + 0.5))) - 1),
    sawtooth: makeBuffer((p) => 2 * (p - Math.floor(p + 0.5))),
    piano:    makeBuffer((p) => {
      // Grand piano approximated via harmonic series — normalized to prevent clipping
      const f = 2 * Math.PI * p;
      const total = 1.00 + 0.60 + 0.35 + 0.18 + 0.08 + 0.04;
      return (1.00 * Math.sin(f)           // fundamental
           + 0.60 * Math.sin(2 * f)       // octave
           + 0.35 * Math.sin(3 * f)       // octave + fifth
           + 0.18 * Math.sin(4 * f)       // 2nd octave
           + 0.08 * Math.sin(5 * f)       // major third above
           + 0.04 * Math.sin(6 * f))      // fifth above
           / total;
    }),
  };
  return waveformBuffers;
}

// ─── SELF-CLEANING VOICE FACTORY ──────────────────────────────────

/**
 * Create a scheduled voice that self-disconnects on completion.
 * Uses AudioBufferSourceNode with pre-rendered waveform buffers —
 * no per-note OscillatorNode allocation.
 *
 * config:
 *   freq: number          — oscillator frequency (Hz)
 *   type: string          — 'sine' | 'triangle' | 'sawtooth' (mapped to buffers)
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
  ensureWaveformBuffers();

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

  // Map waveform type to pre-rendered buffer
  const bufType = (type === 'triangle')                ? 'triangle'
                : (type === 'sawtooth' || type === 'guitar') ? 'sawtooth'
                : (type === 'piano')                   ? 'piano'
                : 'sine';

  const src = ctx.createBufferSource();
  src.buffer = waveformBuffers[bufType];
  src.loop = true;
  src.playbackRate.value = freq; // pitch = frequency

  const gain = ctx.createGain();

  // Enforce minimum 5ms attack ramp to prevent audible clicks
  const safeAttack = Math.max(attack, 0.005);
  const decayStart = startTime + safeAttack;
  const sustainStart = startTime + safeAttack + decay;

  // Guard: release must not start before sustain completes
  const effectiveRelease = Math.min(release, Math.max(duration - safeAttack - decay - 0.001, 0.005));
  const releaseStart = startTime + duration - effectiveRelease;
  const endTime = startTime + duration + 0.1;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, decayStart);
  gain.gain.exponentialRampToValueAtTime(peak * sustain, sustainStart);
  gain.gain.setValueAtTime(peak * sustain, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(gain);
  gain.connect(destination);

  src.start(startTime);
  src.stop(endTime);

  // Self-cleanup: when source stops, disconnect the whole chain
  src.onended = () => {
    gain.disconnect();
    src.disconnect();
  };

  return { src, gain };
}

// ─── INSTRUMENT WAVEFORMS ──────────────────────────────────────────

function getWaveformForInstrument() {
  switch (currentInstrument) {
    case 'piano': return 'piano';
    case 'guitar': return 'sawtooth';
    case 'sine':
    default: return 'sine';
  }
}

// ─── AUDIO-THREAD SCHEDULING ───────────────────────────────────────

/**
 * Schedule a main-thread callback to fire at ctx.currentTime + delaySeconds.
 * Uses a silent AudioBufferSourceNode whose onended fires on the main thread.
 */
export function scheduleAtAudioTime(ctx, delaySeconds, callback) {
  ensureWaveformBuffers();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0; // silent
  src.buffer = waveformBuffers.sine; // arbitrary — won't be heard
  src.connect(gain);
  gain.connect(ctx.destination);
  src.onended = () => {
    gain.disconnect();
    src.disconnect();
    callback();
  };
  const now = ctx.currentTime;
  src.start(now + delaySeconds);
  src.stop(now + delaySeconds + 0.01);
}

// ─── HIGH-LEVEL AUDIO FUNCTIONS ────────────────────────────────────

/** Simple ding — the immediate feedback on key press. */
export function playDing(semitone, vol = 0.5) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const isPiano = getWaveformForInstrument() === 'piano';
  createVoice({
    freq: semitoneToFreq(semitone),
    type: getWaveformForInstrument(),
    startTime: t,
    duration: isPiano ? 2.5 : 1.5,
    attack: 0.001,
    peak: isPiano ? vol * 1.1 : vol,
    decay: isPiano ? 0.50 : 0.28,
    sustain: isPiano ? 0.15 : 0.4,
    release: isPiano ? 1.9 : 1.2,
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
export function playChord(rootSemitone, qualityKey) {
  const ctx = getAudioContext();
  const q = CHORD_QUALITIES[qualityKey];
  if (!q) return;
  // ensureAudioContext() is called by mode handlers before playback;
  // ctx.resume() here is fire-and-forget for direct callers
  if (ctx.state === 'suspended') ctx.resume();
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
