// Pitch & scale tables. Makam flavours are approximated on a 12-TET grid with fractional semitones
// for the characteristic "koma" degrees (segâh etc.). Inspiration only — no existing melody is used.

export type ScaleId =
  | 'hicaz'
  | 'ussak'
  | 'huseyni'
  | 'rast'
  | 'kurdi'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'lydian'
  | 'pentaMajor'
  | 'pentaMinor';

/** Semitone offsets from the tonic for one octave (fractional = microtonal). */
export const SCALES: Readonly<Record<ScaleId, readonly number[]>> = {
  // Hicaz: half step, augmented second, half step (D Eb F# G A Bb C).
  hicaz: [0, 1, 4, 5, 7, 8, 10],
  // Uşşak: 2nd degree a koma flat (segâh-like), minor-ish colour (A B♭k C D E F G).
  ussak: [0, 1.75, 3, 5, 7, 8, 10],
  // Hüseyni: like Uşşak with a koma-flat 6th (A Bk C D E F#k G).
  huseyni: [0, 1.75, 3, 5, 7, 8.75, 10],
  // Rast: neutral-ish 3rd and 7th (G A Bk C D E F#k).
  rast: [0, 2, 3.8, 5, 7, 9, 10.8],
  // Kürdi: phrygian colour.
  kurdi: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  pentaMajor: [0, 2, 4, 7, 9],
  pentaMinor: [0, 3, 5, 7, 10],
};

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function hzToMidi(f: number): number {
  return 69 + 12 * Math.log2(f / 440);
}

/** Semitone offset of a (possibly negative / >octave) scale degree. */
export function degreeToSemitone(scale: readonly number[], degree: number): number {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  const idx = degree - oct * n;
  return oct * 12 + scale[idx];
}

/** MIDI note (float) for a scale degree above `rootMidi`. */
export function degreeToMidi(scale: readonly number[], rootMidi: number, degree: number): number {
  return rootMidi + degreeToSemitone(scale, degree);
}

/**
 * Proximity multiplier tones (§2.3): ×1 Do, ×2 Mi, ×3 Sol, ×5 upper Do.
 * Semitones above the tonic (movable-do: the engine transposes to the active music key).
 */
export const MULT_TONE_SEMITONES: Readonly<Record<number, number>> = { 1: 0, 2: 4, 3: 7, 5: 12 };

/** Reference pitch for the multiplier tones when no music key is active: C5. */
export const MULT_TONE_BASE_MIDI = 72;

export function multToneMidi(mult: number, tonicPc = 0): number {
  const st = MULT_TONE_SEMITONES[mult] ?? 0;
  // Keep the tonic within C5..B5 so the tones always sit in the same register.
  const tonic = MULT_TONE_BASE_MIDI + (((tonicPc % 12) + 12) % 12);
  const base = tonic > 77 ? tonic - 12 : tonic;
  return base + st;
}
