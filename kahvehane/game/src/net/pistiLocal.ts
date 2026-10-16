// Pişti'nin aynı ev sahibi altyapısıyla koşabilmesi için bot bağdaştırıcısı (çevrimiçi Pişti'ye hazırlık).
// game/match.ts bugün motoru doğrudan kullanır ve DEĞİŞMEDİ; bu dosya yalnız yeni yolu açar.
import {type BotPersonality, PistiBot} from '../ai/bot';
import type {BotBrain, BotDecision} from '../core/game';
import type {PistiAction} from '../core/pistiEngine';
import {mulberry32} from '../core/rng';
import type {PistiEvent, PlayerView} from '../core/types';

/** PistiBot'u BotBrain'e çevirir: süzülmüş olayları görür, düşünme süresi kadar bekleyip oynar. */
export class PistiBotBrain implements BotBrain<PistiAction, PistiEvent, PlayerView> {
  private readonly bot: PistiBot;
  private readonly rnd: () => number;

  constructor(
    readonly seat: number,
    personality: BotPersonality,
    seed: number,
    private readonly think: [number, number] = [500, 900],
  ) {
    this.bot = new PistiBot(seat, personality, mulberry32(seed));
    this.rnd = mulberry32(seed ^ 0x51ed27);
  }

  observe(e: PistiEvent): void {
    this.bot.observe(e);
  }

  decide(v: PlayerView): BotDecision<PistiAction> | null {
    if (v.turn !== v.seat || v.hand.length === 0) return null;
    const card = this.bot.choose(v);
    const [a, b] = this.think;
    return {action: {t: 'play', seat: this.seat, card}, delayMs: a + this.rnd() * (b - a)};
  }
}
