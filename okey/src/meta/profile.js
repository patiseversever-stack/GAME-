// Profil ve ilerleme: XP, seviye, istatistik, başarımlar, günlük hedefler.
// Oyun dengesi hiçbir şeye bağlı değil — yalnızca kozmetik ilerleme. Çevrimdışı oyun para vermez; XP, seviye,
// unvan, çerçeve ve kutlama açar. Çarşı'daki öğeler ödüllü reklamla (ilerleme sayacı) açılır.
// Şema hesaba bağlanmaya hazır: acct (uid, rev, updatedAt) ve snapshot()/adopt() ile sunucuya taşınabilir.
import { readJSON, writeJSON } from './storage.js';
import { mixSeed } from '../util/rng.js';
import { rewardsAt, itemOf, titleFor, DEFAULT_EQUIP } from './progression.js';

const KEY = 'patisever.profile.v1';

// Seviye eğrisi: ilk seviyeler bir iki günde, Paşa (30) aktif oyuncu için ~5-7 hafta (toplam ≈ 40.900 XP)
export const xpForNext = (level) => 150 + 90 * (level - 1);
// Ödüllü reklam sınırları: iki reklam arası bekleme, günlük üst sınır, reklam bulunamazsa yeniden deneme beklemesi
export const AD_RULES = { cooldownMs: 3 * 60 * 1000, dailyCap: 12, retryMs: 45 * 1000 };
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
  v: 2,
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
  inv: { frame: [], effect: [], tiles: [] }, // reklamla / satın alımla açılanlar (seviye açılımları türetilir)
  equip: { ...DEFAULT_EQUIP },
  ads: {}, // 'kind:id' → izlenen ödüllü reklam sayısı
  acct: { uid: null, rev: 0, updatedAt: 0 },
});

export class Profile {
  constructor() {
    const saved = readJSON(KEY, null);
    const b = blank();
    this.d = saved && (saved.v === 1 || saved.v === 2) ? saved : b;
    this.migratedFrom = saved?.v || 0;
    this.d.stats = { ...b.stats, ...this.d.stats };
    this.d.xp = Number.isFinite(this.d.xp) ? this.d.xp : 0;
    this.d.achievements = this.d.achievements || {};
    // v1 → v2: envanter, kuşanılanlar, reklam sayaçları, hesap alanı
    this.d.v = 2;
    this.d.inv = { ...b.inv, ...(this.d.inv || {}) };
    this.d.equip = { ...b.equip, ...(this.d.equip || {}) };
    this.d.ads = this.d.ads || {};
    this.d.acct = { ...b.acct, ...(this.d.acct || {}) };
    this._rollDaily();
    this.subs = new Set();
  }
  save() {
    this.d.acct.rev++;
    this.d.acct.updatedAt = Date.now();
    writeJSON(KEY, this.d);
  }
  _emit(out) {
    for (const f of this.subs) f(out);
  }

  // ───── koleksiyon ─────
  owns(kind, id) {
    const it = itemOf(kind, id);
    if (!it) return false;
    if (it.level && this.level >= it.level) return true;
    return kind !== 'title' && (this.d.inv[kind] || []).includes(id);
  }
  grant(kind, id) {
    const list = this.d.inv[kind] || (this.d.inv[kind] = []);
    if (!list.includes(id)) list.push(id);
    this.save();
    this._emit({ grant: { kind, id } });
  }
  equipped(kind) {
    const id = this.d.equip[kind];
    if (kind === 'title') return id && this.owns('title', id) ? itemOf('title', id) : titleFor(this.level);
    return id && this.owns(kind, id) ? id : DEFAULT_EQUIP[kind];
  }
  equip(kind, id) {
    if (id !== null && !this.owns(kind, id)) return false;
    this.d.equip[kind] = id;
    this.save();
    this._emit({ equip: { kind, id } });
    return true;
  }
  adCount(kind, id) {
    return this.d.ads[kind + ':' + id] || 0;
  }
  // Bir ödüllü reklam tamamlandı → { count, need, unlocked }
  addAd(kind, id) {
    const it = itemOf(kind, id);
    if (!it?.ads) return null;
    const k = kind + ':' + id;
    const count = Math.min(it.ads, (this.d.ads[k] || 0) + 1);
    this.d.ads[k] = count;
    const unlocked = count >= it.ads && !this.owns(kind, id);
    if (unlocked) (this.d.inv[kind] || (this.d.inv[kind] = [])).push(id);
    this.save();
    this._emit({ ad: { kind, id, count, unlocked } });
    return { count, need: it.ads, unlocked };
  }
  // Reklam kapısı: { ready, waitMs, left, cap }. Bekleme yalnız başarıyla izlenen reklamdan sonra başlar;
  // reklam bulunamazsa / hata olursa kısa bir yeniden deneme beklemesi uygulanır (reklam ağı zorlanmasın).
  adGate(now = Date.now()) {
    const t = today();
    let g = this.d.adGate;
    if (!g || g.day !== t) g = this.d.adGate = { day: t, n: 0, last: 0, retry: 0 };
    const waitMs = Math.max(0, Math.max(g.last + AD_RULES.cooldownMs, g.retry || 0) - now);
    const left = Math.max(0, AD_RULES.dailyCap - g.n);
    return { ready: left > 0 && waitMs === 0, waitMs, left, cap: AD_RULES.dailyCap };
  }
  adResult(ok, now = Date.now()) {
    this.adGate(now);
    const g = this.d.adGate;
    if (ok) {
      g.n++;
      g.last = now;
    } else g.retry = now + AD_RULES.retryMs;
    this.save();
  }
  // Hesaba bağlanınca sunucuya gidecek / sunucudan gelecek veri
  snapshot() {
    return JSON.parse(JSON.stringify(this.d));
  }
  adopt(remote) {
    if (!remote || remote.v !== 2 || (remote.acct?.rev || 0) <= (this.d.acct.rev || 0)) return false;
    this.d = remote;
    writeJSON(KEY, this.d);
    this._emit({ adopt: true });
    return true;
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

  // Olay: { type, ... } → { xp, from, parts:[[etiket, xp]], levelUps:[{level, unlocks}], achievements:[...], goalsDone:[...] }
  record(ev) {
    this._rollDaily();
    const out = { xp: 0, from: this.d.xp, parts: [], levelUps: [], achievements: [], goalsDone: [] };
    const st = this.d.stats;
    const before = this.level;
    const mult = ev.difficulty === 'expert' ? 1.4 : ev.difficulty === 'casual' ? 0.8 : 1;
    const addXp = (n, label) => {
      const v = Math.round(n * mult);
      out.xp += v;
      out.parts.push([label, v]);
    };
    const goal = (kind, n = 1) => {
      for (const g of this.d.daily.goals) {
        if (g.ev === kind && !g.done) {
          g.progress = Math.min(g.target, g.progress + n);
          if (g.progress >= g.target) {
            g.done = true;
            out.goalsDone.push(g);
            out.xp += 50;
            out.parts.push(['Görev', 50]);
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
      addXp(10, 'El');
      goal('round');
      if (st.rounds >= 25) ach('hands_25');
      if (ev.won) {
        st.wins++;
        st.streak++;
        st.bestStreak = Math.max(st.bestStreak, st.streak);
        addXp(30, 'Galibiyet');
        goal('win');
        ach('first_hand');
        if (ev.difficulty === 'expert') goal('expertWin');
        if (st.streak >= 3) ach('streak3');
        const f = ev.finish || 'normal';
        st.finishes[f] = (st.finishes[f] || 0) + 1;
        if (f === 'okey' || f === 'pairsOkey' || f === 'kafaOkey') {
          addXp(25, 'Okey bitişi');
          goal('okeyFinish');
          ach('okey_finish');
        }
        if (f === 'pairs' || f === 'pairsOkey') {
          addXp(25, 'Çift bitişi');
          goal('pairsFinish');
          ach('pairs_finish');
        }
        if (f === 'kafa' || f === 'kafaOkey') {
          addXp(40, 'Kafadan');
          ach('kafa');
        }
        if (ev.colorFinish) ach('mono');
      } else st.streak = 0;
    } else if (ev.type === 'open101') {
      st.open101++;
      addXp(10, 'El açma');
      goal('open101');
      ach('first_101');
    } else if (ev.type === 'indicator') {
      addXp(6, 'Gösterge');
      goal('indicator');
      ach('indicator');
    } else if (ev.type === 'match') {
      const m = st.matches[ev.mode] || (st.matches[ev.mode] = { played: 0, won: 0 });
      m.played++;
      addXp(20, 'Maç');
      if (ev.won) {
        m.won++;
        addXp(80, 'Maç galibiyeti');
        if (ev.difficulty === 'expert') ach('expert_win');
        if (ev.mode === 'okey101' && ev.clean) ach('clean_101');
      }
    }
    this.d.xp += out.xp;
    const after = this.level;
    for (let l = before + 1; l <= after; l++) out.levelUps.push({ level: l, unlocks: rewardsAt(l) });
    if (after >= 5) ach('level5');
    this.save();
    this._emit(out);
    return out;
  }
}
