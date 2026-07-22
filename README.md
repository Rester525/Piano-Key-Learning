# Piano Key Learning

An interactive web app for learning piano keys, intervals, chords, and ear training — built with vanilla JavaScript, ES modules, and the Web Audio API. Deployed on Vercel.

## Live Demo

**[https://piano-key-learning.vercel.app](https://piano-key-learning.vercel.app)**

## Features

| Mode | Description |
|------|-------------|
| **Note Reading** | See a note name (e.g., "C#4"), tap the correct key on the on-screen piano |
| **Ear Training** | Hear a note, then tap the key you heard |
| **Intervals** | Hear two notes (root + interval), identify the target note |
| **Chords** | Hear a chord, select its quality (Major, Minor, Dim, Aug, Dom7, Maj7) |
| **Speed Run** | 60-second challenge — answer as many as possible |

### Core Capabilities
- **Weighted practice algorithm** — notes you miss appear more often; mastered notes still appear at reduced frequency
- **Shuffle-bag group rotation** — all 4 keyboard groups (CDE, FGAB, CDEFGAB, FGABCDE) appear once per cycle, no consecutive repeats
- **FSM state machine** — explicit `IDLE` / `QUESTION_ACTIVE` / `ANSWER_PENDING` states with automatic timer cleanup (no stale callbacks)
- **Self-cleaning Web Audio voices** — every oscillator/gain chain disconnects on `onended`; minimum 5ms attack ramps prevent clicks
- **Multiple instrument timbres** — Sine, Piano (triangle), Guitar (sawtooth)
- **Dark/Light theme** — persisted to `localStorage`
- **PWA ready** — `manifest.json`, SVG icons, `apple-touch-icon`, works offline after first load
- **Mobile-first** — touch events with `preventDefault()` for iOS Safari, responsive layout, sidebar drawer on mobile

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Vanilla ES2022 (ES modules) |
| Audio | Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) |
| Styling | CSS Custom Properties (design tokens), no build step |
| State | Finite State Machine + weighted practice Map |
| Deploy | Vercel (static) |
| PWA | `manifest.json`, Service Worker ready |

## Project Structure

```
PianoKeyLearning/
├── index.html           # Entry point (loads src/app.js as module)
├── style.css            # All styles (design tokens + components)
├── manifest.json        # PWA manifest
├── vercel.json          # Vercel config (headers, rewrites, caching)
├── public/
│   └── assets/img/
│       ├── icon-192.svg # PWA icon
│       └── icon-512.svg
└── src/
    ├── app.js           # Main entry — wiring, event listeners, mode switching
    ├── engine.js        # Constants, FSM, practice model, groups, medals, speed run timer
    ├── audio.js         # Web Audio factory, instrument voices, playback helpers
    ├── keyboard.js      # Keyboard DOM builder, highlight/press helpers
    ├── ui.js            # DOM updates: score, feedback, sidebar, theme, timers
    └── modes/
        └── modes.js     # All 5 mode implementations (question gen + answer handling)
```

## Local Development

```bash
# Clone
git clone https://github.com/yourusername/Piano-Key-Learning.git
cd Piano-Key-Learning

# Serve (no build step needed)
python3 -m http.server 8000
# or
npx vercel dev

# Open http://localhost:8000
```

## Deployment (Vercel)

```bash
# One-time setup
npm i -g vercel
vercel login

# Deploy to production
vercel --prod
```

The `vercel.json` config handles:
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`)
- Long-term caching for `/assets/*` (`Cache-Control: immutable`)
- SPA fallback rewrite (`/*` → `/index.html`)

## Architecture Highlights

### Integer Semitone Model
All internal state uses **semitone offsets from C0** (C4 = 48). Display strings are derived at the UI boundary via `semitoneToDisplay(semitone, noteType)`. Eliminates string parsing/comparison bugs.

### Finite State Machine
```js
const State = { IDLE, QUESTION_ACTIVE, ANSWER_PENDING };
function transition(newState) {
  while (pendingTimers.length) clearTimeout(pendingTimers.pop());
  fsmState = newState;
}
```
Only `transition()` may change state. All timers registered via `scheduleTimer(fn, ms)` are tracked and cancelled on state change.

### Weighted Practice Selection
```js
weight = 1 / (1 + successRate * 4)
// never-seen: 1.0, 100% correct: 0.2
```
Items are picked via weighted random; the previous item is excluded to avoid immediate repeats.

### Shuffle-Bag Group Rotation
```
bag = shuffle([0,1,2,3])  // indices into GROUPS
pick bag[0], bag[1], bag[2], bag[3]  // each group once
refill bag, ensure first ≠ last of previous cycle
```

### Self-Cleaning Audio Voices
```js
function createVoice({freq, startTime, duration, attack, peak, ...}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  // envelope with minimum 5ms attack
  osc.onended = () => { gain.disconnect(); osc.disconnect(); };
  osc.start(startTime); osc.stop(startTime + duration + 0.1);
  return {osc, gain};
}
```
No manual cleanup needed — GC collects disconnected nodes.

## Keyboard Layout

Groups map to physical piano ranges:

| Group ID | Label | Semitones (C4=48) | Keys |
|----------|-------|-------------------|------|
| `cde` | CDE | 48, 50, 52 | 3 white |
| `fgab` | FGAB | 53, 55, 57, 59 | 4 white |
| `cdefgab` | CDEFGAB | 48–59 | 7 white + 5 black |
| `fgabcde` | FGABCDE | 41–52 | 7 white + 5 black |

Black keys are positioned absolutely (`left: (i+1)*52 - 16px`) and only clickable when `noteType !== 'whole'`.

## Scoring & Medals

| Streak | Medal |
|--------|-------|
| 0–9 | 🎹 Beginner |
| 10–19 | 🥉 Bronze |
| 20–29 | 🥈 Silver |
| 30–39 | 🥇 Gold |
| 40+ | 🏆 Platinum |

Streak resets to 0 on any wrong answer. Score increments on correct answers only.

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Chrome Android |
|---------|--------|---------|--------|------|------------|----------------|
| Web Audio | ✅ | ✅ | ✅* | ✅ | ✅* | ✅ |
| ES Modules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Custom Props | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Touch Events | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |

\* Safari/iOS requires user gesture before `AudioContext.resume()` — handled via one-time click/touch listener on `document`.

## Customization

### Add a New Mode
1. Export `startMyMode(context)` and `handleMyModeAnswer(context, ...)` from `src/modes/modes.js`
2. Import in `src/app.js`
3. Add case in `switchMode()` and `handleKeyAnswer()` / `handlePlayAgain()`
4. Add radio button in `index.html` sidebar

### Add a Chord Quality
```js
// engine.js
CHORD_QUALITIES: {
  // ...
  myChord: { name: 'My Chord', semis: [0, 3, 7, 10] }
}
```
Then add a `<button class="chord-btn" data-quality="myChord">` in `index.html`.

### Change Keyboard Range
Edit `GROUPS` in `engine.js` — semitone values are absolute (C0=0, C4=48).

## License

MIT — free to use, modify, distribute.

---

## Roadmap / Future Enhancements

This section captures ideas discussed during development and their implementation plans.

### 🎯 Phase 1: Core Polish (Next 1–2 weeks)
| Idea | Description | Plan |
|------|-------------|------|
| **MIDI Input Support** | Connect physical MIDI keyboard for answer input | Add `navigator.requestMIDIAccess()` handler in `app.js`; map MIDI note numbers to semitone values; fallback gracefully when unavailable (Safari, mobile). |
| **Service Worker / Offline** | Full offline support after first visit | Generate `sw.js` with Workbox or manual Cache API; precache `index.html`, `style.css`, `src/**`, `manifest.json`, icons. Register in `app.js` after load. |
| **Statistics Dashboard** | Session history, accuracy per note, streak trends | Add `stats.js` module; store sessions in `localStorage` (or IndexedDB for larger data); render charts with simple Canvas or import Chart.js via CDN. |
| **Custom Practice Sets** | User-defined note/interval/chord subsets | New sidebar section "Custom Set" with multi-select; persist to `localStorage`; filter `getPlayableSemis()` and chord/interval pools. |

### 🎯 Phase 2: Learning Features (1–2 months)
| Idea | Description | Plan |
|------|-------------|------|
| **Spaced Repetition (SM-2)** | Replace weighted random with proper SRS algorithm | Implement SM-2 in `engine.js` — track `easeFactor`, `interval`, `repetitions` per item; schedule reviews; show "due" count in UI. |
| **Lesson / Curriculum Mode** | Guided progression: CDE → FGAB → CDEFGAB → accidentals → intervals → chords | Add `curriculum.js` with ordered lessons; each lesson unlocks next; store progress in `localStorage`; show lesson map UI. |
| **Sheet Music Display** | Show staff notation for current question | Integrate VexFlow (ESM from CDN) to render a measure with the target note/chord; toggle with "Show Notation" checkbox. |
| **Microphone Pitch Detection** | Sing/play a note, app detects pitch for ear training | Use Web Audio `AnalyserNode` + autocorrelation or `aubio.wasm`; map detected frequency to nearest semitone; use as answer input. |
| **Multiplayer / Challenge Links** | Share a seeded session URL for competitive practice | Add `?seed=X&mode=Y` URL params; deterministic RNG via `seedrandom`; show leaderboard for that seed. |

### 🎯 Phase 3: Platform & Polish (Ongoing)
| Idea | Description | Plan |
|------|-------------|------|
| **Native Audio Samples** | Replace synthesized tones with real piano/guitar samples | Add `public/assets/audio/` with `.ogg`/`.mp3` per note (or use Web Audio `AudioBufferSourceNode` with decoded samples); toggle in settings. |
| **iOS PWA Install Prompt** | Custom "Add to Home Screen" banner | Listen for `beforeinstallprompt`; show custom banner after 2nd visit; track dismissals. |
| **Accessibility Audit** | Full WCAG 2.1 AA compliance | Semantic HTML review; ARIA labels for keyboard; color contrast check; keyboard-only navigation; screen reader testing. |
| **Internationalization (i18n)** | Multiple languages for UI text | Extract all strings to `locales/en.json`; add language selector in sidebar; dynamic import locale files. |
| **Chromatic Tuner Mode** | Real-time pitch meter for tuning instrument | New mode: listen via microphone, show cents deviation from target note; visual needle + text. |

### 🎯 Phase 4: Advanced / Experimental
| Idea | Description | Plan |
|------|-------------|------|
| **Hand Position / Fingering Hints** | Show suggested finger numbers on keys | Add fingering data to `GROUPS`; render small numbers on key corners; highlight suggested finger for current question. |
| **Chord Progression Practice** | Play common progressions (ii-V-I, I-vi-IV-V, etc.) | Extend `CHORD_QUALITIES` with progression definitions; new mode plays progression, user identifies each chord or plays along. |
| **Harmonic Analysis** | Identify chord function in key (I, IV, V, etc.) | Add key context to chord mode; ask "What is the function of this chord in C major?" |
| **Export / Sync Progress** | Backup/restore practice data to JSON or cloud | Add "Export Data" / "Import Data" buttons; optionally sync to Firebase/GitHub Gist via PAT. |
| **Teacher Dashboard** | Instructor view of student progress | Separate admin mode; read-only view of shared practice data via invite links; requires backend or shared storage. |

### 📋 Implementation Notes
- **No build step** — all additions must work as static ES modules on Vercel
- **Backward compatible** — new features behind feature flags or progressive enhancement
- **Performance first** — lazy-load heavy libs (VexFlow, Chart.js, aubio) only when mode activated
- **Mobile parity** — every desktop feature must work on iOS Safari / Chrome Android

---

Built with ☕ and 🎹 for piano learners everywhere.