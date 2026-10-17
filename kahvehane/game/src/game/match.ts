// Bir elin oyun akışı: kural motoru + botlar + 2B masa + HUD. 1'e 1, 4 kişi (herkes tek) ve eşli (karşıdaki ortak).
// Online'da aynı olay akışı sunucudan gelecek; bu sınıf yalnızca olayları sahneye çevirir (uçuş, tepki, replik, efekt, ses, titreşim).
// Gizli bilgi: sahne (koltuk 0), her bot ve otomatik oyuncu motorun HAM olaylarını değil, kendi koltuğuna süzülmüş olayları
// (pistiEngine.redact) görür — çevrimiçindeki gibi. Baştaki 3 kapalı masa kartını yalnız alan görür; sahnedeki tepkiler
// (değerli kart parıltısı, yüzler, "önde" laf atmaları) başkasının aldığı kapalı kartları hesaba katmaz. El sonu sayımı herkese açık.
import {applyPlay, createGame, viewFor} from '../core/pisti';
import {pistiEngine} from '../core/pistiEngine';
import {mulberry32} from '../core/rng';
import type {CardId, GameResult, PistiEvent, PistiState} from '../core/types';
import {isJack, rankOf} from '../core/types';
import {PistiBot} from '../ai/bot';
import {BANTER_RULES, beginDialogueHand, dialogue, momentPriority, pickLine, setTableHumans, shouldSpeak, type BanterCtx, type Exchange, type Moment as DialogueMoment, type TableMoment} from '../ai/dialogue';
import {chatPolicy} from '../ai/quickTalk';
import {Table2D, cardPoints} from '../table2d/table';
import type {Sfx} from '../audio/sfx';
import type {VoicePlayer} from '../audio/voice';
import {TAIL_MS, speechFor, type SpeechDirector} from '../audio/speech';
import {ChatRelay} from '../net/chat';
import type {GameHud, HudPose} from '../ui/types';
import type {PistiVitrin} from '../ui/pistiVitrin';
import {haptic} from '../platform/bridge';
import {pistiInfo, type MatchSetup, type SeatPlayer} from './types';
import {PISTI_TALK_STORE} from './talk';
import {banterPair} from './banter';
import {SeatBubble, quipUtter, utter, voiceWant} from './seatBubble';
import {whenIdle} from '../platform/sched';
import {QUICK_IDS, type QuickChat} from './quickChat';

/** Karakterlerin konuşabileceği anlar (diyalog sistemi bunlara replik seçer; rövanş kabulü 'endAccept' dahil). */
export type Moment = DialogueMoment | TableMoment | 'endAccept';

export interface MatchDeps {
  table: Table2D;
  hud: GameHud;
  sfx: Sfx;
  voice: VoicePlayer;
  /** Uygulamanın TEK konuşma yöneticisi (verilmezse oynatıcınınki: speechFor(voice)). */
  speech?: SpeechDirector;
  /** Hızlı sohbet denetleyicisi (uygulama başına bir tane). */
  chat?: QuickChat;
  /** Test/önizleme: insan koltuğu (0) kendiliğinden oynar */
  auto?: boolean;
  /** Test: otomatik insan koltuğunun düşünme süresi (ms ortalama; 0 = hemen). Gerçek oyuncu gibi bekletip ölçüm yapmak için (?think=4000). */
  autoThink?: number;
  /** Pişti vitrini (uygulama başına bir tane): maç başında oyuncular tanıtılır, el bitince anında kapanır. */
  vitrin?: PistiVitrin;
}

export interface MatchOutcome {
  setup: MatchSetup;
  result: GameResult;
  /** insan oyuncunun (eşlide takımının) sonucu */
  outcome: 'win' | 'lose' | 'draw';
  /** İnsan oyuncunun yaptığı pişti sayısı (vale piştiler dahil) */
  myPisti: number;
  /** Bunların kaçı vale pişti */
  myValePisti: number;
}

/** İnsanın kararından önce süren atışmanın bitmesi için en çok bekleme (ms). */
const BANTER_WAIT_MS = 6500;

/** Bot düşünme süresi çarpanı (karakter aralığı × bu; tempo hızlı kalsın) */
const TEMPO = 0.8;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const pickOne = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Eşlide ortağın destek repliği (yalnız balon; seslendirme yok). */
const CHEER: Record<string, string[]> = {
  riza: ['Aferin evlat!', 'İşte benim ortağım!', 'Helal olsun, aynı ben gençken!', 'Çaylar benden evlat!'],
  cem: ['Kanka efsane!', 'Hesapladığım gibi!', 'Takım çalışması!', 'İşte bu, devam!'],
  dursun: ['Oh be! Çaylar benden!', 'Helal ortak!', 'Yaz defterine bunu!', 'Maşallah, maşallah!'],
  defne: ['Bayıldım, ortak!', 'Tam planladığım gibi, canım.', 'Zarif hamle!', 'İşte böyle, tatlım.'],
};
const SIGH: Record<string, string[]> = {
  riza: ['Eh be evlat…', 'Valeyi sakla dedim sana!', 'Olur böyle, olur.'],
  cem: ['Kanka o kart gitti ya…', 'İhtimal bizden yana değildi.', 'Sorun yok, toparlarız.'],
  dursun: ['Hay aksi!', 'Eh, bir dahaki ele.', 'Çay iç, kafan açılsın ortak.'],
  defne: ['Ayy, olsun canım.', 'Sakin, toparlarız.', 'Not aldım, tatlım.'],
};
/** Rozete dokununca (dürtme) karakterin tepkisi. */
const POKE: Record<string, string[]> = {
  riza: ['Dürtme evlat, çayım dökülecek!', 'Hop! Bıyığıma dokunma!', 'Oyununa bak sen.', 'Gıdıklanırım ha!'],
  cem: ['Kanka ping atma!', 'Lag yaptırma beni.', 'Ne var ne var?', 'Dur, hesap yapıyorum!'],
  dursun: ['Çay mı istiyorsun?', 'Hey! Defter düşecek!', 'Gıdı gıdı!', 'Kartına bak kartına!'],
  defne: ['Ayy, ojem!', 'Odaklanıyorum, tatlım.', 'Cidden mi, canım?', 'Falına bakarım ha!'],
};
const POKE_POSES: HudPose[] = ['saskin', 'kizgin', 'kahkaha', 'gulumseme', 'saskin'];

export class Match {
  private state!: PistiState;
  private setup!: MatchSetup;
  private players: SeatPlayer[] = [];
  private bots: (PistiBot | null)[] = [];
  private autoBot: PistiBot | null = null;
  private aborted = false;
  private cancelWait: () => void = () => {};
  private pileOwner = new Map<CardId, number>();
  /** Baştaki kapalı masa kartları (ham kimlik) ve onları alan koltuk: başkası aldıysa sahne puanına katılmaz. */
  private hiddenIds = new Set<CardId>();
  private hiddenBy = -1;
  private streak: number[] = [];
  private pistiCount: number[] = [];
  private myPisti = 0;
  private myVale = 0;
  private lastLead = 0;
  private pokeLineAt = -1e9;
  private readonly talk: SpeechDirector;
  private relay: ChatRelay | null = null;

  constructor(private d: MatchDeps) {
    this.talk = d.speech ?? speechFor(d.voice);
  }

  abort(): void {
    this.aborted = true;
    this.cancelWait();
    this.talk.stopAll(); // masadan kalkış: konuşma anında susar, sıra temizlenir
    this.endChat();
  }

  private get seats(): number {
    return this.state.cfg.seats;
  }
  private team(seat: number): number {
    return this.state.cfg.teams[seat];
  }
  private bot(seat: number): SeatPlayer | null {
    const p = this.players[seat];
    return p && !p.human ? p : null;
  }
  /** Koltuğun rakipleri (bot olanlar) */
  private foes(seat: number): number[] {
    const out: number[] = [];
    for (let s = 0; s < this.seats; s++) if (this.team(s) !== this.team(seat) && this.bot(s)) out.push(s);
    return out;
  }
  /** Koltuğun takım arkadaşı (eşli) */
  private mate(seat: number): number {
    for (let s = 0; s < this.seats; s++) if (s !== seat && this.team(s) === this.team(seat)) return s;
    return -1;
  }

  private stats(): void {
    this.d.hud.setStats(Array.from({length: this.seats}, (_, s) => ({cards: this.state.captured[s].length, pisti: this.pistiCount[s]})));
  }

  /**
   * Bot konuşur: TEK konuşma yöneticisinden (ses + balon eşli). force: sıklık kuralını atla. Kanal o öncelikte doluysa
   * replik hiç seçilmez (tekrar hafızası boşa yanmaz) ve false döner.
   */
  private speak(seat: number, m: Moment, force = false, ms = 2400): boolean {
    const p = this.bot(seat);
    if (!p || this.aborted) return false;
    if (!dialogue.allowSoft(m)) return false; // Sakin: ikincil büyük anların çoğu susar (el başı…)
    const prio = momentPriority(m);
    if (!this.talk.canSay(prio)) return false;
    if (!force && !shouldSpeak(m)) return false;
    const line = pickLine(p.char.id, m);
    if (!line) return false;
    return this.talk.say(utter(line, p.char.id, new SeatBubble(this.d.hud, seat), ms), {prio, tag: 'match'});
  }

  /** Seslendirmesiz kısa tepki (balon): kanal doluysa yalnız yüz ifadesi. */
  private quip(seat: number, table: Record<string, string[]>, pose: HudPose, ms = 1800): void {
    const p = this.bot(seat);
    const list = p ? table[p.char.id] : undefined;
    if (!p || !list || this.aborted) return;
    // sohbet seviyesi: Sakin'de ortak sevinci / iç çekme çoğunlukla yalnız yüz ifadesi
    if (!dialogue.allowQuip() || !this.talk.say(quipUtter(pickOne(list), p.char.id, new SeatBubble(this.d.hud, seat), pose, ms), {prio: 1, tag: 'match'})) this.d.hud.react(seat, pose, Math.min(ms, 1500));
  }

  private poke(seat: number): void {
    const p = this.bot(seat);
    if (!p || this.aborted) return;
    const pose = pickOne(POKE_POSES);
    const now = performance.now();
    const said = now - this.pokeLineAt > 3500 && this.talk.say(quipUtter(pickOne(POKE[p.char.id] ?? ['Hı?']), p.char.id, new SeatBubble(this.d.hud, seat), pose, 1700), {prio: 1, tag: 'match'});
    if (said) this.pokeLineAt = now;
    else this.d.hud.react(seat, pose, 900);
    haptic('light');
  }

  // ───────── botlar arası atışma (banter) ─────────
  /**
   * a ile b (iki bot) arasında bağlama uygun bir atışma dener (dialogue.ts → pickBanter: 1'e 1'de yok, en çok 2 elde bir,
   * aynısı 40 el tekrar etmez). Atışma bölünmez birim olarak tek kanaldan söylenir. react: bir olay tepkisinin YERİNE
   * (yakalama) → sessizlik şartı aranmaz, kanal boşalınca başlar (sıraya girer).
   */
  private banter(ctx: BanterCtx, a: number, b: number, react = false): boolean {
    const pa = this.bot(a), pb = this.bot(b);
    if (!pa || !pb || a === b || this.aborted || this.seats < 3) return false;
    if (!this.talk.canSay(2, react)) return false;
    const ex = dialogue.banter({
      game: 'pisti', ctx, a: pa.char.id, b: pb.char.id, mode: this.setup.mode, sameTeam: this.team(a) === this.team(b),
      calm: true, talk: this.talk.isEnabled ? 'voice' : 'bubbles', quietForMs: react ? Infinity : undefined,
    });
    return !!ex && this.sayExchange(ex, a, b, react);
  }

  private sayExchange(ex: Exchange, a: number, b: number, queue: boolean): boolean {
    const lines = ex.lines.map(l => utter(l, l.char, new SeatBubble(this.d.hud, l.char === ex.a ? a : b), 1800));
    return this.talk.exchange(lines, {prio: 2, tag: 'banter', gapMs: BANTER_RULES.lineGapMs, queue, ttlMs: queue ? 4000 : 2500});
  }

  /** Bot koltukları. */
  private botSeats(): number[] {
    const out: number[] = [];
    for (let s = 0; s < this.seats; s++) if (this.bot(s)) out.push(s);
    return out;
  }

  /** as × bs içinden bu bağlamda atışması yazılmış bir bot çifti (yoksa null). */
  private pair(ctx: BanterCtx, as: readonly number[], bs: readonly number[]): [number, number] | null {
    return banterPair(ctx, as, bs, s => this.bot(s)?.char.id);
  }


  // ───────── hızlı sohbet ─────────
  /** Yerel yayıncı (ev sahibi yok): ChatRelay aynı kapıdan geçirir (kimlik + hız sınırı); çevrimiçinde sunucu yayar. */
  private startChat(setup: MatchSetup): void {
    const chat = this.d.chat;
    if (!chat) return;
    const seats = setup.players.map(p => ({seat: p.seat, char: p.char.id, team: p.team, human: p.human}));
    // politika: söyleyiş + hedef denetimi (kişiye özel söz yalnız bot hedefe), bot cevabını yayıncı planlar (herkes aynısını duyar)
    const relay = new ChatRelay({ids: QUICK_IDS, policy: chatPolicy({game: 'pisti', mode: setup.mode, seats})});
    this.relay = relay;
    relay.on(m => {
      if (!this.aborted) chat.receive(m.seat, m.msg, m);
    });
    chat.attach({game: 'pisti', mode: setup.mode, me: 0, seats, send: (msg, line, to) => void relay.send(0, msg, line, to)});
    chat.cue('start');
  }

  private endChat(): void {
    if (!this.relay) return;
    this.d.chat?.detach();
    this.relay.close();
    this.relay = null;
  }

  /** Bir el oynatır; yarıda kesilirse null. HUD'u bu koltuklarla kendisi gösterir. */
  async play(setup: MatchSetup): Promise<MatchOutcome | null> {
    try {
      return await this.run(setup);
    } finally {
      this.d.vitrin?.end();
      this.endChat();
      this.talk.cancel('banter'); // el bitti: yarım atışma kalmaz (son söz sürebilir; sonuç ekranından önce uygulama bekler)
      this.d.hud.onPoke = () => {};
    }
  }

  private async run(setup: MatchSetup): Promise<MatchOutcome | null> {
    const {table, hud, sfx} = this.d;
    const info = pistiInfo(setup.mode);
    this.aborted = false;
    this.setup = setup;
    this.players = [];
    for (const p of setup.players) this.players[p.seat] = p;
    const seed = setup.seed ?? (Math.random() * 2 ** 31) | 0;
    const {state, events} = createGame({seats: info.seats, teams: [...info.teams], dealer: setup.dealer, seed});
    this.state = state;
    setTableHumans(setup.players.filter(p => p.human).map(p => p.char.id)); // insan avatarına adla seslenilmez (dialogue.ts)
    beginDialogueHand(info.seats, PISTI_TALK_STORE); // el sayacı + kalabalık masada daha seyrek konuşma
    this.bots = Array.from({length: info.seats}, (_, s) => {
      const p = this.players[s];
      return p && !p.human ? new PistiBot(s, p.personality, mulberry32((seed ^ 0x5bd1e995) + s * 7919)) : null;
    });
    this.autoBot = this.d.auto ? new PistiBot(0, {memory: 1, skill: 0.9, jackPatience: 0.7}, mulberry32(seed + 7)) : null;
    this.pileOwner.clear();
    this.hiddenIds.clear();
    this.hiddenBy = -1;
    this.streak = new Array<number>(info.seats).fill(0);
    this.pistiCount = new Array<number>(info.seats).fill(0);
    this.myPisti = 0;
    this.myVale = 0;
    this.lastLead = 0;
    // her beyin yalnız kendi koltuğuna süzülmüş olayı görür (çevrimiçindeki gibi; kapalı kartı yalnız alan görür)
    const observe = (e: PistiEvent) => {
      this.bots.forEach((b, s) => {
        const x = b ? pistiEngine.redact(e, s) : null;
        if (x) b!.observe(x);
      });
      const mine = this.autoBot ? pistiEngine.redact(e, 0) : null;
      if (mine) this.autoBot!.observe(mine);
      if (e.t === 'play') this.pileOwner.set(e.card, e.seat);
      if ((e.t === 'capture' || e.t === 'finalSweep') && e.hidden) {
        this.hiddenIds = new Set(e.cards.slice(0, e.hidden));
        this.hiddenBy = e.seat;
      }
    };
    events.forEach(observe);

    hud.setSounds(sfx);
    hud.show(setup.players, setup.mode);
    this.d.vitrin?.begin(setup.players);
    hud.onPoke = s => this.poke(s);
    this.startChat(setup);
    // paketli ses düzeni: masadaki karakterlerin paketleri boşta iner (masada olmayanlar bellekten atılır)
    void whenIdle(600).then(() => (this.aborted ? undefined : this.d.voice.prepare(voiceWant('pisti', setup.players))));
    table.reset(info.seats);
    this.stats();
    hud.setTurn(-1);
    await sleep(140);
    if (this.aborted) return null;
    sfx.shuffle();
    await table.intro();
    if (this.aborted) return null;
    // el başı: iki bot varsa ara sıra kendi aralarında atışır (dağıtım sürerken), yoksa bir rakip açılış repliği
    const bots = this.botSeats();
    const talkers = this.foes(0);
    // rövanş: sonuç ekranından "Bir El Daha / Yeni Maç" → rövanşı çağıran rakip açılışta kabul eder (el başı repliği yerine)
    const rematch = setup.rematchBy ? talkers.find(s => this.players[s]?.char.id === setup.rematchBy) ?? talkers[0] : undefined;
    const duo = rematch === undefined ? this.pair('start', bots, bots) : null;
    if (!(rematch !== undefined && this.speak(rematch, 'endAccept', true, 2200)) && !(duo && this.banter('start', duo[0], duo[1])) && talkers.length) this.speak(pickOne(talkers), 'start', true);
    for (const raw of events) {
      const e = pistiEngine.redact(raw, 0)!; // sahne = koltuk 0'ın gördüğü
      if (e.t === 'tableDeal') await table.dealTable(e.cards, e.faceUp);
      else if (e.t === 'handDeal') await table.dealHands(e.deals);
      if (this.aborted) return null;
    }

    let result: GameResult | null = null;
    while (!this.state.over) {
      if (this.aborted) return null;
      const seat = this.state.turn;
      this.d.chat?.turn(seat); // hızlı sohbet: "hadi" sıradakine
      let card: CardId;
      if (seat === 0) {
        // atışma insanın kararı sırasında sürmez: botlar konuşurken sıra bekler (en çok BANTER_WAIT_MS)
        if (this.talk.busy('banter')) await this.talk.idle({tag: 'banter', maxMs: BANTER_WAIT_MS});
        if (this.aborted) return null;
        card = await this.waitPlayer();
        if (card < 0 || this.aborted) return null;
      } else {
        const p = this.players[seat];
        hud.setTurn(seat, true);
        // sıra botta: masa boşsa / yığın şiştiyse buna laf, yoksa mırıltı (sıklık sohbet seviyesinde: Sakin yok, Geveze sık)
        const pf = dialogue.profile;
        if (this.state.pile.length === 0 && Math.random() < 0.3) this.speak(seat, 'tableEmpty');
        else if (this.state.pile.length >= 6 && Math.random() < pf.turn && this.speak(seat, 'pileGrows')) {
          // yığın lafı söylendi
        } else if (Math.random() < pf.turn) this.speak(seat, 'botThinking');
        const [a, b] = p?.think ?? [0.5, 0.9];
        // karar önce verilir (durum düşünürken değişmez); süre kararın zorluğuna göre: apaçık hamle kısa, başa baş uzun
        card = this.bots[seat]!.choose(viewFor(this.state, seat));
        const hard = this.bots[seat]!.thinkScale();
        await table.think(seat, (a + Math.random() * (b - a)) * 1000 * TEMPO * hard + (this.state.pile.length === 1 ? 220 : 0));
        if (this.aborted) return null;
      }
      hud.setTurn(-1);
      const pileBefore = this.state.pile.slice();
      const r = applyPlay(this.state, seat, card);
      this.state = r.state;
      this.d.chat?.acted(seat); // hızlı sohbet: tepki mesajları son hamleyi yapana
      r.events.forEach(observe);
      result = await this.present(seat, card, r.events.map(e => pistiEngine.redact(e, 0)!), pileBefore);
      if (this.aborted) return null;
    }
    if (!result) return null;
    const outcome = await this.finale(result);
    if (this.aborted) return null;
    return {setup, result, outcome, myPisti: this.myPisti, myValePisti: this.myVale};
  }

  private async waitPlayer(): Promise<CardId> {
    const {table, hud} = this.d;
    const v = viewFor(this.state, 0);
    hud.setTurn(0);
    const first = this.state.round === 1 && this.state.hands[0].length === 4 && this.state.captured.every(c => c.length === 0) && this.state.pile.length === 4;
    const chance = v.pileCount === 1 && v.pileTop !== null && v.hand.some(c => rankOf(c) === rankOf(v.pileTop!));
    hud.showHint(first ? 'Kartına dokun, masaya gitsin' : chance ? 'Pişti fırsatı!' : 'Sıra sende');
    const w = table.waitPlayer(Table2D.capturing(v.hand, v.pileTop, v.pileCount));
    this.cancelWait = w.cancel;
    const best = Table2D.bestCapture(v.hand, v.pileTop, v.pileCount);
    const t1 = window.setTimeout(() => {
      if (best === null) return;
      table.wiggle(best);
      hud.showHint(v.pileCount === 1 && rankOf(best) === rankOf(v.pileTop!) ? 'Pişti fırsatı!' : 'Bu kartla alabilirsin!');
    }, 6000);
    const foes = this.foes(0);
    const t2 = window.setTimeout(() => foes.length && this.speak(pickOne(foes), 'myTurnIdle'), dialogue.idleDelay(9000));
    if (this.autoBot) {
      const c = this.autoBot.choose(v);
      window.setTimeout(() => table.pick(c), 380 + (this.d.autoThink ? this.d.autoThink * (0.5 + Math.random()) : 0));
    }
    const card = await w.card;
    clearTimeout(t1);
    clearTimeout(t2);
    this.cancelWait = () => {};
    hud.showHint(null);
    if (card >= 0) haptic('light');
    return card;
  }

  /**
   * Bir hamlenin sahnesi: atış → (pişti kutlaması | değerli kartlar → süpürme) → seri → tepkiler → yeni dağıtım / son süpürme.
   * evs: koltuk 0'a süzülmüş olaylar (başkasının aldığı kapalı masa kartı −1).
   */
  private async present(seat: number, card: CardId, evs: PistiEvent[], pileBefore: CardId[]): Promise<GameResult | null> {
    const {table, hud, sfx} = this.d;
    const cap = evs.find(e => e.t === 'capture') as Extract<PistiEvent, {t: 'capture'}> | undefined;
    await table.play(seat, card);
    if (this.aborted) return null;

    if (cap && cap.pisti > 0) await this.celebrate(seat, card, cap, pileBefore);
    else if (cap) await this.take(seat, card, cap, pileBefore);
    else {
      this.streak[seat] = 0;
      // değerli kartı açıkta bırakmak: ortak/rakip kaşını kaldırır
      if (seat === 0 && cardPoints(card) >= 2) for (const f of this.foes(0)) if (Math.random() < 0.5) hud.react(f, 'gulumseme', 1000);
    }
    if (this.aborted) return null;

    if (cap) {
      this.streak[seat]++;
      if (this.streak[seat] >= 2) {
        const sp = table.scorePoint(seat);
        hud.combo(seat, this.streak[seat], sp.x, sp.y - table.L.ch * 0.75);
        if (seat === 0) haptic('light');
      }
      this.moods();
    }

    let result: GameResult | null = null;
    for (const e of evs) {
      if (this.aborted) return null;
      if (e.t === 'handDeal') {
        await sleep(200);
        if (this.state.deck.length === 0) {
          hud.banner('Son el!', 'Son kartlar dağıtılıyor', 1200);
          sfx.drumRoll(1.1);
          table.setTension(true);
          haptic('medium');
          const t = this.foes(0);
          const bots = this.botSeats();
          const duo = this.pair('lastRound', bots, bots);
          if (!(duo && this.banter('lastRound', duo[0], duo[1])) && t.length) this.speak(pickOne(t), 'lastRound');
          await sleep(650);
        }
        await table.dealHands(e.deals);
        this.leadingChatter();
      } else if (e.t === 'finalSweep') {
        await sleep(320);
        const p = this.players[e.seat];
        hud.banner('Kalan kartlar', `${p?.human ? 'Senin' : p?.name ?? ''} — son alan alır`, 900);
        sfx.capture(e.cards.length);
        const base = this.state.captured[e.seat].length - e.cards.length;
        await table.collect(e.seat, null, i => hud.tickCards(e.seat, base + i + 1));
        this.stats();
        const sp = table.scorePoint(e.seat);
        hud.popScore(sp.x, sp.y, `+${e.cards.length}`, 'white');
      } else if (e.t === 'gameOver') result = e.result;
    }
    return result;
  }

  /** Pişti: masa patlar, karakter büyük girer (damga + kuşanılmış efekt), diğerleri tepki verir; sonra kartlar süzülür. */
  private async celebrate(seat: number, card: CardId, cap: Extract<PistiEvent, {t: 'capture'}>, pileBefore: CardId[]): Promise<void> {
    const {table, hud, sfx} = this.d;
    const jack = cap.pisti === 20;
    table.impact(jack ? 'jack' : 'pisti');
    sfx.pisti(jack);
    haptic('heavy');
    if (jack) window.setTimeout(() => haptic('success'), 450);
    this.pistiCount[seat]++;
    this.d.chat?.cue(seat === 0 ? 'iScored' : 'theyScored', seat);
    if (seat === 0) {
      this.myPisti++;
      if (jack) this.myVale++;
    }
    const victim = this.pileOwner.get(pileBefore[0]) ?? (seat - 1 + this.seats) % this.seats;
    let line: string | undefined;
    let said: {id: string; bubble: SeatBubble} | null = null;
    const maker = this.bot(seat);
    if (maker) {
      const m: Moment = jack ? 'botJackPisti' : 'botPisti';
      const l = pickLine(maker.char.id, m);
      if (l) {
        line = l.text;
        // yazı kahraman bandında; ses bittikten önce bant çekilirse kalanı koltuk balonunda sürer
        const bubble = new SeatBubble(hud, seat, true);
        if (this.talk.say(utter(l, maker.char.id, bubble, 1600), {prio: momentPriority(m), tag: 'match'})) said = {id: l.id, bubble};
      }
    }
    // diğerleri: ortak sevinir, kurban kızar/şaşırır, kalanlar şaşırır
    const mate = this.mate(seat);
    for (let s = 0; s < this.seats; s++) {
      if (s === seat) continue;
      if (s === mate) hud.react(s, 'kahkaha', 1800);
      else if (s === victim) hud.react(s, jack ? 'saskin' : 'kizgin', 2000);
      else hud.react(s, 'saskin', 1600);
    }
    if (!maker) {
      // insan pişti yaptı: kurban (bot) söylenir; eşlide ortak alkışlar
      window.setTimeout(() => {
        if (this.bot(victim) && this.team(victim) !== this.team(0)) this.speak(victim, jack ? 'playerJackPisti' : 'playerPisti', true, 2600);
        else {
          const f = this.foes(0);
          if (f.length) this.speak(pickOne(f), jack ? 'playerJackPisti' : 'playerPisti', true, 2600);
        }
        if (mate >= 0 && this.bot(mate)) this.quip(mate, CHEER, 'kahkaha', 2000);
      }, jack ? 900 : 700);
    }
    await hud.pisti({seat, jack, points: cap.pisti, fx: this.setup.fx, line, at: table.pilePoint(), low: table.low});
    if (this.aborted) return;
    const cur = said && this.talk.current();
    if (said && cur && cur.id === said.id && cur.leftMs > 250) said.bubble.late(cur.leftMs + TAIL_MS);
    sfx.capture(cap.cards.length);
    await this.sweep(seat, cap, card);
  }

  /** Sıradan alış: değerli kartlar parlar ve puanını gösterir, büyükse SÜPÜRDÜ, kartlar yay çizerek desteye. */
  private async take(seat: number, card: CardId, cap: Extract<PistiEvent, {t: 'capture'}>, pileBefore: CardId[]): Promise<void> {
    const {table, hud, sfx} = this.d;
    await sleep(130);
    // baştaki kapalı kartlar: alan bensem bir an açılıp bana gösterilir; başkası aldıysa kapalı kalır (kimliği −1)
    if (cap.hidden && seat === 0) {
      await table.revealHidden(cap.cards.slice(0, cap.hidden).filter(c => c >= 0));
      if (this.aborted) return;
    }
    const vals = await table.showValuables(cap.cards);
    if (this.aborted) return;
    if (vals.length) {
      vals.forEach((v, i) => window.setTimeout(() => {
        hud.popScore(v.x, v.y, '+' + v.pts, 'gold');
        sfx.valuable(v.pts);
      }, i * 110));
      await sleep(330 + vals.length * 90);
    }
    const n = cap.cards.length;
    const big = n >= 6;
    if (big) {
      const pp = table.pilePoint();
      table.impact('big');
      table.sweepFx();
      sfx.sweep();
      hud.shout('SÜPÜRDÜ!', pp.x, pp.y - table.L.ch * 0.95, seat === 0 || this.team(seat) === this.team(0) ? 'gold' : 'white');
      haptic('medium');
    } else {
      haptic(seat === 0 ? 'medium' : 'light');
      if (n >= 4) table.boostRays(3, 700);
    }
    sfx.capture(n);
    // tepkiler
    const maker = this.bot(seat);
    const human = seat === 0;
    const valuableDumped = pileBefore.some(c => this.pileOwner.get(c) === 0 && cardPoints(c) >= 1 && !isJack(c));
    const notable = big || isJack(card) || vals.some(v => v.pts >= 2);
    if (this.team(seat) !== this.team(0) && valuableDumped) this.d.chat?.cue('myMistake', seat);
    else if (big) this.d.chat?.cue(human ? 'iScored' : 'theyScored', seat);
    let spoke = false;
    if (this.capBanter(seat, pileBefore, notable)) {
      spoke = true; // iki bot kendi arasında atıştı (tek tepki yerine)
    } else if (maker && this.team(seat) !== this.team(0) && valuableDumped && this.speak(seat, 'playerDumpedValuable')) {
      spoke = true;
      const m = this.mate(0);
      if (m >= 0 && this.bot(m) && Math.random() < 0.6) window.setTimeout(() => this.quip(m, SIGH, 'uzgun', 1600), 900);
    } else if (big) {
      if (maker) spoke = this.speak(seat, 'botBigCapture');
      else {
        const f = this.foes(0);
        if (f.length) spoke = this.speak(pickOne(f), 'playerBigCapture');
      }
    } else if (isJack(card) && Math.random() < 0.5) {
      if (maker) spoke = this.speak(seat, 'botJackCapture');
      else {
        const f = this.foes(0);
        if (f.length) spoke = this.speak(pickOne(f), 'playerJackCapture');
      }
    } else if (maker && pileBefore.length && this.pileOwner.get(pileBefore[pileBefore.length - 1]) === 0 && Math.random() < 0.3) spoke = this.speak(seat, 'botLuckyCapture');
    // büyük tepki söylenmediyse: sıradan alışa masa sohbeti (sohbet seviyesi; Sakin'de yok)
    if (!spoke) this.tableReact(seat, pileBefore);
    // yüz ifadesi: alan sevinir; büyükte kaybedenler şaşırır; eşlide ortak sevinir
    hud.react(seat, big || vals.some(v => v.pts >= 2) ? 'kahkaha' : 'gulumseme', 1300);
    const mate = this.mate(seat);
    if (mate >= 0 && (big || human)) hud.react(mate, 'gulumseme', 1200);
    if (big) for (let s = 0; s < this.seats; s++) if (this.team(s) !== this.team(seat)) hud.react(s, Math.random() < 0.5 ? 'saskin' : 'kizgin', 1500);
    if (human && big && mate >= 0 && this.bot(mate) && Math.random() < 0.6) window.setTimeout(() => this.quip(mate, CHEER, 'kahkaha', 1800), 500);
    await this.sweep(seat, cap, null);
  }

  /**
   * Masa sohbeti: sıradan bir alışa KISA tepki (var olan kısa sesler: dialogue.ts POOL_ALIAS). Alan bot sevinir; yığını bırakan rakip
   * bot (4 kişi / eşli: başka bot da olabilir) homurdanır; oyuncu aldıysa yığını bırakan bot, yoksa rastgele bir rakip. Eşlide alan
   * botun ortağı yazıyla alkışlar. Sıklığı sohbet seviyesi (table) ve konuşma yöneticisi (kanal doluysa söylenmez) belirler.
   */
  private tableReact(seat: number, pileBefore: CardId[]): void {
    if (dialogue.profile.table <= 0) return;
    const top = pileBefore[pileBefore.length - 1];
    const owner = top === undefined ? -1 : this.pileOwner.get(top) ?? -1;
    const loser = owner >= 0 && owner !== seat && this.bot(owner) && this.team(owner) !== this.team(seat) ? owner : -1;
    if (this.bot(seat)) {
      const said = this.speak(seat, 'botCapture');
      if (loser >= 0 && this.seats >= 3) window.setTimeout(() => this.speak(loser, 'rivalCapture'), said ? 1900 : 200);
      const m = this.mate(seat);
      if (said && m >= 0 && this.bot(m) && Math.random() < 0.3) window.setTimeout(() => this.quip(m, CHEER, 'gulumseme', 1500), 900);
    } else {
      const f = this.foes(0);
      if (loser >= 0) this.speak(loser, 'playerCapture');
      else if (f.length) this.speak(pickOne(f), 'playerCapture');
    }
  }

  /**
   * Önemli bir alışta atışma: bot A, karşı taraftaki bot B'nin bıraktığı yığını aldı → steal; eşlide bot A, ortağı bot B'nin
   * alışını över → mateHype; insanın takımı bot B'nin bıraktığını aldı → B'nin ortağı (bot) sitem eder → mateBlame.
   */
  private capBanter(seat: number, pileBefore: CardId[], notable: boolean): boolean {
    if (this.seats < 3) return false;
    // sıradan alışta atışma yalnız masa sohbeti açıkken (Geveze) ve ara sıra: Normal'de eskisi gibi yalnız önemli alışta
    if (!notable && Math.random() >= dialogue.profile.table * 0.35) return false;
    const top = pileBefore[pileBefore.length - 1];
    const owner = top === undefined ? -1 : this.pileOwner.get(top) ?? -1;
    const esli = this.setup.mode === 'esli';
    if (this.bot(seat)) {
      if (owner >= 0 && owner !== seat && this.bot(owner) && this.team(owner) !== this.team(seat) && this.banter('steal', seat, owner, true)) return true;
      const m = this.mate(seat);
      if (esli && m >= 0 && this.bot(m) && Math.random() < 0.5) return this.banter('mateHype', m, seat, true);
      return false;
    }
    if (esli && owner >= 0 && this.bot(owner) && this.team(owner) !== this.team(seat)) {
      const m = this.mate(owner);
      if (m >= 0 && this.bot(m)) return this.banter('mateBlame', m, owner, true);
    }
    return false;
  }

  /** Kartlar desteye uçarken sayaç tek tek ilerler; sonunda "+N". */
  private async sweep(seat: number, cap: Extract<PistiEvent, {t: 'capture'}>, pistiCard: CardId | null): Promise<void> {
    const {table, hud} = this.d;
    const base = this.state.captured[seat].length - cap.cards.length;
    await table.collect(seat, pistiCard, i => hud.tickCards(seat, base + i + 1));
    this.stats();
    const sp = table.scorePoint(seat);
    hud.popScore(sp.x, sp.y, `+${cap.cards.length}`, 'white');
    this.pileOwner.clear();
  }

  /**
   * Taraf puanları (o ana kadar), oyuncunun (koltuk 0) bildiği kadarıyla: kart puanları + pişti + kesin çoğunluk tahmini.
   * Başkasının aldığı kapalı masa kartlarının puanı sayılmaz (yüz ifadeleri / laf atmaları gizli kartı ele vermesin).
   */
  private standings(): Map<number, number> {
    const pts = new Map<number, number>();
    const cards = new Map<number, number>();
    for (let s = 0; s < this.seats; s++) {
      const t = this.team(s);
      let p = pts.get(t) ?? 0;
      const secret = s !== 0 && s === this.hiddenBy;
      for (const c of this.state.captured[s]) if (!(secret && this.hiddenIds.has(c))) p += cardPoints(c);
      pts.set(t, p + this.state.pistiPoints[s]);
      cards.set(t, (cards.get(t) ?? 0) + this.state.captured[s].length);
    }
    let best = -1, who = -1, tie = false;
    for (const [t, n] of cards) {
      if (n > best) {
        best = n;
        who = t;
        tie = false;
      } else if (n === best) tie = true;
    }
    if (!tie && who >= 0 && best > 0) pts.set(who, (pts.get(who) ?? 0) + 3);
    return pts;
  }

  /** Çok geride kalan üzülür; bot geriden gelip öne geçerse "comeback". */
  private moods(): void {
    const st = this.standings();
    for (let s = 0; s < this.seats; s++) {
      const mine = st.get(this.team(s)) ?? 0;
      let other = -Infinity;
      for (const [t, v] of st) if (t !== this.team(s)) other = Math.max(other, v);
      this.d.hud.mood(s, other - mine >= 12 ? 'uzgun' : null);
    }
    const me = st.get(this.team(0)) ?? 0;
    let bestFoe = -1, bestV = -Infinity;
    for (const f of this.foes(0)) {
      const v = st.get(this.team(f)) ?? 0;
      if (v > bestV) {
        bestV = v;
        bestFoe = f;
      }
    }
    const lead = Math.sign(me - bestV);
    if (this.lastLead > 0 && lead < 0 && bestFoe >= 0) this.speak(bestFoe, 'comeback');
    if (lead !== 0) this.lastLead = lead;
  }

  private leadingChatter(): void {
    if (Math.random() > dialogue.profile.lead) return;
    const st = this.standings();
    const me = st.get(this.team(0)) ?? 0;
    const foes = this.foes(0);
    if (!foes.length) return;
    let lead = foes[0];
    for (const f of foes) if ((st.get(this.team(f)) ?? 0) > (st.get(this.team(lead)) ?? 0)) lead = f;
    const them = st.get(this.team(lead)) ?? 0;
    // önde giden bot, geride kalan karşı taraf botuna laf atar (atışma); yoksa tek replik
    const behind = foes.filter(f => this.team(f) !== this.team(lead) && (st.get(this.team(lead)) ?? 0) - (st.get(this.team(f)) ?? 0) >= 8);
    const duo = this.pair('lead', [lead], behind);
    if (duo && this.banter('lead', duo[0], duo[1])) return;
    if (me > them + 8) this.speak(pickOne(foes), 'playerLeading');
    else if (them > me + 8) this.speak(lead, 'botLeading');
  }

  /** El sonu: kart sayımı + çoğunluk +3 uçuşu, kazanan zafer / kaybeden üzgün, son söz. */
  private async finale(result: GameResult): Promise<'win' | 'lose' | 'draw'> {
    const {table, hud} = this.d;
    this.talk.cancel('banter'); // el bitti: yarım atışma sürmez
    this.d.chat?.cue('end');
    table.setTension(false);
    hud.setTurn(-1);
    await sleep(350);
    if (this.aborted) return 'draw';
    const esli = this.setup.mode === 'esli';
    const rows = Array.from({length: this.seats}, (_, s) => {
      const p = table.tallyPoint(s);
      return {seat: s, cards: this.state.captured[s].length, x: p.x, y: p.y};
    });
    const maj = result.sides.find(sd => sd.majority > 0);
    const majSeat = maj ? (esli ? (maj.side === this.team(0) ? 0 : this.foes(0)[0] ?? -1) : maj.seats[0]) : -1;
    await hud.tally({rows, merge: esli ? [[2, 0], [3, 1]] : undefined, majority: majSeat, from: table.pilePoint()});
    if (this.aborted) return 'draw';
    const mySide = this.team(0);
    const won = result.winners.includes(mySide);
    const outcome: 'win' | 'lose' | 'draw' = won ? (result.winners.length === 1 ? 'win' : 'draw') : 'lose';
    for (let s = 0; s < this.seats; s++) {
      const w = result.winners.includes(this.team(s));
      hud.mood(s, w ? (result.winners.length === 1 ? 'zafer' : 'gulumseme') : 'uzgun');
      if (w && result.winners.length === 1) hud.react(s, 'zafer', 2600);
    }
    const foes = this.foes(0);
    if (outcome === 'win') {
      haptic('success');
      hud.cheer(0);
      const m0 = this.mate(0);
      if (m0 >= 0) window.setTimeout(() => hud.cheer(m0), 250);
      if (foes.length) this.speak(pickOne(foes), 'playerWin', true, 2800);
      const m = this.mate(0);
      if (m >= 0 && this.bot(m)) window.setTimeout(() => this.quip(m, CHEER, 'zafer', 2200), 700);
    } else if (outcome === 'lose') {
      const winner = foes.find(f => result.winners.includes(this.team(f)));
      if (winner !== undefined) this.speak(winner, 'botWin', true, 2800);
    } else if (foes.length) this.speak(pickOne(foes), 'draw', true, 2800);
    await sleep(1500);
    return outcome;
  }
}
