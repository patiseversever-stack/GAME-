import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events.ts';
import { AppFSM, APP_STATES, APP_TRANSITIONS } from '../../src/core/fsm.ts';
import type { AppEvents } from '../../src/core/fsm.ts';
import { closeTopLayer, clearLayers, layerNames, pushLayer } from '../../src/core/layers.ts';
import { GameLoop, renderDivider, snapRefreshHz } from '../../src/core/loop.ts';
import type { FrameSample } from '../../src/core/loop.ts';
import { formatSportTime, trDayKey, VisualClock } from '../../src/core/time.ts';
import { LocalAdapter } from '../../src/net/NetAdapter.ts';
import type { Command } from '../../src/sim/types.ts';

describe('EventBus', () => {
  it('on / off / once / isolation of throwing listeners', () => {
    const bus = new EventBus<{ a: number; b: string }>();
    bus.onListenerError = () => undefined;
    const got: number[] = [];
    const off = bus.on('a', (n) => got.push(n));
    bus.once('a', (n) => got.push(n * 10));
    bus.on('a', () => {
      throw new Error('boom');
    });
    bus.emit('a', 1);
    bus.emit('a', 2);
    off();
    bus.emit('a', 3);
    expect(got).toEqual([1, 10, 2]);
    expect(bus.listenerCount('a')).toBe(1);
  });
});

describe('AppFSM', () => {
  it('follows the Boot → Loading → Menu → Mode → Game → Result chain and refuses invalid jumps', () => {
    const fsm = new AppFSM();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(fsm.state).toBe('boot');
    expect(fsm.go('game')).toBe(false);
    for (const s of ['loading', 'menu', 'mode', 'game', 'result', 'game', 'game', 'menu'] as const) expect(fsm.go(s)).toBe(true);
    expect(fsm.history.map((h) => h.to)).toEqual(['loading', 'menu', 'mode', 'game', 'result', 'game', 'game', 'menu']);
    for (const s of APP_STATES) expect(Array.isArray(APP_TRANSITIONS[s])).toBe(true);
  });

  it('pause / resume / visibility / context loss are handled in every state', () => {
    for (const state of APP_STATES) {
      const bus = new EventBus<AppEvents>();
      const fsm = new AppFSM(bus);
      const path: Record<string, string[]> = {
        boot: [],
        loading: ['loading'],
        menu: ['loading', 'menu'],
        mode: ['loading', 'menu', 'mode'],
        game: ['loading', 'menu', 'game'],
        result: ['loading', 'menu', 'game', 'result'],
      };
      for (const s of path[state]) fsm.go(s as never);
      const seen: string[] = [];
      bus.on('suspend', () => seen.push('suspend'));
      bus.on('unsuspend', () => seen.push('unsuspend'));
      bus.on('resumePrompt', ({ show }) => seen.push(`prompt:${show}`));
      fsm.setVisible(false);
      expect(fsm.suspended).toBe(true);
      expect(fsm.simRunning).toBe(false);
      fsm.setVisible(true);
      fsm.pause('host');
      fsm.resume('host');
      fsm.contextLost();
      expect(fsm.renderRunning).toBe(false);
      fsm.contextRestored();
      const prompts = seen.filter((s) => s === 'prompt:true').length;
      expect(seen.filter((s) => s === 'suspend').length).toBe(3);
      expect(seen.filter((s) => s === 'unsuspend').length).toBe(3);
      // only an interrupted flight asks for "Devam"
      expect(prompts > 0).toBe(state === 'game');
    }
  });

  it('"Devam" holds the sim until confirmed; a user pause never auto-prompts', () => {
    const fsm = new AppFSM();
    fsm.go('loading');
    fsm.go('menu');
    fsm.go('game');
    expect(fsm.simRunning).toBe(true);
    fsm.setVisible(false);
    fsm.setVisible(true);
    expect(fsm.resumePromptVisible).toBe(true);
    expect(fsm.simRunning).toBe(false);
    expect(fsm.renderRunning).toBe(true);
    fsm.confirmResume();
    expect(fsm.simRunning).toBe(true);
    fsm.pause('user');
    fsm.pause('host');
    fsm.resume('host');
    expect(fsm.resumePromptVisible).toBe(false); // the pause menu is still up
    expect(fsm.simRunning).toBe(false);
    fsm.resume('user');
    expect(fsm.simRunning).toBe(true);
    // leaving the game clears a user pause
    fsm.pause('user');
    fsm.go('result');
    expect(fsm.isPausedBy('user')).toBe(false);
  });

  it('per-state handlers receive enter/exit/pause/visibility', () => {
    const fsm = new AppFSM();
    const log: string[] = [];
    fsm.handle('menu', {
      enter: (_d, from) => log.push(`enter<${from}`),
      exit: (to) => log.push(`exit>${to}`),
      pause: (r) => log.push(`pause:${r}`),
      visibility: (v) => log.push(`vis:${v}`),
    });
    fsm.go('loading');
    fsm.go('menu');
    fsm.setVisible(false);
    fsm.setVisible(true);
    fsm.go('mode');
    expect(log).toEqual(['enter<loading', 'vis:false', 'pause:hidden', 'vis:true', 'exit>mode']);
  });
});

describe('layer stack (back button)', () => {
  it('closes the topmost layer; refusing layers stay; empty → false', () => {
    clearLayers();
    const closed: string[] = [];
    pushLayer('settings', () => {
      closed.push('settings');
    });
    pushLayer('flight', () => {
      closed.push('flight');
      return false;
    });
    expect(closeTopLayer()).toBe(true);
    expect(layerNames()).toEqual(['settings', 'flight']);
    const h = pushLayer('modal', () => {
      closed.push('modal');
    });
    expect(closeTopLayer()).toBe(true);
    expect(layerNames()).toEqual(['settings', 'flight']);
    h.pop();
    clearLayers();
    expect(closeTopLayer()).toBe(false);
    expect(closed).toEqual(['flight', 'modal']);
  });
});

function fakeRaf() {
  let t = 0;
  let cb: ((t: number) => void) | null = null;
  return {
    raf: (f: (t: number) => void) => {
      cb = f;
      return 1;
    },
    caf: () => {
      cb = null;
    },
    now: () => t,
    /** advance one vsync of `dt` ms and run the frame */
    tick(dt: number) {
      t += dt;
      const f = cb;
      cb = null;
      f?.(t);
    },
    get pending() {
      return cb !== null;
    },
  };
}

describe('GameLoop', () => {
  it('fixed 60 Hz steps with interpolation alpha, max 5 catch-up steps', () => {
    const r = fakeRaf();
    let steps = 0;
    const alphas: number[] = [];
    const loop = new GameLoop({ step: () => steps++, render: (a) => alphas.push(a) }, { raf: r.raf, caf: r.caf, now: r.now });
    loop.start();
    r.tick(16.667);
    for (let i = 0; i < 120; i++) r.tick(1000 / 60);
    expect(steps).toBeGreaterThanOrEqual(118);
    expect(steps).toBeLessThanOrEqual(121);
    for (const a of alphas) expect(a).toBeGreaterThanOrEqual(0);
    for (const a of alphas) expect(a).toBeLessThan(1);
    const before = steps;
    r.tick(200); // long hitch: 12 steps owed, at most 5 run
    expect(steps - before).toBe(5);
  });

  it('120 Hz panel renders every 2nd rAF (60 fps) unless ultra120', () => {
    const r = fakeRaf();
    let renders = 0;
    const loop = new GameLoop({ step: () => undefined, render: () => renders++ }, { raf: r.raf, caf: r.caf, now: r.now });
    loop.start();
    for (let i = 0; i < 64; i++) r.tick(1000 / 120); // detection window
    expect(loop.refreshHz).toBe(120);
    expect(loop.renderEvery).toBe(2);
    renders = 0;
    for (let i = 0; i < 120; i++) r.tick(1000 / 120);
    expect(renders).toBe(60);
    loop.setUltra120(true);
    renders = 0;
    for (let i = 0; i < 120; i++) r.tick(1000 / 120);
    expect(renders).toBe(120);
  });

  it('30 FPS battery mode on 60 Hz: every 2nd vsync, evenly spaced; sim speed unchanged', () => {
    const r = fakeRaf();
    const intervals: number[] = [];
    let steps = 0;
    const loop = new GameLoop(
      { step: () => steps++, render: () => undefined, frameEnd: (s: FrameSample) => intervals.push(s.intervalMs) },
      { raf: r.raf, caf: r.caf, now: r.now },
    );
    loop.setFpsMode(30);
    loop.start();
    for (let i = 0; i < 64; i++) r.tick(1000 / 60);
    intervals.length = 0;
    steps = 0;
    for (let i = 0; i < 120; i++) r.tick(1000 / 60);
    expect(intervals.length).toBe(60);
    for (const iv of intervals) expect(iv).toBeCloseTo(1000 / 30, 3);
    expect(steps).toBeGreaterThanOrEqual(119);
    expect(steps).toBeLessThanOrEqual(121);
  });

  it('stop/start never bursts; simEnabled=false holds ticks but keeps rendering; stepN is render-independent', () => {
    const r = fakeRaf();
    let renders = 0;
    let steps = 0;
    const loop = new GameLoop({ step: () => steps++, render: () => renders++ }, { raf: r.raf, caf: r.caf, now: r.now });
    loop.start();
    for (let i = 0; i < 10; i++) r.tick(1000 / 60);
    loop.stop();
    expect(r.pending).toBe(false);
    const s0 = steps;
    loop.start();
    r.tick(60_000); // a minute in the background
    expect(steps - s0).toBeLessThanOrEqual(1);
    loop.setSimEnabled(false);
    const s1 = steps;
    const r1 = renders;
    for (let i = 0; i < 30; i++) r.tick(1000 / 60);
    expect(steps).toBe(s1);
    expect(renders - r1).toBe(30);
    loop.setSimEnabled(true);
    loop.stepN(7);
    expect(steps).toBe(s1 + 7);
    expect(loop.tick).toBe(steps);
  });

  it('time scale (Yavaş Mod 0.8×) and 30 Hz step rate', () => {
    const r = fakeRaf();
    let steps = 0;
    const loop = new GameLoop({ step: () => steps++, render: () => undefined }, { raf: r.raf, caf: r.caf, now: r.now, stepHz: 30 });
    loop.start();
    r.tick(1000 / 60);
    for (let i = 0; i < 600; i++) r.tick(1000 / 60);
    expect(steps).toBeGreaterThanOrEqual(299);
    expect(steps).toBeLessThanOrEqual(301);
    loop.setStepHz(60);
    loop.setTimeScale(0.8);
    steps = 0;
    for (let i = 0; i < 600; i++) r.tick(1000 / 60);
    expect(steps).toBeGreaterThanOrEqual(478);
    expect(steps).toBeLessThanOrEqual(481);
  });

  it('probe runs at most once per interval and reports cost', () => {
    const r = fakeRaf();
    const costs: number[] = [];
    let probes = 0;
    const loop = new GameLoop(
      { step: () => undefined, render: () => undefined, frameEnd: (s) => !Number.isNaN(s.costMs) && costs.push(s.costMs) },
      { raf: r.raf, caf: r.caf, now: r.now },
    );
    loop.setProbe(() => probes++, 1000);
    loop.start();
    for (let i = 0; i < 300; i++) r.tick(1000 / 60);
    expect(probes).toBe(5);
    expect(costs.length).toBe(5);
  });

  it('refresh snapping and divider table', () => {
    expect(snapRefreshHz(119.3)).toBe(120);
    expect(snapRefreshHz(59.7)).toBe(60);
    expect(snapRefreshHz(30.2)).toBe(30);
    expect(renderDivider(120, 60)).toBe(2);
    expect(renderDivider(90, 60)).toBe(1);
    expect(renderDivider(60, 30)).toBe(2);
    expect(renderDivider(120, 30)).toBe(4);
    expect(renderDivider(30, 60)).toBe(1);
    expect(renderDivider(144, 60)).toBe(2);
  });
});

describe('time helpers', () => {
  it('sport time, TR day key, visual clock freeze', () => {
    expect(formatSportTime(127_400)).toBe('2:07.4');
    expect(formatSportTime(5_049)).toBe('0:05.0');
    expect(trDayKey(Date.UTC(2026, 9, 7, 21, 30))).toBe('2026-10-08'); // 00:30 in Türkiye
    const c = new VisualClock();
    c.advance(1);
    c.freeze(true);
    c.advance(5);
    expect(c.time).toBe(1);
    c.freeze(false);
    c.advance(0.5);
    expect(c.time).toBe(1.5);
  });
});

describe('LocalAdapter', () => {
  it('loops commands back synchronously and drains per tick in send order', () => {
    let tick = 10;
    const net = new LocalAdapter<Command>(() => tick);
    const seen: number[] = [];
    net.onCommand((c) => seen.push(c.tick));
    net.send({ tick: 10, actorId: 0, cmd: 'axis', args: [1, 2] });
    net.send({ tick: 12, actorId: 1, cmd: 'axis', args: [3, 4] });
    net.send({ tick: 9, actorId: 0, cmd: 'parachute', args: [] });
    expect(seen).toEqual([10, 12, 9]);
    const out: Command[] = [];
    expect(net.drain(10, out)).toBe(2);
    expect(out.map((c) => c.tick)).toEqual([10, 9]);
    expect(net.pending).toBe(1);
    expect(net.now()).toBe(10);
    tick = 12;
    let snap: unknown = null;
    net.onSnapshot((s) => (snap = s));
    net.publishSnapshot({ hash: 5 });
    expect(snap).toEqual({ hash: 5 });
  });
});
