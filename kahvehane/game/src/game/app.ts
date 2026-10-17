// Uygulama akışı: açılış → (ilk açılışta hikâye + hediye karakter) → ana ekran döngüsü →
// oyna: maç (series.ts: tek el · Pişti 51/101/151 · Blöf 3/5 El) → karşılaşma girişi → eller (Pişti: Match · Blöf: BlofMatch),
// eller arasında Ara Skor → bahis/jeton/XP/istatistik (Profile) → sonuç → Bir El Daha / Yeni Maç / ana ekran.
// Bahis MAÇIN başında bir kez düşülür. Maçı bırakmak (Mola → Masadan Kalk, Ara Skor → Masadan kalk; onaylı) bahsi yakar ve maç
// kaybı sayılır. Yarım kalan maç her el sonunda profile yazılır (Profile.match); uygulama kapanırsa sonraki açılışta ana ekranda
// "devam et?" sorulur: devam, kaldığı ELİN başından aynı tohumla başlar; bırakmak maç kaybıdır. Ekonomi Profile'da; ileride sunucuya.
import type {ResultsData, Screens, Settings} from '../ui/screens';
import type {MatchSetup, MatchLength} from './types';
import {STAKES} from '../ui/screens';
import type {VoicePlayer} from '../audio/voice';
import {speechFor, type SpeechDirector} from '../audio/speech';
import type {QuickChat} from './quickChat';
import type {Sfx} from '../audio/sfx';
import type {ItemKind} from './catalog';
import type {Table2D} from '../table2d/table';
import {Match, type MatchOutcome} from './match';
import type {Profile, SavedMatch} from './profile';
import {MODE_INFO, type BlofOutcome, type Difficulty, type Game, type HandLayout, type Mode, type SeatPlayer} from './types';
import type {GameResult} from '../core/types';
import type {ChatOption, ChatSamplePort, HandOption, ResultsTalk, ResumeOffer, Talker} from '../ui/types';
import {charById, type CharId, type Pose} from './roster';
import {buildSetup, matchXp, receive} from './setup';
import {BLOF, loadBlof, normalizeBlofOutcome, type BlofFactory} from './blofAdapter';
import {
  LENGTH_INFO, createSeries, forfeitSeries, handSeed, handsOf, isExtra, isLong, leaders, lengthFor, outcomeFor, ranking, recordBlof, recordPisti,
  sidesOf, targetOf, type SeriesState,
} from './series';
import {
  CHAT_LEVEL_INFO, chatLevel, chatProfile, dialogue, endChallenger, lineById, planEndTalk, setChatLevel, spectatorFor, speechSeconds,
  type EndFacts, type EndLine, type EndSeat, type LineRef,
} from '../ai/dialogue';
import {utter, voiceWant} from './seatBubble';
import {PISTI_TALK_STORE} from './talk';
import {whenIdle} from '../platform/sched';
import {fmt} from '../ui/dom';
import {post, store} from '../platform/bridge';
import {PistiVitrin} from '../ui/pistiVitrin';

export interface AppDeps {
  table: Table2D;
  sfx: Sfx;
  voice: VoicePlayer;
  /** TEK konuşma yöneticisi (verilmezse oynatıcınınki) */
  speech?: SpeechDirector;
  /** Hızlı sohbet denetleyicisi (oyun içi sohbet düğmesi + pencere) */
  chat?: QuickChat;
  screens: Screens;
  profile: Profile;
  settings: Settings;
  applySettings: (s: Settings) => void;
  /** Kuşanılan deste/masa oyuna uygulanır (atlas yeniden kurulur, tema değişir). */
  applyCosmetics: (kind: ItemKind, id: string) => void | Promise<void>;
  /** ?auto=1: ana ekranda kendiliğinden OYNA, insan koltuğu kendiliğinden oynar (test) */
  auto?: boolean;
  /** ?game=blof: otomatik testte oyun */
  autoGame?: Game;
  /** ?mode=3|4|esli: otomatik testte oyun türü */
  autoMode?: Mode;
  /** ?diff=kolay|orta|zor: otomatik testte Blöf zorluğu */
  autoDifficulty?: Difficulty;
  /** ?hand=group|spread: otomatik testte Blöf el düzeni (verilmezse gruplu; seçici açılmaz) */
  autoHand?: HandLayout;
  /** ?len=tek|51|101|151 (Pişti) · tek|3|5 (Blöf): otomatik testte oyun uzunluğu */
  autoLen?: MatchLength;
  /** ?seed=123: sabit deste (test) */
  seed?: number;
  /** ?chatpick=1: sohbet seçicisini (seçilmiş olsa da) aç (test / ekran görüntüsü) */
  chatPick?: boolean;
  /** ?chat=…: sohbet seviyesi test bayrağıyla sabit (seçici yine kaydeder ama bayrak oturum boyunca geçerli) */
  chatFixed?: boolean;
}

export {buildSetup};

/** Elin (oyundan bağımsız) ortak çalışan yüzeyi: Match de BlofMatch de buna uyar. */
interface Runner {
  play(setup: MatchSetup): Promise<unknown>;
  abort(): void;
}

/** Ara skorun kendiliğinden "Sonraki El" süresi (ms). */
const INTERIM_MS = 6000;

/** Ara skorda konuşan karakter: önde olan bot övünür ya da (oyuncu öndeyse) arkadan gelen söylenir. Konuşacak bot yoksa null. */
export function interimSpeaker(s: SeriesState, players: readonly SeatPlayer[], prevLead: readonly number[]): {seat: number; char: CharId; moment: string | null; pose: Pose} | null {
  const sides = sidesOf(s.mode);
  const mine = sides[0];
  const bots = players.filter(p => !p.human);
  const botOf = (side: number) => bots.find(p => sides[p.seat] === side);
  const lead = leaders(s);
  const order = ranking(s);
  if (lead.length === 1 && lead[0] === mine) {
    const chaser = order.filter(t => t !== mine).map(botOf).find(Boolean);
    return chaser ? {seat: chaser.seat, char: chaser.char.id, moment: 'playerLeading', pose: 'dusunceli'} : null;
  }
  if (lead.length === 1) {
    const b = botOf(lead[0]);
    if (b) {
      const back = prevLead.length === 1 && prevLead[0] === mine; // oyuncu öndeydi, bot öne geçti
      return {seat: b.seat, char: b.char.id, moment: back ? 'comeback' : 'botLeading', pose: back ? 'zafer' : 'kahkaha'};
    }
  }
  const b = order.filter(t => t !== mine).map(botOf).find(Boolean);
  return b ? {seat: b.seat, char: b.char.id, moment: null, pose: 'saskin'} : null;
}

/** Konuşma planı için koltuklar: taraf = maçın tarafı (eşlide takım). */
export function endSeats(setup: MatchSetup): EndSeat[] {
  const sides = sidesOf(setup.mode);
  return setup.players.map(p => ({seat: p.seat, char: p.char.id, human: p.human, side: sides[p.seat] ?? p.seat}));
}

/** 1'e 1'de kenardan laf atacak seyirci (masada olmayan; kahveci Dursun öncelikli). Kalabalık masada yok. */
export function spectatorsOf(setup: MatchSetup): CharId[] {
  if (setup.players.length !== 2) return [];
  const c = spectatorFor(setup.players.map(p => p.char.id));
  return c ? [c] : [];
}

/** Maçın farkı: kıl payı / ezici (Pişti puan farkı · Blöf ceza farkı; uzun maçta hedefe göre). */
export function marginOf(s: SeriesState): {close: boolean; big: boolean} {
  const order = ranking(s);
  if (order.length < 2) return {close: false, big: false};
  const diff = Math.abs((s.totals[order[0]] ?? 0) - (s.totals[order[1]] ?? 0));
  if (s.game === 'pisti') {
    const t = isLong(s.len) ? targetOf(s) : 0;
    return t ? {close: diff <= Math.max(5, Math.round(t * 0.08)), big: diff >= Math.round(t * 0.4)} : {close: diff <= 5, big: diff >= 20};
  }
  const esli = s.mode === 'esli';
  return isLong(s.len) ? {close: diff <= 3, big: diff >= 15} : {close: diff <= (esli ? 3 : 2), big: diff >= (esli ? 12 : 7)};
}

/** Konuşanlar (sırasıyla, tekrarsız): koltuk, karakter, ilk repliğinin yüz ifadesi. */
export function talkersOf(plan: readonly EndLine[], setup: MatchSetup): Talker[] {
  const out: Talker[] = [];
  for (const p of plan) {
    if (out.some(t => t.char.id === p.char)) continue;
    const pl = setup.players.find(x => x.seat === p.seat);
    out.push({seat: p.seat, char: pl?.char ?? charById(p.char), pose: (p.line.mood ?? 'gulumseme') as Pose});
  }
  return out;
}

export async function runApp(d: AppDeps): Promise<void> {
  const {screens, sfx, profile, table} = d;
  const speech = d.speech ?? speechFor(d.voice);
  /** Pişti vitrini: masaya dokununca pişti kartlarını açar (uygulama başına bir tane; ipucu profilde bir kez). */
  const vitrin = new PistiVitrin({
    table,
    slide: v => sfx.cardSlide(v),
    portrait: s => screens.hud.portrait?.(s) ?? null,
    hint: {seen: () => !!profile.data.settings.vitrinHint, mark: () => ((profile.data.settings.vitrinHint = true), profile.save())},
    auto: d.auto,
  });
  let current: Runner | null = null;
  let curGame: Game = 'pisti';
  let dealerBase = 0;
  /** Masadan kalk onaylandı: el yarıda kesildi → maç bırakıldı */
  let leaving = false;
  /** Masadaki bahis (mola onay metni için) */
  let tableStake = 0;
  /** Sonuç ekranında "Bir El Daha / Yeni Maç": yeni maçın açılışında bu rakip rövanşı kabul eder (sonra boşalır) */
  let rematchBy: CharId | null = null;
  /** El / maç sonu repliği seçici: kalıcı tekrar önleme (Pişti hafızası; Blöf maçlarında da aynı havuz) */
  const pickEnd = (c: CharId, ms: readonly string[]) => dialogue.pickAny(c, ms);
  /** Konuşma dizisinin tahmini süresi (ms): manifestteki ses süresi ya da konuşma hızından + satır araları. */
  const estimateMs = (plan: readonly EndLine[]): number =>
    plan.reduce((t, p) => t + (d.voice.duration(p.line.id) ?? speechSeconds(p.char, p.line.tts)) * 1000 + 450, 0);
  /** Sohbet seçicisinin örnekleri: var olan sesli replikler, tek konuşma yöneticisinden (öncekini keser). */
  const samples: ChatSamplePort = {
    play(level, bubble) {
      speech.cancel('chooser');
      const lines = CHAT_LEVEL_INFO[level].sample.map(id => lineById(id)).filter((l): l is LineRef => !!l);
      if (lines.length) speech.exchange(lines.map(l => utter(l, l.char, bubble(l.char), 1400)), {prio: 3, tag: 'chooser', gapMs: level === 'geveze' ? 220 : 420});
    },
    stop: () => speech.cancel('chooser'),
    warm() {
      const want: [string, string][] = [];
      for (const lv of Object.values(CHAT_LEVEL_INFO))
        for (const id of lv.sample) {
          const c = lineById(id)?.char;
          if (c && !want.some(w => w[0] === c)) want.push([c, 'bot']);
        }
      void whenIdle(300).then(() => d.voice.prepare(want));
    },
  };
  /** Ayarlar penceresindeki "Sohbet" satırı: profile yazar, hemen geçerli. */
  const chatOption = (): ChatOption => ({
    value: chatLevel(),
    onChange: l => {
      profile.data.settings.chatLevel = l;
      profile.save();
      setChatLevel(l);
    },
  });
  // her maç uzunluğunda aynı kural (Tek El dahil): kalkmak = bahis yanar + maç kaybı
  const leaveText = (stake: number) =>
    stake > 0 ? `Masadan kalkarsan masadaki ${fmt(stake)} jetonluk bahsi kaybedersin ve maç kayıp sayılır — Tek El'de de.` : 'Masadan kalkarsan bu maç kayıp sayılır.';
  /** Ayarlar penceresindeki "Blöf el düzeni" satırı: profile yazar; Blöf eli sürüyorsa ve masa destekliyorsa anında uygular. */
  const handOption = (): HandOption | undefined => {
    if (!BLOF.available()) return undefined;
    const live = (): ((h: HandLayout) => void) | undefined => (current as Partial<{setHandLayout(h: HandLayout): void}> | null)?.setHandLayout?.bind(current);
    return {
      value: profile.data.settings.blofHand,
      live: !!live(),
      onChange: h => {
        profile.data.settings.blofHand = h;
        profile.save();
        live()?.(h);
      },
    };
  };
  // eski sürümde (maç kaydı yokken) yarıda kalan elin bahsi iade
  const pending = store.get<number>('pendingStake', 0);
  if (pending > 0) {
    profile.addCoins(pending);
    store.set('pendingStake', 0);
  }

  screens.onCosmeticsChanged = (kind, id) => {
    d.applyCosmetics(kind, id);
  };
  screens.hud.onMenu = async () => {
    sfx.uiTap();
    d.chat?.close();
    speech.hold(true); // mola: konuşma susar, menü açık kaldıkça yeni replik yok
    try {
      const r = await screens.pause({sub: leaveText(tableStake)});
      if (r === 'settings') await screens.settings(d.settings, s => d.applySettings(s), handOption(), chatOption());
      else if (r === 'rules') await screens.rules(curGame);
      else if (r === 'leave' && current) {
        leaving = true;
        current.abort();
      }
    } finally {
      speech.hold(false);
    }
  };

  // ilk açılış: hikâye + hediye karakter + ad
  if (!profile.data.onboarded) await screens.onboarding(profile);
  dialogue.attach(PISTI_TALK_STORE); // el / maç sonu konuşmaları Blöf'te de aynı kalıcı hafızayla tekrar etmesin
  // sohbet yoğunluğu: hikâyeden sonra (ya da eski oyuncunun ilk açılışında) bir kez sorulur; otomatik testte sorulmaz
  if ((d.chatPick || !profile.data.settings.chatLevel) && !d.auto) {
    const lvl = await screens.chatChooser(samples, profile.data.settings.chatLevel ?? 'normal');
    profile.data.settings.chatLevel = lvl;
    profile.save();
    setChatLevel(lvl);
  }

  /** Maç bitti/bırakıldı (köprü: uygulama kabuğu). */
  const postEnd = (s: SeriesState, result: 'win' | 'lose' | 'draw', delta: number, forfeit = false) =>
    post('match:end', {game: s.game, mode: s.mode, len: s.len, hands: s.hands.length, result, delta, coins: profile.data.coins, ...(forfeit ? {forfeit: true} : {})});

  /** Yarım kalan maçı "bırak": maç kaybı (bahis maç başında düşülmüştü). */
  const dropSaved = (m: SavedMatch) => {
    const s = forfeitSeries(m.series, sidesOf(m.series.mode)[0]);
    profile.recordGame(s.game, s.mode, 'lose', s.len);
    profile.saveMatch(null);
    postEnd(s, 'lose', -m.stake, true);
  };

  for (;;) {
    const saved = profile.data.match;
    let offer: ResumeOffer | undefined;
    if (saved && (saved.series.game !== 'blof' || BLOF.playable())) {
      const s = saved.series;
      const view = buildSetup(profile, s.mode, saved.opponents, 0, profile.data.equipped.fx, undefined, {game: s.game, difficulty: saved.difficulty, tutorial: false});
      offer = {series: s, players: view.players, stake: saved.stake, frame: profile.data.equipped.frame, auto: d.auto, onDecline: () => dropSaved(saved)};
    }
    const autoGame = d.autoGame && (d.autoGame !== 'blof' || BLOF.playable()) ? d.autoGame : 'pisti';
    const action = await screens.home(profile, d.auto ? {game: autoGame, mode: d.autoMode ?? (autoGame === 'blof' ? '3' : '1v1'), difficulty: d.autoDifficulty} : undefined, offer);
    if (action.type === 'settings') {
      await screens.settings(d.settings, s => d.applySettings(s), handOption(), chatOption());
      continue;
    }
    if (action.type === 'rules') {
      await screens.rules();
      continue;
    }

    // ---- maç ayarı: yeni (ana ekran) ya da yarım kalan (kayıttan) ----
    let resume: SavedMatch | null = null;
    let game: Game, mode: Mode, opponents: CharId[], difficulty: Difficulty, stake: number, len: MatchLength;
    if (action.type === 'resume') {
      resume = profile.data.match;
      if (!resume) continue;
      ({game, mode, len} = resume.series);
      ({opponents, difficulty, stake} = resume);
    } else {
      ({game, mode, opponents, difficulty, stake} = action);
      // uzunluk: ana ekranın verdiği (ileride seçici) → otomatik test (?len=) → oyunun son seçimi (ilk oyunlarda tek el)
      len = lengthFor(game, action.len ?? (d.auto ? d.autoLen : undefined) ?? profile.data.lastLength[game]);
      if (action.len && profile.data.lastLength[game] !== len) {
        profile.data.lastLength[game] = len;
        profile.save();
      }
    }
    curGame = game;
    // ilk Blöf: el düzeni henüz seçilmediyse VS'ten önce seçici (otomatik testte seçici yok)
    if (game === 'blof' && !profile.data.settings.blofHand) {
      profile.data.settings.blofHand = d.auto ? d.autoHand ?? 'group' : await screens.handChooser();
      profile.save();
    }
    const seats = MODE_INFO[mode].seats;
    const mySide = sidesOf(mode)[0];
    let first = true;
    // aynı masada maç döngüsü ("Bir El Daha" / "Yeni Maç": aynı ayarlarla yeni maç)
    for (;;) {
      let series: SeriesState;
      const acc = {pisti: 0, vale: 0, caught: 0};
      /** Maç boyunca oyuncunun Blöf sayıları (sonuç konuşması: çok yakalandı / hiç yakalanmadı) — kayda girmez */
      const talkAcc = {bluffs: 0, timesCaught: 0};
      if (resume) {
        series = resume.series;
        Object.assign(acc, resume.acc);
      } else {
        if (profile.data.coins < stake) {
          // jeton yetmiyorsa açık ve karşılanabilir en büyük bahse in; hiçbiri yoksa ana ekrana (Dursun'un desteği orada)
          const ok = STAKES.filter(s => s.lvl <= profile.data.level && s.v <= profile.data.coins).pop();
          if (!ok) {
            screens.hud.hide();
            await screens.cover();
            break;
          }
          stake = ok.v;
        }
        // ilk eli insan açar (Pişti: dağıtan son koltuk); "Bir El Daha"da dağıtan döner. Blöf'te ilk açanı motor seçer.
        series = createSeries({game, mode, len, seed: d.seed ?? (Math.random() * 2 ** 31) | 0, first: game === 'pisti' ? (seats - 1 + dealerBase++) % seats : -1});
      }
      /** Sıradaki elin kurulumu: tohum ve dağıtan/açan maçtan; öğretici yalnız ilk Blöf maçının ilk elinde. */
      const mkSetup = (s: SeriesState): MatchSetup => {
        const st = buildSetup(profile, mode, opponents, game === 'pisti' ? s.next : 0, profile.data.equipped.fx, handSeed(s), {
          game, difficulty, tutorial: d.auto || s.hands.length > 0 ? false : undefined, handLayout: game === 'blof' ? profile.data.settings.blofHand : undefined,
        });
        st.len = s.len;
        st.handNo = s.hands.length + 1;
        // rövanş: yeni maçın ilk elinde sonuç ekranında rövanş çağıran rakip açılışta kabul eder
        if (rematchBy && !s.hands.length) st.rematchBy = rematchBy;
        if (game === 'blof' && s.next >= 0) st.firstSeat = s.next;
        return st;
      };
      let setup = mkSetup(series);
      // koltuklar maç boyunca sabit (öğretici elde Rıza karşıya alınır; sonraki eller aynı sırayla)
      opponents = setup.players.filter(p => !p.human).sort((a, b) => a.seat - b.seat).map(p => p.char.id);
      table.setActive(true); // maç masası açılır (menülerde kapalıydı)
      // giriş perdesi açıldığında masa temiz görünsün (deste ekran dışında, karıştırmaya hazır). 3 kişi masası maçın kendi kurulumunda yerleşir.
      if (first) table.reset(seats === 2 ? 2 : 4);
      // Blöf motoru giriş ekranı sürerken arka planda yüklenir
      const factory: Promise<BlofFactory | null> = game === 'blof' ? loadBlof().catch(() => null) : Promise.resolve(null);
      const deckReady = table.ready; // deste atlası arka planda çiziliyor olabilir; giriş ekranı süresince tamamlanır
      speech.stopAll(); // giriş müziği/damgası bir konuşmanın üstüne binmez (market / galeri sesi biter)
      if (first) await screens.versus(setup, stake);
      await deckReady;
      first = false;
      const make = await factory;
      if (game === 'blof' && !make) {
        // motor yüklenemedi: yeni maçta bahis hiç düşülmedi; yarım kalan maç kayıtta kalır (sonra yine sorulur)
        screens.hud.hide();
        await screens.cover();
        break;
      }
      // bahis maç başında bir kez düşülür (yarım kalan maçta zaten masada)
      if (!resume) {
        profile.addCoins(-stake);
        sfx.coin(2);
      }
      resume = null;
      tableStake = stake;
      const save = () => profile.saveMatch({series, stake, opponents, difficulty, acc: {...acc}, at: Date.now()});
      save();
      screens.hud.show(setup.players, mode, profile.data.coins, profile.data.equipped.frame);
      screens.hud.setCoins(profile.data.coins);
      const deps = {table, hud: screens.hud, sfx, voice: d.voice, speech, chat: d.chat, auto: d.auto, vitrin};

      // ---- eller ----
      let quit: 'leave' | 'error' | null = null;
      let lastResult: GameResult | undefined;
      let lastBlof: BlofOutcome | undefined;
      for (;;) {
        leaving = false;
        setup = mkSetup(series);
        current = game === 'blof' ? make!(deps) : new Match(deps);
        const run = current.play(setup);
        rematchBy = null;
        if (isLong(series.len)) handBanner(series, setup.players);
        const raw = await run;
        current = null;
        if (!raw) {
          quit = leaving ? 'leave' : 'error';
          break;
        }
        // el sonu: el istatistikleri (pişti / blöf sayıları, el görevleri) hemen; maç durumu ilerler ve kaydedilir
        const prevLead = leaders(series);
        if (game === 'blof') {
          const bo = normalizeBlofOutcome(raw, setup);
          const me = bo.seats[0];
          profile.recordBlofHand(mode, {bluffs: me.bluffs, caught: me.caught, timesCaught: me.timesCaught, wrongChallenges: me.wrongChallenges}, bo.outcome);
          acc.caught += me.caught;
          talkAcc.bluffs += me.bluffs;
          talkAcc.timesCaught += me.timesCaught;
          series = recordBlof(series, {winner: bo.winner, handCounts: bo.seats.map(x => x.left)});
          lastBlof = bo;
        } else {
          const out = raw as MatchOutcome;
          const mine = out.result.sides.find(sd => sd.seats.includes(0));
          profile.recordPistiHand(mode, {pisti: out.myPisti, valePisti: out.myValePisti, cards: mine?.cards ?? 0, majority: (mine?.majority ?? 0) > 0}, out.outcome);
          acc.pisti += out.myPisti;
          acc.vale += out.myValePisti;
          series = recordPisti(series, out.result);
          lastResult = out.result;
        }
        // el bitti: paketli ses düzeninde Ara Skor / sonuç konuşmalarının paketleri önce insin
        void d.voice.prepare(voiceWant(game, setup.players, true));
        if (series.over) break;
        save();
        // son söz yarıda kalmasın, sonra Ara Skor
        await speech.settle(350, 3800);
        speech.stopAll();
        if ((await interim(series, setup, prevLead, stake)) === 'leave') {
          quit = 'leave';
          break;
        }
      }

      if (quit) {
        speech.stopAll();
        if (quit === 'leave') {
          // maçı bırakmak: bahis yanar, maç kaybı
          const s = forfeitSeries(series, mySide);
          profile.recordGame(game, mode, 'lose', s.len);
          postEnd(s, 'lose', -stake, true);
        } else profile.addCoins(stake); // beklenmedik kesinti (oyuncu bırakmadı): bahis iade
        profile.saveMatch(null);
        tableStake = 0;
        screens.hud.hide();
        await screens.cover();
        break;
      }

      // ---- maç sonu ekonomisi (await yok: kayıt ile ödeme arasında uygulama kapanamaz) ----
      const outcome = outcomeFor(series, mySide);
      const mult = LENGTH_INFO[series.len].mult;
      const coinsBefore = profile.data.coins;
      const before = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      const got = receive(mode, stake, outcome, series.winners.length, mult);
      profile.addCoins(got);
      const xpGain = matchXp(game, mode, outcome, {hands: series.hands.length, mult, pisti: acc.pisti, vale: acc.vale, caught: acc.caught});
      profile.recordGame(game, mode, outcome, series.len);
      profile.saveMatch(null);
      tableStake = 0;
      const lv = profile.addXp(xpGain);
      const after = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      postEnd(series, outcome, got - stake);
      const data: ResultsData = {
        setup, result: lastResult, blof: lastBlof, series: isLong(series.len) ? series : undefined, outcome, myPisti: acc.pisti, myValePisti: acc.vale,
        stake, coinsDelta: got - stake, coinsBefore, coinsAfter: profile.data.coins, xpGain, before, after, levelReward: lv.reward,
        streak: game === 'blof' ? profile.data.blof.streak : profile.data.stats.streak,
      };
      // sonuç ekranının karşılıklı konuşması: kazanan / kaybeden, eşlide ortaklar ve rakipler, rövanş çağrısı
      const seatsE = endSeats(setup);
      const blofTalk = game === 'blof';
      const long = isLong(series.len);
      const facts: EndFacts = {
        scene: 'results', game, mode, seats: seatsE, outcome, leaders: series.winners, order: ranking(series), ...marginOf(series),
        streak: outcome === 'win' && data.streak >= 3,
        pistiHeavy: !blofTalk && acc.pisti >= (long ? 3 : 2),
        caughtLot: blofTalk && talkAcc.timesCaught >= (long ? 3 : 2),
        sly: blofTalk && ((talkAcc.bluffs >= 2 && talkAcc.timesCaught === 0) || acc.caught >= (long ? 4 : 3)),
        lastBluff: blofTalk && outcome === 'win' && !!lastBlof?.lastBluff,
        rematch: true, spectators: spectatorsOf(setup),
      };
      const plan = planEndTalk(facts, pickEnd);
      const talk: ResultsTalk = {
        talkers: talkersOf(plan, setup),
        start(stage) {
          if (plan.length) speech.exchange(plan.map(p => utter(p.line, p.char, stage.bubble(p.seat, p.char), 2000)), {prio: 3, tag: 'end', gapMs: 450});
        },
        leave(choice, stage) {
          speech.cancel('end'); // seçim anında konuşma kesilir (düğmeler hiç beklemez)
          const ch = endChallenger(plan, seatsE);
          if (choice === 'again') {
            rematchBy = ch?.char ?? null;
            return;
          }
          // ana sayfaya dönerken ara sıra rakipten kısa bir veda (perde kapanırken biter; ses kapalıysa yok)
          if (ch && speech.live && Math.random() < chatProfile().bye) {
            const line = dialogue.pickAny(ch.char, ['endBye']);
            if (line) speech.say(utter(line, ch.char, stage.bubble(ch.seat, ch.char), 1400), {prio: 3, tag: 'bye'});
          }
        },
      };
      // son söz yarıda kalmasın: konuşma bitene dek (en çok ~3,8 sn) bekle, sonra sonuç ekranının sesi tek başına çalar
      screens.prepareResults(data); // beklerken portreler çözülür (ekran bir kare geç "pat" diye dolmaz)
      await speech.settle(350, 3800);
      speech.stopAll();
      const choice = await screens.results(data, profile.data.equipped.frame, talk);
      if (choice === 'home') {
        screens.hud.hide();
        break;
      }
    }
    table.setActive(false); // ana ekrana dönüş: masa tamamen kapanır (GPU belleği boşalır)
  }

  /** Uzun maçta elin başında kısa afiş: "3. El" + skor özeti (masa karışırken). */
  function handBanner(s: SeriesState, players: readonly SeatPlayer[]): void {
    const no = s.hands.length + 1;
    const extra = isExtra(s);
    const mine = sidesOf(s.mode)[0];
    let sub: string;
    if (s.game === 'pisti') {
      if (!s.hands.length) sub = `${LENGTH_INFO[s.len].title} başlıyor`;
      else {
        const lead = ranking(s)[0];
        const name = (side: number) => (side === mine ? (s.mode === 'esli' ? 'Takımın' : 'Sen') : s.mode === 'esli' ? 'Rakip' : players.find(p => sidesOf(s.mode)[p.seat] === side)?.char.name.split(' ')[0] ?? '');
        sub = lead === mine ? `${name(mine)} öndesin: ${s.totals[mine]} / ${targetOf(s)}` : `${name(mine)} ${s.totals[mine]} · ${name(lead)} ${s.totals[lead]} · hedef ${targetOf(s)}`;
        if (s.mode === 'esli' && lead === mine) sub = `Takımın önde: ${s.totals[mine]} / ${targetOf(s)}`;
      }
    } else sub = !s.hands.length ? `${LENGTH_INFO[s.len].title} · en az ceza kazanır` : `${no} / ${handsOf(s)} · cezan ${s.totals[mine]}`;
    window.setTimeout(() => screens.hud.banner(extra ? 'Uzatma Eli!' : `${no}. El`, sub, 1500), 420);
  }

  /**
   * Ara Skor: karşılıklı kısa konuşma (önde / geride olan bot + ikinci ses; eşlide ortak ↔ rakip), sonra kendiliğinden
   * sonraki el. Konuşma sürecekse otomatik geçiş biraz uzar (en çok 9 sn); "Sonraki El" her an basılabilir.
   */
  async function interim(s: SeriesState, setup: MatchSetup, prevLead: readonly number[], stake: number): Promise<'next' | 'leave'> {
    const lead = leaders(s);
    const mine = sidesOf(s.mode)[0];
    const facts: EndFacts = {
      scene: 'interim', game: s.game, mode: s.mode, seats: endSeats(setup), outcome: lead.length === 1 ? (lead[0] === mine ? 'win' : 'lose') : 'draw',
      leaders: lead, order: ranking(s), prevLeaders: prevLead, spectators: spectatorsOf(setup),
    };
    const plan = planEndTalk(facts, pickEnd);
    let talkers = talkersOf(plan, setup);
    if (!talkers.length) {
      // sessiz Ara Skor (Sakin): önde / geride olan büst yine sahnede
      const sp = interimSpeaker(s, setup.players, prevLead);
      if (sp) talkers = [{seat: sp.seat, char: charById(sp.char), pose: sp.pose}];
    }
    const autoMs = plan.length ? Math.min(9000, Math.max(INTERIM_MS, 900 + estimateMs(plan) + 1400)) : INTERIM_MS;
    const ia = screens.interim({setup, series: s, stake, frame: profile.data.equipped.frame, talkers, autoMs});
    let open = true;
    if (plan.length)
      window.setTimeout(() => open && speech.exchange(plan.map(p => utter(p.line, p.char, ia.stage.bubble(p.seat, p.char), 1800)), {prio: 3, tag: 'end', gapMs: 450}), 900);
    const r = await ia.done;
    open = false;
    speech.stopAll();
    return r;
  }
}
