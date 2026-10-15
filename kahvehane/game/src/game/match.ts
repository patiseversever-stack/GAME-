// Bir elin oyun akışı: kural motoru + bot + masa sunumu + HUD.
// Online'da aynı olay akışı sunucudan gelecek; bu sınıf yalnızca olayları sahneye çevirir.
import {applyPlay, createGame, viewFor} from '../core/pisti';
import {mulberry32} from '../core/rng';
import type {CardId, GameResult, PistiEvent, PistiState} from '../core/types';
import {cardId, isJack} from '../core/types';
import {PistiBot, type BotPersonality} from '../ai/bot';
import type {Stage} from '../render/stage';
import type {TableView} from './table';
import type {HandInput, ThrowInfo} from '../input/hand';
import type {Sparks} from '../fx/particles';
import type {Shockwave} from '../fx/ring';
import type {Sfx} from '../audio/sfx';
import type {GameHud} from '../ui/screens';
import {haptic} from '../platform/bridge';
import {CARD} from './layout';
import * as THREE from 'three';

/** Rakibin konuşabileceği anlar (diyalog sistemi bunlara replik seçer). */
export type Moment =
  | 'start' | 'botThinking' | 'botPisti' | 'botJackPisti' | 'playerPisti' | 'playerJackPisti'
  | 'botBigCapture' | 'playerBigCapture' | 'botJackCapture' | 'playerJackCapture' | 'playerDumpedValuable'
  | 'lastRound' | 'botLeading' | 'playerLeading' | 'myTurnIdle' | 'tableEmpty';

export interface MatchDeps {
  stage: Stage;
  table: TableView;
  hand: HandInput;
  hud: GameHud;
  sparks: Sparks;
  ring: Shockwave;
  sfx: Sfx;
  speak: (m: Moment, force?: boolean) => void;
  personality: BotPersonality;
  think: [number, number];
  auto?: boolean;
}

const VALUABLE = new Set([cardId('D', 10), cardId('C', 2)]);

export class Match {
  private state!: PistiState;
  private bot!: PistiBot;
  private autoBot: PistiBot | null = null;
  private aborted = false;
  private idleTimer = 0;

  constructor(private d: MatchDeps) {}

  abort(): void {
    this.aborted = true;
  }

  private stats(): void {
    this.d.hud.setStats([0, 1].map(s => ({cards: this.state.captured[s].length, pisti: (this.state.pistiPoints[s] / 10) | 0})));
  }

  /** Bir el oynatır; yarıda kesilirse null. */
  async play(dealer: number, seed = (Math.random() * 2 ** 31) | 0): Promise<GameResult | null> {
    const {stage, table, hud, sfx} = this.d;
    this.aborted = false;
    const {state, events} = createGame({seats: 2, teams: [0, 1], dealer, seed});
    this.state = state;
    this.bot = new PistiBot(1, this.d.personality, mulberry32(seed ^ 0x5bd1e995));
    this.autoBot = this.d.auto ? new PistiBot(0, {memory: 1, skill: 0.9, jackPatience: 0.7}, mulberry32(seed + 7)) : null;
    const observe = (e: PistiEvent) => {
      this.bot.observe(e);
      this.autoBot?.observe(e);
    };
    events.forEach(observe);
    table.reset(2);
    this.stats();
    hud.setTurn(-1);
    // sinematik giriş: kamera yukarıdan ve hafif dönerek masaya süzülür
    const h = stage.home;
    stage.rig.pos.set(h.pos.x + 0.35, h.pos.y + 1.1, h.pos.z + 0.9);
    stage.rig.target.copy(h.target).add(new THREE.Vector3(0, 0, -0.15));
    const intro = stage.goHome(1.5);
    await stage.time.wait(0.3);
    sfx.shuffle();
    await Promise.all([table.shuffle(), intro]);
    this.d.speak('start', true);
    for (const e of events) {
      if (e.t === 'tableDeal') await table.dealTable(e.cards, e.faceUp);
      else if (e.t === 'handDeal') await table.dealHands(e.deals);
    }

    let result: GameResult | null = null;
    while (!this.state.over) {
      if (this.aborted) return null;
      const seat = this.state.turn;
      hud.setTurn(seat);
      let card: CardId, thr: ThrowInfo | null = null;
      if (seat === 0) {
        thr = await this.waitThrow();
        if (!thr) return null;
        card = table.cardOf(thr.slot);
      } else {
        const [a, b] = this.d.think;
        if (this.state.pile.length === 0 && Math.random() < 0.3) this.d.speak('tableEmpty');
        else if (Math.random() < 0.12) this.d.speak('botThinking');
        await table.botThink(seat, a + Math.random() * (b - a) + (this.state.pile.length === 1 ? 0.45 : 0));
        if (this.aborted) return null;
        card = this.bot.choose(viewFor(this.state, seat));
      }
      hud.setTurn(-1);
      const pileBefore = this.state.pile.slice();
      const r = applyPlay(this.state, seat, card);
      this.state = r.state;
      r.events.forEach(observe);
      result = await this.present(seat, card, thr, r.events, pileBefore);
    }
    return result;
  }

  private waitThrow(): Promise<ThrowInfo | null> {
    const {hand, hud} = this.d;
    return new Promise(res => {
      const first = this.state.round === 1 && this.state.hands[0].length === 4;
      hud.showHint(first ? 'Kartı parmağınla masaya fırlat ya da iki kez dokun' : 'Sıra sende');
      clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => this.d.speak('myTurnIdle'), 7000);
      const iv = setInterval(() => {
        if (!this.aborted) return;
        clearInterval(iv);
        clearTimeout(this.idleTimer);
        hand.setEnabled(false);
        hand.onThrow = () => {};
        hud.showHint(null);
        res(null);
      }, 150);
      hand.onThrow = t => {
        clearInterval(iv);
        clearTimeout(this.idleTimer);
        hud.showHint(null);
        hand.onThrow = () => {};
        res(t);
      };
      hand.setEnabled(true);
      if (this.autoBot) this.autoPlay();
    });
  }

  private async autoPlay(): Promise<void> {
    const {stage, hand, table} = this.d;
    await stage.time.wait(0.4);
    const c = this.autoBot!.choose(viewFor(this.state, 0));
    const s = hand.slots.find(x => table.cardOf(x) === c);
    if (!s) return;
    hand.select(s);
    await stage.time.wait(0.25);
    hand.throwSelected();
  }

  private screenOf(p: {x: number; y: number; z: number}): {x: number; y: number} {
    const o = {x: 0, y: 0};
    this.d.stage.project(p as never, o);
    return o;
  }

  private async present(seat: number, card: CardId, thr: ThrowInfo | null, evs: PistiEvent[], pileBefore: CardId[]): Promise<GameResult | null> {
    const {stage, table, hud, sfx, sparks, ring} = this.d;
    const T = stage.time;
    const cap = evs.find(e => e.t === 'capture') as Extract<PistiEvent, {t: 'capture'}> | undefined;
    const {slot, landed} = table.playToPile(seat, card, thr ?? undefined);

    if (cap && cap.pisti > 0) {
      // Yavaş çekim: kart inmeden hemen önce zaman yavaşlar; inişte sarsıntı, titreşim, halka, kıvılcım, damga
      await new Promise<void>(res => T.addTicker(() => (table.remaining(slot) < 0.12 ? (res(), false) : true)));
      sfx.setSlowMo(0.15);
      void stage.pushTo(table.layout.pile, 0.24, 0.35);
      await T.scaleTo(0.12, 0.07);
      await landed;
      const jack = cap.pisti === 20;
      stage.shake(jack ? 0.95 : 0.72);
      stage.kickFov(-4);
      ring.fire(slot.pos, jack ? 1.25 : 1);
      sparks.burst(slot.pos, jack ? 1.35 : 1);
      sfx.pisti(jack);
      haptic('heavy');
      hud.pisti(jack, cap.pisti);
      await T.waitReal(0.45);
      sfx.setSlowMo(1);
      void stage.goHome(0.7);
      await T.scaleTo(1, 0.45);
      this.d.speak(seat === 0 ? (jack ? 'playerJackPisti' : 'playerPisti') : jack ? 'botJackPisti' : 'botPisti', true);
      await T.wait(0.35);
    } else {
      await landed;
      haptic('light');
    }

    if (cap) {
      await T.wait(cap.pisti ? 0.1 : 0.3);
      sfx.capture(cap.cards.length);
      haptic('medium');
      await table.collect(seat, cap.pisti ? card : null);
      this.stats();
      const st = table.layout.seats[seat].stack;
      const sp = this.screenOf({x: st.x, y: st.y + CARD.t * 30, z: st.z});
      hud.popScore(sp.x, sp.y - 20, `+${cap.cards.length}`);
      if (!cap.pisti) {
        const valuable = seat === 1 && pileBefore.some(c => VALUABLE.has(c));
        if (valuable) this.d.speak('playerDumpedValuable');
        else if (cap.cards.length >= 6) this.d.speak(seat === 0 ? 'playerBigCapture' : 'botBigCapture');
        else if (isJack(card) && Math.random() < 0.5) this.d.speak(seat === 0 ? 'playerJackCapture' : 'botJackCapture');
      }
    }

    let result: GameResult | null = null;
    for (const e of evs) {
      if (e.t === 'handDeal') {
        await T.wait(0.3);
        if (this.state.deck.length === 0) {
          hud.banner('Son el!');
          this.d.speak('lastRound');
        }
        await table.dealHands(e.deals);
        const a = this.state.captured[0].length + this.state.pistiPoints[0], b = this.state.captured[1].length + this.state.pistiPoints[1];
        if (Math.random() < 0.35) this.d.speak(a > b + 8 ? 'playerLeading' : b > a + 8 ? 'botLeading' : 'botThinking');
      } else if (e.t === 'finalSweep') {
        await T.wait(0.4);
        sfx.capture(e.cards.length);
        await table.collect(e.seat, null);
        this.stats();
      } else if (e.t === 'gameOver') result = e.result;
    }
    return result;
  }
}
