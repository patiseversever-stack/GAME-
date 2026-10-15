// Ana uygulama (Expo / React Native WebView) ile haberleşme + titreşim + yerel kayıt.
// WebView dışında (tarayıcı önizlemesi) titreşim için navigator.vibrate kullanılır.

export type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

interface RNWindow extends Window {
  ReactNativeWebView?: {postMessage: (s: string) => void};
}
const w = window as RNWindow;

export const inApp = (): boolean => !!w.ReactNativeWebView;

export function post(type: string, payload: Record<string, unknown> = {}): void {
  try {
    w.ReactNativeWebView?.postMessage(JSON.stringify({v: 1, type, ...payload}));
  } catch {
    /* yok say */
  }
}

let hapticsOn = true;
export function setHaptics(on: boolean): void {
  hapticsOn = on;
}

const PATTERN: Record<Haptic, number | number[]> = {light: 8, medium: 18, heavy: [30, 30, 45], success: [12, 40, 22], warning: [20, 60, 20]};
export function haptic(kind: Haptic): void {
  if (!hapticsOn) return;
  if (inApp()) return post('haptic', {kind});
  try {
    navigator.vibrate?.(PATTERN[kind]);
  } catch {
    /* desteklenmiyor */
  }
}

type HostMsg = {type: string; [k: string]: unknown};
const listeners = new Set<(m: HostMsg) => void>();
export function onHost(fn: (m: HostMsg) => void): void {
  listeners.add(fn);
}
function receive(e: MessageEvent | Event): void {
  const data = (e as MessageEvent).data;
  try {
    const m = typeof data === 'string' ? JSON.parse(data) : data;
    if (m && typeof m.type === 'string') listeners.forEach(f => f(m));
  } catch {
    /* başka mesaj */
  }
}
window.addEventListener('message', receive);
document.addEventListener('message', receive as EventListener); // Android WebView

// Yerel kayıt (tarayıcı önizlemesi için; uygulamada jeton ana uygulamadan gelecek)
export const store = {
  get<T>(k: string, def: T): T {
    try {
      const v = localStorage.getItem('kh.' + k);
      return v === null ? def : (JSON.parse(v) as T);
    } catch {
      return def;
    }
  },
  set(k: string, v: unknown): void {
    try {
      localStorage.setItem('kh.' + k, JSON.stringify(v));
    } catch {
      /* gizli mod vb. */
    }
  },
};
