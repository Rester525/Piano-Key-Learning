// ═══════════════════════════════════════════════════════════════════
// PITCH DETECTOR — Microphone → absolute semitone (C4 = 48).
// Uses getUserMedia + AnalyserNode + normalized autocorrelation.
// Emits a note callback when a stable pitch is detected.
// ═══════════════════════════════════════════════════════════════════

let _audioCtx = null;
let _stream = null;
let _analyser = null;
let _rafId = null;
let _onNote = null;
let _onLevel = null;

// Detection state
let _lastSemi = null;      // last reported semitone
let _stableCount = 0;      // consecutive frames matching the candidate
let _silentFrames = 0;

const STABLE_FRAMES = 3;   // frames a pitch must hold before reporting
const SILENT_FRAMES = 8;   // frames of silence before allowing a repeat
const MIN_FREQ = 55;       // A1
const MAX_FREQ = 1600;     // ~G6

/** Convert frequency (Hz) to nearest absolute semitone (C4 = 48). */
export function freqToSemitone(freq) {
  if (!freq || freq <= 0) return null;
  // C4 = 261.63 Hz = semitone 48
  return Math.round(48 + 12 * Math.log2(freq / 261.6255653005986));
}

/**
 * Normalized autocorrelation pitch detection.
 * Returns fundamental frequency in Hz, or -1 if no clear pitch.
 */
function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // silence

  // Trim leading/trailing near-zero samples
  let r1 = 0, r2 = SIZE - 1;
  for (let i = 0; i < SIZE; i++) { if (Math.abs(buf[i]) < 0.01) { r1 = i; break; } }
  for (let i = SIZE - 1; i > r1; i--) { if (Math.abs(buf[i]) < 0.01) { r2 = i; break; } }

  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.floor(sampleRate / MIN_FREQ);
  if (maxLag >= SIZE - 1) return -1;

  let bestLag = -1, bestCorr = -1;
  const correlations = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const end = r2 - lag;
    for (let i = r1; i < end; i++) sum += buf[i] * buf[i + lag];
    correlations[lag] = sum;
    if (sum > bestCorr) { bestCorr = sum; bestLag = lag; }
  }

  if (bestLag === -1 || bestCorr <= 0) return -1;

  // Parabolic interpolation for sub-sample precision
  const l0 = correlations[bestLag - 1] || 0;
  const l1 = correlations[bestLag];
  const l2 = correlations[bestLag + 1] || 0;
  const denom = l0 - 2 * l1 + l2;
  const shift = denom !== 0 ? 0.5 * (l0 - l2) / denom : 0;
  const refinedLag = bestLag + shift;

  return sampleRate / refinedLag;
}

/**
 * Start listening on the microphone.
 * @param {(semitone:number|null)=>void} onNote — called with detected semitone
 * @param {(level:number)=>void} [onLevel] — optional RMS level 0..1
 * @returns {Promise<boolean>} true on success
 */
export async function startPitchDetection(onNote, onLevel) {
  if (_audioCtx) return true; // already running

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    _stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch {
    return false;
  }

  const Ctor = window.AudioContext || window.webkitAudioContext;
  _audioCtx = new Ctor();
  await _audioCtx.resume().catch(() => {});

  const source = _audioCtx.createMediaStreamSource(_stream);
  _analyser = _audioCtx.createAnalyser();
  _analyser.fftSize = 4096;
  _analyser.smoothingTimeConstant = 0;
  source.connect(_analyser);

  _onNote = onNote;
  _onLevel = onLevel;
  _lastSemi = null;
  _stableCount = 0;
  _silentFrames = 0;

  const buf = new Float32Array(_analyser.fftSize);

  const tick = () => {
    _analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, _audioCtx.sampleRate);

    if (freq > 0) {
      const semi = freqToSemitone(freq);
      _silentFrames = 0;

      // RMS for level meter
      if (_onLevel) {
        let rms = 0;
        for (let i = 0; i < buf.length; i += 8) rms += buf[i] * buf[i];
        _onLevel(Math.min(1, Math.sqrt(rms / (buf.length / 8)) * 4));
      }

      if (semi !== null) {
        if (semi === _lastSemi) {
          _stableCount++;
        } else {
          _lastSemi = semi;
          _stableCount = 1;
        }
        if (_stableCount === STABLE_FRAMES) {
          _onNote && _onNote(semi);
        }
      }
    } else {
      // Silence: allow the same note to fire again after a gap
      _silentFrames++;
      if (_silentFrames > SILENT_FRAMES) {
        _lastSemi = null;
        _stableCount = 0;
      }
      if (_onLevel) _onLevel(0);
    }

    _rafId = requestAnimationFrame(tick);
  };

  _rafId = requestAnimationFrame(tick);
  return true;
}

/** Stop listening and release the microphone. */
export function stopPitchDetection() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
  if (_audioCtx) { _audioCtx.close().catch(() => {}); _audioCtx = null; }
  _analyser = null;
  _onNote = null;
  _onLevel = null;
  _lastSemi = null;
  _stableCount = 0;
  _silentFrames = 0;
}

/** Whether pitch detection is currently active. */
export function isPitchDetecting() {
  return _audioCtx !== null;
}
