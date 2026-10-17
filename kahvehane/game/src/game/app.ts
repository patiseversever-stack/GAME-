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
import type {HandOption, ResumeOffer} from '../ui/types';
import type {Pose} from './roster';
import type {CharId} from './roster';
import {buildSetup, matchXp, receive} from './setup';
import {BLOF, loadBlof, normalizeBlofOutcome, type BlofFactory} from './blofAdapter';
import {
  LENGTH_INFO, createSeries, forfeitSeries, handSeed, handsOf, isExtra, isLong, leaders, lengthFor, outcomeFor, ranking, recordBlof, recordPisti,
  sidesOf, targetOf, type SeriesState,
} from './series';
import {pickLine} from '../ai/dialogue';
import {utter} from './seatBubble';
import {fmt} from '../ui/dom';
import {post, store} from '../platform/bridge';

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

export async function runApp(d: AppDeps): Promise<void> {
  const {screens, sfx, profile, table} = d;
  const speech = d.speech ?? speechFor(d.voice);
  let current: Runner | null = null;
  let curGame: Game = 'pisti';
  let dealerBase = 0;
  /** Masadan kalk onaylandı: el yarıda kesildi → maç bırakıldı */
  let leaving = false;
  /** Masadaki bahis (mola onay metni için) */
  let tableStake = 0;
  /** Ara skorda son konuşan (karakter:an) */
  let lastSpoken = '';
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
      if (r === 'settings') await screens.settings(d.settings, s => d.applySettings(s), handOption());
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
      await screens.settings(d.settings, s => d.applySettings(s), handOption());
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
      const deps = {table, hud: screens.hud, sfx, voice: d.voice, speech, chat: d.chat, auto: d.auto};

      // ---- eller ----
      let quit: 'leave' | 'error' | null = null;
      let lastResult: GameResult | undefined;
      let lastBlof: BlofOutcome | undefined;
      for (;;) {
        leaving = false;
        setup = mkSetup(series);
        current = game === 'blof' ? make!(deps) : new Match(deps);
        const run = current.play(setup);
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
      // son söz yarıda kalmasın: konuşma bitene dek (en çok ~3,8 sn) bekle, sonra sonuç ekranının sesi tek başına çalar
      await speech.settle(350, 3800);
      speech.stopAll();
      const choice = await screens.results(data, profile.data.equipped.frame);
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

  /** Ara Skor: konuşan karakter + balon, 6 sn sonra kendiliğinden sonraki el. */
  async function interim(s: SeriesState, setup: MatchSetup, prevLead: readonly number[], stake: number): Promise<'next' | 'leave'> {
    const sp = interimSpeaker(s, setup.players, prevLead);
    const ia = screens.interim({setup, series: s, stake, frame: profile.data.equipped.frame, speaker: sp ? {seat: sp.seat, pose: sp.pose} : undefined, autoMs: INTERIM_MS});
    let open = true;
    // aynı karakter aynı anı üst üste söylemesin diye: tekrarında yarı yarıya sessiz (büst yine görünür)
    const key = sp ? `${sp.char}:${sp.moment}` : '';
    const repeat = key === lastSpoken;
    lastSpoken = key;
    if (sp?.moment && (!repeat || Math.random() < 0.5)) {
      const line = pickLine(sp.char, sp.moment);
      if (line) window.setTimeout(() => open && speech.say(utter(line, sp.char, ia.bubble, 2400), {prio: 3, tag: 'match'}), 900);
    }
    const r = await ia.done;
    open = false;
    speech.stopAll();
    return r;
  }
}
