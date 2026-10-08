import { describe, expect, it } from 'vitest';
import { MemoryKV, STORAGE_KEYS } from '../../src/core/save.ts';
import type { QualityTier } from '../../src/core/settings.ts';
import { runBenchmark } from '../../src/perf/benchmark.ts';
import type { DeviceInfo } from '../../src/perf/deviceGuess.ts';
import { fingerprint, guessTier, uaMajor } from '../../src/perf/deviceGuess.ts';
import { PerformanceDirector } from '../../src/perf/PerformanceDirector.ts';
import { initialMp, mpRange, pixelRatioFor, TIER_ORDER, TIERS } from '../../src/perf/tiers.ts';

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 11; M1903F10G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';

function dev(gpu: string, extra: Partial<DeviceInfo> = {}): DeviceInfo {
  return { gpu, vendor: '', screenW: 393, screenH: 851, dpr: 2.75, ua: ANDROID_UA, cores: 8, maxTextureSize: 16384, memoryGB: 6, ...extra };
}

describe('tier table', () => {
  it('matches §5.2 ranges and budgets', () => {
    expect(TIERS.low.common).toMatchObject({ mpMin: 0.45, mpMax: 0.65, dprCap: 1.25, maxDrawCalls: 80, maxTriangles: 150_000, particleCap: 300, anisotropy: 1 });
    expect(TIERS.medium.common).toMatchObject({ mpMin: 0.65, mpMax: 1.0, dprCap: 1.75, maxDrawCalls: 140, maxTriangles: 350_000, particleCap: 800 });
    expect(TIERS.high.common).toMatchObject({ mpMin: 1.0, mpMax: 1.6, dprCap: 2.25, maxDrawCalls: 220, maxTriangles: 700_000, particleCap: 1500 });
    expect(TIERS.ultra.common).toMatchObject({ mpMin: 1.6, mpMax: 2.4, dprCap: 3, maxDrawCalls: 300, maxTriangles: 1_200_000, particleCap: 3000 });
    for (const t of TIER_ORDER) expect(TIERS[t].suru.simBirds).toBe(1500); // gameplay identical on every tier
    expect(TIERS.low.kanat).toMatchObject({ cdlodGrid: 17, lod0RadiusM: 100, terrainViewKm: 12, maxFragSamples: 4, targetDrawCalls: 45, targetTriangles: 140_000 });
    expect(TIERS.ultra.kanat).toMatchObject({ cdlodGrid: 33, cdlodExtraLevel: true, lod0RadiusM: 450, terrainViewKm: 40, cloudImpostors: 250, cloudLayers: 3 });
  });

  it('clamps MP ranges to the native screen and derives pixel ratio', () => {
    expect(mpRange('ultra', 1.0)).toEqual([1.0, 1.0]);
    expect(initialMp('high', 3)).toBeCloseTo(1.3, 6);
    const pr = pixelRatioFor(1.3, 390, 844, 2.25, 3);
    expect(390 * 844 * pr * pr).toBeCloseTo(1.3e6, -3);
    expect(pixelRatioFor(2.4, 390, 844, 1.25, 3)).toBe(1.25); // tier DPR cap
    expect(pixelRatioFor(2.4, 390, 844, 3, 2)).toBe(2); // never above device DPR
  });
});

describe('static guess (§5.3 regex table)', () => {
  const cases: [string, QualityTier][] = [
    ['ANGLE (Qualcomm, Adreno (TM) 506, OpenGL ES 3.2)', 'low'],
    ['Adreno (TM) 610', 'low'],
    ['Adreno (TM) 616', 'low'],
    ['ANGLE (Qualcomm, Adreno (TM) 618, OpenGL ES 3.2)', 'medium'], // Mi 9T
    ['Adreno (TM) 619', 'medium'],
    ['Adreno (TM) 640', 'high'],
    ['Adreno (TM) 660', 'high'],
    ['ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', 'ultra'], // Xiaomi 13
    ['Adreno (TM) 830', 'ultra'],
    ['Mali-G52 MC2', 'low'],
    ['Mali-G57 MC2', 'low'],
    ['Mali-G68 MC4', 'medium'],
    ['ANGLE (ARM, Mali-G76 MC4, OpenGL ES 3.2)', 'medium'],
    ['Mali-G78 MP14', 'medium'],
    ['Mali-G710 MC10', 'high'],
    ['Immortalis-G715', 'ultra'],
    ['ANGLE (Samsung Xclipse 920) on Vulkan', 'high'],
    ['PowerVR Rogue GE8320', 'low'],
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'low'],
    ['Some Future GPU 9000', 'medium'],
  ];
  for (const [gpu, tier] of cases) {
    it(`${gpu} → ${tier}`, () => {
      expect(guessTier(dev(gpu)).tier).toBe(tier);
    });
  }

  it('masked "Apple GPU" (iPhone 11/13) starts High and may be promoted to Ultra', () => {
    const g = guessTier(dev('Apple GPU', { ua: IOS_UA, screenW: 390, screenH: 844, dpr: 3 }));
    expect(g).toMatchObject({ tier: 'high', maxTier: 'ultra', family: 'apple', ios: true });
  });

  it('fingerprint = GPU + screen + UA major, orientation independent', () => {
    const a = dev('Adreno (TM) 618');
    const b = dev('Adreno (TM) 618', { screenW: 851, screenH: 393 });
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(a)).not.toBe(fingerprint(dev('Adreno (TM) 618', { ua: ANDROID_UA.replace('Chrome/141', 'Chrome/142') })));
    expect(fingerprint(a)).not.toBe(fingerprint(dev('Adreno (TM) 640')));
    expect(uaMajor(ANDROID_UA)).toBe('c141');
    expect(uaMajor(IOS_UA)).toBe('s18');
  });
});

describe('micro-benchmark', () => {
  function fakeGpu(costs: Partial<Record<QualityTier, number>>) {
    let t = 0;
    const draws: QualityTier[] = [];
    return {
      now: () => t,
      draws,
      draw: (tier: QualityTier) => {
        draws.push(tier);
        t += costs[tier] ?? 5;
      },
      sync: () => {
        t += 0.2;
      },
    };
  }

  it('picks the highest tier with an estimated frame ≤ 11 ms (measures high → low, warms up each tier)', async () => {
    const f = fakeGpu({ ultra: 19, high: 10, medium: 6, low: 3 });
    const r = await runBenchmark(f.draw, ['low', 'medium', 'high', 'ultra'], { now: f.now, sync: f.sync, yieldFn: async () => undefined });
    expect(r.tier).toBe('high');
    expect(r.measured).toEqual(['ultra', 'high']);
    expect(r.estimates.ultra).toBeCloseTo(19.2, 5);
    expect(r.timedOut).toBe(false);
    expect(r.elapsedMs).toBeLessThanOrEqual(1500);
    expect(f.draws.filter((d) => d === 'ultra').length).toBe(6); // 1 warm-up + 5 timed
  });

  it('stays within the 1.5 s budget on a very slow device', async () => {
    const f = fakeGpu({ ultra: 400, high: 300, medium: 200, low: 100 });
    const r = await runBenchmark(f.draw, ['low', 'medium', 'high', 'ultra'], { now: f.now, sync: f.sync, yieldFn: async () => undefined });
    expect(r.timedOut).toBe(true);
    expect(r.elapsedMs).toBeLessThan(1500 + 401 * 2);
    expect(TIER_ORDER.indexOf(r.tier)).toBeLessThan(TIER_ORDER.indexOf('ultra'));
  });
});

describe('PerformanceDirector', () => {
  const now = () => 0;

  it('auto: static guess → benchmark (clamped to one tier below the guess) → governor', async () => {
    const kv = new MemoryKV();
    const d = new PerformanceDirector({ kv, now });
    expect(d.init(dev('Adreno (TM) 640'))).toBe('high');
    expect(d.needsBenchmark).toBe(true);
    let t = 0;
    const r = await d.benchmark(
      (tier) => {
        t += tier === 'ultra' ? 30 : tier === 'high' ? 25 : tier === 'medium' ? 20 : 4;
      },
      { now: () => t, sync: () => undefined, yieldFn: async () => undefined },
    );
    // low (4 ms) would pass but a capable phone never goes below guess − 1
    expect(r.measured).not.toContain('low');
    expect(d.tier).toBe('medium');
    expect(d.snapshot().source).toBe('benchmark');
  });

  it('saves the stable tier to perf.profile.v1 and starts from it next session (no benchmark)', () => {
    const kv = new MemoryKV();
    const device = dev('Adreno (TM) 618');
    const d1 = new PerformanceDirector({ kv, now });
    d1.init(device);
    d1.forceTier('high');
    let t = 0;
    for (let i = 0; i < 60 * 190; i++) {
      t += 1000 / 60;
      d1.frame({ nowMs: t, intervalMs: 1000 / 60, cpuMs: 4, costMs: i % 60 === 0 ? 11 : NaN, steps: 1, targetMs: 1000 / 60 });
    }
    const raw = kv.getItem(STORAGE_KEYS.perfProfile);
    expect(raw).toBeTruthy();
    const file = JSON.parse(raw!);
    expect(file.entries[fingerprint(device)]).toMatchObject({ tier: 'high', stable: true });
    const d2 = new PerformanceDirector({ kv, now });
    expect(d2.init(device)).toBe('high');
    expect(d2.needsBenchmark).toBe(false);
    expect(d2.snapshot().source).toBe('profile');
  });

  it('manual tier: governor keeps the tier, only resolution moves; back to auto restores auto control', () => {
    const kv = new MemoryKV();
    const d = new PerformanceDirector({ kv, now, quality: 'ultra' });
    d.init(dev('Adreno (TM) 618'));
    expect(d.tier).toBe('ultra');
    expect(d.needsBenchmark).toBe(false);
    let t = 0;
    for (let i = 0; i < 60 * 30; i++) {
      t += 30;
      d.frame({ nowMs: t, intervalMs: 30, cpuMs: 12, costMs: NaN, steps: 1, targetMs: 1000 / 60 });
    }
    d.naturalBreak();
    expect(d.tier).toBe('ultra');
    expect(d.mp).toBeLessThan(TIERS.ultra.common.mpMax);
    d.setQuality('auto');
    expect(d.qualitySetting).toBe('auto');
    expect(d.tier).toBe('medium'); // back to the guess (no profile, no benchmark)
  });

  it('snapshot exposes the perf-panel fields', () => {
    const d = new PerformanceDirector({ kv: new MemoryKV(), now });
    d.init(dev('Adreno (TM) 740', { screenW: 393, screenH: 873 }));
    d.setRendererStatsSource(() => ({ calls: 42, triangles: 120_000, programs: 18, textures: 30, geometries: 50, textureMB: 61.5 }));
    const s = d.snapshot(393, 873);
    expect(s).toMatchObject({ tier: 'ultra', quality: 'auto', renderer: { calls: 42, programs: 18 } });
    expect(s.pixelRatio).toBeGreaterThan(1);
    expect(d.ultra120Available(120)).toBe(true);
    expect(d.ultra120Available(60)).toBe(false);
  });
});
