import { afterEach, describe, expect, it } from 'vitest';
import { clearLayers, pushLayer } from '../../src/core/layers.ts';
import type { BridgeNavigator, BridgeWindow, Envelope } from '../../src/bridge/GameBridge.ts';
import { GAME_TO_HOST_TYPES, GameBridge, hapticDurationMs, HOST_TO_GAME_TYPES, parseUrlParams } from '../../src/bridge/GameBridge.ts';

type Listener = (e: unknown) => void;

function fakeWindow(extra: Partial<BridgeWindow> = {}, search = '') {
  const listeners = new Map<string, Set<Listener>>();
  const w: BridgeWindow & { fire(type: string, e: unknown): void } = {
    location: { search },
    addEventListener(t, f) {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t)!.add(f);
    },
    removeEventListener(t, f) {
      listeners.get(t)?.delete(f);
    },
    fire(type, e) {
      for (const f of listeners.get(type) ?? []) f(e);
    },
    ...extra,
  };
  if (!('parent' in extra)) w.parent = w; // top-level window
  return w;
}

const sink = () => {
  const out: string[] = [];
  return { out, postMessage: (s: unknown) => out.push(String(s)) };
};

afterEach(() => clearLayers());

describe('transports (order §7.2)', () => {
  it('detects each transport and prefers them in protocol order', () => {
    const rn = sink();
    const wk = sink();
    const an = sink();
    const fl = sink();
    const parent = sink();
    const all = fakeWindow({
      ReactNativeWebView: rn,
      webkit: { messageHandlers: { gameBridge: wk } },
      AndroidGameBridge: an,
      GameBridgeChannel: fl,
      flutter_inappwebview: { callHandler: () => undefined },
      parent: { postMessage: (m: unknown) => parent.postMessage(m) },
    });
    const order: string[] = [];
    const b = new GameBridge({ win: all });
    const w = all as unknown as Record<string, unknown>;
    for (const key of ['ReactNativeWebView', 'webkit', 'AndroidGameBridge', 'GameBridgeChannel', 'flutter_inappwebview', 'parent']) {
      order.push(b.transport());
      if (key === 'parent') w.parent = all;
      else delete w[key];
    }
    order.push(b.transport());
    expect(order).toEqual(['reactNative', 'webkit', 'android', 'flutterChannel', 'flutterInApp', 'iframe', 'none']);
  });

  it('sends the exact envelope as a JSON string', () => {
    const rn = sink();
    const b = new GameBridge({ win: fakeWindow({ ReactNativeWebView: rn }) });
    expect(b.send('ended', { mode: 'career', score: 100, stars: 2, durationSec: 61.5, result: 'landed' })).toBe(true);
    expect(JSON.parse(rn.out[0])).toEqual({ v: 1, game: 'kanat', type: 'ended', payload: { mode: 'career', score: 100, stars: 2, durationSec: 61.5, result: 'landed' } });
    b.send('storage:get', { key: 'k', id: 'r1' }, 'r1');
    expect(JSON.parse(rn.out[1])).toEqual({ v: 1, game: 'kanat', type: 'storage:get', id: 'r1', payload: { key: 'k', id: 'r1' } });
  });

  it('flutter_inappwebview uses callHandler("gameBridge", json) and its reply is an inbound message', async () => {
    const calls: unknown[][] = [];
    const w = fakeWindow({
      flutter_inappwebview: {
        callHandler: (...a: unknown[]) => {
          calls.push(a);
          return Promise.resolve(JSON.stringify({ v: 1, type: 'mute', payload: { muted: true } }));
        },
      },
    });
    const b = new GameBridge({ win: w });
    const muted: boolean[] = [];
    b.on('mute', (p) => muted.push(p.muted));
    b.send('ready', { version: '1', modes: ['career'], capabilities: {} });
    await new Promise((r) => setTimeout(r, 0));
    expect(calls[0][0]).toBe('gameBridge');
    expect(JSON.parse(String(calls[0][1])).type).toBe('ready');
    expect(muted).toEqual([true]);
  });

  it('standalone: silent no-op; early messages are flushed when a late transport appears', () => {
    const w = fakeWindow();
    let t = 0;
    const b = new GameBridge({ win: w, now: () => t }).install();
    expect(b.send('loading', { progress: 0.5 })).toBe(false);
    const fl: unknown[][] = [];
    (w as unknown as Record<string, unknown>).flutter_inappwebview = { callHandler: (...a: unknown[]) => fl.push(a) };
    w.fire('flutterInAppWebViewPlatformReady', {});
    expect(fl.length).toBe(1);
    // after the grace window, nothing is queued anymore
    delete (w as unknown as Record<string, unknown>).flutter_inappwebview;
    t = 10_000;
    b.send('loading', { progress: 1 });
    expect(b.stats.dropped).toBe(1);
  });
});

describe('host → game', () => {
  it('window.GameBridge.receive + message events (window and document) + validation', () => {
    const w = fakeWindow();
    const docL = new Set<Listener>();
    const doc = { addEventListener: (_t: string, f: Listener) => docL.add(f), removeEventListener: (_t: string, f: Listener) => docL.delete(f) };
    const b = new GameBridge({ win: w, doc }).install();
    const got: string[] = [];
    for (const t of HOST_TO_GAME_TYPES) b.on(t, () => got.push(t));
    const api = w.GameBridge as { receive(s: unknown): boolean };
    expect(api.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'pause', payload: {} }))).toBe(true);
    w.fire('message', { data: JSON.stringify({ v: 1, type: 'resume', payload: {} }) }); // game omitted is ok
    for (const f of docL) f({ data: { v: 1, game: 'kanat', type: 'setLocale', payload: { lang: 'en' } } }); // RN Android: object on document
    // rejected: wrong version, other game, unknown type, our own outgoing event echoed back, junk
    expect(api.receive(JSON.stringify({ v: 2, type: 'pause', payload: {} }))).toBe(false);
    expect(api.receive(JSON.stringify({ v: 1, game: 'other', type: 'pause', payload: {} }))).toBe(false);
    expect(api.receive(JSON.stringify({ v: 1, type: 'teleport', payload: {} }))).toBe(false);
    expect(api.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'ready', payload: {} }))).toBe(false);
    expect(api.receive('{oops')).toBe(false);
    expect(got).toEqual(['pause', 'resume', 'setLocale']);
    b.uninstall();
    expect(w.GameBridge).toBeUndefined();
  });

  it('every protocol type is covered by the tables', () => {
    expect(GAME_TO_HOST_TYPES).toEqual(['ready', 'loading', 'started', 'ended', 'haptic', 'share', 'analytics', 'storage:set', 'storage:get', 'exit', 'perf', 'error']);
    expect(HOST_TO_GAME_TYPES).toEqual(['pause', 'resume', 'mute', 'setLocale', 'setSafeArea', 'setQuality', 'storage:value', 'setProfile', 'back']);
  });

  it('back closes the topmost layer first, then sends exit', () => {
    const rn = sink();
    const b = new GameBridge({ win: fakeWindow({ ReactNativeWebView: rn }) });
    const closed: string[] = [];
    pushLayer('settings', () => {
      closed.push('settings');
    });
    b.receive({ v: 1, type: 'back', payload: {} });
    expect(closed).toEqual(['settings']);
    expect(rn.out.length).toBe(0);
    b.receive({ v: 1, type: 'back', payload: {} });
    expect(JSON.parse(rn.out[0]).type).toBe('exit');
  });

  it('URL params', () => {
    expect(parseUrlParams('?lang=en&quality=low&mode=suru&muted=1&safeTop=44&safeBottom=34&test=1')).toEqual({
      lang: 'en',
      quality: 'low',
      mode: 'suru',
      muted: true,
      safeTop: 44,
      safeBottom: 34,
      safeLeft: undefined,
      safeRight: undefined,
      test: true,
    });
    expect(parseUrlParams('?quality=bogus&muted=0').quality).toBeUndefined();
    expect(parseUrlParams('?muted=0').muted).toBe(false);
    const w = fakeWindow({}, '?lang=en&quality=high&safeTop=20');
    const b = new GameBridge({ win: w });
    const seen: Envelope[] = [];
    b.on('setLocale', (_p, e) => seen.push(e));
    b.on('setQuality', (_p, e) => seen.push(e));
    b.on('setSafeArea', (_p, e) => seen.push(e));
    b.applyUrlParams();
    expect(seen.map((e) => [e.type, e.payload])).toEqual([
      ['setLocale', { lang: 'en' }],
      ['setQuality', { tier: 'high' }],
      ['setSafeArea', { top: 20, right: 0, bottom: 0, left: 0 }],
    ]);
  });
});

describe('storage over the bridge', () => {
  it('storage:get ↔ storage:value round trip by id', async () => {
    const host = new Map([['kanat.save', '{"v":1}']]);
    const w = fakeWindow();
    let b!: GameBridge;
    w.ReactNativeWebView = {
      postMessage: (s: string) => {
        const m = JSON.parse(s);
        if (m.type === 'storage:get') {
          // host answers asynchronously, object values are accepted too
          setTimeout(() => b.receive({ v: 1, type: 'storage:value', id: m.id, payload: { id: m.payload.id, value: host.get(m.payload.key) ?? null } }), 1);
        }
      },
    };
    b = new GameBridge({ win: w });
    expect(await b.storageGet('kanat.save', 500)).toBe('{"v":1}');
    expect(await b.storageGet('missing', 500)).toBeNull();
  });

  it('timeout → undefined; no host → undefined immediately', async () => {
    const b = new GameBridge({ win: fakeWindow({ ReactNativeWebView: sink() }) });
    expect(await b.storageGet('x', 20)).toBeUndefined();
    const s = new GameBridge({ win: fakeWindow() });
    expect(await s.storageGet('x', 1000)).toBeUndefined();
  });
});

describe('haptics', () => {
  const android = (vib: (number | number[])[]): BridgeNavigator => ({
    userAgent: 'Mozilla/5.0 (Linux; Android 13)',
    vibrate: (p) => {
      vib.push(p);
      return true;
    },
  });

  it('host present → haptic event; GDD names map to bridge patterns', () => {
    const rn = sink();
    const b = new GameBridge({ win: fakeWindow({ ReactNativeWebView: rn }), now: () => 0 });
    b.haptic('orta');
    b.haptic('çift');
    expect(rn.out.map((s) => JSON.parse(s).payload.pattern)).toEqual(['medium', [10, 40, 10]]);
  });

  it('no host: navigator.vibrate on Android only, nothing on iOS', () => {
    const vib: (number | number[])[] = [];
    let t = 0;
    const b = new GameBridge({ win: fakeWindow(), nav: android(vib), now: () => (t += 500) });
    expect(b.haptic('light')).toBe(true);
    expect(b.haptic('success')).toBe(true);
    expect(vib).toEqual([12, [20, 60, 40]]);
    const ios = new GameBridge({ win: fakeWindow(), nav: { userAgent: 'iPhone OS 18', vibrate: () => true }, now: () => 0 });
    expect(ios.haptic('heavy')).toBe(false);
  });

  it('≤150 ms of vibration per second, "Az" weakens, "Kapalı" mutes', () => {
    const vib: (number | number[])[] = [];
    let t = 0;
    const b = new GameBridge({ win: fakeWindow(), nav: android(vib), now: () => t });
    let ok = 0;
    for (let i = 0; i < 10; i++) if (b.haptic('heavy')) ok++; // 50 ms each
    expect(ok).toBe(3);
    t = 1500;
    expect(b.haptic('heavy')).toBe(true);
    b.setHapticLevel('low');
    t = 3000;
    vib.length = 0;
    b.haptic('heavy');
    b.haptic('light'); // dropped on Az
    expect(vib).toEqual([25]);
    b.setHapticLevel('off');
    expect(b.haptic('error')).toBe(false);
    expect(hapticDurationMs([10, 40, 10])).toBe(20);
  });
});

describe('share fallbacks', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';

  it('host → share event', async () => {
    const rn = sink();
    const b = new GameBridge({ win: fakeWindow({ ReactNativeWebView: rn }) });
    expect(await b.share({ text: 'KANAT', imageDataUrl: png })).toEqual({ method: 'host' });
    expect(JSON.parse(rn.out[0]).payload).toEqual({ text: 'KANAT', imageDataUrl: png });
  });

  it('Web Share with the image file when canShare(files)', async () => {
    const shared: unknown[] = [];
    const nav: BridgeNavigator = { share: async (d) => void shared.push(d), canShare: (d) => Array.isArray(d.files) };
    const b = new GameBridge({ win: fakeWindow(), nav, makeFile: (bytes, name, mime) => ({ bytes: bytes.length, name, mime }) });
    expect(await b.share({ text: 'T', imageDataUrl: png })).toEqual({ method: 'webshare' });
    expect(shared[0]).toEqual({ text: 'T', files: [{ bytes: 8, name: 'kanat.png', mime: 'image/png' }] });
  });

  it('user cancel is not an error; failures fall back to clipboard + download link', async () => {
    const cancel = new GameBridge({
      win: fakeWindow(),
      nav: {
        share: async () => {
          throw Object.assign(new Error('x'), { name: 'AbortError' });
        },
      },
    });
    expect(await cancel.share({ text: 'T' })).toEqual({ method: 'webshare', cancelled: true });
    const copied: string[] = [];
    const b = new GameBridge({
      win: fakeWindow(),
      nav: { clipboard: { writeText: async (s) => void copied.push(s) } },
      createObjectURL: () => 'blob:kanat/1',
    });
    expect(await b.share({ text: 'Günün Rotası #214', imageDataUrl: png })).toEqual({ method: 'clipboard', copied: true, downloadUrl: 'blob:kanat/1' });
    expect(copied).toEqual(['Günün Rotası #214']);
    const none = new GameBridge({ win: fakeWindow(), nav: {} });
    expect(await none.share({ text: 'x' })).toEqual({ method: 'none', copied: false });
  });
});
