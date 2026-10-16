import {beforeAll, describe, expect, it, vi} from 'vitest';

// profile.ts → platform/bridge.ts pencere/belge ister: node'da yok, küçük bir taklit
const mem = new Map<string, string>();
vi.stubGlobal('window', {addEventListener() {}, removeEventListener() {}});
vi.stubGlobal('document', {addEventListener() {}, removeEventListener() {}});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});

type P = typeof import('../src/game/profile');
let mod: P;
beforeAll(async () => {
  mod = await import('../src/game/profile');
});

/** v3 (yalnız Pişti) bir kayıt: gerçek kullanıcıların elindekine benzer. */
const v3 = () => ({
  v: 3,
  name: 'Ayşe',
  level: 6,
  xp: 133,
  coins: 4321,
  char: 'cem',
  onboarded: true,
  owned: {char: ['cem'], deck: ['yildizli', 'iznik'], table: ['arena'], fx: ['klasik'], frame: ['standart']},
  equipped: {deck: 'iznik', table: 'arena', fx: 'klasik', frame: 'standart'},
  stats: {played: 20, won: 11, lost: 8, draw: 1, pisti: 17, valePisti: 3, streak: 2, bestStreak: 5,
    byMode: {'1v1': {played: 12, won: 8}, '4': {played: 6, won: 2}, esli: {played: 2, won: 1}}},
  daily: {last: '2026-10-15', day: 3},
  chestAt: 12345,
  lastMode: '4',
  lastStake: 500,
  quests: {date: '2026-10-16', list: [{id: 'play3', progress: 2, claimed: false}, {id: 'win2', progress: 1, claimed: false}, {id: 'vale1', progress: 0, claimed: false}], bonus: false},
});

describe('profil göçü (v3 → v4)', () => {
  it('v3 Pişti istatistikleri aynen kalır, Blöf sıfırdan başlar', () => {
    const p = mod.migrateProfile(v3());
    expect(p.v).toBe(4);
    expect(p.name).toBe('Ayşe');
    expect(p.coins).toBe(4321);
    expect(p.level).toBe(6);
    expect(p.char).toBe('cem');
    expect(p.owned.deck).toEqual(['yildizli', 'iznik']);
    expect(p.equipped.deck).toBe('iznik');
    expect(p.stats).toMatchObject({played: 20, won: 11, lost: 8, draw: 1, pisti: 17, valePisti: 3, streak: 2, bestStreak: 5});
    expect(p.stats.byMode['1v1']).toEqual({played: 12, won: 8});
    expect(p.stats.byMode['4']).toEqual({played: 6, won: 2});
    expect(p.stats.byMode.esli).toEqual({played: 2, won: 1});
    expect(p.stats.byMode['3']).toEqual({played: 0, won: 0});
    expect(p.blof).toMatchObject({played: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, bluffs: 0, caught: 0, timesCaught: 0, wrongChallenges: 0});
    expect(p.blof.byMode['3']).toEqual({played: 0, won: 0});
  });

  it('tek `lastMode` metni Pişti\'nin modu olur; oyun Pişti, zorluk orta', () => {
    const p = mod.migrateProfile(v3());
    expect(p.lastGame).toBe('pisti');
    expect(p.lastMode).toEqual({pisti: '4', blof: '3'});
    expect(p.lastDifficulty).toBe('orta');
    expect(p.lastStake).toBe(500);
  });

  it('günlük görevler ve diğer alanlar korunur', () => {
    const p = mod.migrateProfile(v3());
    expect(p.quests.date).toBe('2026-10-16');
    expect(p.quests.list.map(q => q.id)).toEqual(['play3', 'win2', 'vale1']);
    expect(p.quests.list[0].progress).toBe(2);
    expect(p.daily).toEqual({last: '2026-10-15', day: 3});
    expect(p.chestAt).toBe(12345);
  });

  it('v4 kaydı gidiş-dönüşte aynen kalır (göç idempotent)', () => {
    const once = mod.migrateProfile(v3());
    once.blof.played = 4;
    once.blof.bluffs = 9;
    once.lastGame = 'blof';
    once.lastMode.blof = '4';
    once.lastDifficulty = 'zor';
    const twice = mod.migrateProfile(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });

  it('bozuk alanlar varsayılana döner, kayıt çökmez', () => {
    const bad = {...v3(), stats: {played: 'x', won: -3, byMode: null}, blof: {played: NaN, bluffs: -1, byMode: {'3': {played: 'a', won: 2}}}, lastMode: 'bogus', lastGame: 'okey', lastDifficulty: 'imkansiz'};
    const p = mod.migrateProfile(bad);
    expect(p.stats.played).toBe(0);
    expect(p.stats.won).toBe(0);
    expect(p.stats.byMode['1v1']).toEqual({played: 0, won: 0});
    expect(p.blof.played).toBe(0);
    expect(p.blof.bluffs).toBe(0);
    expect(p.blof.byMode['3']).toEqual({played: 0, won: 2});
    expect(p.lastMode).toEqual({pisti: '1v1', blof: '3'});
    expect(p.lastGame).toBe('pisti');
    expect(p.lastDifficulty).toBe('orta');
  });

  it('Pişti\'de olmayan bir mod (3) lastMode.pisti ise ilk moda döner', () => {
    const p = mod.migrateProfile({...v3(), lastMode: '3'});
    expect(p.lastMode.pisti).toBe('1v1');
    const q = mod.migrateProfile({...v3(), lastMode: {pisti: '3', blof: 'esli'}});
    expect(q.lastMode).toEqual({pisti: '1v1', blof: 'esli'});
  });

  it('boş / çok eski kayıt: yeni profil; eski `profile` anahtarından yalnız ad-jeton-seviye taşınır', () => {
    expect(mod.migrateProfile(null).stats.played).toBe(0);
    expect(mod.migrateProfile({v: 2, name: 'x'}).name).toBe('Misafir');
    const p = mod.migrateProfile(null, {name: 'Mehmet', level: 9, xp: 5, coins: 9000});
    expect(p).toMatchObject({name: 'Mehmet', level: 9, xp: 5, coins: 9000, v: 4});
  });

  it('Profile sınıfı localStorage\'daki v3 kaydı yükleyip v4 olarak yazar', () => {
    mem.clear();
    mem.set('kh.profile3', JSON.stringify(v3()));
    const pr = new mod.Profile();
    expect(pr.data.v).toBe(4);
    expect(pr.data.stats.won).toBe(11);
    expect(pr.playedBlof).toBe(false);
    const saved = JSON.parse(mem.get('kh.profile3')!);
    expect(saved.v).toBe(4);
    expect(saved.blof.played).toBe(0);
    expect(saved.lastMode).toEqual({pisti: '4', blof: '3'});
  });
});

describe('Blöf istatistikleri', () => {
  const fresh = () => {
    mem.clear();
    return new mod.Profile();
  };

  it('galibiyet/yenilgi, seri, mod başına sayaçlar ve blöf sayıları', () => {
    const pr = fresh();
    pr.recordBlof('3', 'win', {bluffs: 4, timesCaught: 1, caught: 2, wrongChallenges: 0});
    pr.recordBlof('3', 'win', {bluffs: 2, timesCaught: 0, caught: 1, wrongChallenges: 1});
    pr.recordBlof('1v1', 'lose', {bluffs: 1, timesCaught: 1, caught: 0, wrongChallenges: 2});
    const b = pr.data.blof;
    expect(b).toMatchObject({played: 3, won: 2, lost: 1, streak: 0, bestStreak: 2, bluffs: 7, caught: 3, timesCaught: 2, wrongChallenges: 3});
    expect(b.byMode['3']).toEqual({played: 2, won: 2});
    expect(b.byMode['1v1']).toEqual({played: 1, won: 0});
    expect(pr.playedBlof).toBe(true);
    // Pişti istatistiğine dokunulmaz
    expect(pr.data.stats.played).toBe(0);
    expect(pr.gameStats('blof').played).toBe(3);
    expect(pr.gameStats('pisti').played).toBe(0);
  });

  it('Pişti eli Blöf istatistiğine karışmaz', () => {
    const pr = fresh();
    pr.recordMatch('1v1', 'win', 2, 1, {cards: 20, majority: true});
    expect(pr.data.stats).toMatchObject({played: 1, won: 1, pisti: 2, valePisti: 1});
    expect(pr.data.blof.played).toBe(0);
  });
});

describe('günlük görevler', () => {
  const OLD: Record<0 | 1 | 2, string[]> = {0: ['play3', 'pisti2', 'cards60'], 1: ['win2', 'majority2', 'mode4', 'esli1'], 2: ['vale1', 'streak3', 'pisti5', 'cards30']};
  /** Blöf'ten önceki (v3) seçim algoritması: Pişti oyuncusunun günlük görevi değişmemeli. */
  const oldPicks = (date: string): string[] => {
    let h = 2166136261;
    for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
    return ([0, 1, 2] as const).map(t => {
      const pool = OLD[t];
      h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
      return pool[(h >>> 0) % pool.length];
    });
  };
  const dates = Array.from({length: 120}, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

  it('Blöf oynamamış oyuncunun günlük görevleri öncekiyle birebir aynı (Blöf görevi çıkmaz)', () => {
    for (const d of dates) expect(mod.questsFor(d).map(q => q.id)).toEqual(oldPicks(d));
  });

  it('Blöf oynamış oyuncuya Blöf görevleri de teklif edilir; her kademeden bir görev kalır', () => {
    let blof = 0;
    for (const d of dates) {
      const list = mod.questsFor(d, true);
      expect(list.map(q => mod.questDef(q.id).tier)).toEqual([0, 1, 2]);
      blof += list.filter(q => mod.questDef(q.id).game === 'blof').length;
    }
    expect(blof).toBeGreaterThan(dates.length * 0.6); // 3 kademede ~%35-40 → ortalama ~1,1 görev/gün
    expect(blof).toBeLessThan(dates.length * 2.2);
  });

  const withQuests = (ids: string[]) => {
    mem.clear();
    const pr = new mod.Profile();
    pr.data.quests = {date: new Date().toISOString().slice(0, 10), list: ids.map(id => ({id: id as never, progress: 0, claimed: false})), bonus: false};
    return pr;
  };
  const prog = (pr: InstanceType<P['Profile']>) => Object.fromEntries(pr.data.quests.list.map(q => [q.id, q.progress]));

  it('Blöf görevleri: yakala, el kazan, yakalanmadan blöf yap', () => {
    const pr = withQuests(['blofCatch1', 'blofWin1', 'blofLie3']);
    pr.recordBlof('3', 'win', {bluffs: 2, timesCaught: 0, caught: 1, wrongChallenges: 0});
    expect(prog(pr)).toEqual({blofCatch1: 1, blofWin1: 1, blofLie3: 2});
    pr.recordBlof('3', 'lose', {bluffs: 5, timesCaught: 2, caught: 0, wrongChallenges: 0}); // yakalandığı elin blöfleri sayılmaz
    expect(prog(pr).blofLie3).toBe(2);
    pr.recordBlof('1v1', 'lose', {bluffs: 5, timesCaught: 0, caught: 0, wrongChallenges: 0});
    expect(prog(pr).blofLie3).toBe(3); // hedefte kalır
    expect(prog(pr).blofWin1).toBe(1);
  });

  it('Pişti eli Blöf görevini ilerletmez; genel görevler iki oyunda da sayılır', () => {
    const pr = withQuests(['blofPlay2', 'blofCatch3', 'play3', 'win2']);
    pr.recordMatch('1v1', 'win', 1, 0, {cards: 30, majority: true});
    expect(prog(pr)).toEqual({blofPlay2: 0, blofCatch3: 0, play3: 1, win2: 1});
    pr.recordBlof('4', 'win', {bluffs: 1, timesCaught: 0, caught: 2, wrongChallenges: 0});
    expect(prog(pr)).toEqual({blofPlay2: 1, blofCatch3: 2, play3: 2, win2: 2});
  });

  it('Blöf galibiyet serisi görevi', () => {
    const pr = withQuests(['blofStreak2']);
    pr.recordBlof('1v1', 'win', {bluffs: 0, timesCaught: 0, caught: 0, wrongChallenges: 0});
    expect(prog(pr).blofStreak2).toBe(1);
    pr.recordBlof('1v1', 'lose', {bluffs: 0, timesCaught: 0, caught: 0, wrongChallenges: 0});
    pr.recordBlof('1v1', 'win', {bluffs: 0, timesCaught: 0, caught: 0, wrongChallenges: 0});
    expect(prog(pr).blofStreak2).toBe(1); // seri bozuldu; en yüksek ilerleme kalır
    pr.recordBlof('1v1', 'win', {bluffs: 0, timesCaught: 0, caught: 0, wrongChallenges: 0});
    expect(prog(pr).blofStreak2).toBe(2);
  });

  it('gün değişince yenilenen görevler Blöf oynamışsa Blöf havuzunu kullanır', () => {
    const pr = withQuests(['play3', 'win2', 'vale1']);
    pr.recordBlof('3', 'win', {bluffs: 0, timesCaught: 0, caught: 0, wrongChallenges: 0});
    pr.data.quests.date = '2000-01-01';
    const list = pr.dailyQuests().list;
    expect(list).toHaveLength(3);
    expect(list.every(q => q.progress === 0)).toBe(true);
  });
});
