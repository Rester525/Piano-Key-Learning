// ═══════════════════════════════════════════════════════════════════
// SONGS — Melody library for Sheet Music practice mode.
// Each note is an absolute semitone (C4 = 48). C0 = 0.
// ═══════════════════════════════════════════════════════════════════

// Note names for readability (C4 = 48)
// C4=48 D4=50 E4=52 F4=53 G4=55 A4=57 B4=59 C5=60 D5=62 E5=64 F5=65 G5=67

export const SONGS = [
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle Little Star',
    notes: [
      48, 48, 55, 55, 57, 57, 55,         // C C G G A A G
      53, 53, 52, 52, 50, 50, 48,         // F F E E D D C
      55, 55, 53, 53, 52, 52, 50,         // G G F F E E D
      55, 55, 53, 53, 52, 52, 50,         // G G F F E E D
      48, 48, 55, 55, 57, 57, 55,         // C C G G A A G
      53, 53, 52, 52, 50, 50, 48,         // F F E E D D C
    ],
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    notes: [
      52, 52, 53, 55, 55, 53, 52, 50,     // E E F G G F E D
      48, 48, 50, 52, 52, 50, 50,         // C C D E E D D
      52, 52, 53, 55, 55, 53, 52, 50,     // E E F G G F E D
      48, 48, 50, 52, 50, 48, 48,         // C C D E D C C
    ],
  },
  {
    id: 'mary-lamb',
    name: 'Mary Had a Little Lamb',
    notes: [
      52, 50, 48, 50, 52, 52, 52,         // E D C D E E E
      50, 50, 50,                         // D D D
      52, 55, 55,                         // E G G
      52, 50, 48, 50, 52, 52, 52, 52,     // E D C D E E E E
      50, 50, 52, 50, 48,                 // D D E D C
    ],
  },
  {
    id: 'hot-cross-buns',
    name: 'Hot Cross Buns',
    notes: [
      52, 50, 48,                         // E D C
      52, 50, 48,                         // E D C
      48, 48, 48, 48, 50, 50, 50, 50,     // C C C C D D D D
      52, 50, 48,                         // E D C
    ],
  },
  {
    id: 'jingle-bells',
    name: 'Jingle Bells',
    notes: [
      52, 52, 52, 52, 52, 52,             // E E E E E E
      52, 55, 48, 50, 52,                 // E G C D E
      53, 53, 53, 53, 53, 52, 52, 52,     // F F F F F E E E
      52, 50, 50, 52, 50, 55,             // E D D E D G
    ],
  },
];

/** Get a song by id (defaults to first). */
export function getSong(id) {
  return SONGS.find(s => s.id === id) || SONGS[0];
}
