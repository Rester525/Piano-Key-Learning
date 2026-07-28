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

### Platform Features
- **Statistics Dashboard** — session history, accuracy per mode and per note, streak trends, all persisted to localStorage
- **Custom Practice Sets** — create note/chord subsets via modal editor, filter practice pools to focus on weak areas
- **MIDI Input** — plug in a physical MIDI keyboard and use it as answer input
- **Keyboard Shortcuts** — Space/Enter for replay, 1–6 for chord qualities, T for theme toggle
- **Open WebUI Design** — clean dark theme with blue accent, matching light theme, glassmorphism effects

### Core Capabilities
- **Weighted practice algorithm** — notes you miss appear more often; mastered notes still appear at reduced frequency
- **Spaced Repetition (SM-2)** — toggle between weighted random and SRS algorithm with ease factor, intervals, and overdue priority
- **Shuffle-bag group rotation** — all 4 keyboard groups (CDE, FGAB, CDEFGAB, FGABCDE) appear once per cycle, no consecutive repeats
- **FSM state machine with payloads** — explicit `IDLE` / `QUESTION_ACTIVE` / `ANSWER_PENDING` states; question data frozen in immutable payload on each transition; automatic timer cleanup
- **Self-cleaning Web Audio voices** — pre-rendered AudioBufferSourceNode waveforms eliminate per-note OscillatorNode allocation; minimum 5ms attack ramps prevent clicks
- **Multiple instrument timbres** — Sine, Piano (6-harmonic grand piano), Guitar (sawtooth)
- **Dark/Light theme** — Open WebUI-inspired design system, persisted to `localStorage`
- **PWA ready** — `manifest.json`, SVG icons, `apple-touch-icon`
- **Mobile-first** — touch events with `preventDefault()` for iOS Safari, responsive layout, sidebar drawer on mobile

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Vanilla ES2022 (ES modules) |
| Audio | Web Audio API (`AudioBufferSourceNode`, `GainNode`, waveform buffers) |
| Styling | CSS Custom Properties (Open WebUI design tokens), no build step |
| State | Finite State Machine with frozen payloads + weighted practice Map |
| Persistence | localStorage (stats sessions, custom sets, theme, instrument) |
| Deploy | Vercel (static) |
| PWA | `manifest.json`, Service Worker ready |

## Project Structure

```
PianoKeyLearning/
├── index.html              # Entry point (loads src/app.js as module)
├── style.css               # Open WebUI design system (dark + light, ~700 lines)
├── manifest.json           # PWA manifest
├── vercel.json             # Vercel config (headers, rewrites, caching)
├── public/
│   └── assets/img/
│       ├── icon-192.svg    # PWA icon
│       └── icon-512.svg
└── src/
    ├── app.js              # Main entry — wiring, event listeners, mode switching, MIDI
    ├── engine.js           # Constants, FSM + payloads, practice model, groups, medals, speed run
    ├── audio.js            # Pre-rendered waveform buffers, voice factory, playback helpers
    ├── keyboard.js         # Keyboard DOM builder, highlight/press helpers
    ├── ui.js               # DOM updates: score, feedback, sidebar, theme, stats, custom sets
    ├── stats-engine.js     # Session recording, accuracy computation, localStorage CRUD
    ├── stats-ui.js         # Statistics dashboard rendering (zero innerHTML, DOM-only)
    ├── custom-sets.js      # Practice set storage, pool filtering, built-in + user sets
    └── modes/
        └── modes.js        # All 5 mode implementations (question gen + answer handling)
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

## Design System

The app uses an Open WebUI-inspired design system with CSS custom properties:

| Token | Dark | Light |
|-------|------|-------|
| Background | `#0b0f19` | `#f8fafc` |
| Surface | `#151b28` | `#ffffff` |
| Accent | `#4f8ef7` | `#2563eb` |
| Text | `#e2e8f0` | `#0f172a` |
| Border | `#1f2937` | `#e2e8f0` |

Theme toggles via `data-theme` attribute on `<html>`, persisted to `localStorage`.

## Architecture Highlights

### FSM with Immutable Payloads
```js
const State = { IDLE, QUESTION_ACTIVE, ANSWER_PENDING };

function transition(newState, payload = {}) {
  while (pendingTimers.length) clearTimeout(pendingTimers.pop());
  fsmState = newState;
  fsmPayload = Object.freeze({ ...payload });  // immutable
}

// Modes pass question data on transition:
transition(State.QUESTION_ACTIVE, { semitone: 48, group, pool });

// Answer handlers read from payload — no global mutation:
const { semitone: correctAnswer } = getPayload();
const correct = chosenSemitone === correctAnswer;
```
Only `transition()` may change state. Payload is frozen to prevent accidental mutation. All timers are tracked and cancelled on state change.

### Statistics Engine
```js
// Sessions recorded per-mode, questions tracked individually
session = startSession('noteReading');
recordQuestion(session, { correctAnswer: '48', chosenAnswer: '48', wasCorrect: true });
endSession(session);

// Compute functions are pure — no localStorage dependency:
getOverallAccuracy(sessions)     // → 0.85
getAccuracyByMode(sessions)      // → { noteReading: 0.85, chords: 0.72 }
getAccuracyByKey(sessions)       // → { '48': 1.0, 'major': 0.75 }
getBestStreak(sessions)          // → 12
```

### Custom Practice Sets
```js
// Built-in sets:
{ name: 'CDE Only', mode: 'noteReading', items: [48, 50, 52] }

// User creates custom sets via modal → localStorage
// Pool filtered before question selection:
pool = filterPool(fullPool, activeSet);  // only items in set
```

### Integer Semitone Model
All internal state uses **semitone offsets from C0** (C4 = 48). Display strings are derived at the UI boundary via `semitoneToDisplay(semitone, noteType)`. Eliminates string parsing/comparison bugs.

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

### Pre-Rendered Audio Waveforms
```js
// Waveforms rendered once into AudioBuffers:
waveformBuffers = { sine, triangle, sawtooth }

// Notes use AudioBufferSourceNode with playbackRate:
src.buffer = waveformBuffers[bufType];
src.playbackRate.value = freq;  // frequency via rate
// No per-note OscillatorNode allocation — lighter GC
```

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
| MIDI Input | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
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

### ✅ Completed

| Feature | Status |
|---------|--------|
| MIDI Input Support | ✅ Done |
| Statistics Dashboard | ✅ Done — localStorage sessions, accuracy by mode/note, streak trends |
| Custom Practice Sets | ✅ Done — modal editor, pool filtering, built-in + user sets |
| FSM Payload Transitions | ✅ Done — immutable payloads on state change |
| Pre-rendered Audio Waveforms | ✅ Done — AudioBufferSourceNode pool |
| Open WebUI Design System | ✅ Done — dark + light theme with blue accent |
| **Piano Waveform (6 harmonics)** | ✅ Done — hammer-strike timbre with natural decay |
| **88-Key Free Play Keyboard** | ✅ Done — full A0–C8 range with minimap slider |
| **Service Worker / Offline** | ✅ Done — cache-first strategy, all static assets precached |
| **Spaced Repetition (SM-2)** | ✅ Done — SRS algorithm with ease factor, intervals, overdue priority |
| Keyboard Shortcuts | ✅ Done — Space/Enter replay, 1–6 chords, T theme, Esc sidebar |
| **iOS PWA Install Prompt** | ✅ Done — custom banner with localStorage dismissal, iOS Safari instructions |
| **Export / Import Progress** | ✅ Done — JSON backup/restore for stats, SRS, custom sets |
| **Lesson / Curriculum Mode** | ✅ Done — 6-level guided progression, auto-unlock, progress panel |

### 🎯 Phase 1: Core Polish

*(All Phase 1 items complete ✅)*

### 🎯 Phase 2: Learning Features

| Idea | Description |
|------|-------------|
| **Sheet Music Display** | Show staff notation via VexFlow (lazy-loaded ESM from CDN) |
| **Microphone Pitch Detection** | Sing/play a note, app detects pitch via Web Audio AnalyserNode + autocorrelation |
| **Multiplayer / Challenge Links** | Share a seeded session URL for competitive practice |

### 🎯 Phase 3: Platform & Polish

| Idea | Description |
|------|-------------|
| **Native Audio Samples** | Replace synthesized tones with real piano/guitar samples via AudioBufferSourceNode |
| **Accessibility Audit** | Full WCAG 2.1 AA — semantic HTML, ARIA labels, keyboard-only navigation |
| **Internationalization (i18n)** | Multiple languages, locale files, dynamic import |
| **Chromatic Tuner Mode** | Real-time pitch meter via microphone |

### 🎯 Phase 4: Advanced / Experimental

| Idea | Description |
|------|-------------|
| **Fingering Hints** | Suggested finger numbers on keys |
| **Chord Progression Practice** | Play common progressions (ii-V-I, I-vi-IV-V) |
| **Harmonic Analysis** | Identify chord function in key (I, IV, V, etc.) |
| **Teacher Dashboard** | Instructor view of student progress |

### 📋 Implementation Notes
- **No build step** — all additions must work as static ES modules on Vercel
- **Backward compatible** — new features behind feature flags or progressive enhancement
- **Performance first** — lazy-load heavy libs (VexFlow, Chart.js, aubio) only when mode activated
- **Mobile parity** — every desktop feature must work on iOS Safari / Chrome Android

---

## Usage Guide

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` / `Enter` | Play Again (when visible) |
| `←` / `→` | Previous / Next group (Note Reading) |
| `1`–`6` | Select chord quality (Chords mode) |
| `Esc` | Close sidebar (mobile) |
| `T` | Toggle theme |

### Mode Walkthrough

#### Note Reading
1. A note name appears (e.g., `C#4`, `F3`)
2. Tap the matching key on the on-screen piano
3. Correct → green highlight + pleasant cadence; Wrong → red highlight + diminished resolution
4. Next question auto-advances after ~1.5s
5. **Practice Set** filter in sidebar to focus on specific notes

#### Ear Training
1. Press **Play Again** (🔊) to hear the target note
2. Tap the key you think you heard
3. Same feedback as Note Reading

#### Intervals
1. Hear two notes: root + interval (700ms gap)
2. Prompt shows root note (e.g., `From C4, tap the note you hear`)
3. Tap the target note
4. Feedback includes interval name (e.g., `Perfect 5th — Brilliant!`)

#### Chords
1. Hear a full chord (all tones played with 20ms stagger)
2. Six quality buttons appear: Major, Minor, Dim, Aug, Dom7, Maj7
3. Tap the quality you heard (or press 1–6)
4. Wrong answer reveals correct button in green

#### Speed Run
1. 60-second countdown starts immediately
2. Same as Note Reading but faster pace (800ms between questions)
3. Timer shows in score card (red when <10s)
4. Final screen shows score + streak

### Statistics Dashboard
Click **📊 Statistics** in the sidebar to view:
- Session count, total questions, overall accuracy, best streak
- Accuracy breakdown by mode (horizontal bars)
- Recent sessions with score, accuracy, and streak per session
- **Clear all data** button to reset

### Custom Practice Sets
- Select a set from the **Practice Set** dropdown to filter questions
- Built-in sets: CDE Only, FGAB Only, All Notes, All Qualities
- Click **+ add custom set** to create your own — choose mode and name
- Custom sets are saved to localStorage

### Touch / Mobile
- Tap keys normally — `touchstart` with `preventDefault()` prevents scroll/zoom
- Sidebar opens via ☰ button (top-left); closes on outside tap
- Piano horizontally scrolls on narrow screens

### MIDI Keyboard
- Plug in a USB MIDI keyboard — recognized automatically
- MIDI note-on messages map to piano keys
- Works in Note Reading, Ear Training, Intervals, and Speed Run modes
- Not supported in Safari or iOS

---

## Architecture Deep-Dive

### Module Dependency Graph
```
index.html
  └── src/app.js (entry)
       ├── src/engine.js (constants, FSM + payloads, practice model, groups, medals, speed run)
       ├── src/audio.js (pre-rendered waveform buffers, voice factory, playback helpers)
       ├── src/keyboard.js (DOM builder, highlight/press)
       ├── src/ui.js (DOM updates, sidebar, theme, stats, custom sets)
       ├── src/stats-engine.js (session CRUD, accuracy computation)
       ├── src/stats-ui.js (stats dashboard rendering)
       ├── src/custom-sets.js (practice set storage + filtering)
       └── src/modes/modes.js (5 mode implementations)
```

### Data Flow
```
User Interaction
      │
      ▼
handleKeyAnswer() / handleChordAnswer()
      │
      ├──▶ Audio Feedback (playDing, cadences)
      ├──▶ Visual Feedback (highlightAnswer, setQuestionNote)
      ├──▶ Practice Model Update (recordAttempt)
      ├──▶ Stats Recording (recordQuestion → statsSession)
      ├──▶ Score Update (updateScore)
      └──▶ Schedule Next Question (scheduleTimer → mode.startXxxMode)
```

### FSM State Diagram
```
                    ┌─────────────────┐
                    │      IDLE       │
                    │ (mode switch,   │
                    │  noteType change)│
                    └────────┬────────┘
                             │ transition(QUESTION_ACTIVE, {semitone, group, pool})
                             ▼
                    ┌─────────────────┐
         ┌──────────│ QUESTION_ACTIVE │──────────┐
         │          │ (await answer)  │          │
         │          └────────┬────────┘          │
         │                   │ handleAnswer()    │
         │                   ▼                   │
         │          ┌─────────────────┐          │
         │          │ ANSWER_PENDING  │          │
         │          │ (audio playing, │          │
         │          │  highlights on) │          │
         │          └────────┬────────┘          │
         │                   │ scheduleTimer     │
         │                   ▼                   │
         │          ┌─────────────────┐          │
         └──────────│   (back to      │◀─────────┘
                    │ QUESTION_ACTIVE)│
                    └─────────────────┘

All states: transition() clears ALL pendingTimers atomically
Payload: Object.freeze() on each transition — answer handlers read from getPayload()
```

---

## Changelog

### v1.2.0 (2026-07-27)
- **Spaced Repetition (SM-2)** — toggle between weighted random and SRS in sidebar; SM-2 algorithm with ease factor, intervals, overdue priority; `srs-engine.js` pure compute module
- **88-Key Free Play Keyboard** — full A0–C8 piano with minimap slider navigation; free-play mode with no scoring
- **Piano waveform upgrade** — 6-harmonic grand piano timbre with hammer-strike attack and natural decay envelope
- **Service Worker offline support** — cache-first strategy, all static assets precached (`sw.js`)
- **iOS PWA Install Prompt** — custom banner with `beforeinstallprompt` (Chrome) and Safari manual instructions; 7-day dismissal
- **Export / Import Progress** — JSON backup/restore for stats, SRS data, custom sets; reset all data option
- **Lesson Curriculum Mode** — 6-level guided progression (CDE → FGAB → Full Octave → Sharps/Flats → Intervals → Chords); auto-unlock with accuracy gates; live progress panel
- **Shortcuts** — Space/Enter replay, 1–6 chords, T theme toggle, Esc close sidebar

### v1.1.0 (2026-07-27)
- **FSM payload transitions** — immutable question data on state change, answer handlers read from `getPayload()`
- **Statistics Dashboard** — session recording, accuracy by mode/note, recent sessions, localStorage persistence
- **Custom Practice Sets** — modal editor, built-in + user sets, pool filtering across all modes
- **MIDI input** — `navigator.requestMIDIAccess()` with semitone mapping
- **Pre-rendered audio** — AudioBufferSourceNode waveform pool replacing OscillatorNode allocation
- **Open WebUI theme** — new design system with blue accent, glassmorphism, refined dark + light palettes
- **Keyboard shortcuts** — Space/Enter for replay, 1–6 for chords, T for theme, Esc for sidebar

### v1.0.0 (2026-07-22)
- Initial release
- 5 modes: Note Reading, Ear Training, Intervals, Chords, Speed Run
- Weighted practice algorithm + shuffle-bag groups
- FSM state machine with timer cleanup
- Self-cleaning Web Audio voices (3 timbres)
- Dark/Light theme, PWA manifest, Vercel config
- Mobile-first responsive design

---

## FAQ / Troubleshooting

### Audio doesn't play
- **First interaction required** — click/tap anywhere on page to unlock AudioContext (browser policy)
- **iOS Safari** — must tap a key or Play Again; silent mode switch mutes Web Audio
- **Check console** — `AudioContext` errors appear in DevTools

### Keyboard not visible
- **Horizontal scroll** — on narrow screens, swipe the piano area left/right
- **Note Type = "Whole"** — black keys hidden; switch to "Sharps", "Flats", or "All"

### Score/Streak not saving
- **Session data now persists** via Statistics Dashboard (localStorage)
- Refresh still resets current session score but history is saved
- Click "📊 Statistics" to view past performance

### PWA not installing
- **HTTPS required** — Vercel provides this
- **Must visit twice** — `beforeinstallprompt` fires on 2nd visit
- **iOS** — use Share → Add to Home Screen (no auto-prompt)

### MIDI not working
- **Chrome/Edge/Firefox** — supported; plug in keyboard and play
- **Safari/iOS** — no `navigator.requestMIDIAccess` support
- **Fallback** — on-screen piano and keyboard shortcuts always work

### Performance issues
- **Heavy libs lazy-load** — VexFlow, Chart.js, aubio only load when mode activated
- **Voice cleanup** — every AudioBufferSourceNode disconnects on `onended`
- **No memory leaks** — FSM cancels all timers on state change
- **Waveform buffers** — pre-rendered once, reused for all notes via `playbackRate`

### Development server CORS errors
- Use `npx vercel dev` instead of `python -m http.server` for ES module imports
- Or serve from project root with `npx serve`

---

Built with ☕ and 🎹 for piano learners everywhere.
