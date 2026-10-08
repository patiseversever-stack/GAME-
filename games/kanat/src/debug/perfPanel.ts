// Hidden performance panel (§5.6). Opened by 5 taps on the version label in Settings
// (UI calls attachVersionTapTrigger(versionEl)) or programmatically with openPerfPanel().
// Shows FPS, p50/p90, tier, render MP, draw calls, triangles, programs, texture memory, JS heap.

import type { PerfSnapshot } from '../perf/PerformanceDirector.ts';

type Source = () => PerfSnapshot;

let source: Source | null = null;
let panel: HTMLDivElement | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let onCloseCb: (() => void) | null = null;

/** Boot registers the director's snapshot here. */
export function setPerfPanelSource(fn: Source | null): void {
  source = fn;
}

const fmt = (v: number, d = 1): string => (Number.isFinite(v) ? v.toFixed(d) : '–');

function rows(s: PerfSnapshot): [string, string][] {
  const r = s.renderer;
  return [
    ['FPS', fmt(s.fps)],
    ['p50 / p90', `${fmt(s.p50)} / ${fmt(s.p90)} ms`],
    ['fps p50 / p90', `${fmt(s.fpsP50)} / ${fmt(s.fpsP90)}`],
    ['maliyet p90', `${fmt(s.costP90)} ms`],
    ['CPU p90', `${fmt(s.cpuP90)} ms`],
    ['Kademe', `${s.tier} (${s.quality === 'auto' ? 'Otomatik' : 'Manuel'} · ${s.source})`],
    ['Render MP', `${fmt(s.mp, 2)} MP${Number.isFinite(s.pixelRatio) ? ` · pr ${fmt(s.pixelRatio, 2)}` : ''}`],
    ['Draw call', r ? String(r.calls) : '–'],
    ['Üçgen', r ? r.triangles.toLocaleString('tr-TR') : '–'],
    ['Program', r ? String(r.programs) : '–'],
    ['Doku / geo', r ? `${r.textures} / ${r.geometries}` : '–'],
    ['Doku bellek', r ? `${fmt(r.textureMB)} MB` : '–'],
    ['JS heap', Number.isFinite(s.jsHeapMB) ? `${fmt(s.jsHeapMB)} MB` : '– (yalnız Chromium)'],
    ['Partikül', `${s.particleCap} (×${fmt(s.particleScale, 2)})${r?.particles !== undefined ? ` · ${r.particles} aktif` : ''}`],
    ['Ekran', `${s.refreshHz} Hz hedef`],
    ['Kısıt (LPM)', s.constraint ? 'EVET (30 Hz kilit)' : 'hayır'],
    ['Termal', String(s.thermalLevel)],
    ['Bekleyen düşüş', s.pendingDrop ? 'evet' : 'hayır'],
    ['GPU', s.gpu || '–'],
    ['Tahmin', s.guess ? `${s.guess.tier}→max ${s.guess.maxTier} (${s.guess.rule})` : '–'],
    ['Benchmark', s.benchmark ? Object.entries(s.benchmark.estimates).map(([t, ms]) => `${t} ${fmt(ms as number)}`).join(' · ') : '–'],
    ['Parmak izi', s.fingerprint || '–'],
  ];
}

function render(): void {
  if (!panel) return;
  const body = panel.querySelector('tbody');
  if (!body) return;
  if (!source) {
    body.innerHTML = '<tr><td colspan="2">Kaynak yok (PerformanceDirector bağlı değil)</td></tr>';
    return;
  }
  const s = source();
  const html = rows(s)
    .map(([k, v]) => `<tr><th>${k}</th><td>${v.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</td></tr>`)
    .join('');
  body.innerHTML = html;
}

export function isPerfPanelOpen(): boolean {
  return panel !== null;
}

export function openPerfPanel(onClose?: () => void): void {
  if (panel || typeof document === 'undefined') return;
  onCloseCb = onClose ?? null;
  const el = document.createElement('div');
  el.id = 'kanat-perf-panel';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Performans paneli');
  el.style.cssText = [
    'position:fixed',
    'z-index:2147483000',
    'top:calc(env(safe-area-inset-top, 0px) + 8px)',
    'left:8px',
    'max-width:min(360px, calc(100vw - 16px))',
    'max-height:calc(100vh - 16px)',
    'overflow:auto',
    'background:rgba(8,12,18,0.86)',
    'color:#dfe8f2',
    'font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'border:1px solid rgba(255,255,255,0.15)',
    'border-radius:8px',
    'padding:8px 10px',
    // the overlay never steals game input; only its close button is interactive
    'pointer-events:none',
  ].join(';');
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
    '<b style="letter-spacing:.08em">PERF</b>' +
    '<button type="button" data-input-ignore aria-label="Kapat" style="all:unset;pointer-events:auto;cursor:pointer;padding:2px 8px;border:1px solid rgba(255,255,255,.3);border-radius:4px">×</button>' +
    '</div><table style="border-collapse:collapse;width:100%"><tbody></tbody></table>';
  const style = document.createElement('style');
  style.textContent = '#kanat-perf-panel th{text-align:left;font-weight:600;padding:1px 8px 1px 0;white-space:nowrap;color:#9fb3c8;vertical-align:top}#kanat-perf-panel td{padding:1px 0;word-break:break-word}';
  el.appendChild(style);
  el.querySelector('button')?.addEventListener('click', () => closePerfPanel());
  document.body.appendChild(el);
  panel = el;
  render();
  timer = setInterval(render, 250);
}

export function closePerfPanel(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  panel?.remove();
  panel = null;
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
}

export function togglePerfPanel(): void {
  if (panel) closePerfPanel();
  else openPerfPanel();
}

/** 5 taps within 3 s on `el` (the version label) toggles the panel. Returns a detach function. */
export function attachVersionTapTrigger(el: HTMLElement, taps = 5, windowMs = 3000): () => void {
  const times: number[] = [];
  const onTap = (): void => {
    const t = performance.now();
    times.push(t);
    while (times.length && t - times[0] > windowMs) times.shift();
    if (times.length >= taps) {
      times.length = 0;
      togglePerfPanel();
    }
  };
  el.addEventListener('pointerup', onTap);
  return () => el.removeEventListener('pointerup', onTap);
}
