// Bir elin oyun akışı: kural motoru + bot + 2B masa + HUD.
// Online'da aynı olay akışı sunucudan gelecek; bu sınıf yalnızca olayları sahneye çevirir.
import {applyPlay, createGame, viewFor} from '../core/pisti';
import {mulberry32} from '../core/rng';
import type {CardId, GameResult, PistiEvent, PistiState} from '../core/types';
import {cardId, isJack} from '../core/types';
import {PistiBot, type BotPersonality} from '../ai/bot';
import {Table2D} from '../table2d/table';
import type {Sfx} from '../audio/sfx';
import type {GameHud} from '../ui/screens';
import {haptic} from '../platform/bridge';

/** Rakibin konuşabileceği anlar (diyalog sistemi bunlara replik seçer). */
export type Moment =
  | 'start' | 'botThinking' | 'botPisti' | 'botJackPisti' | 'playerPisti' | 'playerJackPisti'
  | 'botBigCapture' | 'playerBigCapture' | 'botJackCapture' | 'playerJackCapture' | 'playerDumpedValuable'
  | 'lastRound' | 'botLeading' | 'playerLeading' | 'myTurnIdle' | 'tableEmpty';

export interface MatchDeps {
  table: Table2D;
  hud: GameHud;
  sfx: Sfx;
  speak: (m: Moment, force?: boolean) => void;
  personality: BotPersonality;
  think: [number, number];
  auto?: boolean;
}

const VALUABLE = new Set([cardId('D', 10), cardId('C', 2)]);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class Match {
  private state!: PistiState;
  private bot!: PistiBot;
  private autoBot: PistiBot | null = null;
  private aborted = false;
  private cancelWait: () => void = () => {};

  constructor(private d: MatchDeps) {}

  abort(): void {
    this.aborted = true;
    this.cancelWait();
  }

  private stats(): void {
    this.d.hud.setStats([0, 1].map(s => ({cards: this.state.captured[s].length, pisti: (this.state.pistiPoints[s] / 10) | 0})));
  }

  /** Bir el oynatır; yarıda kesilirse null. */
  async play(dealer: number, seed = (Math.random() * 2 ** 31) | 0): Promise<GameResult | null> {
    const {table, hud, sfx} = this.d;
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
    table.reset();
    this.stats();
    hud.setTurn(-1);
    await sleep(120);
    sfx.shuffle();
    await table.intro();
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
      let card: CardId;
      if (seat === 0) {
        card = await this.waitPlayer();
        if (card < 0 || this.aborted) return null;
      } else {
        const [a, b] = this.d.think;
        if (this.state.pile.length === 0 && Math.random() < 0.3) this.d.speak('tableEmpty');
        else if (Math.random() < 0.1) this.d.speak('botThinking');
        await table.think((a + Math.random() * (b - a) + (this.state.pile.length === 1 ? 0.3 : 0)) * 1000);
        if (this.aborted) return null;
        card = this.bot.choose(viewFor(this.state, seat));
      }
      hud.setTurn(-1);
      const pileBefore = this.state.pile.slice();
      const r = applyPlay(this.state, seat, card);
      this.state = r.state;
      r.events.forEach(observe);
      result = await this.present(seat, card, r.events, pileBefore);
    }
    return result;
  }

  private async waitPlayer(): Promise<CardId> {
    const {table, hud} = this.d;
    const v = viewFor(this.state, 0);
    const first = this.state.round === 1 && this.state.hands[0].length === 4;
    hud.showHint(first ? 'Kartına dokun, masaya gitsin' : 'Sıra sende');
    const w = table.waitPlayer(Table2D.capturing(v.hand, v.pileTop, v.pileCount));
    this.cancelWait = w.cancel;
    const idle = window.setTimeout(() => this.d.speak('myTurnIdle'), 8000);
    if (this.autoBot) {
      const c = this.autoBot.choose(v);
      window.setTimeout(() => table.pick(c), 380);
    }
    const card = await w.card;
    clearTimeout(idle);
    this.cancelWait = () => {};
    hud.showHint(null);
    return card;
  }

  private async present(seat: number, card: CardId, evs: PistiEvent[], pileBefore: CardId[]): Promise<GameResult | null> {
    const {table, hud, sfx} = this.d;
    const cap = evs.find(e => e.t === 'capture') as Extract<PistiEvent, {t: 'capture'}> | undefined;
    await table.play(seat, card);

    if (cap && cap.pisti > 0) {
      const jack = cap.pisti === 20;
      table.burst(jack);
      sfx.pisti(jack);
      haptic('heavy');
      hud.pisti(jack, cap.pisti);
      await sleep(800);
      this.d.speak(seat === 0 ? (jack ? 'playerJackPisti' : 'playerPisti') : jack ? 'botJackPisti' : 'botPisti', true);
      await sleep(250);
    } else haptic('light');

    if (cap) {
      await sleep(cap.pisti ? 80 : 240);
      sfx.capture(cap.cards.length);
      haptic('medium');
      await table.collect(seat, cap.pisti ? card : null);
      this.stats();
      const p = table.stackPoint(seat);
      hud.popScore(p.x, p.y, `+${cap.cards.length}`);
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
        await sleep(220);
        if (this.state.deck.length === 0) {
          hud.banner('Son el!');
          this.d.speak('lastRound');
        }
        await table.dealHands(e.deals);
        const a = this.state.captured[0].length + this.state.pistiPoints[0], b = this.state.captured[1].length + this.state.pistiPoints[1];
        if (Math.random() < 0.3) this.d.speak(a > b + 8 ? 'playerLeading' : b > a + 8 ? 'botLeading' : 'botThinking');
      } else if (e.t === 'finalSweep') {
        await sleep(320);
        sfx.capture(e.cards.length);
        await table.collect(e.seat, null);
        this.stats();
      } else if (e.t === 'gameOver') result = e.result;
    }
    return result;
  }
}
