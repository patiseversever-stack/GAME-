// Profil ve ilerleme: XP, seviye, istatistik, başarımlar, günlük hedefler.
// Ödeme / chip ekonomisi yok; oyun dengesi hiçbir şeye bağlı değil — yalnızca kozmetik ilerleme.
import { readJSON, writeJSON } from './storage.js';
import { mixSeed } from '../util/rng.js';
import { unlockedAt } from './cosmetics.js';

const KEY = 'patisever.profile.v1';

export const xpForNext = (level) => 120 + 70 * (level - 1);
export function levelFromXp(xp) {
  let level = 1;
  let rest = xp;
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level++;
  }
  return { level, into: rest, need: xpForNext(level) };
}

export const ACHIEVEMENTS = [
  { id: 'first_hand', name: 'İlk El', desc: 'Bir eli bitir.' },
  { id: 'first_101', name: '101’e Hoş Geldin', desc: '101’de ilk kez el aç.' },
  { id: 'okey_finish', name: 'Okey’le Kapat', desc: 'Okey atarak bir eli bitir.' },
  { id: 'pairs_finish', name: 'Çift Usta', desc: 'Çiftten bir eli bitir.' },
  { id: 'kafa', name: 'Kafadan', desc: '101’de aynı turda açıp bitir.' },
  { id: 'streak3', name: 'Seri Galibiyet', desc: 'Art arda 3 eli kazan.' },
  { id: 'clean_101', name: 'Temiz Sicil', desc: '101 maçını hiç ceza almadan kazan.' },
  { id: 'expert_win', name: 'Uzmanı Yendin', desc: 'Uzman botlara karşı maç kazan.' },
  { id: 'hands_25', name: 'Masanın Müdavimi', desc: '25 el oyna.' },
  { id: 'indicator', name: 'Keskin Göz', desc: 'Göstergeyi göster.' },
  { id: 'mono', name: 'Tek Renk', desc: 'Tek renk bitişle el kazan.' },
  { id: 'level5', name: 'Usta', desc: '5. seviyeye ulaş.' },
];

const GOAL_POOL = [
  { id: 'play3', text: '3 el oyna', target: 3, ev: 'round' },
  { id: 'win2', text: '2 el kazan', target: 2, ev: 'win' },
  { id: 'open101', text: '101’de 2 kez el aç', target: 2, ev: 'open101' },
  { id: 'okeyfin', text: 'Okey atarak bitir', target: 1, ev: 'okeyFinish' },
  { id: 'pairsfin', text: 'Çiftten bitir', target: 1, ev: 'pairsFinish' },
  { id: 'expertwin', text: 'Uzman botlara karşı el kazan', target: 1, ev: 'expertWin' },
  { id: 'indicator', text: 'Göstergeyi göster', target: 1, ev: 'indicator' },
  { id: 'play5', text: '5 el oyna', target: 5, ev: 'round' },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayNumber = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);

function freshDaily(date) {
  const n = dayNumber(date);
  const pool = GOAL_POOL.slice();
  const goals = [];
  let seed = mixSeed(n, 7);
  while (goals.length < 3) {
    seed = mixSeed(seed, goals.length + 1);
    const i = seed % pool.length;
    const g = pool.splice(i, 1)[0];
    goals.push({ id: g.id, text: g.text, target: g.target, ev: g.ev, progress: 0, done: false });
  }
  return { date, goals };
}

const blank = () => ({
  v: 1,
  xp: 0,
  stats: {
    rounds: 0,
    wins: 0,
    matches: { okey: { played: 0, won: 0 }, okey101: { played: 0, won: 0 } },
    streak: 0,
    bestStreak: 0,
    finishes: {},
    open101: 0,
  },
  achievements: {},
  daily: freshDaily(today()),
});

export class Profile {
  constructor() {
    const saved = readJSON(KEY, null);
    this.d = saved && saved.v === 1 ? saved : blank();
    this.d.stats = { ...blank().stats, ...this.d.stats };
    this._rollDaily();
    this.subs = new Set();
  }
  save() {
    writeJSON(KEY, this.d);
  }
  _rollDaily() {
    const t = today();
    if (this.d.daily?.date !== t) this.d.daily = freshDaily(t);
  }
  get level() {
    return levelFromXp(this.d.xp).level;
  }
  progress() {
    return levelFromXp(this.d.xp);
  }
  onChange(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  // Olay: { type, ... } → { xp, levelUps:[{level, unlocks}], achievements:[...], goalsDone:[...] }
  record(ev) {
    this._rollDaily();
    const out = { xp: 0, levelUps: [], achievements: [], goalsDone: [] };
    const st = this.d.stats;
    const before = this.level;
    const mult = ev.difficulty === 'expert' ? 1.4 : ev.difficulty === 'casual' ? 0.8 : 1;
    const addXp = (n) => (out.xp += Math.round(n * mult));
    const goal = (kind, n = 1) => {
      for (const g of this.d.daily.goals) {
        if (g.ev === kind && !g.done) {
          g.progress = Math.min(g.target, g.progress + n);
          if (g.progress >= g.target) {
            g.done = true;
            out.goalsDone.push(g);
            out.xp += 50;
          }
        }
      }
    };
    const ach = (id) => {
      if (!this.d.achievements[id]) {
        this.d.achievements[id] = Date.now();
        out.achievements.push(ACHIEVEMENTS.find((a) => a.id === id));
      }
    };

    if (ev.type === 'round') {
      st.rounds++;
      addXp(10);
      goal('round');
      if (st.rounds >= 25) ach('hands_25');
      if (ev.won) {
        st.wins++;
        st.streak++;
        st.bestStreak = Math.max(st.bestStreak, st.streak);
        addXp(30);
        goal('win');
        ach('first_hand');
        if (ev.difficulty === 'expert') goal('expertWin');
        if (st.streak >= 3) ach('streak3');
        const f = ev.finish || 'normal';
        st.finishes[f] = (st.finishes[f] || 0) + 1;
        if (f === 'okey' || f === 'pairsOkey' || f === 'kafaOkey') {
          addXp(25);
          goal('okeyFinish');
          ach('okey_finish');
        }
        if (f === 'pairs' || f === 'pairsOkey') {
          addXp(25);
          goal('pairsFinish');
          ach('pairs_finish');
        }
        if (f === 'kafa' || f === 'kafaOkey') {
          addXp(40);
          ach('kafa');
        }
        if (ev.colorFinish) ach('mono');
      } else st.streak = 0;
    } else if (ev.type === 'open101') {
      st.open101++;
      addXp(10);
      goal('open101');
      ach('first_101');
    } else if (ev.type === 'indicator') {
      addXp(6);
      goal('indicator');
      ach('indicator');
    } else if (ev.type === 'match') {
      const m = st.matches[ev.mode] || (st.matches[ev.mode] = { played: 0, won: 0 });
      m.played++;
      addXp(20);
      if (ev.won) {
        m.won++;
        addXp(80);
        if (ev.difficulty === 'expert') ach('expert_win');
        if (ev.mode === 'okey101' && ev.clean) ach('clean_101');
      }
    }
    this.d.xp += out.xp;
    const after = this.level;
    for (let l = before + 1; l <= after; l++) out.levelUps.push({ level: l, unlocks: unlockedAt(l) });
    if (after >= 5) ach('level5');
    this.save();
    for (const f of this.subs) f(out);
    return out;
  }
}
