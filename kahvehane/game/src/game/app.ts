// Uygulama akışı: açılış → (ilk açılışta hikâye + hediye karakter) → ana ekran döngüsü →
// oyna: masa kurulumu (MatchSetup) → karşılaşma girişi → el (Match) → bahis/jeton/XP/istatistik (Profile) → sonuç → bir el daha / ana ekran.
// Bahis elin başında düşülür; el yarıda bırakılırsa iade edilir. Ekonomi Profile'da; ileride sunucuya taşınacak.
import type {ResultsData, Screens, Settings} from '../ui/screens';
import {BOT_LEVEL, STAKES, payout} from '../ui/screens';
import type {VoicePlayer} from '../audio/voice';
import type {Sfx} from '../audio/sfx';
import type {ItemKind} from './catalog';
import type {Table2D} from '../table2d/table';
import {Match} from './match';
import type {Profile} from './profile';
import {charById, type CharId} from './roster';
import {MODE_INFO, type MatchSetup, type Mode, type SeatPlayer} from './types';
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
  /** ?mode=4|esli: otomatik testte oyun türü */
  autoMode?: Mode;
  /** ?seed=123: sabit deste (test) */
  seed?: number;
}

/** Koltukları kur: 0 = insan (profil adı/seviyesi, kendi karakteri), botlar roster'dan (kişilik, düşünme süresi). */
export function buildSetup(profile: Profile, mode: Mode, opponents: CharId[], dealer: number, fx: string, seed?: number): MatchSetup {
  const info = MODE_INFO[mode];
  const meChar = charById(profile.data.char ?? 'dursun');
  const players: SeatPlayer[] = [{
    seat: 0, char: meChar, name: profile.data.name, human: true, team: info.teams[0], level: profile.data.level,
    personality: meChar.personality, think: meChar.think,
  }];
  // kişi sayısı kadar bot (eksikse kadrodan tamamla, insanın karakteri hariç)
  const pool = opponents.filter(id => id !== meChar.id);
  for (let s = 1; s < info.seats; s++) {
    const id = pool[s - 1] ?? (['riza', 'cem', 'dursun', 'defne'] as CharId[]).find(x => x !== meChar.id && !pool.includes(x))!;
    if (!pool.includes(id)) pool.push(id);
    const c = charById(id);
    players.push({seat: s, char: c, name: c.name, human: false, team: info.teams[s], level: BOT_LEVEL[c.id] ?? 10, personality: c.personality, think: c.think});
  }
  return {mode, players, dealer, seed, fx};
}

/** El sonu ödemesi (bahis düşüldükten sonra alınan): 1'e 1/eşli kazanana 2×, 4 kişide pot kazanan(lar)a; beraberlikte iade. */
function receive(mode: Mode, stake: number, outcome: 'win' | 'lose' | 'draw', winners: number): number {
  if (mode === '4') return outcome === 'lose' ? 0 : Math.floor(payout(mode, stake) / Math.max(1, winners));
  return outcome === 'win' ? payout(mode, stake) : outcome === 'draw' ? stake : 0;
}

export async function runApp(d: AppDeps): Promise<void> {
  const {screens, sfx, profile, table} = d;
  let current: Match | null = null;
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
    else if (r === 'rules') await screens.rules();
    else if (r === 'leave') current?.abort();
  };

  // ilk açılış: hikâye + hediye karakter + ad
  if (!profile.data.onboarded) await screens.onboarding(profile);

  for (;;) {
    const action = await screens.home(profile, d.auto ? {mode: d.autoMode ?? '1v1'} : undefined);
    if (action.type === 'settings') {
      await screens.settings(d.settings, s => d.applySettings(s));
      continue;
    }
    if (action.type === 'rules') {
      await screens.rules();
      continue;
    }

    const {mode, opponents} = action;
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
      const setup = buildSetup(profile, mode, opponents, (seats - 1 + dealerBase++) % seats, profile.data.equipped.fx, d.seed);
      table.setActive(true); // maç masası açılır (menülerde kapalıydı)
      if (first) await screens.versus(setup, stake);
      first = false;
      // bahis düşülür (yarıda kalırsa iade)
      profile.addCoins(-stake);
      store.set('pendingStake', stake); // uygulama el ortasında kapanırsa sonraki açılışta iade
      sfx.coin(2);
      screens.hud.show(setup.players, mode, profile.data.coins, profile.data.equipped.frame);
      screens.hud.setCoins(profile.data.coins);
      current = new Match({table, hud: screens.hud, sfx, voice: d.voice, auto: d.auto});
      const out = await current.play(setup);
      current = null;
      store.set('pendingStake', 0);
      if (!out) {
        profile.addCoins(stake);
        screens.hud.hide();
        await screens.cover();
        break;
      }

      // ---- ekonomi ----
      const coinsBefore = profile.data.coins;
      const got = receive(mode, stake, out.outcome, out.result.winners.length);
      profile.addCoins(got);
      const before = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      const base = out.outcome === 'win' ? 60 : out.outcome === 'draw' ? 30 : 20;
      const xpGain = Math.round(base * (mode === '4' ? 1.25 : mode === 'esli' ? 1.1 : 1) + out.myPisti * 8 + out.myValePisti * 12);
      const mine = out.result.sides.find(sd => sd.seats.includes(0));
      profile.recordMatch(mode, out.outcome, out.myPisti, out.myValePisti, {cards: mine?.cards ?? 0, majority: (mine?.majority ?? 0) > 0});
      const lv = profile.addXp(xpGain);
      const after = {level: profile.data.level, xp: profile.data.xp, xpNext: profile.xpNext};
      post('match:end', {mode, result: out.outcome, delta: got - stake, coins: profile.data.coins});

      const data: ResultsData = {
        setup, result: out.result, outcome: out.outcome, myPisti: out.myPisti, myValePisti: out.myValePisti,
        stake, coinsDelta: got - stake, coinsBefore, coinsAfter: profile.data.coins, xpGain, before, after,
        levelReward: lv.reward, streak: profile.data.stats.streak,
      };
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
