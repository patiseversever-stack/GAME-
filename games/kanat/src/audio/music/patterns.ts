// Adaptive music data (JSON-like): per-world themes with layers
//   K0 ambient pad (always) · K1 rhythm (speed > 160 km/h) · K2 melody (combo ≥ 1.5) · K3 percussion (×5).
// Original phrases written for KANAT; makam scales are used as melodic colour only.
import type { WorldId } from '../../sim/types.ts';
import type { ScaleId } from '../scales.ts';

export type MusicWorld = WorldId | 'menu' | 'suru';

export type PadInst = 'strings' | 'warmPad' | 'choir' | 'glass';
export type LineInst = 'ney' | 'kemence' | 'guitar' | 'ud' | 'pluck' | 'bell' | 'bass' | 'drums';
export type InstId = PadInst | LineInst;

/**
 * Note token: number = scale degree (0-based, 7-note scales: 7 = octave, negatives allowed);
 * 'c0'…'c5' = tone of the current bar's chord (wrapping up an octave); drums: one of D T K B V J S W.
 */
export type NoteTok = number | string;
/** [step in bar, note, length in steps, velocity 0..1] */
export type NoteEv = readonly [number, NoteTok, number, number];

export interface Track {
  inst: LineInst;
  /** Semitones relative to the section root. */
  octave: number;
  /** Bar patterns, cycled (bar i uses bars[i % bars.length]). */
  bars: readonly (readonly NoteEv[])[];
  gain?: number;
}

export interface PadDef {
  inst: PadInst;
  octave: number;
  gain?: number;
}

export interface Section {
  root: number;
  scale: ScaleId;
  /** Chord per bar (scale degrees relative to root + pad octave), cycled. */
  chords: readonly (readonly number[])[];
  pad: PadDef;
  k1: readonly Track[];
  k2: readonly Track[];
  k3: readonly Track[];
}

export type AmbienceId = 'sea' | 'rain' | 'trickle' | 'burners' | 'suru';

export interface ThemeDef {
  id: MusicWorld;
  /** Seconds per step. */
  stepDur: number;
  stepsPerBar: number;
  /** Theme output gain (linear). */
  gain: number;
  sections: readonly Section[];
  ambience: readonly AmbienceId[];
  /** Layers active when nothing drives intensity (menu idles with K1+K2). */
  idle: readonly [boolean, boolean, boolean];
}

// ---------------------------------------------------------------------------------------------
// W1 Kapadokya — Hicaz on D, 4/4 ~88 bpm. Strings pad + ney-like breathy flute.

const kapadokya: ThemeDef = {
  id: 'kapadokya',
  stepDur: 0.17,
  stepsPerBar: 16,
  gain: 0.9,
  ambience: ['burners'],
  idle: [false, false, false],
  sections: [
    {
      root: 50,
      scale: 'hicaz',
      chords: [
        [0, 4, 7],
        [0, 2, 4, 7],
        [1, 3, 5, 8],
        [0, 4, 7, 9],
        [-4, -2, 0, 3],
        [-1, 1, 3, 6],
        [1, 3, 5, 8],
        [0, 4, 7],
      ],
      pad: { inst: 'strings', octave: 0 },
      k1: [
        {
          inst: 'drums',
          octave: 0,
          bars: [
            [
              [0, 'B', 1, 0.9], [6, 'B', 1, 0.55], [8, 'T', 1, 0.35], [11, 'B', 1, 0.45], [12, 'T', 1, 0.3],
              [2, 'S', 1, 0.18], [6, 'S', 1, 0.14], [10, 'S', 1, 0.18], [14, 'S', 1, 0.22],
            ],
          ],
        },
        { inst: 'bass', octave: -12, bars: [[[0, 'c0', 6, 0.8], [10, 'c0', 4, 0.55]]] },
      ],
      k2: [
        {
          inst: 'ney',
          octave: 24,
          bars: [
            [[0, 4, 6, 0.8], [6, 3, 2, 0.6], [8, 2, 4, 0.7], [12, 1, 4, 0.65]],
            [[0, 0, 12, 0.75]],
            [[0, 2, 4, 0.7], [4, 3, 4, 0.7], [8, 4, 6, 0.8], [14, 5, 2, 0.6]],
            [[0, 4, 8, 0.8], [8, 3, 4, 0.65], [12, 2, 4, 0.6]],
            [[0, 3, 6, 0.75], [6, 5, 2, 0.6], [8, 4, 4, 0.7], [12, 3, 4, 0.6]],
            [[0, 2, 4, 0.7], [4, 1, 4, 0.65], [8, -1, 8, 0.7]],
            [[0, 1, 6, 0.7], [6, 2, 2, 0.6], [8, 3, 8, 0.75]],
            [[0, 2, 4, 0.65], [4, 1, 4, 0.6], [8, 0, 8, 0.75]],
          ],
        },
      ],
      k3: [
        {
          inst: 'drums',
          octave: 0,
          bars: [
            [
              [0, 'D', 1, 1], [4, 'T', 1, 0.55], [6, 'T', 1, 0.45], [8, 'D', 1, 0.85], [10, 'K', 1, 0.4],
              [12, 'T', 1, 0.65], [14, 'K', 1, 0.4], [15, 'K', 1, 0.3], [0, 'V', 1, 0.6], [8, 'V', 1, 0.4],
              [4, 'J', 1, 0.3], [12, 'J', 1, 0.3],
            ],
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// W2 Likya — Uşşak on A, 6/8. Warm pad + nylon guitar arpeggios + flute; sea ambience.

const likya: ThemeDef = {
  id: 'likya',
  stepDur: 0.12,
  stepsPerBar: 12,
  gain: 0.9,
  ambience: ['sea'],
  idle: [false, false, false],
  sections: [
    {
      root: 57,
      scale: 'ussak',
      chords: [
        [0, 2, 4],
        [-1, 3, 6],
        [-2, 0, 2],
        [-1, 3, 6],
        [0, 2, 4],
        [3, 5, 7],
        [2, 4, 6],
        [0, 4, 7],
      ],
      pad: { inst: 'warmPad', octave: -12 },
      k1: [
        {
          inst: 'guitar',
          octave: 0,
          bars: [[[0, 'c0', 3, 0.8], [2, 'c1', 3, 0.55], [4, 'c2', 3, 0.6], [6, 'c3', 3, 0.65], [8, 'c2', 3, 0.5], [10, 'c1', 2, 0.5]]],
        },
        { inst: 'bass', octave: -12, bars: [[[0, 'c0', 5, 0.6], [6, 'c0', 5, 0.4]]] },
      ],
      k2: [
        {
          inst: 'ney',
          octave: 12,
          gain: 0.85,
          bars: [
            [[0, 4, 4, 0.75], [4, 3, 2, 0.6], [6, 2, 4, 0.7], [10, 1, 2, 0.6]],
            [[0, 0, 6, 0.75], [6, 1, 3, 0.6], [9, 2, 3, 0.6]],
            [[0, 3, 4, 0.7], [4, 2, 2, 0.6], [6, 1, 6, 0.65]],
            [[0, 2, 3, 0.65], [3, 3, 3, 0.65], [6, 4, 6, 0.75]],
            [[0, 4, 3, 0.75], [3, 5, 3, 0.65], [6, 4, 3, 0.7], [9, 3, 3, 0.6]],
            [[0, 3, 6, 0.7], [6, 5, 3, 0.65], [9, 4, 3, 0.6]],
            [[0, 4, 4, 0.7], [4, 2, 2, 0.6], [6, 1, 6, 0.65]],
            [[0, 0, 12, 0.75]],
          ],
        },
      ],
      k3: [
        {
          inst: 'drums',
          octave: 0,
          bars: [
            [
              [0, 'D', 1, 0.9], [3, 'T', 1, 0.45], [5, 'K', 1, 0.3], [6, 'D', 1, 0.7], [8, 'T', 1, 0.5],
              [9, 'K', 1, 0.35], [10, 'T', 1, 0.55], [3, 'J', 1, 0.35], [9, 'J', 1, 0.35],
            ],
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// W3 Karadeniz — Hüseyni on A, aksak 7/8 (2+2+3). Bowed kemençe-flavoured synth; rain ambience.

const karadeniz: ThemeDef = {
  id: 'karadeniz',
  stepDur: 0.15,
  stepsPerBar: 7,
  gain: 0.85,
  ambience: ['rain'],
  idle: [false, false, false],
  sections: [
    {
      root: 57,
      scale: 'huseyni',
      chords: [
        [0, 4, 7],
        [0, 4, 7],
        [-1, 3, 6],
        [-1, 3, 6],
        [0, 2, 4],
        [0, 2, 4],
        [-4, 0, 3],
        [-3, 0, 4],
      ],
      pad: { inst: 'strings', octave: -12, gain: 0.9 },
      k1: [
        {
          inst: 'kemence',
          octave: 0,
          gain: 0.8,
          bars: [
            [[0, 4, 1, 0.8], [1, 3, 1, 0.55], [2, 4, 1, 0.7], [3, 3, 1, 0.55], [4, 2, 1, 0.75], [5, 1, 1, 0.5], [6, 2, 1, 0.6]],
            [[0, 0, 1, 0.8], [1, 1, 1, 0.55], [2, 2, 1, 0.7], [3, 1, 1, 0.55], [4, 2, 1, 0.75], [5, 3, 1, 0.55], [6, 4, 1, 0.6]],
          ],
        },
        { inst: 'bass', octave: -12, bars: [[[0, 'c0', 2, 0.7], [4, 'c0', 2, 0.5]]] },
      ],
      k2: [
        {
          inst: 'kemence',
          octave: 12,
          bars: [
            [[0, 4, 4, 0.7], [4, 5, 3, 0.6]],
            [[0, 4, 7, 0.7]],
            [[0, 6, 4, 0.7], [4, 5, 3, 0.6]],
            [[0, 3, 7, 0.7]],
            [[0, 2, 4, 0.7], [4, 3, 3, 0.6]],
            [[0, 4, 7, 0.75]],
            [[0, 3, 2, 0.6], [2, 2, 2, 0.6], [4, 1, 3, 0.65]],
            [[0, 0, 7, 0.75]],
          ],
        },
      ],
      k3: [
        {
          inst: 'drums',
          octave: 0,
          bars: [
            [
              [0, 'V', 1, 0.9], [2, 'T', 1, 0.5], [4, 'V', 1, 0.6], [5, 'T', 1, 0.45], [6, 'K', 1, 0.4],
              [0, 'D', 1, 0.4], [3, 'K', 1, 0.3], [2, 'J', 1, 0.25], [6, 'J', 1, 0.25],
            ],
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// W4 Erciyes — Rast colour on G, 4/4 ~75 bpm. Choir pad + bells (neutral degrees only in melody).

const erciyes: ThemeDef = {
  id: 'erciyes',
  stepDur: 0.2,
  stepsPerBar: 16,
  gain: 0.9,
  ambience: [],
  idle: [false, false, false],
  sections: [
    {
      root: 55,
      scale: 'rast',
      chords: [
        [0, 4, 7],
        [-4, 0, 3],
        [-2, 1, 3, 5],
        [-3, 1, 4],
        [0, 4, 7],
        [-4, 0, 3, 5],
        [1, 3, 5, 8],
        [-3, 1, 4, 7],
      ],
      pad: { inst: 'choir', octave: 0 },
      k1: [
        { inst: 'bell', octave: 12, gain: 0.55, bars: [[[0, 4, 2, 0.6], [3, 7, 2, 0.45], [6, 5, 2, 0.5], [8, 4, 2, 0.55], [11, 1, 2, 0.4], [14, 3, 2, 0.45]]] },
        { inst: 'drums', octave: 0, bars: [[[0, 'B', 1, 0.6], [8, 'B', 1, 0.4], [4, 'W', 1, 0.25], [12, 'W', 1, 0.25]]] },
      ],
      k2: [
        {
          inst: 'bell',
          octave: 24,
          gain: 0.7,
          bars: [
            [[0, 4, 4, 0.7], [4, 5, 4, 0.6], [8, 4, 8, 0.7]],
            [[0, 3, 6, 0.65], [6, 2, 2, 0.55], [8, 1, 8, 0.65]],
            [[0, 1, 4, 0.65], [4, 3, 4, 0.6], [8, 5, 8, 0.7]],
            [[0, 4, 12, 0.7]],
            [[0, 7, 4, 0.7], [4, 6, 4, 0.6], [8, 5, 4, 0.65], [12, 4, 4, 0.6]],
            [[0, 3, 4, 0.65], [4, 4, 4, 0.6], [8, 5, 8, 0.7]],
            [[0, 5, 4, 0.65], [4, 3, 4, 0.6], [8, 1, 8, 0.65]],
            [[0, 0, 12, 0.7]],
          ],
        },
      ],
      k3: [
        {
          inst: 'drums',
          octave: 0,
          bars: [[[0, 'V', 1, 0.8], [6, 'B', 1, 0.5], [8, 'V', 1, 0.6], [12, 'B', 1, 0.5], [14, 'B', 1, 0.35], [4, 'J', 1, 0.3], [12, 'J', 1, 0.3]]],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// W5 Pamukkale — Uşşak on D, aksak 9/8 (2+2+2+3). Warm strings + ud-like Karplus-Strong; water.

const pamukkale: ThemeDef = {
  id: 'pamukkale',
  stepDur: 0.19,
  stepsPerBar: 9,
  gain: 0.9,
  ambience: ['trickle'],
  idle: [false, false, false],
  sections: [
    {
      root: 50,
      scale: 'ussak',
      chords: [
        [0, 2, 4],
        [0, 2, 4],
        [-2, 0, 2],
        [-1, 3, 6],
        [3, 5, 7],
        [0, 2, 4],
        [-1, 3, 6],
        [-3, 0, 4],
      ],
      pad: { inst: 'strings', octave: 0, gain: 0.85 },
      k1: [
        { inst: 'ud', octave: 0, gain: 0.8, bars: [[[0, 0, 2, 0.8], [2, 4, 1, 0.5], [4, 'c0', 2, 0.6], [6, 4, 1, 0.55], [7, 3, 1, 0.5], [8, 2, 1, 0.55]]] },
        { inst: 'bass', octave: -12, bars: [[[0, 'c0', 4, 0.6], [6, 'c0', 3, 0.45]]] },
      ],
      k2: [
        {
          inst: 'ud',
          octave: 12,
          bars: [
            [[0, 4, 2, 0.8], [2, 5, 2, 0.6], [4, 4, 2, 0.7], [6, 3, 1, 0.6], [7, 2, 2, 0.65]],
            [[0, 1, 2, 0.7], [2, 2, 2, 0.6], [4, 1, 2, 0.6], [6, 0, 3, 0.75]],
            [[0, 2, 2, 0.7], [2, 3, 2, 0.6], [4, 4, 2, 0.7], [6, 5, 3, 0.7]],
            [[0, 4, 2, 0.75], [2, 3, 2, 0.6], [4, 6, 2, 0.65], [6, 4, 3, 0.7]],
            [[0, 5, 2, 0.75], [2, 4, 2, 0.6], [4, 3, 2, 0.65], [6, 2, 3, 0.7]],
            [[0, 3, 2, 0.7], [2, 2, 2, 0.6], [4, 1, 2, 0.6], [6, 2, 3, 0.7]],
            [[0, 1, 2, 0.65], [2, 2, 2, 0.6], [4, 3, 2, 0.65], [6, 4, 3, 0.7]],
            [[0, 1, 2, 0.6], [2, 0, 7, 0.75]],
          ],
        },
      ],
      k3: [
        {
          inst: 'drums',
          octave: 0,
          bars: [[[0, 'D', 1, 0.9], [2, 'T', 1, 0.5], [4, 'D', 1, 0.7], [6, 'T', 1, 0.55], [7, 'K', 1, 0.4], [8, 'T', 1, 0.6], [2, 'J', 1, 0.3], [6, 'J', 1, 0.3]]],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Menu — Hüseyni on E, very calm. Idles with soft plucks (K1) and a sparse ney line (K2).

const menu: ThemeDef = {
  id: 'menu',
  stepDur: 0.22,
  stepsPerBar: 16,
  gain: 0.85,
  ambience: ['burners'],
  idle: [true, true, false],
  sections: [
    {
      root: 52,
      scale: 'huseyni',
      chords: [
        [0, 4, 7],
        [-4, 0, 2],
        [-1, 3, 6],
        [0, 2, 4],
      ],
      pad: { inst: 'warmPad', octave: 0 },
      k1: [{ inst: 'pluck', octave: 0, gain: 0.6, bars: [[[0, 'c0', 4, 0.5], [4, 'c1', 4, 0.4], [8, 'c2', 4, 0.45], [12, 'c1', 4, 0.35]]] }],
      k2: [
        {
          inst: 'ney',
          octave: 12,
          gain: 0.75,
          bars: [
            [[0, 4, 8, 0.6], [8, 3, 4, 0.5], [12, 2, 4, 0.5]],
            [[0, 3, 12, 0.6]],
            [[0, 6, 6, 0.55], [6, 4, 2, 0.5], [8, 3, 8, 0.55]],
            [[0, 1, 4, 0.5], [4, 0, 12, 0.55]],
          ],
        },
      ],
      k3: [{ inst: 'drums', octave: 0, bars: [[[0, 'B', 1, 0.5], [10, 'B', 1, 0.3]]] }],
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// SÜRÜ.io — 3-minute sunset piece; section chosen by timeFrac:
//   0 major (warm) → 1 soft minor → 2 "blue hour" glass pad.

export const SURU_SECTION_EDGES: readonly number[] = [0.45, 0.8];

const suru: ThemeDef = {
  id: 'suru',
  stepDur: 0.2,
  stepsPerBar: 16,
  gain: 0.85,
  ambience: ['suru'],
  idle: [false, false, false],
  sections: [
    {
      root: 53,
      scale: 'major',
      chords: [
        [0, 2, 4, 7],
        [2, 4, 6],
        [3, 5, 7],
        [4, 6, 8],
      ],
      pad: { inst: 'warmPad', octave: 0 },
      k1: [
        {
          inst: 'pluck',
          octave: 0,
          gain: 0.6,
          bars: [[[0, 'c0', 2, 0.55], [2, 'c1', 2, 0.4], [4, 'c2', 2, 0.45], [6, 'c3', 2, 0.4], [8, 'c0', 2, 0.5], [10, 'c1', 2, 0.4], [12, 'c2', 2, 0.45], [14, 'c3', 2, 0.4]]],
        },
      ],
      k2: [
        {
          inst: 'bell',
          octave: 12,
          gain: 0.6,
          bars: [
            [[0, 4, 4, 0.6], [4, 2, 4, 0.5], [8, 7, 8, 0.6]],
            [[0, 6, 4, 0.55], [4, 4, 4, 0.5], [8, 2, 8, 0.55]],
            [[0, 5, 4, 0.55], [4, 3, 4, 0.5], [8, 7, 4, 0.55], [12, 5, 4, 0.5]],
            [[0, 4, 8, 0.6], [8, 6, 8, 0.55]],
          ],
        },
      ],
      k3: [{ inst: 'drums', octave: 0, bars: [[[0, 'B', 1, 0.6], [8, 'B', 1, 0.45], [4, 'S', 1, 0.2], [12, 'S', 1, 0.2], [14, 'B', 1, 0.3]]] }],
    },
    {
      root: 50,
      scale: 'minor',
      chords: [
        [0, 2, 4],
        [-2, 0, 2],
        [3, 5, 7],
        [4, 6, 8],
      ],
      pad: { inst: 'warmPad', octave: 0, gain: 0.9 },
      k1: [{ inst: 'pluck', octave: 0, gain: 0.55, bars: [[[0, 'c0', 4, 0.5], [4, 'c1', 4, 0.4], [8, 'c2', 4, 0.45], [12, 'c1', 4, 0.35]]] }],
      k2: [
        {
          inst: 'ney',
          octave: 12,
          gain: 0.7,
          bars: [
            [[0, 4, 6, 0.55], [6, 3, 2, 0.45], [8, 2, 8, 0.5]],
            [[0, 1, 4, 0.5], [4, 2, 4, 0.45], [8, 0, 8, 0.5]],
            [[0, 5, 6, 0.5], [6, 4, 2, 0.45], [8, 3, 8, 0.5]],
            [[0, 4, 12, 0.55]],
          ],
        },
      ],
      k3: [{ inst: 'drums', octave: 0, bars: [[[0, 'B', 1, 0.5], [10, 'B', 1, 0.35]]] }],
    },
    {
      root: 50,
      scale: 'minor',
      chords: [
        [0, 1, 4, 7],
        [-2, 0, 2, 4],
        [-4, 0, 1, 4],
        [-3, 0, 2, 4],
      ],
      pad: { inst: 'glass', octave: 0 },
      k1: [],
      k2: [{ inst: 'bell', octave: 12, gain: 0.5, bars: [[[0, 7, 16, 0.4]], [], [[8, 4, 8, 0.35]], []] }],
      k3: [],
    },
  ],
};

export const THEMES: Readonly<Record<MusicWorld, ThemeDef>> = {
  kapadokya,
  likya,
  karadeniz,
  erciyes,
  pamukkale,
  menu,
  suru,
};

export const MUSIC_WORLDS = Object.keys(THEMES) as MusicWorld[];

/** SÜRÜ section index for a sunset time fraction (0..1). */
export function suruSection(timeFrac: number): number {
  if (timeFrac < SURU_SECTION_EDGES[0]) return 0;
  if (timeFrac < SURU_SECTION_EDGES[1]) return 1;
  return 2;
}
