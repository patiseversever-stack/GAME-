// window.__game test API (§9.2) — installed ONLY with ?test=1.
// Platform owns the registry; modes plug in their handlers:
//
//   import { registerTestHandlers, markTime } from '../debug/testApi.ts';
//   const off = registerTestHandlers({ state: () => …, hash: () => sim.hash(), step: (n) => …, goto: async (m, l, s) => … });
//   markTime('crash'); markTime('replayStart'); markTime('retry'); markTime('controllable');
//
// Latest registration wins per function; unregistering restores the previous one. A call to a function
// nobody registered throws a clear error (tests fail loudly instead of passing silently).

import type { QualityTier } from '../core/settings.ts';

export interface TestHandlers {
  /** Serializable summary of the running mode. */
  state(): unknown;
  /** Sim state hash. */
  hash(): number | string;
  /** Go to a mode / level / seed. Resolve when controllable. */
  goto(mode: string, level?: string | number, seed?: number): unknown;
  /** Inject a command (Command shape for flight/SÜRÜ). */
  input(cmd: unknown): unknown;
  /** Advance the sim deterministically n ticks (render-independent). */
  step(n: number): unknown;
  setTier(t: QualityTier): unknown;
  /** renderer.info + texture memory estimate + particles + JS heap. */
  perf(): unknown;
  freezeVisuals(on: boolean): unknown;
  /** Start an autoplay bot ('careful' | 'expert' | 'noise' | …); null stops it. */
  bot(policy: string | null): unknown;
}

export type TestHandlerName = keyof TestHandlers;
export const TEST_HANDLER_NAMES: readonly TestHandlerName[] = ['state', 'hash', 'goto', 'input', 'step', 'setTier', 'perf', 'freezeVisuals', 'bot'];

interface Registration {
  h: Partial<TestHandlers>;
  source: string;
}

const registrations: Registration[] = [];
const timestamps: Record<string, number[]> = {};
let readyResolve: (() => void) | null = null;
let readyFlag = false;
const readyPromise = new Promise<void>((r) => {
  readyResolve = r;
});

export function registerTestHandlers(h: Partial<TestHandlers>, source = 'mode'): () => void {
  const reg: Registration = { h, source };
  registrations.push(reg);
  return () => {
    const i = registrations.indexOf(reg);
    if (i >= 0) registrations.splice(i, 1);
  };
}

export function findTestHandler<K extends TestHandlerName>(name: K): { fn: TestHandlers[K]; source: string } | null {
  for (let i = registrations.length - 1; i >= 0; i--) {
    const fn = registrations[i].h[name];
    if (typeof fn === 'function') return { fn: fn as TestHandlers[K], source: registrations[i].source };
  }
  return null;
}

export function registeredHandlers(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of TEST_HANDLER_NAMES) {
    const f = findTestHandler(n);
    if (f) out[n] = f.source;
  }
  return out;
}

/** Timestamp (performance.now ms) for crash → replay → retry measurement (§9.G-16). */
export function markTime(name: string): void {
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const list = timestamps[name] ?? (timestamps[name] = []);
  list.push(t);
  if (list.length > 100) list.shift();
}

export function getTimestamps(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const k of Object.keys(timestamps)) out[k] = [...timestamps[k]];
  return out;
}

/** Boot calls this when the first interactive screen is up. */
export function markTestReady(): void {
  if (readyFlag) return;
  readyFlag = true;
  markTime('ready');
  readyResolve?.();
}

export function isTestReady(): boolean {
  return readyFlag;
}

function missing(name: string): never {
  throw new Error(
    `__game.${name}(): no handler registered — the active mode has not wired registerTestHandlers({ ${name} }) (src/debug/testApi.ts)`,
  );
}

export interface TestApiContext {
  /** Platform-level summary (FSM state, pause reasons, settings, bridge …). */
  app(): unknown;
  /** Send a raw game→host bridge event (bridge e2e). */
  emit(type: string, payload: unknown): boolean;
  bridgeLog(): unknown;
  confirmResume(): void;
  loseContext(): boolean;
  restoreContext(): boolean;
}

export function isTestMode(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
  const q = new URLSearchParams(search);
  return q.get('test') === '1' || q.get('test') === 'true';
}

export interface GameTestApi {
  ready(): Promise<boolean>;
  state(): unknown;
  hash(): unknown;
  goto(mode: string, level?: string | number, seed?: number): Promise<unknown>;
  input(cmd: unknown): unknown;
  step(n: number): unknown;
  setTier(t: QualityTier): unknown;
  perf(): unknown;
  freezeVisuals(on: boolean): unknown;
  bot(policy: string | null): unknown;
  handlers(): Record<string, string>;
  timestamps(): Record<string, number[]>;
  mark(name: string): void;
  app(): unknown;
  emit(type: string, payload: unknown): boolean;
  bridgeLog(): unknown;
  confirmResume(): void;
  loseContext(): boolean;
  restoreContext(): boolean;
}

/** Install window.__game (no-op unless ?test=1, or `force`). Returns the API object. */
export function installTestApi(ctx: TestApiContext, force = false): GameTestApi | null {
  if (!force && !isTestMode()) return null;
  const call = <K extends TestHandlerName>(name: K, ...args: unknown[]): unknown => {
    const f = findTestHandler(name);
    if (!f) missing(name);
    return (f.fn as (...a: unknown[]) => unknown)(...args);
  };
  const api: GameTestApi = {
    ready: async () => {
      await readyPromise;
      return true;
    },
    state: () => call('state'),
    hash: () => call('hash'),
    goto: async (mode, level, seed) => call('goto', mode, level, seed),
    input: (cmd) => call('input', cmd),
    step: (n) => call('step', n),
    setTier: (t) => call('setTier', t),
    perf: () => call('perf'),
    freezeVisuals: (on) => call('freezeVisuals', on),
    bot: (policy) => call('bot', policy),
    handlers: registeredHandlers,
    timestamps: getTimestamps,
    mark: markTime,
    app: () => ctx.app(),
    emit: (type, payload) => ctx.emit(type, payload),
    bridgeLog: () => ctx.bridgeLog(),
    confirmResume: () => ctx.confirmResume(),
    loseContext: () => ctx.loseContext(),
    restoreContext: () => ctx.restoreContext(),
  };
  (globalThis as unknown as { __game?: GameTestApi }).__game = api;
  return api;
}
