// World ambience beds + sparse random one-shots, and the SÜRÜ.io "thousand wings" murmur layer.
//   sea: waves bed + distant gulls · rain: rain bed · trickle: travertine water · burners: distant
//   balloon burners (Kapadokya dawn / menu) · suru: murmur (filter opens with density/size) + sea.
// Thermal hum and storm are beds driven by gameplay events.
import type { BufferCache } from './bank.ts';
import { clamp, dbToGain, expMap } from './dsp.ts';
import type { AmbienceId } from './music/patterns.ts';
import { Rng } from './rng.ts';
import { SFX } from './sfxLib.ts';
import { LoopBed } from './voices.ts';
import type { VoicePool } from './voices.ts';

export interface SuruAudioState {
  /** Player flock size (birds). */
  flockSize: number;
  /** Local density 0..1 (how packed the flock is / birds nearby). */
  density: number;
  /** Round progress 0..1 (sunset). */
  timeFrac: number;
  /** "Sıkı Dizi" (hold) active. */
  tight: boolean;
}

export class Ambience {
  private readonly ctx: BaseAudioContext;
  private readonly pool: VoicePool;
  private readonly rng = new Rng(0x5eed);
  private readonly sea: LoopBed;
  private readonly rain: LoopBed;
  private readonly trickle: LoopBed;
  private readonly murmur: LoopBed;
  private readonly storm: LoopBed;
  private readonly thermal: LoopBed;
  private scene: readonly AmbienceId[] = [];
  private nextGull = 0;
  private nextBurner = 0;
  private nextThunder = 0;
  private stormOn = false;
  private suruState: SuruAudioState = { flockSize: 16, density: 0.3, timeFrac: 0, tight: false };
  /** 0..1 how much of the scene is "outside" (beds fade under high wind speed slightly). */
  private windMask = 0;

  constructor(ctx: BaseAudioContext, cache: BufferCache, pool: VoicePool, dest: AudioNode) {
    this.ctx = ctx;
    this.pool = pool;
    this.sea = new LoopBed(ctx, cache, 'waves', dest, 0.7);
    this.rain = new LoopBed(ctx, cache, 'rain', dest, 0.6);
    this.trickle = new LoopBed(ctx, cache, 'trickle', dest, 0.5);
    this.murmur = new LoopBed(ctx, cache, 'murmur', dest, 0.55);
    this.storm = new LoopBed(ctx, cache, 'storm', dest, 0.5);
    this.thermal = new LoopBed(ctx, cache, 'thermalHum', dest, 0.2);
    this.murmur.filter.frequency.value = 1200;
  }

  setScene(ids: readonly AmbienceId[]): void {
    this.scene = ids;
    const has = (id: AmbienceId) => ids.includes(id);
    const k = 1 - 0.5 * this.windMask;
    this.sea.set(has('sea') || has('suru') ? dbToGain(SFX.waves.db) * k : 0, 1.2);
    this.rain.set(has('rain') ? dbToGain(SFX.rain.db) * k : 0, 1.2);
    this.trickle.set(has('trickle') ? dbToGain(SFX.trickle.db) * k : 0, 1.2);
    if (!has('suru')) {
      this.murmur.set(0, 1.0);
      this.setStorm(false);
    } else {
      this.applySuru();
    }
    const now = this.ctx.currentTime;
    this.nextGull = now + 3 + this.rng.next() * 5;
    this.nextBurner = now + 1.0 + this.rng.next() * 2;
  }

  /** High flight speed masks distant beds (they stay, just recede). */
  setWindMask(k: number): void {
    const m = clamp(k, 0, 1);
    if (Math.abs(m - this.windMask) < 0.05) return;
    this.windMask = m;
    this.setScene(this.scene);
  }

  setSuru(s: SuruAudioState): void {
    this.suruState = s;
    if (this.scene.includes('suru')) this.applySuru();
  }

  private applySuru(): void {
    const s = this.suruState;
    const size = clamp(Math.log10(1 + Math.max(0, s.flockSize)) / Math.log10(1 + 600), 0, 1);
    const dens = clamp(s.density, 0, 1);
    const open = clamp(0.25 + 0.45 * dens + 0.3 * size + (s.tight ? 0.15 : 0), 0, 1);
    const t = this.ctx.currentTime;
    this.murmur.filter.frequency.setTargetAtTime(expMap(450, 5200, open), t, 0.25);
    const g = dbToGain(SFX.murmur.db + (s.tight ? 2 : 0)) * (0.3 + 0.7 * size);
    this.murmur.set(g, 0.4);
  }

  setStorm(on: boolean): void {
    if (on === this.stormOn) return;
    this.stormOn = on;
    this.storm.set(on ? dbToGain(SFX.storm.db) : 0, on ? 1.5 : 2.5);
    this.nextThunder = this.ctx.currentTime + 4 + this.rng.next() * 6;
  }

  setThermal(on: boolean): void {
    this.thermal.set(on ? dbToGain(SFX.thermalHum.db) : 0, on ? 0.25 : 0.4);
  }

  /** Random sparse one-shots (call from the engine pump). */
  pump(): void {
    const now = this.ctx.currentTime;
    const has = (id: AmbienceId) => this.scene.includes(id);
    if ((has('sea') || has('suru')) && now >= this.nextGull) {
      const key = this.rng.next() < 0.5 ? 'gull1' : 'gull2';
      const pan = this.rng.bi() * 0.8;
      const rate = 0.9 + this.rng.next() * 0.25;
      this.pool.play(key, SFX.gull1.db - this.rng.next() * 6 - 4 * this.windMask, 0, pan, rate);
      this.nextGull = now + 6 + this.rng.next() * 9;
    }
    if (has('burners') && now >= this.nextBurner) {
      const pan = this.rng.bi() * 0.7;
      this.pool.play('burnerFar', SFX.burnerFar.db - this.rng.next() * 5 - 6 * this.windMask, 0, pan, 0.92 + this.rng.next() * 0.16);
      this.nextBurner = now + 7 + this.rng.next() * 9;
    }
    if (this.stormOn && now >= this.nextThunder) {
      this.pool.play('thunder', SFX.thunder.db - this.rng.next() * 6, 1, this.rng.bi() * 0.6, 0.9 + this.rng.next() * 0.2);
      this.nextThunder = now + 9 + this.rng.next() * 10;
    }
    this.sea.tick();
    this.rain.tick();
    this.trickle.tick();
    this.murmur.tick();
    this.storm.tick();
    this.thermal.tick();
  }

  dispose(): void {
    for (const b of [this.sea, this.rain, this.trickle, this.murmur, this.storm, this.thermal]) b.dispose();
  }
}
