// GameBridge (§7.2) — identical contract in all 3 games. Owner: platform.
//
// Envelope: {"v":1,"game":"kanat","type":"<type>","id":"<optional request id>","payload":{…}} (JSON string)
// Game → host transports, tried in order:
//   1 window.ReactNativeWebView.postMessage
//   2 window.webkit.messageHandlers.gameBridge.postMessage
//   3 window.AndroidGameBridge.postMessage            (@JavascriptInterface)
//   4 window.GameBridgeChannel.postMessage            (Flutter JavaScriptChannel)
//   5 window.flutter_inappwebview.callHandler('gameBridge', json)
//   6 window.parent.postMessage(json, '*')            (iframe)
//   none → standalone: silent no-op, the game is fully playable in a browser.
// Host → game: window.GameBridge.receive(jsonString), `message` events (window + document), URL params
//   ?lang=tr&quality=auto&mode=<id>&muted=0&safeTop=..&safeBottom=..&safeLeft=..&safeRight=..&test=1

import { base64ToBytes } from '../core/base64.ts';
import { closeTopLayer } from '../core/layers.ts';
import type { HostStorageChannel } from '../core/save.ts';
import type { QualitySetting } from '../core/settings.ts';

export { base64ToBytes };

export const BRIDGE_PROTOCOL_VERSION = 1;
export const GAME_ID = 'kanat';

export type HapticName = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
export type HapticPattern = HapticName | number[];

export interface GameToHostPayloads {
  ready: { version: string; modes: string[]; capabilities: Record<string, unknown> };
  loading: { progress: number };
  started: { mode: string };
  ended: { mode: string; score: number; stars: number; durationSec: number; result: string };
  haptic: { pattern: HapticPattern };
  share: { text: string; imageDataUrl?: string; videoBlobUrl?: string; mimeType?: string };
  analytics: { name: string; params: Record<string, unknown> };
  'storage:set': { key: string; value: string };
  'storage:get': { key: string; id: string };
  exit: Record<string, never>;
  perf: { tier: string; fpsP50: number; fpsP90: number };
  error: { message: string; fatal: boolean };
}

export interface HostToGamePayloads {
  pause: Record<string, never>;
  resume: Record<string, never>;
  mute: { muted: boolean };
  setLocale: { lang: string };
  setSafeArea: { top: number; right: number; bottom: number; left: number };
  setQuality: { tier: QualitySetting };
  'storage:value': { id: string; value: unknown };
  setProfile: { displayName?: string; avatarUrl?: string };
  back: Record<string, never>;
}

export type GameToHostType = keyof GameToHostPayloads;
export type HostToGameType = keyof HostToGamePayloads;

export const GAME_TO_HOST_TYPES: readonly GameToHostType[] = [
  'ready', 'loading', 'started', 'ended', 'haptic', 'share', 'analytics', 'storage:set', 'storage:get', 'exit', 'perf', 'error',
];
export const HOST_TO_GAME_TYPES: readonly HostToGameType[] = [
  'pause', 'resume', 'mute', 'setLocale', 'setSafeArea', 'setQuality', 'storage:value', 'setProfile', 'back',
];

export interface Envelope<T = unknown> {
  v: 1;
  game: string;
  type: string;
  id?: string;
  payload: T;
}

export type TransportName = 'reactNative' | 'webkit' | 'android' | 'flutterChannel' | 'flutterInApp' | 'iframe' | 'none';

export interface UrlParams {
  lang?: string;
  quality?: QualitySetting;
  mode?: string;
  muted?: boolean;
  safeTop?: number;
  safeBottom?: number;
  safeLeft?: number;
  safeRight?: number;
  test: boolean;
}

export interface ShareResult {
  method: 'host' | 'webshare' | 'clipboard' | 'download' | 'none';
  /** The user dismissed the native share sheet. */
  cancelled?: boolean;
  /** Text was copied to the clipboard. */
  copied?: boolean;
  /** Object/data URL of the image for a "download" link when nothing else could share it. */
  downloadUrl?: string;
}

/** Minimal window surface the bridge touches (injectable for tests). */
export interface BridgeWindow {
  ReactNativeWebView?: { postMessage(s: string): void };
  webkit?: { messageHandlers?: { gameBridge?: { postMessage(s: unknown): void } } };
  AndroidGameBridge?: { postMessage(s: string): void };
  GameBridgeChannel?: { postMessage(s: string): void };
  flutter_inappwebview?: { callHandler(name: string, ...args: unknown[]): unknown };
  parent?: unknown;
  GameBridge?: unknown;
  addEventListener?(type: string, fn: (e: unknown) => void): void;
  removeEventListener?(type: string, fn: (e: unknown) => void): void;
  location?: { search: string };
}

export interface BridgeNavigator {
  userAgent?: string;
  vibrate?(p: number | number[]): boolean;
  share?(d: { text?: string; files?: unknown[]; title?: string }): Promise<void>;
  canShare?(d: { files?: unknown[] }): boolean;
  clipboard?: { writeText(s: string): Promise<void> };
}

export interface BridgeEnv {
  win: BridgeWindow;
  nav?: BridgeNavigator;
  doc?: { addEventListener(type: string, fn: (e: unknown) => void): void; removeEventListener(type: string, fn: (e: unknown) => void): void };
  now?: () => number;
  /** Create a File from bytes (tests stub it). */
  makeFile?: (bytes: Uint8Array, name: string, mime: string) => unknown;
  createObjectURL?: (blob: Blob) => string;
}

export interface BridgeLogEntry {
  dir: 'out' | 'in';
  type: string;
  transport: TransportName | 'receive' | 'message' | 'url';
  at: number;
  payload: unknown;
}

const HAPTIC_MS: Record<HapticName, number | number[]> = {
  light: 12,
  medium: 25,
  heavy: 50,
  success: [20, 60, 40],
  warning: [40, 80, 40],
  error: [60, 60, 60, 60, 60],
};

/** Game-side names from the GDD (§2.3) → bridge patterns. */
export const GAME_HAPTICS: Readonly<Record<string, HapticPattern>> = {
  hafif: 'light',
  orta: 'medium',
  guclu: 'heavy',
  güçlü: 'heavy',
  cift: [10, 40, 10],
  çift: [10, 40, 10],
  yildiz: [40],
  yıldız: [40],
};

/** Total vibration ms of a pattern ([vib, pause, vib, …]). */
export function hapticDurationMs(p: HapticPattern): number {
  const v = typeof p === 'string' ? HAPTIC_MS[p] : p;
  if (typeof v === 'number') return v;
  let ms = 0;
  for (let i = 0; i < v.length; i += 2) ms += Math.max(0, v[i] ?? 0);
  return ms;
}

export function parseUrlParams(search: string): UrlParams {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const num = (k: string): number | undefined => {
    const s = q.get(k);
    if (s === null || s === '') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const quality = q.get('quality');
  const muted = q.get('muted');
  return {
    lang: q.get('lang') ?? undefined,
    quality: quality && ['auto', 'ultra', 'high', 'medium', 'low'].includes(quality) ? (quality as QualitySetting) : undefined,
    mode: q.get('mode') ?? undefined,
    muted: muted === null ? undefined : muted === '1' || muted === 'true',
    safeTop: num('safeTop'),
    safeBottom: num('safeBottom'),
    safeLeft: num('safeLeft'),
    safeRight: num('safeRight'),
    test: q.get('test') === '1' || q.get('test') === 'true',
  };
}

type Handler<K extends HostToGameType> = (payload: HostToGamePayloads[K], env: Envelope<HostToGamePayloads[K]>) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export class GameBridge implements HostStorageChannel {
  readonly env: BridgeEnv;
  readonly urlParams: UrlParams;
  readonly log: BridgeLogEntry[] = [];
  private readonly handlers = new Map<string, Set<Handler<HostToGameType>>>();
  private readonly pending = new Map<string, (v: string | null | undefined) => void>();
  private reqCounter = 0;
  private outbox: string[] = [];
  private outboxUntil = 0;
  private hapticLevel: 'on' | 'low' | 'off' = 'on';
  private hapticHistory: { at: number; ms: number }[] = [];
  private installed = false;
  private readonly onMessageBound = (e: unknown) => this.onMessage(e);
  private readonly onFlutterReady = () => this.flushOutbox();
  private readonly clock: () => number;
  stats = { sent: 0, delivered: 0, received: 0, dropped: 0 };

  constructor(env?: Partial<BridgeEnv>) {
    const g = globalThis as unknown as { window?: BridgeWindow; navigator?: BridgeNavigator; document?: BridgeEnv['doc'] };
    this.env = {
      win: env?.win ?? g.window ?? {},
      nav: env?.nav ?? g.navigator,
      doc: env?.doc ?? g.document,
      now: env?.now,
      makeFile: env?.makeFile,
      createObjectURL: env?.createObjectURL,
    };
    this.clock = this.env.now ?? (() => Date.now());
    this.urlParams = parseUrlParams(this.env.win.location?.search ?? '');
  }

  /** Expose window.GameBridge.receive and start listening. Idempotent. */
  install(): this {
    if (this.installed) return this;
    this.installed = true;
    const w = this.env.win;
    w.GameBridge = {
      v: BRIDGE_PROTOCOL_VERSION,
      game: GAME_ID,
      receive: (json: unknown) => this.receive(json),
      /** Debug helper for hosts: last transport used. */
      transport: () => this.transport(),
    };
    w.addEventListener?.('message', this.onMessageBound);
    // react-native-webview on Android dispatches on document
    this.env.doc?.addEventListener('message', this.onMessageBound);
    w.addEventListener?.('flutterInAppWebViewPlatformReady', this.onFlutterReady);
    this.outboxUntil = this.clock() + 5000;
    return this;
  }

  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;
    const w = this.env.win;
    w.removeEventListener?.('message', this.onMessageBound);
    this.env.doc?.removeEventListener('message', this.onMessageBound);
    w.removeEventListener?.('flutterInAppWebViewPlatformReady', this.onFlutterReady);
    if (w.GameBridge) delete w.GameBridge;
  }

  // ---- transports ----------------------------------------------------------------------------

  /** Which transport a send() would use right now. */
  transport(): TransportName {
    const w = this.env.win;
    if (typeof w.ReactNativeWebView?.postMessage === 'function') return 'reactNative';
    if (typeof w.webkit?.messageHandlers?.gameBridge?.postMessage === 'function') return 'webkit';
    if (typeof w.AndroidGameBridge?.postMessage === 'function') return 'android';
    if (typeof w.GameBridgeChannel?.postMessage === 'function') return 'flutterChannel';
    if (typeof w.flutter_inappwebview?.callHandler === 'function') return 'flutterInApp';
    if (w.parent && w.parent !== w && typeof (w.parent as { postMessage?: unknown }).postMessage === 'function') return 'iframe';
    return 'none';
  }

  hasHost(): boolean {
    return this.transport() !== 'none';
  }

  private deliver(json: string): TransportName {
    const w = this.env.win;
    const t = this.transport();
    try {
      switch (t) {
        case 'reactNative':
          w.ReactNativeWebView!.postMessage(json);
          break;
        case 'webkit':
          w.webkit!.messageHandlers!.gameBridge!.postMessage(json);
          break;
        case 'android':
          w.AndroidGameBridge!.postMessage(json);
          break;
        case 'flutterChannel':
          w.GameBridgeChannel!.postMessage(json);
          break;
        case 'flutterInApp': {
          const r = w.flutter_inappwebview!.callHandler('gameBridge', json);
          if (r && typeof (r as Promise<unknown>).then === 'function') {
            // A reply from callHandler is treated as an inbound message (lets Flutter answer storage:get).
            (r as Promise<unknown>).then(
              (reply) => {
                if (reply !== undefined && reply !== null && reply !== '') this.receive(reply, 'receive');
              },
              () => undefined,
            );
          }
          break;
        }
        case 'iframe':
          (w.parent as { postMessage(m: unknown, o: string): void }).postMessage(json, '*');
          break;
        case 'none':
          break;
      }
    } catch (err) {
      console.warn('[bridge] transport failed', t, err);
      return 'none';
    }
    return t;
  }

  private flushOutbox(): void {
    if (this.outbox.length === 0 || !this.hasHost()) return;
    const q = this.outbox;
    this.outbox = [];
    for (const json of q) this.deliver(json);
  }

  /** Send a game → host event. Returns true when a host transport took it. */
  send<K extends GameToHostType>(type: K, payload: GameToHostPayloads[K], id?: string): boolean {
    const env: Envelope<GameToHostPayloads[K]> = { v: 1, game: GAME_ID, type, payload };
    if (id !== undefined) env.id = id;
    const json = JSON.stringify(env);
    this.stats.sent++;
    if (this.outbox.length) this.flushOutbox();
    const t = this.deliver(json);
    this.pushLog({ dir: 'out', type, transport: t, at: this.clock(), payload });
    if (t === 'none') {
      // flutter_inappwebview injects its handler late: keep early messages for a few seconds.
      if (this.clock() < this.outboxUntil && this.outbox.length < 64) this.outbox.push(json);
      else this.stats.dropped++;
      return false;
    }
    this.stats.delivered++;
    return true;
  }

  // ---- inbound -------------------------------------------------------------------------------

  on<K extends HostToGameType>(type: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(fn as unknown as Handler<HostToGameType>);
    return () => set.delete(fn as unknown as Handler<HostToGameType>);
  }

  private onMessage(e: unknown): void {
    const data = isRecord(e) ? (e as { data?: unknown }).data : undefined;
    if (data === undefined) return;
    this.receive(data, 'message');
  }

  /** Host → game entry point (also window.GameBridge.receive). Returns true if handled. */
  receive(input: unknown, via: 'receive' | 'message' | 'url' = 'receive'): boolean {
    let msg: unknown = input;
    if (typeof input === 'string') {
      if (input.length > 2_000_000) return false;
      try {
        msg = JSON.parse(input);
      } catch {
        return false;
      }
    }
    if (!isRecord(msg)) return false;
    if (msg.v !== 1 || typeof msg.type !== 'string') return false;
    if (msg.game !== undefined && msg.game !== GAME_ID) return false;
    const type = msg.type as HostToGameType;
    if (!HOST_TO_GAME_TYPES.includes(type)) return false; // also ignores echoes of our own events
    const payload = (isRecord(msg.payload) ? msg.payload : {}) as HostToGamePayloads[HostToGameType];
    const env = { v: 1, game: GAME_ID, type, id: typeof msg.id === 'string' ? msg.id : undefined, payload } as Envelope<
      HostToGamePayloads[HostToGameType]
    >;
    this.stats.received++;
    this.pushLog({ dir: 'in', type, transport: via, at: this.clock(), payload });
    if (this.outbox.length) this.flushOutbox();

    if (type === 'storage:value') {
      const p = payload as HostToGamePayloads['storage:value'];
      const id = typeof p.id === 'string' ? p.id : env.id;
      const resolve = id ? this.pending.get(id) : undefined;
      if (id && resolve) {
        this.pending.delete(id);
        const v = p.value;
        resolve(v === null || v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v));
      }
    }
    if (type === 'back') {
      // Topmost layer closes first (a layer may refuse and stay, e.g. the in-flight layer opens the
      // pause menu instead); with nothing open the player wants out → `exit`.
      const consumed = closeTopLayer();
      this.dispatch(type, payload, env);
      if (!consumed) this.send('exit', {});
      return true;
    }
    this.dispatch(type, payload, env);
    return true;
  }

  private dispatch(type: HostToGameType, payload: unknown, env: Envelope<unknown>): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as (p: unknown, e: Envelope<unknown>) => void)(payload, env);
      } catch (err) {
        console.error(`[bridge] handler for ${type} threw`, err);
      }
    }
  }

  /** Replay URL params as host commands (call once handlers are registered). */
  applyUrlParams(): void {
    const p = this.urlParams;
    const fake = (type: HostToGameType, payload: Record<string, unknown>): void => {
      this.receive({ v: 1, game: GAME_ID, type, payload }, 'url');
    };
    if (p.lang) fake('setLocale', { lang: p.lang });
    if (p.quality) fake('setQuality', { tier: p.quality });
    if (p.muted !== undefined) fake('mute', { muted: p.muted });
    if (p.safeTop !== undefined || p.safeBottom !== undefined || p.safeLeft !== undefined || p.safeRight !== undefined) {
      fake('setSafeArea', { top: p.safeTop ?? 0, right: p.safeRight ?? 0, bottom: p.safeBottom ?? 0, left: p.safeLeft ?? 0 });
    }
  }

  private pushLog(e: BridgeLogEntry): void {
    this.log.push(e);
    if (this.log.length > 200) this.log.shift();
  }

  // ---- storage (HostStorageChannel) ----------------------------------------------------------

  storageGet(key: string, timeoutMs: number): Promise<string | null | undefined> {
    if (!this.hasHost()) return Promise.resolve(undefined);
    const id = `s${++this.reqCounter}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) resolve(undefined);
      }, timeoutMs);
      this.pending.set(id, (v) => {
        clearTimeout(timer);
        resolve(v);
      });
      this.send('storage:get', { key, id }, id);
    });
  }

  storageSet(key: string, value: string): void {
    this.send('storage:set', { key, value });
  }

  // ---- convenience events --------------------------------------------------------------------

  ready(version: string, modes: string[], capabilities: Record<string, unknown> = {}): void {
    this.send('ready', {
      version,
      modes,
      capabilities: {
        bridge: BRIDGE_PROTOCOL_VERSION,
        haptics: true,
        share: true,
        storage: true,
        safeArea: true,
        back: true,
        quality: ['auto', 'ultra', 'high', 'medium', 'low'],
        lang: ['tr', 'en'],
        orientation: ['portrait', 'landscape'],
        ...capabilities,
      },
    });
  }

  loading(progress: number): void {
    this.send('loading', { progress: Math.max(0, Math.min(1, Math.round(progress * 1000) / 1000)) });
  }

  started(mode: string): void {
    this.send('started', { mode });
  }

  ended(p: GameToHostPayloads['ended']): void {
    this.send('ended', p);
  }

  analytics(name: string, params: Record<string, unknown> = {}): void {
    this.send('analytics', { name, params });
  }

  exit(): void {
    this.send('exit', {});
  }

  error(message: string, fatal = false): void {
    this.send('error', { message: String(message).slice(0, 2000), fatal });
  }

  perf(tier: string, fpsP50: number, fpsP90: number): void {
    this.send('perf', { tier, fpsP50, fpsP90 });
  }

  // ---- haptics -------------------------------------------------------------------------------

  setHapticLevel(level: 'on' | 'low' | 'off'): void {
    this.hapticLevel = level;
  }

  /**
   * Haptic with the §2.12 fatigue cap (≤150 ms of vibration per second) and the "Az" level.
   * Host present → `haptic` event. No host → navigator.vibrate on Android only; iOS has none.
   */
  haptic(pattern: HapticPattern | keyof typeof GAME_HAPTICS): boolean {
    if (this.hapticLevel === 'off') return false;
    let p: HapticPattern | null =
      typeof pattern === 'string' && !(pattern in HAPTIC_MS) ? (GAME_HAPTICS[pattern] ?? null) : (pattern as HapticPattern);
    if (p === null) return false;
    if (this.hapticLevel === 'low') {
      if (typeof p === 'string') {
        p = p === 'heavy' ? 'medium' : p === 'medium' ? 'light' : p === 'light' ? null : p;
      } else {
        p = p.map((v, i) => (i % 2 === 0 ? Math.round(v * 0.6) : v));
        if (hapticDurationMs(p) < 8) p = null;
      }
      if (p === null) return false;
    }
    const t = this.clock();
    const ms = hapticDurationMs(p);
    while (this.hapticHistory.length && t - this.hapticHistory[0].at > 1000) this.hapticHistory.shift();
    let used = 0;
    for (const h of this.hapticHistory) used += h.ms;
    if (used + ms > 150) return false;
    this.hapticHistory.push({ at: t, ms });

    if (this.hasHost()) return this.send('haptic', { pattern: p });
    const nav = this.env.nav;
    const ua = nav?.userAgent ?? '';
    if (/Android/i.test(ua) && typeof nav?.vibrate === 'function') {
      try {
        const v = typeof p === 'string' ? HAPTIC_MS[p] : p;
        return nav.vibrate(v);
      } catch {
        return false;
      }
    }
    return false;
  }

  // ---- share ---------------------------------------------------------------------------------

  /** Host share → Web Share (with image file when supported) → clipboard + download link. */
  async share(d: GameToHostPayloads['share'], filename = 'kanat.png'): Promise<ShareResult> {
    if (this.hasHost()) {
      this.send('share', d);
      return { method: 'host' };
    }
    const nav = this.env.nav;
    if (nav && typeof nav.share === 'function') {
      try {
        if (d.imageDataUrl) {
          const file = this.dataUrlToFile(d.imageDataUrl, filename);
          if (file && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
            await nav.share({ text: d.text, files: [file] });
            return { method: 'webshare' };
          }
        }
        await nav.share({ text: d.text });
        return { method: 'webshare' };
      } catch (err) {
        if (isRecord(err) && (err as { name?: string }).name === 'AbortError') return { method: 'webshare', cancelled: true };
        // NotAllowedError (no user gesture) etc. → fall back
      }
    }
    let copied = false;
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(d.text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    const downloadUrl = d.imageDataUrl ? this.imageDownloadUrl(d.imageDataUrl) : undefined;
    if (copied) return { method: 'clipboard', copied, downloadUrl };
    if (downloadUrl) return { method: 'download', copied, downloadUrl };
    return { method: 'none', copied };
  }

  private dataUrlToFile(dataUrl: string, name: string): unknown {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
    if (!m) return null;
    const mime = m[1] ?? 'application/octet-stream';
    const bytes = m[2] ? base64ToBytes(m[3]) : new TextEncoder().encode(decodeURIComponent(m[3]));
    if (this.env.makeFile) return this.env.makeFile(bytes, name, mime);
    if (typeof File === 'undefined') return null;
    return new File([bytes as BlobPart], name, { type: mime });
  }

  private imageDownloadUrl(dataUrl: string): string {
    try {
      const m = /^data:([^;,]+)?;base64,(.*)$/s.exec(dataUrl);
      const create = this.env.createObjectURL ?? (typeof URL !== 'undefined' && URL.createObjectURL ? (b: Blob) => URL.createObjectURL(b) : null);
      if (m && create && typeof Blob !== 'undefined') {
        return create(new Blob([base64ToBytes(m[2]) as BlobPart], { type: m[1] ?? 'image/png' }));
      }
    } catch {
      // fall through to the data URL itself
    }
    return dataUrl;
  }
}

/** Trigger a browser download for a URL (used by the share fallback UI). */
export function triggerDownload(url: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

let singleton: GameBridge | null = null;

/** The app-wide bridge (installed on first call). */
export function getBridge(): GameBridge {
  if (!singleton) singleton = new GameBridge().install();
  return singleton;
}
