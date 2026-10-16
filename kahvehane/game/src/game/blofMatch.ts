// Blöf eli: motoru DOĞRUDAN çağırmaz — yerel ev sahibi (net/LocalHost: yetkili motor + 5 sn pencere sayacı + botlar) ile
// GameClient üzerinden konuşur; ileride aynı akış sunucuya bağlanır. Gelen olayları sahneye çevirir (uçuş, açılış, damga,
// tepki, replik, ses, titreşim), arayüzden gelen hamleleri ev sahibine yollar, her olay kümesini sunduktan sonra 'ack' verir
// (pencere sayacı ve botlar animasyon bitince başlar).
// Dışarıdan görünüşü Pişti'nin Match'iyle aynı: new BlofMatch({table, hud, sfx, voice, auto}).play(setup) → BlofOutcome | null, abort().
import {BLOF_MODES, blofConfigFor, claimText, type BlofAction, type BlofEvent, type BlofMode, type BlofTell, type BlofView} from '../core/blofTypes';
import {rankOf} from '../core/types';
import {mulberry32} from '../core/rng';
import {BlofBot, type BlofDifficulty} from '../ai/blofBot';
import {createBlofLocal, type BlofClient, type BlofHost} from '../net/blofLocal';
import {BlofTalk, BLOF_MOOD, TUTORIAL, type BlofMoment} from '../ai/blofDialogue';
import type {ServerMsg} from '../net/protocol';
import {BlofTable, type BlofSounds} from '../table2d/blofTable';
import type {Table2D} from '../table2d/table';
import {BlofHud, type BarState} from '../ui/blofHud';
import type {Sfx} from '../audio/sfx';
import type {VoicePlayer} from '../audio/voice';
import type {GameHud, HudPose} from '../ui/types';
import {haptic, store} from '../platform/bridge';
import {charById} from './roster';
import {type BlofOutcome, type BlofSeatResult, type Difficulty, type HandLayout, type MatchSetup, type SeatPlayer} from './types';

export interface BlofMatchDeps {
  table: Table2D;
  hud: GameHud;
  sfx: Sfx;
  voice: VoicePlayer;
  /** Test/önizleme: insan koltuğu (0) kendiliğinden oynar (arayüz yolundan: kartları seçer, düğmeye basar) */
  auto?: boolean;
  /** Blöf arayüzünün takılacağı katman (verilmezse HUD'un kendi öğesi) */
  layer?: HTMLElement;
}

type Msg = ServerMsg<BlofEvent, BlofView, BlofTell>;
type EventsMsg = Extract<Msg, {t: 'events'}>;

const ME = 0;
/** Zorluk kimliği botunkiyle aynı; eski adlar (easy/medium/hard) da kabul. */
const DIFF: Record<string, BlofDifficulty> = {kolay: 'kolay', orta: 'orta', zor: 'zor', easy: 'kolay', medium: 'orta', hard: 'zor'};
const diffOf = (d: Difficulty | undefined): BlofDifficulty => DIFF[d ?? 'orta'] ?? 'orta';
const TUT_KEY = 'tut.blof';
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const pickOne = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

// Masa ve arayüz katmanı bir kez kurulur (52 kart düğümü + havuzlar), sonraki ellerde yeniden kullanılır.
const TABLES = new WeakMap<Table2D, BlofTable>();
const HUDS = new WeakMap<HTMLElement, BlofHud>();

type TutStep = 'open' | 'select' | 'play' | 'blof' | 'pass';

export class BlofMatch {
  private t!: BlofTable;
  private ui!: BlofHud;
  private host: BlofHost | null = null;
  private client: BlofClient | null = null;
  private setup!: MatchSetup;
  private players: SeatPlayer[] = [];
  private n = 2;
  private teams: number[] = [];
  private view: BlofView | null = null;
  private aborted = false;
  private abortRes: () => void = () => {};
  private abortP: Promise<null> = Promise.resolve(null);
  private talk = new BlofTalk();
  private counts: number[] = [];
  private pileN = 0;
  private outN = 0;
  /** Turu açarken seçilen değer (yerel) */
  private openRank = 0;
  /** Sunum sürüyor (çubuk kapalı) */
  private busy = true;
  /** Hamle yollandı, sonucu bekleniyor */
  private sent = false;
  /** Hamle pencere kapanınca uygulanacak (sıraya alındı) */
  private queued = false;
  private result: BlofView['result'] = null;
  private idleTimer = 0;
  private autoBot: BlofBot | null = null;
  private autoKey = '';
  private autoTimer = 0;
  private tut: {seen: Set<TutStep>; step: TutStep | null; doneTimer: number} | null = null;
  private handMode: HandLayout = 'group';
  private hintTimer = 0;

  constructor(private d: BlofMatchDeps) {}

  /** El düzeni (oyuncu seçeneği): 'group' değer grupları, 'spread' klasik yayvan. Oyun sırasında da uygulanır. */
  setHandLayout(h: HandLayout): void {
    this.handMode = h;
    this.t?.setHandLayout(h);
  }

  abort(): void {
    this.aborted = true;
    this.abortRes();
    this.host?.stop();
  }

  // ───────── kurulum ─────────
  private ensureViews(): void {
    const {table, sfx, hud} = this.d;
    let t = TABLES.get(table);
    if (!t) {
      const snd: BlofSounds = {
        deal: () => sfx.deal(),
        land: i => sfx.cardLand(i),
        flip: () => sfx.cardFlip(),
        slide: p => sfx.cardSlide(p ?? 0.5),
        whoosh: p => sfx.cardThrow(p),
        tick: i => sfx.tick(i),
        shuffle: () => sfx.shuffle(),
      };
      t = new BlofTable(table, snd);
      TABLES.set(table, t);
    }
    this.t = t;
    const layer = this.d.layer ?? (hud as unknown as {el?: HTMLElement}).el ?? document.querySelector<HTMLElement>('.kh-ui') ?? document.body;
    let ui = HUDS.get(layer);
    if (!ui) {
      ui = new BlofHud(layer, {tap: () => sfx.uiTap(), tick: i => sfx.tick(i), slam: () => sfx.cardLand(0.9)});
      HUDS.set(layer, ui);
    }
    this.ui = ui;
  }

  private bind(): void {
    const {t, ui} = this;
    t.onLayout = L => ui.layout(L);
    t.onDetach = () => ui.show(false);
    t.onSelect = ids => this.onSelect(ids);
    t.onReject = () => {
      this.d.hud.showHint('En fazla 4 kart');
      ui.shakePlay();
      window.clearTimeout(this.hintTimer);
      this.hintTimer = window.setTimeout(() => this.d.hud.showHint(null), 1500);
    };
    t.onPile = () => this.challenge();
    ui.onPlay = () => this.submit();
    ui.onPass = () => this.pass();
    ui.onRank = r => this.chooseRank(r);
    ui.onBlof = () => this.challenge();
    ui.onLetGo = () => this.decline();
    ui.onClear = () => t.clearSelection();
    ui.onQuick = r => {
      t.selectRank(r);
      this.tutSeen('select');
    };
    ui.onSkipTutorial = () => this.endTutorial(false);
  }

  private name(seat: number): string {
    const p = this.players[seat];
    if (!p) return '';
    if (p.human) return 'Sen';
    const n = p.name;
    return n.length > 10 ? n.split(/\s+/).pop() ?? n : n;
  }
  private bot(seat: number): SeatPlayer | null {
    const p = this.players[seat];
    return p && !p.human ? p : null;
  }
  private team(seat: number): number {
    return this.teams[seat] ?? seat;
  }
  private mate(seat: number): number {
    for (let s = 0; s < this.n; s++) if (s !== seat && this.team(s) === this.team(seat)) return s;
    return -1;
  }
  private foes(seat: number): number[] {
    const out: number[] = [];
    for (let s = 0; s < this.n; s++) if (this.team(s) !== this.team(seat) && this.bot(s)) out.push(s);
    return out;
  }

  /** Bot konuşur (balon + yüz ifadesi). */
  private say(seat: number, m: BlofMoment, force = false, ms = 2200, mood?: HudPose | null): boolean {
    const p = this.bot(seat);
    if (!p || this.aborted) return false;
    const line = this.talk.pick(p.char.id, m, force);
    if (!line) return false;
    this.d.hud.say(line, mood === undefined ? BLOF_MOOD[m] : mood, ms, seat);
    return true;
  }

  // ───────── oyun ─────────
  async play(setup: MatchSetup): Promise<BlofOutcome | null> {
    const {hud, sfx} = this.d;
    this.ensureViews();
    this.bind();
    this.aborted = false;
    this.abortP = new Promise<null>(r => (this.abortRes = () => r(null)));
    this.setup = setup;
    const mode = setup.mode as BlofMode;
    const info = BLOF_MODES[mode] ?? BLOF_MODES['1v1'];
    this.n = info.seats;
    this.teams = [...info.teams];
    this.players = [];
    for (const p of setup.players) this.players[p.seat] = p;
    this.counts = new Array<number>(this.n).fill(0);
    this.pileN = 0;
    this.outN = 0;
    this.openRank = 0;
    this.busy = true;
    this.sent = false;
    this.queued = false;
    this.result = null;
    this.view = null;
    this.talk.reset();
    const tutorial = setup.tutorial ?? !store.get<boolean>(TUT_KEY, false);
    this.tut = tutorial && !this.d.auto ? {seen: new Set(), step: null, doneTimer: 0} : null;

    // HUD: Blöf yerleşimi (rozet sayaçları masadaki büyük haplarda)
    hud.setGame?.('blof');
    hud.setSounds(sfx);
    hud.show(setup.players, setup.mode);
    hud.onPoke = s => this.poke(s);
    hud.setDeck(0, 0, 0);
    hud.setTurn(-1);
    hud.showHint(null);
    for (let s = 0; s < this.n; s++) hud.alert?.(s, false);

    // masa + arayüz
    this.handMode = setup.handLayout ?? this.handMode ?? 'group';
    this.t.setHandLayout(this.handMode);
    this.t.reset(this.n);
    this.ui.reset();
    this.stats();
    this.ui.layout(this.t.L);
    this.ui.show(true);

    // yerel ev sahibi: motor yetkili, botlar ev sahibinde, insan koltuğu bu arayüz
    const seed = setup.seed ?? (Math.random() * 2 ** 31) | 0;
    const diff: BlofDifficulty = tutorial ? 'kolay' : diffOf(setup.difficulty);
    const cfg = {...blofConfigFor(mode, seed, tutorial ? ME : undefined), challengeWindowMs: tutorial ? 9000 : undefined};
    const local = createBlofLocal({
      cfg,
      seats: Array.from({length: this.n}, (_, i) => (i === ME ? {kind: 'human' as const, name: setup.players[0]?.name} : {kind: 'bot' as const, difficulty: diff, name: this.players[i]?.name})),
      paceMaxMs: 9000,
      botSeed: (seed ^ 0x5bd1e995) >>> 0,
    });
    const host = local.host;
    this.host = host;
    const client = local.client!;
    this.client = client;
    this.autoBot = this.d.auto ? new BlofBot(ME, 'orta', mulberry32(seed + 7)) : null;
    this.autoKey = '';

    await sleep(140);
    if (this.aborted) return this.finish(null);
    const talkers = this.foes(ME);
    if (talkers.length) this.say(pickOne(talkers), 'start', true, 2400);
    host.start();

    // olay döngüsü
    for (;;) {
      const m = await Promise.race([client.next(), this.abortP]);
      if (!m || this.aborted) return this.finish(null);
      await this.handle(m);
      if (this.aborted) return this.finish(null);
      if (this.result) break;
    }
    const out = this.outcome();
    return this.finish(out);
  }

  private finish<T>(v: T): T {
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.autoTimer);
    if (this.tut?.doneTimer) window.clearTimeout(this.tut.doneTimer);
    this.host?.stop();
    this.client?.close();
    this.host = null;
    this.client = null;
    this.ui.closeBlof(false);
    this.ui.coach(null);
    this.ui.setBar({mode: 'off', rank: null, sel: 0, canPass: false});
    this.t.setSelectable(false);
    this.t.setPileTap(false);
    this.d.sfx.setSlowMo(1);
    this.d.hud.onPoke = () => {};
    this.d.hud.showHint(null);
    for (let s = 0; s < this.n; s++) this.d.hud.alert?.(s, false);
    if (this.aborted) {
      this.ui.show(false);
      this.t.detach();
    }
    this.d.hud.setGame?.('pisti');
    return v;
  }

  private outcome(): BlofOutcome {
    const r = this.result!;
    const win = r.winners.includes(ME) || this.team(r.winner) === this.team(ME);
    const seats: BlofSeatResult[] = Array.from({length: this.n}, (_, seat) => {
      const st = r.stats[seat];
      return {seat, left: r.handCounts[seat] ?? 0, bluffs: st?.bluffs ?? 0, caught: st?.caught ?? 0, timesCaught: st?.timesCaught ?? 0, wrongChallenges: st?.wrongChallenges ?? 0};
    });
    return {setup: this.setup, outcome: win ? 'win' : 'lose', winner: r.winner, seats};
  }

  // ───────── ev sahibi mesajları ─────────
  private async handle(m: Msg): Promise<void> {
    switch (m.t) {
      case 'events': {
        this.busy = true;
        this.controls();
        for (const e of m.events) this.autoBot?.observe(e);
        for (const e of m.events) {
          await this.present(e, m);
          if (this.aborted) return;
        }
        this.view = m.view;
        this.busy = false;
        this.syncCounts(m.view);
        this.client?.ack(m.seq);
        this.controls();
        return;
      }
      case 'timer':
        if (m.timer.kind === 'window') this.openWindow();
        return;
      case 'timerCleared':
        this.closeWindow(false);
        return;
      case 'queued':
        this.queued = true;
        this.sent = false;
        this.d.hud.showHint('Pencere kapanınca atılacak');
        this.controls();
        return;
      case 'rejected':
        this.sent = false;
        this.queued = false;
        if (m.code !== 'phase' && m.code !== 'stale' && m.code !== 'over') {
          this.d.hud.showHint(m.error);
          window.setTimeout(() => this.d.hud.showHint(null), 1600);
        }
        this.controls();
        return;
      case 'sync':
        this.view = m.view;
        this.syncCounts(m.view);
        this.controls();
        return;
      default:
        return;
    }
  }

  /** Görünümle ekrandakini eşitle (sayılar, el). Normalde zaten aynıdır; kopukluk/hata durumunda sessiz düzeltme. */
  private syncCounts(v: BlofView): void {
    let changed = false;
    for (let s = 0; s < this.n; s++) {
      const c = v.handCounts[s] ?? 0;
      if (this.counts[s] !== c) {
        this.counts[s] = c;
        changed = true;
      }
      this.d.hud.alert?.(s, c > 0 && c <= 2);
    }
    if (changed) this.stats();
    this.t.sync(v.hand, v.handCounts);
    this.ui.setHeld(this.heldCounts(v.hand));
    if (this.pileN !== v.pileCount) {
      this.pileN = v.pileCount;
      this.ui.setPile(v.pileCount);
    }
    if (this.outN !== v.discardCount) {
      this.outN = v.discardCount;
      this.ui.setOut(v.discardCount);
    }
  }

  /** Kart sayıları rozetlerin altındaki haplarda (HUD). */
  private stats(): void {
    this.d.hud.setStats(this.counts.map(c => ({cards: c, pisti: 0})));
  }

  private heldCounts(hand: readonly number[]): number[] {
    const c = new Array<number>(14).fill(0);
    for (const id of hand) c[rankOf(id)]++;
    return c;
  }

  // ───────── olayların sahnesi ─────────
  private async present(e: BlofEvent, m: EventsMsg): Promise<void> {
    const {hud, sfx} = this.d;
    const t = this.t, ui = this.ui;
    switch (e.t) {
      case 'deal': {
        hud.setTurn(-1);
        await t.shuffle();
        if (this.aborted) return;
        const order: number[] = [];
        const total = e.counts.reduce((a, b) => a + b, 0);
        for (let i = 0; i < total; i++) order.push((e.startSeat + i) % this.n);
        const mine = e.hands[ME] ?? [];
        await t.deal(order, mine);
        e.counts.forEach((c, s) => (this.counts[s] = c));
        this.stats();
        ui.setHeld(this.heldCounts(mine));
        t.setSelectable(true);
        return;
      }
      case 'turn': {
        hud.setTurn(e.seat, e.seat !== ME);
        if (e.open || !e.rank) {
          ui.setClaim(null);
          ui.setLast(null);
        } else ui.setClaim(e.rank);
        // sıra bende: çubuk + tur halkası (+ hızlı seçim) yeterli; ayrıca ipucu yazısı sahneyi örtmesin
        if (e.seat === ME) haptic('light');
        return;
      }
      case 'opened':
      case 'played': {
        const seat = e.seat;
        if (e.t === 'opened') ui.setClaim(e.rank);
        hud.setTurn(-1);
        const text = claimText(e.count, e.rank) + (seat === ME ? '' : '!');
        hud.say(text, null, 1500, seat);
        if (m.tell && seat === m.actor && this.bot(seat)) {
          if (m.tell.nervous) hud.react(seat, 'saskin', 1300);
          else if (m.tell.smug) hud.react(seat, 'gulumseme', 1300);
        }
        if (seat === ME) {
          haptic('medium');
          this.openRank = 0;
          this.sent = false;
          this.queued = false;
          this.tutSeen('play');
          this.tutSeen('select');
          this.tutSeen('open');
          if (e.t === 'played') this.tutSeen('pass');
          await t.play(ME, e.cards ?? []);
        } else await t.play(seat, e.count);
        this.counts[seat] = e.handCount;
        this.stats();
        this.pileN = e.pileCount;
        ui.setPile(e.pileCount);
        ui.setLast(this.name(seat), e.count);
        hud.alert?.(seat, e.handCount > 0 && e.handCount <= 2);
        if (seat === ME) ui.setHeld(this.heldCounts(t.hand.map(c => c.id)));
        if (e.handCount > 0 && e.handCount <= 2) {
          if (seat === ME) {
            const f = this.foes(ME);
            if (f.length) this.say(pickOne(f), 'playerNearWin');
          } else this.say(seat, 'nearWin');
        }
        return;
      }
      case 'windowOpen': {
        if (e.final) {
          const pp = t.pilePoint();
          hud.shout('SON KART!', pp.x, pp.y, e.by === ME ? 'gold' : 'white');
          this.d.table.setTension(true);
          sfx.drumRoll(0.8);
          haptic('medium');
        }
        return;
      }
      case 'declined':
        this.closeWindow(false);
        return;
      case 'windowClosed':
        this.closeWindow(false);
        this.d.table.setTension(false);
        if (e.by !== ME && this.tut) this.tutSeen('blof');
        return;
      case 'challenged':
        await this.challenged(e.by, e.target);
        return;
      case 'reveal':
        await this.reveal(e);
        return;
      case 'pileTaken': {
        const seat = e.seat;
        const base = this.counts[seat] ?? 0;
        t.setSelectable(false);
        sfx.capture(e.count);
        ui.focusClaim(false);
        await t.take(seat, seat === ME ? (e.cards ?? []) : undefined, (i, total) => {
          const k = base + Math.round(((i + 1) / total) * (e.handCount - base));
          if (k !== this.counts[seat]) {
            this.counts[seat] = k;
            hud.tickCards(seat, k);
          }
        });
        this.counts[seat] = e.handCount;
        this.stats();
        this.pileN = 0;
        ui.setPile(0);
        ui.setClaim(null);
        ui.setLast(null);
        hud.alert?.(seat, e.handCount > 0 && e.handCount <= 2);
        this.d.table.setTension(false);
        if (seat === ME) ui.setHeld(this.heldCounts(t.hand.map(c => c.id)));
        t.setSelectable(true);
        if (e.count >= 10) {
          const watchers = this.foes(seat).filter(s => s !== seat);
          if (watchers.length) this.say(pickOne(watchers), 'bigPile');
        }
        return;
      }
      case 'passed': {
        const seat = e.seat;
        hud.setTurn(-1);
        sfx.cardSlide(0.25);
        if (seat === ME) {
          this.sent = false;
          this.queued = false;
          hud.say('Pas', null, 1000, ME);
          this.tutSeen('pass');
        } else if (!this.say(seat, 'pass', false, 1200)) hud.say('Pas', null, 1000, seat);
        await sleep(260);
        return;
      }
      case 'pileCleared': {
        const pp = t.pilePoint();
        hud.shout('KENARA', pp.x, pp.y, 'blue');
        await t.discard();
        this.pileN = 0;
        this.outN += e.count;
        ui.setPile(0);
        ui.setOut(this.outN);
        ui.setClaim(null);
        ui.setLast(null);
        return;
      }
      case 'finished': {
        hud.setTurn(-1);
        const mine = this.team(e.seat) === this.team(ME);
        this.d.table.setTension(false);
        this.d.table.impact('big');
        sfx.win();
        haptic(mine ? 'success' : 'warning');
        hud.banner(e.seat === ME ? 'BİTİRDİN!' : `${this.name(e.seat)} bitirdi!`, this.setup.mode === 'esli' ? (mine ? 'Takımın kazandı' : 'Rakip takım kazandı') : undefined, 1400);
        await sleep(1100);
        return;
      }
      case 'gameOver': {
        this.result = e.result;
        await this.finale(e.result.winner);
        return;
      }
    }
  }

  // ───────── blöf anı ─────────
  /** "Blöf!": çağıran bağırır, çizgi roman patlaması yığına uçar, masa sarsılır. */
  private async challenged(by: number, target: number): Promise<void> {
    const {hud, sfx, table} = this.d;
    this.closeWindow(by === ME);
    hud.setTurn(-1);
    this.t.setSelectable(false);
    const from = by === ME ? {x: this.t.L.u * 3.2, y: this.t.L.barY} : this.t.seatPoint(by);
    const to = this.t.pilePoint();
    sfx.cardLand(1);
    sfx.poke();
    haptic(by === ME || target === ME ? 'heavy' : 'medium');
    table.shake(0.35);
    table.tint('#ff2e4d', 0.55, 650);
    hud.react(by, 'kizgin', 1500);
    hud.react(target, 'saskin', 2200);
    // bot bağırır (kendi repliği); oyuncu için çizgi roman patlaması yeterli (balon tekrarı yok)
    if (this.bot(by)) this.say(by, 'callOut', true, 1300);
    if (by === ME) this.tutSeen('blof');
    void this.ui.call(from, to);
    await sleep(420);
  }

  /** Ağır çekim açılış → damga → tepkiler. Yığın uçuşu sonraki olayda (pileTaken). */
  private async reveal(e: Extract<BlofEvent, {t: 'reveal'}>): Promise<void> {
    const {hud, sfx, table} = this.d;
    const m = e.cards.length;
    sfx.setSlowMo(0.6);
    sfx.drumRoll(Math.min(1.9, 0.3 + m * 0.27));
    this.ui.focusClaim(true, this.t.revealTop(m) - this.t.L.claim.d * 0.62 - this.t.L.u * 0.3);
    await this.t.reveal(e.cards, e.rank, {step: 265});
    sfx.setSlowMo(1);
    if (this.aborted) return;
    const caught = !e.truthful;
    const liar = e.seat, caller = e.by;
    const loser = caught ? liar : caller;
    const winner = caught ? caller : liar;
    // damga açılan kartların alt yarısında (indeksler ve ✓/✗ görünür; alttaki rozet/sayaç açık kalır)
    const y = this.t.revealTop(m) + this.t.L.ch * this.t.revealScale(m) * 0.8;
    const pileN = this.pileN || this.t.pile.length;
    const sub = loser === ME ? `Yığın sana: ${pileN} kart` : `${this.name(loser)} yığını alıyor · ${pileN} kart`;
    // ses + titreşim: oyuncunun durumu belirler
    if (loser === ME) {
      sfx.lose();
      haptic('warning');
    } else if (winner === ME || this.team(winner) === this.team(ME)) {
      if (caught) sfx.pisti(false);
      else sfx.bonus();
      haptic('success');
    } else sfx.sweep();
    if (caught) {
      table.impact('big');
      table.tint('#ff2e4d', 0.7, 900);
    } else {
      table.tint('#3dff86', 0.6, 900);
      table.pulse('#3dff86', 1.6, this.t.pilePoint());
      table.sparkle('#7dffa8', 16, 1.4, this.t.pilePoint());
    }
    void this.ui.stamp(caught ? 'caught' : 'truth', sub, y, 1550);
    // yüzler: yakalanan kızar/üzülür, yakalayan güler; doğru çıkınca diyen şaşırır, atan zafer
    if (caught) {
      hud.react(liar, Math.random() < 0.5 ? 'kizgin' : 'uzgun', 2300);
      hud.react(caller, 'kahkaha', 2000);
    } else {
      hud.react(caller, Math.random() < 0.5 ? 'saskin' : 'kizgin', 2300);
      hud.react(liar, 'zafer', 2000);
    }
    for (let s = 0; s < this.n; s++) {
      if (s === liar || s === caller) continue;
      const mateOfWinner = this.team(s) === this.team(winner);
      hud.react(s, mateOfWinner ? 'gulumseme' : 'saskin', 1500);
    }
    // laf atma
    window.setTimeout(() => {
      if (this.aborted) return;
      if (caught) {
        if (this.bot(caller)) this.say(caller, liar === ME ? 'catchPlayer' : 'catchGloat', true, 2400);
        else if (this.bot(liar)) this.say(liar, 'caughtByPlayer', true, 2400);
        if (this.bot(caller) && this.bot(liar)) window.setTimeout(() => this.say(liar, 'caught', true, 2000), 1100);
      } else {
        if (this.bot(liar)) this.say(liar, caller === ME ? 'survivedPlayer' : 'survived', true, 2400);
        else if (this.bot(caller)) this.say(caller, 'wrongCall', true, 2400);
        if (this.bot(liar) && this.bot(caller)) window.setTimeout(() => this.say(caller, 'wrongCall', true, 2000), 1100);
      }
      // eşli: kazanan tarafın ortağı sevinir
      const m2 = this.mate(winner);
      if (m2 >= 0 && this.bot(m2) && Math.random() < 0.5) window.setTimeout(() => this.say(m2, 'mateCheer', false, 1600), 1500);
    }, 380);
    await sleep(650);
  }

  /** El sonu: kazanan(lar) zafer, diğerleri üzgün; konfeti; son söz. */
  private async finale(winner: number): Promise<void> {
    const {hud} = this.d;
    hud.setTurn(-1);
    const myWin = this.team(winner) === this.team(ME);
    for (let s = 0; s < this.n; s++) {
      const w = this.team(s) === this.team(winner);
      hud.mood(s, w ? 'zafer' : 'uzgun');
      if (w) hud.react(s, 'zafer', 2600);
    }
    if (myWin) {
      hud.cheer(ME);
      const m = this.mate(ME);
      if (m >= 0) window.setTimeout(() => hud.cheer(m), 250);
      const f = this.foes(ME);
      if (f.length) this.say(pickOne(f), 'playerWin', true, 2800);
      if (m >= 0 && this.bot(m)) window.setTimeout(() => this.say(m, 'mateCheer', true, 2000), 700);
    } else {
      const w = this.bot(winner) ? winner : this.foes(ME).find(s => this.team(s) === this.team(winner));
      if (w !== undefined && w >= 0) this.say(w, 'botWin', true, 2800);
    }
    await sleep(1600);
  }

  // ───────── pencere ─────────
  private openWindow(): void {
    const v = this.view;
    const c = this.client;
    if (!v || !c || !v.canChallenge) return;
    const ms = Math.max(400, c.timeLeft());
    this.ui.openBlof(ms, {letGo: true});
    this.t.setPileTap(true, ms);
    if (this.tut && !this.tut.seen.has('blof')) this.tutShow();
  }

  private closeWindow(pressed: boolean): void {
    this.ui.closeBlof(pressed);
    this.t.setPileTap(false);
  }

  // ───────── oyuncu hamleleri ─────────
  private act(a: BlofAction): void {
    if (!this.client || this.aborted) return;
    this.client.act(a);
  }

  private challenge(): void {
    const v = this.view;
    if (!v?.canChallenge || this.busy) return;
    this.closeWindow(true);
    haptic('heavy');
    this.act({t: 'challenge', seat: ME});
  }

  private decline(): void {
    const v = this.view;
    if (!v?.canChallenge) return;
    this.closeWindow(false);
    this.d.sfx.uiTap();
    this.act({t: 'decline', seat: ME});
    if (this.tut) this.tutSeen('blof');
  }

  private pass(): void {
    const v = this.view;
    if (!v || this.busy || this.sent) return;
    const canNow = v.myTurn && v.canPass;
    const canLater = v.phase === 'window' && v.turn === ME;
    if (!canNow && !canLater) return;
    this.d.sfx.uiTap();
    this.sent = true;
    this.t.clearSelection();
    this.act({t: 'pass', seat: ME});
    this.controls();
  }

  private chooseRank(r: number): void {
    this.openRank = r;
    this.t.preselect(r);
    this.tutSeen('open');
    this.d.sfx.cardLand(0.5);
    this.controls();
  }

  private submit(): void {
    const v = this.view;
    if (!v || this.busy || this.sent) return;
    const cards = this.t.selected();
    if (!cards.length || cards.length > 4) return;
    if (v.myTurn && v.mustOpen) {
      if (!this.openRank) return;
      this.act({t: 'open', seat: ME, rank: this.openRank, cards});
    } else if (v.myTurn || (v.phase === 'window' && v.turn === ME)) this.act({t: 'play', seat: ME, cards});
    else return;
    this.sent = true;
    this.controls();
  }

  private onSelect(ids: number[]): void {
    let r = 0;
    for (const id of ids) {
      const k = rankOf(id);
      if (r === 0) r = k;
      else if (r !== k) {
        r = 0;
        break;
      }
    }
    this.ui.setSelectionRank(ids.length ? r : 0);
    if (ids.length) this.tutSeen('select');
    // pencere açıkken sıradaki benim ve kart seçmeye başladım: blöf demiyorum (pencere herkes geçince erken kapanır)
    const v = this.view;
    if (ids.length && v && v.canChallenge && v.turn === ME && this.ui.blofOpen && !this.d.auto) this.decline();
    this.controls();
  }

  /** Eylem çubuğu + öğretici + otomatik oyun: görünümden. */
  private controls(): void {
    const v = this.view;
    const sel = this.t.selected().length;
    const st: BarState = {mode: 'wait', rank: null, sel, canPass: false};
    if (!v || v.over || this.result) st.mode = 'off';
    else if (!this.busy && !this.sent && !this.queued) {
      if (v.myTurn && v.mustOpen) {
        st.mode = 'open';
        st.rank = this.openRank || null;
      } else if (v.myTurn) {
        st.mode = 'follow';
        st.rank = v.rank;
        st.canPass = v.canPass;
      } else if (v.phase === 'window' && v.turn === ME && v.window && v.window.by !== ME && !v.canChallenge) {
        // pencere açıkken sıradaki benim: atarsam "blöf demiyorum" sayılır, hamle pencere kapanınca uygulanır
        st.mode = 'follow';
        st.rank = v.window.rank;
        st.canPass = true;
      }
    }
    this.ui.setBar(st);
    if (st.mode === 'open' && !st.rank && !this.ui.picking) this.ui.openPicker(true);
    // hızlı seçim: turdaki değerden elimde varsa ve hepsi seçili değilse "7'lerini seç ×2"
    let quick = 0, qn = 0;
    if (st.mode === 'follow' && st.rank && v) {
      const mine = this.t.hand.filter(c => rankOf(c.id) === st.rank);
      const selR = mine.filter(c => c.sel).length;
      if (mine.length && selR < Math.min(4, mine.length) && sel < 4) {
        quick = st.rank;
        qn = Math.min(4, mine.length);
      }
    }
    this.ui.setQuick(quick || null, qn);
    this.idle(st.mode === 'open' || st.mode === 'follow');
    this.tutShow();
    this.autoPlay();
  }

  /** Oyuncu uzun düşünürse rakip söylenir. */
  private idle(on: boolean): void {
    window.clearTimeout(this.idleTimer);
    if (!on || this.d.auto) return;
    this.idleTimer = window.setTimeout(() => {
      const f = this.foes(ME);
      if (f.length && this.view?.myTurn) this.say(pickOne(f), 'idle', true, 2200);
    }, 11000);
  }

  private poke(seat: number): void {
    if (!this.bot(seat) || this.aborted) return;
    this.d.hud.react(seat, pickOne<HudPose>(['saskin', 'kizgin', 'kahkaha', 'gulumseme']), 900);
    haptic('light');
  }

  // ───────── otomatik oyun (?auto=1): arayüz yolundan ─────────
  private autoPlay(): void {
    const bot = this.autoBot;
    const v = this.view;
    if (!bot || !v || this.busy || this.sent || this.queued || v.over) return;
    const key = `${v.move}:${v.phase}:${v.myTurn ? 1 : 0}:${v.canChallenge ? 1 : 0}`;
    if (key === this.autoKey || !(v.myTurn || v.canChallenge)) return;
    this.autoKey = key;
    const d = bot.decide(v);
    if (!d) return;
    const a = d.action;
    window.clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(() => {
      if (this.aborted || this.busy) return;
      if (a.t === 'open' || a.t === 'play') {
        if (a.t === 'open') this.chooseRank(a.rank);
        this.t.selectIds(a.cards);
        this.autoTimer = window.setTimeout(() => this.submit(), 320);
      } else if (a.t === 'pass') this.pass();
      else if (a.t === 'challenge') this.challenge();
      else if (a.t === 'decline') this.decline();
    }, Math.min(900, Math.max(250, d.delayMs * 0.4)));
  }

  // ───────── öğretici (ilk Blöf eli; Rıza Amca) ─────────
  private tutSeen(s: TutStep): void {
    const tut = this.tut;
    if (!tut || tut.seen.has(s)) return;
    tut.seen.add(s);
    if (tut.step === s) tut.step = null;
    if (tut.seen.size >= 5) this.endTutorial(true);
  }

  private tutShow(): void {
    const tut = this.tut;
    const v = this.view;
    if (!tut || !v) return;
    const ui = this.ui, t = this.t;
    const face = charById('riza').poses.gulumseme || charById('riza').poses.notr;
    let step: TutStep | null = null;
    let target: {x: number; y: number} | null = null;
    let text = '';
    const mode = this.busy ? 'busy' : v.myTurn ? (v.mustOpen ? 'open' : 'follow') : 'wait';
    if (mode === 'open' && !this.openRank && !tut.seen.has('open')) {
      step = 'open';
      text = TUTORIAL.open;
      // en çok tuttuğun değeri göster (doğru açmak en güvenlisi)
      const held = this.heldCounts(v.hand);
      let best = 1;
      for (let r = 1; r <= 13; r++) if (held[r] > held[best]) best = r;
      target = ui.where('picker', best);
    } else if (mode === 'open' && this.openRank && t.selected().length === 0 && !tut.seen.has('select')) {
      step = 'select';
      text = t.handMode === 'spread' ? TUTORIAL.selectSpread : TUTORIAL.select;
      target = t.handPoint(this.openRank);
    } else if ((mode === 'open' || mode === 'follow') && t.selected().length > 0 && !tut.seen.has('play')) {
      step = 'play';
      text = TUTORIAL.play;
      target = ui.where('play');
    } else if (!this.busy && v.canChallenge && ui.blofOpen && !tut.seen.has('blof')) {
      step = 'blof';
      text = this.bot(v.window?.by ?? -1)?.char.id === 'riza' ? TUTORIAL.blof : TUTORIAL.blofOther;
      target = ui.where('blof');
    } else if (mode === 'follow' && tut.seen.has('play') && !tut.seen.has('pass')) {
      step = 'pass';
      text = TUTORIAL.pass;
      target = ui.where('pass');
    }
    if (step === tut.step) return;
    tut.step = step;
    if (!step) {
      ui.coach(null);
      return;
    }
    ui.coach({text, face, target, at: 'top'});
  }

  private endTutorial(completed: boolean): void {
    const tut = this.tut;
    if (!tut) return;
    this.tut = null;
    store.set(TUT_KEY, true);
    if (!completed) {
      this.ui.coach(null);
      this.d.sfx.uiTap();
      return;
    }
    const face = charById('riza').poses.kahkaha || charById('riza').poses.notr;
    // son söz, masadaki anlık yazılar (KENARA vb.) bittikten sonra
    this.ui.coach(null);
    window.setTimeout(() => {
      if (this.aborted || this.result) return;
      this.ui.coach({text: TUTORIAL.done, face, target: null, at: 'top'});
      window.setTimeout(() => this.ui.coach(null), 3400);
    }, 1300);
  }
}
