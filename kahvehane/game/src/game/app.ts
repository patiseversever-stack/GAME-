// Uygulama akışı: açılış → (ilk açılışta hikâye + hediye karakter) → ana ekran döngüsü →
// oyna: masa kurulumu (MatchSetup) → karşılaşma girişi → el (Pişti: Match · Blöf: BlofMatch) → bahis/jeton/XP/istatistik (Profile) → sonuç → bir el daha / ana ekran.
// Bahis elin başında düşülür; el yarıda bırakılırsa iade edilir. Ekonomi Profile'da; ileride sunucuya taşınacak.
import type {ResultsData, Screens, Settings} from '../ui/screens';
import type {MatchSetup} from './types';
import {STAKES} from '../ui/screens';
import type {VoicePlayer} from '../audio/voice';
import type {Sfx} from '../audio/sfx';
import type {ItemKind} from './catalog';
import type {Table2D} from '../table2d/table';
import {Match, type MatchOutcome} from './match';
import type {Profile} from './profile';
import {MODE_INFO, type Difficulty, type Game, type Mode} from './types';
import {blofXp, buildSetup, receive} from './setup';
import {BLOF, loadBlof, normalizeBlofOutcome, type BlofFactory} from './blofAdapter';
import {post, store} from '../platform/bridge';

export interface AppDeps {
  table: Table2D;
  sfx: Sfx;
  voice: VoicePlayer;
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
  /** ?seed=123: sabit deste (test) */
  seed?: number;
}

export {buildSetup};

/** Elin (oyundan bağımsız) ortak çalışan yüzeyi: Match de BlofMatch de buna uyar. */
interface Runner {
  play(setup: MatchSetup): Promise<unknown>;
  abort(): void;
}

export async function runApp(d: AppDeps): Promise<void> {
  const {screens, sfx, profile, table} = d;
  let current: Runner | null = null;
  let curGame: Game = 'pisti';
  let dealerBase = 0;
  // önceki oturumda yarıda kalan elin bahsi iade
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
    const r = await screens.pause();
    if (r === 'settings') await screens.settings(d.settings, s => d.applySettings(s));
    else if (r === 'rules') await screens.rules(curGame);
    else if (r === 'leave') current?.abort();
  };

  // ilk açılış: hikâye + hediye karakter + ad
  if (!profile.data.onboarded) await screens.onboarding(profile);

  for (;;) {
    const autoGame = d.autoGame && (d.autoGame !== 'blof' || BLOF.playable()) ? d.autoGame : 'pisti';
    const action = await screens.home(profile, d.auto ? {game: autoGame, mode: d.autoMode ?? (autoGame === 'blof' ? '3' : '1v1'), difficulty: d.autoDifficulty} : undefined);
    if (action.type === 'settings') {
      await screens.settings(d.settings, s => d.applySettings(s));
      continue;
    }
    if (action.type === 'rules') {
      await screens.rules();
      continue;
    }

    const {game, mode, opponents, difficulty} = action;
    curGame = game;
    let stake = action.stake;
    let first = true;
    // aynı masada "Bir El Daha" döngüsü
    for (;;) {
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
      const seats = MODE_INFO[mode].seats;
      // otomatik testte öğretici yok: botlar istenen zorlukta oynar
      const setup = buildSetup(profile, mode, opponents, (seats - 1 + dealerBase++) % seats, profile.data.equipped.fx, d.seed, {game, difficulty, tutorial: d.auto ? false : undefined});
      table.setActive(true); // maç masası açılır (menülerde kapalıydı)
      // giriş perdesi açıldığında masa temiz görünsün (deste ekran dışında, karıştırmaya hazır). 3 kişi masası maçın kendi kurulumunda yerleşir.
      if (first) table.reset(seats === 2 ? 2 : 4);
      // Blöf motoru giriş ekranı sürerken arka planda yüklenir
      const factory: Promise<BlofFactory | null> = game === 'blof' ? loadBlof().catch(() => null) : Promise.resolve(null);
      const deckReady = table.ready; // deste atlası arka planda çiziliyor olabilir; giriş ekranı süresince tamamlanır
      if (first) await screens.versus(setup, stake);
      await deckReady;
      first = false;
      const make = await factory;
      if (game === 'blof' && !make) {
        // motor yüklenemedi: bahis hiç düşülmedi
        screens.hud.hide();
        await screens.cover();
        break;
      }
      // bahis düşülür (yarıda kalırsa iade)
      profile.addCoins(-stake);
      store.set('pendingStake', stake); // uygulama el ortasında kapanırsa sonraki açılışta iade
      sfx.coin(2);
      screens.hud.show(setup.players, mode, profile.data.coins, profile.data.equipped.frame);
      screens.hud.setCoins(profile.data.coins);
      const deps = {table, hud: screens.hud, sfx, voice: d.voice, auto: d.auto};
      current = game === 'blof' ? make!(deps) : new Match(deps);
      const raw = await current.play(setup);
      current = null;
      store.set('pendingStake', 0);
      if (!raw) {
        profile.addCoins(stake);
        screens.hud.hide();
        await screens.cover();
        break;
      }

      // ---- ekonomi ----
      const coinsBefore = profile.data.coins;
      const before = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      let data: ResultsData;
      let outcome: 'win' | 'lose' | 'draw';
      let got: number;
      let xpGain: number;
      if (game === 'blof') {
        const bo = normalizeBlofOutcome(raw, setup);
        outcome = bo.outcome;
        got = receive(mode, stake, outcome, 1); // tek kazanan: pot onun
        profile.addCoins(got);
        const me = bo.seats[0];
        xpGain = blofXp(mode, outcome, me.caught);
        profile.recordBlof(mode, outcome, {bluffs: me.bluffs, caught: me.caught, timesCaught: me.timesCaught, wrongChallenges: me.wrongChallenges});
        data = {setup, blof: bo, outcome, myPisti: 0, myValePisti: 0, stake, coinsDelta: 0, coinsBefore, coinsAfter: 0, xpGain, before, after: before, levelReward: 0, streak: 0};
      } else {
        const out = raw as MatchOutcome;
        outcome = out.outcome;
        got = receive(mode, stake, outcome, out.result.winners.length);
        profile.addCoins(got);
        const base = outcome === 'win' ? 60 : outcome === 'draw' ? 30 : 20;
        xpGain = Math.round(base * (mode === '4' ? 1.25 : mode === 'esli' ? 1.1 : 1) + out.myPisti * 8 + out.myValePisti * 12);
        const mine = out.result.sides.find(sd => sd.seats.includes(0));
        profile.recordMatch(mode, outcome, out.myPisti, out.myValePisti, {cards: mine?.cards ?? 0, majority: (mine?.majority ?? 0) > 0});
        data = {setup, result: out.result, outcome, myPisti: out.myPisti, myValePisti: out.myValePisti, stake, coinsDelta: 0, coinsBefore, coinsAfter: 0, xpGain, before, after: before, levelReward: 0, streak: 0};
      }
      const lv = profile.addXp(xpGain);
      const after = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      post('match:end', {game, mode, result: outcome, delta: got - stake, coins: profile.data.coins});
      Object.assign(data, {
        coinsDelta: got - stake, coinsAfter: profile.data.coins, after, levelReward: lv.reward,
        streak: game === 'blof' ? profile.data.blof.streak : profile.data.stats.streak,
      });
      await new Promise(r => setTimeout(r, 350));
      const choice = await screens.results(data, profile.data.equipped.frame);
      if (choice === 'home') {
        screens.hud.hide();
        break;
      }
    }
    table.setActive(false); // ana ekrana dönüş: masa tamamen kapanır (GPU belleği boşalır)
  }
}
