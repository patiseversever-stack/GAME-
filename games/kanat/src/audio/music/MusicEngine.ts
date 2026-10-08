// Adaptive music runtime: lookahead scheduler driving per-world theme players.
// Layer gates (K1..K3) and SÜRÜ sections switch only on bar boundaries; world changes cross-fade.
import type { BufferCache } from '../bank.ts';
import { Rng } from '../rng.ts';
import { Rack } from './instruments.ts';
import type { PcmInst } from './pcm.ts';
import { THEMES } from './patterns.ts';
import type { MusicWorld, NoteEv, Section, ThemeDef, Track } from './patterns.ts';
import { LayerGates, StepClock, resolveNote } from './scheduler.ts';

export const LOOKAHEAD = 0.2;

function sameChord(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export class ThemePlayer {
  readonly theme: ThemeDef;
  readonly gates = new LayerGates(3, false);
  private readonly ctx: BaseAudioContext;
  private readonly rack: Rack;
  private readonly out: GainNode;
  private readonly wet: GainNode;
  readonly clock: StepClock;
  private readonly rng: Rng;
  section = 0;
  private sectionWant = 0;
  private padUntilBar = -1;
  private padSection = -1;
  calm = false;
  stopped = false;
  stopAt = Infinity;
  /** Notes emitted (diagnostics / tests). */
  notes = 0;
  private readonly emitFn: (step: number, t: number, late: boolean) => void;

  constructor(ctx: BaseAudioContext, cache: BufferCache, musicIn: AudioNode, verbIn: AudioNode, theme: ThemeDef, start: number, fadeIn: number) {
    this.ctx = ctx;
    this.theme = theme;
    this.out = ctx.createGain();
    this.wet = ctx.createGain();
    this.out.connect(musicIn);
    this.wet.connect(verbIn);
    for (const g of [this.out, this.wet]) {
      g.gain.setValueAtTime(fadeIn > 0 ? 0 : theme.gain, start);
      if (fadeIn > 0) g.gain.linearRampToValueAtTime(theme.gain, start + fadeIn);
    }
    this.rack = new Rack(ctx, cache, this.out, this.wet);
    this.clock = new StepClock(start, theme.stepDur, theme.stepsPerBar);
    this.rng = new Rng(theme.id.length * 7919 + theme.stepsPerBar);
    this.emitFn = (step, t, late) => this.emit(step, t, late);
  }

  setLayers(k1: boolean, k2: boolean, k3: boolean): void {
    this.gates.set(0, k1);
    this.gates.set(1, k2);
    this.gates.set(2, k3);
  }

  setSection(i: number): void {
    this.sectionWant = Math.max(0, Math.min(this.theme.sections.length - 1, i));
  }

  get tonicMidi(): number {
    return this.theme.sections[this.section].root;
  }

  pump(now: number): void {
    if (this.stopped) return;
    this.clock.collect(now, now + LOOKAHEAD, this.emitFn);
  }

  private emit(step: number, t: number, late: boolean): void {
    const sib = this.clock.stepInBar(step);
    const bar = this.clock.barOf(step);
    if (sib === 0) {
      this.gates.onBar();
      this.section = this.sectionWant;
    }
    if (late) return;
    const sec = this.theme.sections[this.section];
    const chord = sec.chords[bar % sec.chords.length];
    if (sib === 0 && (bar >= this.padUntilBar || this.padSection !== this.section)) this.schedulePad(sec, bar, t);
    const g = this.gates.active;
    const k1 = g[0] && !this.calm;
    const k2 = g[1] || this.calm;
    const k3 = g[2] && !this.calm;
    if (k1) this.playTracks(sec.k1, sec, chord, bar, sib, t, 1);
    if (k2 && (!this.calm || bar % 2 === 0)) this.playTracks(sec.k2, sec, chord, bar, sib, t, this.calm ? 0.7 : 1);
    if (k3) this.playTracks(sec.k3, sec, chord, bar, sib, t, 1);
  }

  private schedulePad(sec: Section, bar: number, t: number): void {
    const n = sec.chords.length;
    const chord = sec.chords[bar % n];
    let run = 1;
    while (run < 4 && sameChord(sec.chords[(bar + run) % n], chord)) run++;
    this.padUntilBar = bar + run;
    this.padSection = this.section;
    const dur = run * this.clock.barDur;
    const attack = Math.min(1.1, dur * 0.4);
    const release = Math.min(1.6, Math.max(0.6, dur * 0.5));
    const vel = (sec.pad.gain ?? 1) / Math.sqrt(chord.length);
    for (const d of chord) {
      const midi = resolveNote(d, sec.scale, sec.root, sec.pad.octave, chord);
      if (Number.isFinite(midi)) this.rack.pad(sec.pad.inst, midi, t, dur, vel, attack, release);
    }
    this.notes += chord.length;
  }

  private playTracks(tracks: readonly Track[], sec: Section, chord: readonly number[], bar: number, sib: number, t: number, velK: number): void {
    for (const tr of tracks) {
      if (tr.bars.length === 0) continue;
      const pat = tr.bars[bar % tr.bars.length];
      for (const ev of pat) if (ev[0] === sib) this.playNote(tr, ev, sec, chord, t, velK);
    }
  }

  private playNote(tr: Track, ev: NoteEv, sec: Section, chord: readonly number[], t: number, velK: number): void {
    const [, tok, len, v] = ev;
    const vel = Math.pow(v, 1.6) * (tr.gain ?? 1) * velK * (0.92 + 0.16 * this.rng.next());
    const dur = len * this.theme.stepDur;
    // Tiny humanization off the downbeats (never earlier than scheduled).
    const jt = t + (ev[0] === 0 ? 0 : this.rng.next() * 0.006);
    this.notes++;
    if (tr.inst === 'drums') {
      if (typeof tok === 'string') this.rack.drum(tok, jt, vel);
      return;
    }
    const midi = resolveNote(tok, sec.scale, sec.root, tr.octave, chord);
    if (!Number.isFinite(midi)) return;
    if (tr.inst === 'ney' || tr.inst === 'kemence') this.rack.line(tr.inst, midi, jt, dur, vel);
    else this.rack.pcm(tr.inst as PcmInst, midi, jt, dur, vel);
  }

  stop(fade: number): void {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    for (const g of [this.out, this.wet]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fade);
    }
    this.stopAt = t + fade;
  }

  get voices(): number {
    return this.rack.voices;
  }

  dispose(): void {
    this.rack.dispose();
    this.out.disconnect();
    this.wet.disconnect();
  }
}

export interface MusicTargets {
  world: MusicWorld | null;
  k1: boolean;
  k2: boolean;
  k3: boolean;
  calm: boolean;
  section: number;
}

/** Owns the current/fading theme players for one AudioContext. */
export class MusicEngine {
  private readonly ctx: BaseAudioContext;
  private readonly cache: BufferCache;
  private readonly musicIn: AudioNode;
  private readonly verbIn: AudioNode;
  current: ThemePlayer | null = null;
  private fading: ThemePlayer[] = [];
  /** Cross-fade time between worlds (s). */
  crossfade = 2.0;
  /** Fade-in for a freshly started theme (0 = start at full level, used by offline measurement). */
  fadeIn = 1.5;

  constructor(ctx: BaseAudioContext, cache: BufferCache, musicIn: AudioNode, verbIn: AudioNode) {
    this.ctx = ctx;
    this.cache = cache;
    this.musicIn = musicIn;
    this.verbIn = verbIn;
  }

  /** Apply targets; starts/stops themes and sets layer wants. Safe to call every frame. */
  apply(tg: MusicTargets): void {
    const cur = this.current;
    if (!tg.world) {
      if (cur) {
        cur.stop(this.crossfade);
        this.fading.push(cur);
        this.current = null;
      }
      return;
    }
    if (!cur || cur.theme.id !== tg.world) {
      if (cur) {
        cur.stop(this.crossfade);
        this.fading.push(cur);
      }
      const theme = THEMES[tg.world];
      const p = new ThemePlayer(this.ctx, this.cache, this.musicIn, this.verbIn, theme, this.ctx.currentTime + 0.06, this.fadeIn);
      // A fresh theme starts with its wanted layers already active on bar 0.
      p.setLayers(tg.k1, tg.k2, tg.k3);
      p.setSection(tg.section);
      this.current = p;
    }
    const p = this.current;
    if (!p) return;
    p.calm = tg.calm;
    p.setLayers(tg.k1, tg.k2, tg.k3);
    p.setSection(tg.section);
  }

  pump(): void {
    const now = this.ctx.currentTime;
    this.current?.pump(now);
    if (this.fading.length) {
      this.fading = this.fading.filter((f) => {
        if (now > f.stopAt + 3) {
          f.dispose();
          return false;
        }
        return true;
      });
    }
  }

  /** Pitch class of the active key (for movable-do multiplier tones). */
  tonicPc(): number {
    const m = this.current?.tonicMidi;
    return m === undefined ? 0 : ((Math.round(m) % 12) + 12) % 12;
  }

  stopAll(fade = 0.5): void {
    if (this.current) {
      this.current.stop(fade);
      this.fading.push(this.current);
      this.current = null;
    }
  }

  dispose(): void {
    this.current?.dispose();
    for (const f of this.fading) f.dispose();
    this.current = null;
    this.fading = [];
  }
}
