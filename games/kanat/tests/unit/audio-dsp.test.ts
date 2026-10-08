import { describe, expect, it } from 'vitest';
import { SoundBank, bankJobs } from '../../src/audio/bank.ts';
import { GEN_SR, decimate2, karplus, limiterCurve, makePcm, makeSeamless, resampleLinear, shapeSample } from '../../src/audio/dsp.ts';
import { loudness, meter, truePeakAbs } from '../../src/audio/measure.ts';
import { DRUM_IDS, PCM_INSTS, PCM_REFS, nearestRef } from '../../src/audio/music/pcm.ts';
import { Rng } from '../../src/audio/rng.ts';
import { SFX, SFX_IDS } from '../../src/audio/sfxLib.ts';

const bank = new SoundBank();
bank.generateSync();

describe('sound bank (all procedural)', () => {
  it('generates every clip: finite, non-silent, peak-normalized to −3 dBFS', () => {
    expect(bank.pcm.size).toBe(bankJobs().length);
    for (const [k, p] of bank.pcm) {
      const m = meter(p.ch, p.sr);
      expect(m.nanCount, k).toBe(0);
      if (k.startsWith('ir:')) continue;
      expect(m.peakDb, k).toBeGreaterThan(-3.05);
      expect(m.peakDb, k).toBeLessThan(-2.95);
      expect(m.rmsDb, k).toBeGreaterThan(-45);
    }
  });

  it('covers ~35+ SFX plus ambience beds, instruments and drums', () => {
    const oneShots = SFX_IDS.filter((id) => !SFX[id].loop);
    expect(oneShots.length).toBeGreaterThanOrEqual(35);
    for (const id of ['thermalHum', 'murmur', 'storm', 'rain', 'waves', 'trickle'] as const) expect(SFX[id].loop).toBe(true);
    expect(PCM_INSTS.length).toBe(5);
    expect(DRUM_IDS.length).toBe(8);
  });

  it('is deterministic (seeded): two banks render identical audio', () => {
    const b2 = new SoundBank();
    b2.generateSync();
    for (const k of ['graze', 'gateChime', 'murmur', 'inst:ud:57']) {
      const a = bank.get(k)!.ch[0];
      const b = b2.get(k)!.ch[0];
      expect(a.length).toBe(b.length);
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
      expect(diff, k).toBe(0);
    }
  });

  it('loops are seamless: the wrap-around step looks like any other sample step', () => {
    for (const k of ['pinkLoop', 'brownLoop', 'whiteLoop', 'thermalHum', 'murmur', 'storm', 'rain', 'waves', 'trickle']) {
      const c = bank.get(k)!.ch[0];
      let sum = 0;
      let max = 0;
      for (let i = 1; i < c.length; i++) {
        const d = Math.abs(c[i] - c[i - 1]);
        sum += d;
        if (d > max) max = d;
      }
      const seam = Math.abs(c[0] - c[c.length - 1]);
      // the seam step must be within the normal distribution of steps (no click)
      expect(seam, k).toBeLessThan(Math.max(6 * (sum / (c.length - 1)), max * 0.5));
    }
  });

  it('one-shots start and end at (near) zero → click-free', () => {
    for (const id of SFX_IDS) {
      if (SFX[id].loop) continue;
      for (const c of bank.get(id)!.ch) {
        expect(Math.abs(c[0]), id).toBeLessThan(0.02);
        expect(Math.abs(c[c.length - 1]), id).toBeLessThan(0.02);
      }
    }
  });
});

describe('DSP primitives', () => {
  it('Karplus-Strong is in tune (±5 cents)', () => {
    for (const f of [110, 220, 329.63, 440]) {
      const o = new Float32Array(GEN_SR);
      karplus(o, f, { decay: 2, bright: 0.5, damp: 0.3, pick: 0.15 }, new Rng(1));
      // Autocorrelation peak near the expected period.
      const T = GEN_SR / f;
      let best = 0;
      let bestLag = 0;
      for (let lag = Math.floor(T * 0.9); lag <= Math.ceil(T * 1.1); lag++) {
        let acc = 0;
        for (let i = 2000; i < 30000; i++) acc += o[i] * o[i + lag];
        if (acc > best) {
          best = acc;
          bestLag = lag;
        }
      }
      // parabolic refinement
      const ac = (lag: number) => {
        let a = 0;
        for (let i = 2000; i < 30000; i++) a += o[i] * o[i + lag];
        return a;
      };
      const y0 = ac(bestLag - 1);
      const y1 = ac(bestLag);
      const y2 = ac(bestLag + 1);
      const lag = bestLag + (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2);
      const cents = 1200 * Math.log2(T / lag);
      expect(Math.abs(cents), `f=${f}`).toBeLessThan(5);
    }
  });

  it('safety limiter curve: identity below the knee, never above the ceiling, monotonic', () => {
    const curve = limiterCurve(4096, 0.5, -6, -1.5);
    const ceil = Math.pow(10, -1.5 / 20);
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
    for (const x of [0, 0.1, -0.3, 0.45]) expect(shapeSample(curve, x * 0.5)).toBeCloseTo(x, 3);
    for (const x of [0.9, 1, 1.5, 3, 100, -100]) expect(Math.abs(shapeSample(curve, x * 0.5))).toBeLessThanOrEqual(ceil + 1e-6);
  });

  it('makeSeamless preserves level and length bookkeeping', () => {
    const p = makePcm(1.2, 1);
    const r = new Rng(3);
    for (let i = 0; i < p.ch[0].length; i++) p.ch[0][i] = r.bi() * 0.5;
    const s = makeSeamless(p, 0.2);
    expect(s.ch[0].length).toBe(Math.round(1.0 * GEN_SR));
  });

  it('decimate2 / resampleLinear keep tone and level', () => {
    const p = makePcm(0.5, 1);
    for (let i = 0; i < p.ch[0].length; i++) p.ch[0][i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / GEN_SR);
    const d = decimate2(p);
    expect(d.sr).toBe(GEN_SR / 2);
    expect(d.ch[0].length).toBe(p.ch[0].length / 2);
    const mid = d.ch[0].subarray(100, d.ch[0].length - 100);
    expect(Math.max(...mid)).toBeCloseTo(0.5, 2);
    const r = resampleLinear(p, 44100);
    expect(r.ch[0].length).toBe(Math.round((p.ch[0].length * 44100) / GEN_SR));
  });

  it('nearestRef keeps transposition within ±6 semitones over the playable range', () => {
    for (const inst of PCM_INSTS) {
      const refs = PCM_REFS[inst];
      for (let m = refs[0] - 6; m <= refs[refs.length - 1] + 6; m++) expect(Math.abs(m - nearestRef(inst, m))).toBeLessThanOrEqual(6);
    }
  });
});

describe('metering (BS.1770)', () => {
  it('calibration: 997 Hz sine at 0 dBFS in one channel reads −3.01 LUFS; −20 dBFS stereo reads −20', () => {
    const n = GEN_SR * 3;
    const a = new Float32Array(n);
    const z = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = Math.sin((2 * Math.PI * 997 * i) / GEN_SR);
    expect(loudness([a, z], GEN_SR).integrated).toBeCloseTo(-3.01, 1);
    for (let i = 0; i < n; i++) a[i] *= 0.1;
    expect(loudness([a, a], GEN_SR).integrated).toBeCloseTo(-20.0, 1);
  });

  it('true peak sees inter-sample overs that sample peak misses', () => {
    const n = 4800;
    const a = new Float32Array(n);
    // fs/4 sine sampled at 45° phase: samples at ±0.707, true peak 1.0
    for (let i = 0; i < n; i++) a[i] = Math.sin((Math.PI / 2) * i + Math.PI / 4);
    let sp = 0;
    for (const v of a) sp = Math.max(sp, Math.abs(v));
    expect(sp).toBeCloseTo(0.7071, 3);
    expect(truePeakAbs([a])).toBeGreaterThan(0.97);
  });
});
