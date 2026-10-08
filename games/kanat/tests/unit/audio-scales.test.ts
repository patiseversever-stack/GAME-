import { describe, expect, it } from 'vitest';
import { MULT_TONE_SEMITONES, SCALES, degreeToMidi, degreeToSemitone, hzToMidi, midiToHz, multToneMidi } from '../../src/audio/scales.ts';

describe('scale tables', () => {
  it('every scale starts on the tonic, ascends, and stays inside one octave', () => {
    for (const [id, s] of Object.entries(SCALES)) {
      expect(s[0], id).toBe(0);
      for (let i = 1; i < s.length; i++) expect(s[i], id).toBeGreaterThan(s[i - 1]);
      expect(s[s.length - 1], id).toBeLessThan(12);
    }
  });

  it('makam colours: Hicaz augmented second, Uşşak koma-flat second', () => {
    const h = SCALES.hicaz;
    expect(h[1] - h[0]).toBe(1);
    expect(h[2] - h[1]).toBe(3); // augmented second (Eb → F#)
    expect(h[3] - h[2]).toBe(1);
    const u = SCALES.ussak;
    expect(u[1]).toBeGreaterThan(1.5);
    expect(u[1]).toBeLessThan(2); // between minor and major second
    expect(u[2]).toBe(3);
    expect(SCALES.huseyni[5]).toBeGreaterThan(8);
    expect(SCALES.huseyni[5]).toBeLessThan(9);
  });

  it('degree arithmetic wraps octaves in both directions', () => {
    const maj = SCALES.major;
    expect(degreeToSemitone(maj, 0)).toBe(0);
    expect(degreeToSemitone(maj, 7)).toBe(12);
    expect(degreeToSemitone(maj, 9)).toBe(16);
    expect(degreeToSemitone(maj, -1)).toBe(-1);
    expect(degreeToSemitone(maj, -7)).toBe(-12);
    expect(degreeToMidi(SCALES.pentaMajor, 60, 5)).toBe(72);
  });

  it('midi ↔ Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 9);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
    expect(hzToMidi(880)).toBeCloseTo(81, 9);
  });
});

describe('multiplier tones (§2.3: ×1 Do, ×2 Mi, ×3 Sol, ×5 üst Do)', () => {
  it('pentatonic intervals', () => {
    expect(MULT_TONE_SEMITONES[1]).toBe(0);
    expect(MULT_TONE_SEMITONES[2]).toBe(4);
    expect(MULT_TONE_SEMITONES[3]).toBe(7);
    expect(MULT_TONE_SEMITONES[5]).toBe(12);
  });

  it('default key is C5 (C E G C)', () => {
    expect([1, 2, 3, 5].map((m) => multToneMidi(m))).toEqual([72, 76, 79, 84]);
  });

  it('movable-do: follows the active music tonic but stays in one register', () => {
    // D tonic (Kapadokya Hicaz)
    expect([1, 2, 3, 5].map((m) => multToneMidi(m, 2))).toEqual([74, 78, 81, 86]);
    // A tonic wraps down to stay near C5
    expect(multToneMidi(1, 9)).toBe(69);
    for (let pc = 0; pc < 12; pc++) {
      const t = multToneMidi(1, pc);
      expect(t).toBeGreaterThanOrEqual(66);
      expect(t).toBeLessThanOrEqual(77);
    }
  });
});
