// AudioManager — ses ve müzik için tek giriş. Ses ≠ müzik (ayrı anahtar ve ayrı seviye).
// • Web Audio bağlamı ilk kullanıcı hareketinde açılır (tarayıcı otomatik oynatma kuralı)
// • Adaptif yoğunluk: aynı ses kısa aralıkla tekrar ederse kısılır; eşzamanlı ses sayısı sınırlı
// • Her çalışta küçük perde/şiddet varyasyonu (birebir tekrar yok)
// • Haptik: navigator.vibrate (destek varsa, ayar açıksa)

import { RECIPES, RULES } from './synth.js';
import { Music } from './kahvehane.js';
import { Ambience } from './ambience.js';

const HAPTICS = {
  select: [6],
  place: [7],
  draw: [9],
  discard: [12, 18, 7],
  invalid: [16, 34, 16],
  open: [10, 26, 10, 26, 14],
  meld: [8, 22, 8],
  finish: [14, 36, 14, 36, 26],
  win: [20, 50, 20, 50, 40],
  lose: [24],
  penalty: [22, 30, 14],
  okey: [8, 24, 8],
  tap: [4],
  myTurn: [8],
};

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.music = null;
    this.last = new Map();
    this.voices = 0;
    this.unlocked = false;
    this.wantMusic = false;
    this._onVis = this._onVis.bind(this);
    document.addEventListener('visibilitychange', this._onVis);
    settings.subscribe?.((key) => {
      if (key === 'music' || key === 'musicVol' || key === 'ambience') this.applyMusic();
      if (key === 'sfxVol' && this.sfxBus) this.sfxBus.gain.value = this.settings.get('sfxVol');
    });
  }

  // Kullanıcı hareketi içinde çağrılmalı (pointerdown/keydown/click)
  unlock() {
    if (this.unlocked) {
      this.ctx?.state === 'suspended' && this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -15;
    this.comp.knee.value = 14;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.16;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.get('sfxVol');
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.sfxBus.connect(this.comp);
    this.musicBus.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);
    this.unlocked = true;
    if (ctx.state === 'suspended') ctx.resume();
    this.applyMusic();
  }

  _onVis() {
    if (!this.ctx) return;
    if (document.hidden) this.ctx.suspend?.();
    else if (this.unlocked) this.ctx.resume?.();
  }

  // Ayarlar/ekran değişince müziği uygula. mood: 'menu' (taksim) | 'game' (oyun havası)
  setMusicWanted(v, mood = 'game') {
    this.wantMusic = v;
    if (v) this.musicMood = mood;
    this.applyMusic();
  }

  applyMusic() {
    if (!this.unlocked) return;
    const on = this.wantMusic && this.settings.get('music');
    if (on) {
      if (!this.music) this.music = new Music(this.ctx, this.musicBus);
      this.music.start(this.settings.get('musicVol'), this.musicMood || 'game');
    } else this.music?.stop(1.0);
    const amb = this.wantMusic && this.settings.get('ambience') !== false;
    if (amb) {
      if (!this.ambience) this.ambience = new Ambience(this.ctx, this.musicBus);
      this.ambience.start(this.settings.get('musicVol'));
    } else this.ambience?.stop(1.0);
  }

  // name: RECIPES anahtarı. opts: { delay, rate, vol, step }
  play(name, opts = {}) {
    const rule = RULES[name];
    const fn = RECIPES[name];
    if (!fn) return;
    // quiet: yalnızca ses (menüdeki taş tıkırtıları telefonu titretmez)
    if (!opts.quiet) this.haptic(name);
    if (!this.unlocked || !this.ctx || !this.settings.get('sfx')) return;
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const [minGap, pv, vv, cat] = rule;
    const last = this.last.get(name) ?? -1;
    if (now - last < minGap) return;
    // eşzamanlı ses sınırı: ufak tıklar kırpılır, olaylar her zaman çalar
    if (this.voices > 14 && cat !== 'event') return;
    // tekrar sönümü: aynı ses sık tekrar ederse hafifçe kısılır
    const sinceSame = now - last;
    const atten = sinceSame < 0.18 ? 0.72 : 1;
    this.last.set(name, now);
    const p = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * pv);
    const v = (opts.vol ?? 1) * atten * (1 + (Math.random() * 2 - 1) * vv);
    const t = now + (opts.delay || 0);
    let dur = 0.2;
    try {
      dur = fn(ctx, this.sfxBus, t, { p, v, step: opts.step || 0 });
    } catch (e) {
      console.warn('ses hatası', name, e);
      return;
    }
    this.voices++;
    setTimeout(() => (this.voices = Math.max(0, this.voices - 1)), (dur + (opts.delay || 0)) * 1000 + 60);
    if (cat === 'event' && this.music?.playing) {
      if (name === 'win') this.music.flourish();
      else if (name === 'finish' || name === 'lose') this.music.duck(0.4, 2.2);
    }
  }

  // Seviye atlama fanfarı (kanun). Ses açıksa müzik kapalıyken de çalar; müzik varsa altında kısılır.
  fanfare(makam) {
    this.haptic('win');
    if (!this.unlocked || !this.ctx || !this.settings.get('sfx') || this.ctx.state !== 'running') return 0;
    if (!this.stinger) {
      this.stinger = new Music(this.ctx, this.sfxBus);
      this.stinger.root.gain.value = 0.62;
    }
    const dur = this.stinger.fanfare(makam);
    if (this.music?.playing) this.music.duck(0.25, dur + 0.6);
    return dur;
  }

  haptic(name) {
    if (!this.settings.get('haptics')) return;
    const pat = HAPTICS[name];
    if (pat && navigator.vibrate) {
      try {
        navigator.vibrate(pat);
      } catch {}
    }
  }

  // Taş şelalesi gibi art arda sesler: adet, aralık
  cascade(name, n, gap = 0.05, o = {}) {
    for (let i = 0; i < n; i++) this.play(name, { ...o, delay: i * gap, rate: (o.rate ?? 1) * (0.94 + (i / Math.max(1, n - 1)) * 0.14) });
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._onVis);
    this.music?.stop(0.1);
    this.ambience?.stop(0.1);
    this.ctx?.close?.();
  }
}

// Başsız ortam / test için sessiz sahte
export class NullAudio {
  unlock() {}
  play() {}
  cascade() {}
  haptic() {}
  fanfare() {
    return 0;
  }
  setMusicWanted() {}
  applyMusic() {}
  destroy() {}
}
