// Uygulama akışı: açılış → lobi → karşılaşma girişi → masa → sonuç → lobi.
// İlerleme (seviye, XP, jeton, günlük ödül) burada; ileride ana uygulama/sunucu tarafına taşınacak.
import type {Screens, Profile, Opponent, Settings} from '../ui/screens';
import type {Sfx} from '../audio/sfx';
import type {VoicePlayer} from '../audio/voice';
import {pickLine, shouldSpeak} from '../ai/dialogue';
import {Match, type MatchDeps, type Moment} from './match';
import {haptic, post, store} from '../platform/bridge';
import type {BotPersonality} from '../ai/bot';

export interface OpponentDef extends Opponent {
  personality: BotPersonality;
  think: [number, number];
}

const DAILY = [200, 300, 400, 500, 650, 800, 1500];
const xpNext = (lvl: number) => Math.round(120 * Math.pow(lvl, 1.35));
const today = () => new Date().toISOString().slice(0, 10);

interface Saved {
  name: string;
  level: number;
  xp: number;
  coins: number;
}

export interface AppDeps extends Omit<MatchDeps, 'speak' | 'personality' | 'think' | 'hud'> {
  screens: Screens;
  voice: VoicePlayer;
  opponents: OpponentDef[];
  settings: Settings;
  applySettings: (s: Settings) => void;
}

export async function runApp(d: AppDeps): Promise<void> {
  const {screens, sfx} = d;
  const saved = store.get<Saved>('profile', {name: 'Misafir', level: 1, xp: 0, coins: 2000});
  const profile = (): Profile => ({name: saved.name, level: saved.level, xp: saved.xp, xpNext: xpNext(saved.level), coins: saved.coins});
  const save = () => store.set('profile', saved);
  const daily = store.get('daily', {last: '', day: 0});
  const dailyReady = () => daily.last !== today();
  let dealer = 1;
  let current: Match | null = null;

  screens.hud.onMenu = async () => {
    sfx.uiTap();
    const r = await screens.pause();
    if (r === 'settings') await screens.settings(d.settings, s => d.applySettings(s));
    else if (r === 'rules') await screens.rules();
    else if (r === 'leave') current?.abort();
  };

  for (;;) {
    const action = await screens.lobby(profile(), d.opponents, dailyReady());
    if (action.type === 'settings') {
      await screens.settings(d.settings, s => d.applySettings(s));
      continue;
    }
    if (action.type === 'rules') {
      await screens.rules();
      continue;
    }
    if (action.type === 'daily') {
      if (!dailyReady()) continue;
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const day = daily.last === yesterday ? (daily.day % 7) + 1 : 1;
      const got = await screens.daily(day, DAILY);
      daily.last = today();
      daily.day = day;
      store.set('daily', daily);
      saved.coins += got;
      save();
      continue;
    }

    const opp = d.opponents.find(o => o.id === action.opponentId) ?? d.opponents[0];
    let stake = Math.min(action.stake, Math.max(100, saved.coins));
    await screens.versus(profile(), opp, stake);

    // aynı rakiple "Bir El Daha" döngüsü
    for (;;) {
      if (saved.coins < stake) {
        saved.coins += 1000; // önizleme: kasa boşsa takviye
        save();
      }
      saved.coins -= stake;
      save();
      screens.hud.show(opp, profile());
      screens.hud.setCoins(saved.coins);
      sfx.coin(2);
      const speak = (m: Moment, force = false) => {
        const now = performance.now();
        if (!force && !shouldSpeak(m, now)) return;
        const line = pickLine(opp.id, m);
        if (!line) return;
        screens.hud.say(line.text, line.mood ?? undefined, 2400);
        d.voice.play(line.id);
      };
      current = new Match({...d, hud: screens.hud, speak, personality: opp.personality, think: opp.think});
      dealer = 1 - dealer;
      sfx.startAmbience();
      const res = await current.play(dealer);
      current = null;
      if (!res) {
        saved.coins += stake; // yarıda bırakılan elin bahsi iade
        save();
        screens.hud.hide();
        break;
      }
      const win = res.winners.length === 1 ? res.winners[0] : -1;
      const delta = win === 0 ? stake : win === -1 ? 0 : -stake;
      saved.coins += stake + delta;
      const me = res.sides[0];
      const xpGain = (win === 0 ? 60 : win === -1 ? 30 : 20) + (me.pisti / 10) * 10;
      saved.xp += xpGain;
      while (saved.xp >= xpNext(saved.level)) {
        saved.xp -= xpNext(saved.level);
        saved.level++;
      }
      save();
      post('match:end', {result: win === 0 ? 'win' : win === -1 ? 'draw' : 'lose', delta, coins: saved.coins});
      const endLine = pickLine(opp.id, win === 0 ? 'playerWin' : win === -1 ? 'draw' : 'botWin');
      if (endLine) {
        screens.hud.say(endLine.text, endLine.mood ?? undefined, 2600);
        d.voice.play(endLine.id);
      }
      if (win === 0) {
        sfx.win();
        haptic('success');
      } else if (win === 1) sfx.lose();
      await d.stage.time.waitReal(1.6);
      const choice = await screens.results({result: res, meSide: 0, opp, coinsDelta: delta, coinsAfter: saved.coins, xpGain, profile: profile()});
      if (choice === 'lobby') {
        screens.hud.hide();
        break;
      }
      stake = Math.min(stake, Math.max(100, saved.coins));
    }
  }
}

