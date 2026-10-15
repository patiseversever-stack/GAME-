// Bir masanın oyun akışı: kural motoru + bot + sunum. İleride online istemci aynı olay akışını sunucudan alacak.
import {applyPlay, createGame, viewFor} from '../core/pisti';
import {mulberry32} from '../core/rng';
import type {CardId, GameResult, PistiEvent, PistiState} from '../core/types';
import {isJack} from '../core/types';
import {PistiBot} from '../ai/bot';
import type {Character, Moment} from '../ai/characters';
import type {Stage} from '../render/stage';
import type {TableView} from './table';
import type {HandInput, ThrowInfo} from '../input/hand';
import type {Hud} from '../ui/hud';
import type {Sparks} from '../fx/particles';
import type {Sfx} from '../audio/sfx';
import {haptic, post, store} from '../platform/bridge';

const BET = 100;
const AUTO = new URLSearchParams(location.search).has('auto');

export class Match {
  private state!: PistiState;
  private bot!: PistiBot;
  private dealer = 1;
  private coins = store.get('coins', 1000);
  private games = store.get('games', 0);
  private abort = false;
  private lastLine = 0;

  constructor(
    private stage: Stage, private table: TableView, private hand: HandInput, private hud: Hud,
    private sparks: Sparks, private sfx: Sfx, private char: Character,
  ) {
    hud.setCoins(this.coins);
    stage.onRender(() => {
      const o = {x: 0, y: 0};
      table.topScreen('deck', o);
      hud.setDeck(table.deck.length, o.x, o.y - 16);
    });
  }

  private line(m: Moment, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastLine < 2500) return;
    this.lastLine = now;
    const arr = this.char.lines[m];
    this.hud.say(arr[Math.floor(Math.random() * arr.length)], this.char.mood[m], this.char.mood[m] ? 2600 : 1800);
  }

  private stats(): void {
    this.hud.setStats([0, 1].map(s => ({cards: this.state.captured[s].length, pisti: this.state.pistiPoints[s] / 10 | 0})));
  }

  newGame(): void {
    this.abort = true;
  }

  async loop(): Promise<void> {
    if (!AUTO) await this.hud.showStart(this.coins, BET);
    await this.sfx.unlock();
    this.sfx.startAmbience();
    for (;;) {
      this.abort = false;
      const res = await this.play();
      if (!res) {
        this.coins += BET; // yarıda kalan elin bahsi iade
        this.hud.setCoins(this.coins);
        continue;
      }
      const win = res.winners.length === 1 ? res.winners[0] : -1;
      const delta = win === 0 ? BET : win === -1 ? 0 : -BET;
      this.coins = Math.max(0, this.coins + delta + BET);
      if (this.coins < BET) this.coins = 1000; // önizleme: kasa biterse yenile
      store.set('coins', this.coins);
      store.set('games', ++this.games);
      post('match:end', {result: win === 0 ? 'win' : win === -1 ? 'draw' : 'lose', delta, coins: this.coins});
      if (win === 0) {
        this.sfx.win();
        haptic('success');
        this.line('playerWin', true);
      } else if (win === 1) {
        this.sfx.lose();
        this.line('botWin', true);
      } else this.line('draw', true);
      await this.stage.time.waitReal(1.2);
      this.sfx.coin(delta > 0 ? 6 : 2);
      this.hud.setCoins(this.coins, true);
      (window as unknown as {__kh_done?: number}).__kh_done = this.games;
      if (AUTO) {
        await this.stage.time.waitReal(1.5);
        continue;
      }
      await this.hud.showEnd(res, ['Sen', this.char.name], delta, this.coins);
    }
  }

  /** Bir el oynatır. Yarıda kesilirse null döner. */
  private async play(): Promise<GameResult | null> {
    const seed = (Math.random() * 2 ** 31) | 0;
    this.dealer = 1 - this.dealer;
    this.coins -= BET;
    this.hud.setCoins(this.coins, true);
    this.sfx.coin(2);
    const {state, events} = createGame({seats: 2, teams: [0, 1], dealer: this.dealer, seed});
    this.state = state;
    this.bot = new PistiBot(1, this.char.personality, mulberry32(seed ^ 0x5bd1e995));
    this.autoBot = AUTO ? new PistiBot(0, {memory: 1, skill: 0.9, jackPatience: 0.7}, mulberry32(seed + 7)) : null;
    events.forEach(e => {
      this.bot.observe(e);
      this.autoBot?.observe(e);
    });
    this.table.reset(2);
    this.stats();
    this.hud.setTurn(-1);
    await this.stage.time.wait(0.25);
    this.sfx.shuffle();
    await this.table.shuffle();
    this.line('start', true);
    for (const e of events) await this.present(e, null);

    let result: GameResult | null = null;
    while (!this.state.over) {
      if (this.abort) return null;
      const seat = this.state.turn;
      this.hud.setTurn(seat);
      let card: CardId, thr: ThrowInfo | null = null;
      if (seat === 0) {
        thr = await this.waitThrow();
        if (!thr) return null;
        card = this.table.cardOf(thr.slot);
      } else {
        const [a, b] = this.char.think;
        await this.stage.time.wait(a + Math.random() * (b - a) + (this.state.pile.length === 1 ? 0.5 : 0));
        if (this.abort) return null;
        card = this.bot.choose(viewFor(this.state, seat));
      }
      this.hud.setTurn(-1);
      const r = applyPlay(this.state, seat, card);
      this.state = r.state;
      r.events.forEach(e => {
        this.bot.observe(e);
        this.autoBot?.observe(e);
      });
      result = await this.presentPlay(seat, card, thr, r.events);
    }
    return result;
  }

  private waitThrow(): Promise<ThrowInfo | null> {
    return new Promise(res => {
      const first = this.games === 0 && this.state.round === 1 && this.state.hands[0].length >= 3;
      this.hud.showHint(first ? 'Kartı parmağınla masaya fırlat ya da iki kez dokun' : 'Sıra sende');
      const iv = setInterval(() => {
        if (!this.abort) return;
        clearInterval(iv);
        this.hand.setEnabled(false);
        this.hand.onThrow = () => {};
        this.hud.showHint(null);
        res(null);
      }, 200);
      this.hand.onThrow = t => {
        clearInterval(iv);
        this.hud.showHint(null);
        this.hand.onThrow = () => {};
        res(t);
      };
      this.hand.setEnabled(true);
      if (AUTO) this.autoPlay();
    });
  }

  /** Test modu: insan koltuğunu da bot oynar (?auto=1). */
  private autoBot: PistiBot | null = null;
  private async autoPlay(): Promise<void> {
    if (!this.autoBot) {
      this.autoBot = new PistiBot(0, {memory: 1, skill: 0.9, jackPatience: 0.7}, mulberry32(7));
    }
    await this.stage.time.wait(0.35);
    const c = this.autoBot.choose(viewFor(this.state, 0));
    const s = this.hand.slots.find(x => this.table.cardOf(x) === c);
    if (!s) return;
    this.hand.select(s);
    await this.stage.time.wait(0.25);
    this.hand.throwSelected();
  }

  private async present(e: PistiEvent, _thr: ThrowInfo | null): Promise<void> {
    if (e.t === 'tableDeal') await this.table.dealTable(e.cards, e.faceUp);
    else if (e.t === 'handDeal') await this.table.dealHands(e.deals);
  }

  private async presentPlay(seat: number, card: CardId, thr: ThrowInfo | null, evs: PistiEvent[]): Promise<GameResult | null> {
    const cap = evs.find(e => e.t === 'capture') as Extract<PistiEvent, {t: 'capture'}> | undefined;
    const {slot, landed} = this.table.playToPile(seat, card, thr ?? undefined);
    const T = this.stage.time;

    if (cap && cap.pisti > 0) {
      // Yavaş çekim: kart inmeden hemen önce zaman yavaşlar, inişte sarsıntı + titreşim + kıvılcım
      await new Promise<void>(res => {
        const fn = () => {
          if (this.table.remaining(slot) < 0.11) {
            res();
            return false;
          }
          return true;
        };
        T.addTicker(fn);
      });
      this.sfx.setSlowMo(0.15);
      await T.scaleTo(0.13, 0.07);
      await landed;
      const jack = cap.pisti === 20;
      this.stage.shake(jack ? 0.95 : 0.75);
      this.stage.kickFov(-5);
      this.sparks.burst(slot.pos, jack ? 1.35 : 1);
      this.sfx.pisti(jack);
      haptic('heavy');
      this.hud.showBanner(jack ? 'VALE PİŞTİ!' : 'PİŞTİ!', `+${cap.pisti}`);
      await T.waitReal(0.42);
      this.sfx.setSlowMo(1);
      await T.scaleTo(1, 0.45);
      if (seat === 0) this.line(jack ? 'playerJackPisti' : 'playerPisti', true);
      else this.line(jack ? 'botJackPisti' : 'botPisti', true);
      await T.wait(0.5);
    } else {
      await landed;
      haptic('light');
    }

    if (cap) {
      await T.wait(cap.pisti ? 0.1 : 0.32);
      this.sfx.capture(cap.cards.length);
      haptic('medium');
      await this.table.collect(seat, cap.pisti ? card : null);
      this.stats();
      if (!cap.pisti && cap.cards.length >= 6) this.line(seat === 0 ? 'playerBig' : 'botBig');
      else if (!cap.pisti && seat === 0 && isJack(card) && Math.random() < 0.4) this.line('playerJack');
    }

    let result: GameResult | null = null;
    for (const e of evs) {
      if (e.t === 'handDeal') {
        await T.wait(0.3);
        await this.table.dealHands(e.deals);
      } else if (e.t === 'finalSweep') {
        await T.wait(0.4);
        this.sfx.capture(e.cards.length);
        await this.table.collect(e.seat, null);
        this.stats();
      } else if (e.t === 'gameOver') result = e.result;
    }
    return result;
  }
}
