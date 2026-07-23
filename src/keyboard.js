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
  const wrap = document.querySelector('.keyboard-wrap');
  if (locked) {
    wrap.classList.add('locked-ui');
  } else {
    wrap.classList.remove('locked-ui');
  }
}

/** Add pressed animation to a key. */
export function pressKey(keyEl, duration = 150) {
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