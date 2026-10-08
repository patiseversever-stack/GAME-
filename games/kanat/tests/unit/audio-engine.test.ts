import { describe, expect, it } from 'vitest';
import { AudioEngine, FlightAudioAdapter } from '../../src/audio/AudioEngine.ts';
import { Haptics } from '../../src/audio/haptics.ts';
import type { FlightState } from '../../src/sim/types.ts';

function state(over: Partial<FlightState> = {}): FlightState {
  return {
    tick: 0,
    phase: 'flying',
    pos: [0, 100, 0],
    prevPos: [0, 100, 0],
    vel: [0, 0, -50],
    speed: 50,
    gamma: 0,
    psi: 0,
    phi: 0,
    cl: 0.5,
    heightAGL: 50,
    prox: { d: 4, cls: 'rock', nearest: [3, 100, 0], normal: [-1, 0, 0], mult: 2, propId: -1 },
    score: 0,
    combo: 1.5,
    comboTime: 0,
    timeSec: 1,
    gateIndex: 0,
    gatesPassed: 0,
    gatesMissed: 0,
    inThermal: -1,
    inLandingZone: false,
    canopyOpen: false,
    assist: 'full',
    energy: 0,
    ...over,
  };
}

describe('FlightAudioAdapter', () => {
  it('derives bank rate, proximity side and copies flight fields without reallocating', () => {
    const a = new FlightAudioAdapter();
    const o1 = a.fill(state({ phi: 0, timeSec: 1 }));
    const o2 = a.fill(state({ phi: 0.2, timeSec: 1.1 }));
    expect(o1).toBe(o2); // same object every frame
    expect(o2.bankRate).toBeCloseTo(2, 6);
    // Heading north (ψ = 0), surface to the east (+x) → right side.
    expect(o2.proxSide).toBe(1);
    expect(o2.proxCls).toBe('rock');
    expect(o2.mult).toBe(2);
    expect(o2.speedMs).toBe(50);
    // Heading east (ψ = π/2), surface to the north (−z) → left side.
    const o3 = a.fill(state({ psi: Math.PI / 2, timeSec: 1.2, prox: { d: 4, cls: 'tree', nearest: [0, 100, -3], normal: [0, 0, 1], mult: 1, propId: 3 } }));
    expect(o3.proxSide).toBe(-1);
    expect(a.fill(state({ inThermal: 2, timeSec: 1.3 })).thermal).toBe(true);
  });
});

describe('AudioEngine without an AudioContext (before unlock / Node)', () => {
  it('accepts every call safely and still drives haptics', () => {
    const sent: string[] = [];
    let t = 0;
    const eng = new AudioEngine({ haptics: new Haptics({ now: () => t, sink: (_p, name) => sent.push(String(name)) }) });
    expect(eng.unlocked).toBe(false);
    eng.setVolumes({ master: 0.5, muted: true });
    eng.music.setWorld('kapadokya');
    eng.music.setIntensity(1, 0, true);
    eng.suru.setState({ flockSize: 120, timeFrac: 0.5 });
    eng.setFlight({ speedMs: 50, bankRate: 1, prox: 3, mult: 3, combo: 2, inCloud: true, phase: 'flying' });
    eng.event({ type: 'gate', tick: 1, index: 0, points: 100, chain: 1 });
    eng.event({ type: 'crash', tick: 2, pos: [0, 0, 0], cls: 'rock' });
    t += 2000;
    eng.event({ type: 'star', index: 0 });
    eng.event({ type: 'unknownThing', foo: 1 });
    expect(sent).toEqual(['kapı', 'çarpma', 'yıldız']);
    expect(eng.musicIntensity()).toBe(0);
    eng.dispose();
  });

  it('thermal enter/exit toggles 6 Hz haptic ticks via setFlight frames', () => {
    let t = 0;
    const sent: string[] = [];
    const eng = new AudioEngine({ haptics: new Haptics({ now: () => t, sink: (_p, name) => sent.push(String(name)) }) });
    eng.event({ type: 'thermalEnter', tick: 0, index: 0 });
    for (let i = 0; i < 60; i++) {
      eng.setFlight({ speedMs: 40, phase: 'flying' });
      t += 1000 / 60;
    }
    const ticks = sent.filter((s) => s === 'termal').length;
    expect(ticks).toBeGreaterThanOrEqual(5);
    expect(ticks).toBeLessThanOrEqual(7);
    eng.event({ type: 'thermalExit', tick: 0, index: 0 });
    const n = sent.length;
    for (let i = 0; i < 30; i++) {
      eng.setFlight({ speedMs: 40 });
      t += 16;
    }
    expect(sent.length).toBe(n);
  });
});
