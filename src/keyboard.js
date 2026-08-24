// ══════════════════════════════════════════════════════════════════
// KEYBOARD — Piano Keyboard Builder & Interaction
// ══════════════════════════════════════════════════════════════════

import { GROUPS, BLACK_PAIRS, BLACK_SEMI_MAP, semitoneToDisplay, CHROMATIC } from './engine.js';

/** Build the piano keyboard for a given group and note type. */
export function buildKeyboard(group, noteType) {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';

  const ntype = noteType;
  const semis = group.semis;

  semis.forEach((semi, i) => {
    // White key
    const wk = document.createElement('div');
    wk.className = 'white-key';
    wk.dataset.semitone = semi;
    keyboard.appendChild(wk);

    // Black key (if applicable)
    if (i < semis.length - 1) {
      const pairRaw = [semis[i] % 12, semis[i + 1] % 12].sort((a, b) => a - b);
      const pair = pairRaw.join(',');
      if (BLACK_PAIRS.has(pair)) {
        const bk = document.createElement('div');
        bk.className = 'black-key';
        if (ntype !== 'whole') {
          bk.classList.add('clickable');
          const blackSemi = semis[i] + (BLACK_SEMI_MAP[pair] - (semis[i] % 12));
          bk.dataset.semitone = blackSemi;
        }
        bk.style.left = `${(i + 1) * 52 - 16}px`;
        keyboard.appendChild(bk);
      }
    }
  });

  keyboard.style.width = `${semis.length * 52}px`;
  keyboard.style.height = '200px';
}

/** Clear all highlights and restore pointer events. */
export function clearHighlights() {
  document.querySelectorAll('.white-key,.black-key').forEach(k => {
    k.classList.remove('highlight-correct', 'highlight-wrong', 'pressed');
    k.style.pointerEvents = '';
  });
}

/** Lock/unlock keyboard UI. */
export function setKeyboardLocked(locked) {
  const viewport = document.getElementById('keyboardViewport');
  if (!viewport) return;
  if (locked) {
    viewport.classList.add('locked-ui');
  } else {
    viewport.classList.remove('locked-ui');
  }
}

/** Add pressed animation to a key. */
export function pressKey(keyEl, duration = 150) {
  if (!keyEl) return;
  keyEl.classList.add('pressed');
  setTimeout(() => keyEl.classList.remove('pressed'), duration);
}

/** Highlight correct/incorrect keys. */
export function highlightAnswer(correctSemitone, chosenSemitone, isCorrect) {
  document.querySelectorAll('.white-key,.black-key.clickable').forEach(k => {
    k.style.pointerEvents = 'none';
    if (Number(k.dataset.semitone) === correctSemitone) {
      k.classList.add('highlight-correct');
    }
  });
  if (!isCorrect) {
    const chosenEl = document.querySelector(`[data-semitone="${chosenSemitone}"]`);
    if (chosenEl) chosenEl.classList.add('highlight-wrong');
  }
}

/** Get the group object by ID. */
export function getGroupById(id) {
  return GROUPS.find(g => g.id === id) || GROUPS[2];
}

/** Get default group (CDEFGAB). */
export function getDefaultGroup() {
  return GROUPS[2];
}

// ══════════════════════════════════════════════════════════════════
// FULL 88-KEY KEYBOARD (A0–C8)
// ══════════════════════════════════════════════════════════════════

const FULL_START = 21;  // A0
const FULL_END = 108;   // C8
const WHITE_KEY_W = 36; // narrower keys for 88-key mode

/** All white-key semitones in 88-key range */
function getFullWhiteKeys() {
  const keys = [];
  for (let s = FULL_START; s <= FULL_END; s++) {
    const pc = ((s % 12) + 12) % 12;
    if ([0, 2, 4, 5, 7, 9, 11].includes(pc)) keys.push(s);
  }
  return keys;
}

/**
 * Build the full 88-key piano keyboard.
 * All black keys are clickable (plays notes).
 */
export function buildFullKeyboard() {
  const keyboard = document.getElementById('keyboard');
  if (!keyboard) return;
  keyboard.innerHTML = '';

  const whiteKeys = getFullWhiteKeys();
  let whiteIdx = 0;

  whiteKeys.forEach(semi => {
    const wk = document.createElement('div');
    wk.className = 'white-key full-key';
    wk.dataset.semitone = semi;
    keyboard.appendChild(wk);

    // Black key between this and next
    const nextSemi = whiteIdx < whiteKeys.length - 1 ? whiteKeys[whiteIdx + 1] : null;
    if (nextSemi !== null) {
      const pair = [semi % 12, nextSemi % 12].sort((a, b) => a - b).join(',');
      if (BLACK_PAIRS.has(pair)) {
        const bk = document.createElement('div');
        bk.className = 'black-key clickable full-key';
        const blackSemi = semi + (BLACK_SEMI_MAP[pair] - (semi % 12));
        bk.dataset.semitone = blackSemi;
        bk.style.left = `${(whiteIdx + 1) * WHITE_KEY_W - 12}px`;
        keyboard.appendChild(bk);
      }
    }
    whiteIdx++;
  });

  keyboard.style.width = `${whiteKeys.length * WHITE_KEY_W}px`;
  keyboard.style.height = '160px';
}

/**
 * Build the mini-map: tiny colored bars representing all 88 keys.
 * White keys as tall bars, black keys as short bars.
 */
export function buildMinimap() {
  const track = document.getElementById('minimapTrack');
  if (!track) return;
  track.innerHTML = '';

  const whiteKeys = getFullWhiteKeys();
  const whiteWidth = 100 / whiteKeys.length;
  let whiteIdx = 0;

  whiteKeys.forEach(semi => {
    // White key bar
    const wk = document.createElement('div');
    wk.className = 'minimap-white';
    wk.style.left = `${whiteIdx * whiteWidth}%`;
    wk.style.width = `${whiteWidth}%`;
    track.appendChild(wk);

    // Black key bar
    const nextSemi = whiteIdx < whiteKeys.length - 1 ? whiteKeys[whiteIdx + 1] : null;
    if (nextSemi !== null) {
      const pair = [semi % 12, nextSemi % 12].sort((a, b) => a - b).join(',');
      if (BLACK_PAIRS.has(pair)) {
        const bk = document.createElement('div');
        bk.className = 'minimap-black';
        bk.style.left = `${(whiteIdx + 0.67) * whiteWidth}%`;
        bk.style.width = `${whiteWidth * 0.66}%`;
        track.appendChild(bk);
      }
    }
    whiteIdx++;
  });
}