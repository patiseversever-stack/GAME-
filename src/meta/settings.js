// Kalıcı ayarlar. get/set/subscribe; değişiklikler anında uygulanır (ses, tema, hareket, yazı ölçeği…).
import { readJSON, writeJSON } from './storage.js';

const KEY = 'patisever.settings.v1';

export const DEFAULTS = Object.freeze({
  sfx: true,
  music: true,
  sfxVol: 0.9,
  musicVol: 0.85,
  haptics: true,
  motion: 'auto', // 'auto' | 'full' | 'reduced'
  quality: 'auto', // 'auto' | 'high' | 'low'
  theme: 'lounge',
  rack: 'walnut',
  tiles: 'ivory',
  botSpeed: 'normal', // 'slow' | 'normal' | 'fast'
  meldHints: true,
  tapToDiscard: true,
  tutorial: true,
  textScale: 1,
  playerName: 'Oyuncu',
  playerAvatar: 'mert',
  lastMode: 'okey',
  lastDifficulty: 'mixed',
  lastRounds101: 3,
  lastStartScore: 10,
  wrapHigh101: false,
  colorFinish: false,
  opening: 'fixed',
  seenHowTo: false,
});

export class Settings {
  constructor() {
    this.v = { ...DEFAULTS, ...(readJSON(KEY, {}) || {}) };
    this.subs = new Set();
  }
  get(k) {
    return this.v[k];
  }
  set(k, val) {
    if (this.v[k] === val) return;
    this.v[k] = val;
    writeJSON(KEY, this.v);
    for (const f of this.subs) f(k, val);
  }
  subscribe(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  all() {
    return { ...this.v };
  }
}

// Ayarların belge düzeyinde uygulanması
export function applyDocumentSettings(settings, app) {
  const apply = () => {
    const d = document.documentElement;
    d.dataset.theme = settings.get('theme');
    d.dataset.rack = settings.get('rack');
    d.dataset.tiles = settings.get('tiles');
    d.style.fontSize = Math.round(16 * settings.get('textScale') * 100) / 100 + 'px';
    if (app) {
      app.dataset.motion = settings.get('motion') === 'auto' ? 'auto' : settings.get('motion') === 'reduced' ? 'reduced' : 'full';
    }
  };
  apply();
  settings.subscribe((k) => {
    if (['theme', 'rack', 'tiles', 'textScale', 'motion'].includes(k)) apply();
  });
}

export function prefersReducedMotion(settings) {
  const m = settings.get('motion');
  if (m === 'reduced') return true;
  if (m === 'full') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
