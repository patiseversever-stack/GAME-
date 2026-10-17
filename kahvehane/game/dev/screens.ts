// Ekran galerisi: /dev/screens.html?s=<ekran>[&anim=0]
// Ekranlar: splash onboarding (p=new: hikâye; jump=gallery: doğrudan galeri) home (tab=shop|profile|quests, mode=1v1|3|4|esli, game=blof, diff=kolay|orta|zor, sub=deck…, poke=1)
//   product (k=deck&id=iznik) versus (mode=…, game=blof) results (mode=…, game=blof, r=win|lose|draw, lvl=1, streak=3) pause settings rules (game=blof) daily
// newblof=1 → Blöf'ü hiç oynamamış oyuncu (Yeni etiketi, boş istatistik). game=blof → Blöf sekmesi motor olmadan da gösterilir (yalnız galeri; gerçek uygulamada Blöf motoru yoksa Blöf görünmez).
//   handchooser (ilk Blöf el düzeni seçici) settings (game=blof → "Blöf el düzeni" satırı; hand=group|spread, live=1)
//   online (Çevrimiçi tanıtımı) friends (aynı tanıtımın "Arkadaşınla" sekmesi) bailout wipe
// Oyun uzunluğu: lensheet (OYNA → "Kaça oynuyoruz?"; game=blof) · interim (Ara Skor; mode, game, len=51|101|151|3|5, n=biten el, extra=1 uzatma)
//   resume (yarım kalan maç; mode, game, len, n) · results&len=101 (çok elli maç sonucu, maç sonuna dek oynanmış)
// Profil galeride ayrı anahtarlarda tutulur (kh.* → khg.*): gerçek oyunun kaydına dokunulmaz. p=new → ilk açılış profili; rich=1 → zengin.
const LS = window.localStorage;
const gi = LS.getItem.bind(LS), si = LS.setItem.bind(LS), ri = LS.removeItem.bind(LS);
const map = (k: string) => (k.startsWith('kh.') ? 'khg.' + k.slice(3) : k);
LS.getItem = (k: string) => gi(map(k));
LS.setItem = (k: string, v: string) => si(map(k), v);
LS.removeItem = (k: string) => ri(map(k));

import {Screens, type ResultsData} from '../src/ui/screens';
import {Profile, xpNext} from '../src/game/profile';
import {buildSetup, interimSpeaker} from '../src/game/app';
import {BLOF} from '../src/game/blofAdapter';
import type {GameResult, SideScore} from '../src/core/types';
import type {CharId} from '../src/game/roster';
import {MODE_INFO, type BlofOutcome, type Difficulty, type Game, type HandLayout, type MatchLength, type Mode} from '../src/game/types';
import {pickLine} from '../src/ai/dialogue';
import {createSeries, isLong, lengthFor, outcomeFor, recordBlof, recordPisti, sidesOf, type SeriesState} from '../src/game/series';

const P = new URLSearchParams(location.search);
const S = P.get('s') ?? '';
const G: Game = P.get('game') === 'blof' ? 'blof' : 'pisti';
const DIFF = (['kolay', 'orta', 'zor'] as Difficulty[]).find(d => d === P.get('diff')) ?? 'orta';
if (G === 'blof' || P.has('blof')) BLOF.previewOnly(true);
const LIST = ['splash', 'onboarding', 'onboarding&p=new&jump=gallery', 'home', 'home&poke=1', 'home&tab=shop', 'home&tab=profile', 'home&tab=quests', 'home&mode=4', 'home&mode=esli', 'product&k=deck&id=yildizli', 'product&k=char&id=defne',
  'product&k=fx&id=havai', 'product&k=table&id=gece', 'versus', 'versus&mode=4', 'versus&mode=esli', 'results', 'results&r=lose', 'results&mode=4', 'results&mode=esli', 'results&lvl=1&streak=3',
  'pause', 'settings', 'rules', 'daily', 'online', 'friends', 'bailout', 'wipe',
  'handchooser', 'settings&game=blof', 'settings&game=blof&hand=spread&live=1',
  'home&game=blof', 'home&game=blof&mode=1v1', 'home&game=blof&mode=4', 'home&game=blof&mode=esli', 'home&tab=profile&game=blof', 'home&tab=quests&game=blof',
  'versus&game=blof&mode=3', 'versus&game=blof&mode=1v1', 'results&game=blof&mode=3', 'results&game=blof&mode=3&r=lose', 'results&game=blof&mode=esli', 'rules&game=blof',
  'lensheet', 'lensheet&game=blof', 'interim', 'interim&mode=esli', 'interim&mode=4&n=3', 'interim&extra=1&len=51', 'interim&game=blof&mode=4&len=5&n=2', 'interim&game=blof&mode=esli&len=3',
  'resume&mode=esli&n=3', 'resume&game=blof&mode=4&len=5&n=2', 'results&len=101', 'results&mode=4&len=51', 'results&game=blof&mode=4&len=5'];

const log = (n: string) => () => console.debug('[ses]', n);
const sounds = {tap: log('tap'), whoosh: log('whoosh'), coin: log('coin'), reward: log('reward')};

/** Galeri profili: her açılışta senaryoya göre kurulur. */
function demoProfile(): Profile {
  ri('khg.profile3');
  const pr = new Profile();
  if (P.get('p') === 'new') return pr;
  const d = pr.data;
  pr.completeOnboarding((P.get('char') as CharId) ?? 'dursun', P.get('name') ?? 'Misafir');
  const rich = P.has('rich');
  d.level = rich ? 8 : 3;
  d.xp = rich ? 420 : 180;
  d.coins = P.has('poor') ? 40 : rich ? 64200 : 12450;
  d.owned.deck.push('iznik');
  d.owned.table.push('gece');
  d.owned.frame.push('altin');
  d.owned.char.push('cem');
  d.equipped.frame = P.get('frame') ?? 'altin';
  d.stats = {...d.stats, played: 37, won: 22, lost: 13, draw: 2, pisti: 41, valePisti: 3, streak: 3, bestStreak: 6,
    byMode: {'1v1': {played: 24, won: 15}, '3': {played: 0, won: 0}, '4': {played: 8, won: 3}, esli: {played: 5, won: 4}}};
  if (G === 'blof' || P.has('blof')) {
    d.blof = {played: 18, won: 9, lost: 9, streak: 2, bestStreak: 4, long: {played: 2, won: 1}, bluffs: 64, caught: 21, timesCaught: 17, wrongChallenges: 6,
      byMode: {'1v1': {played: 5, won: 3}, '3': {played: 7, won: 3}, '4': {played: 4, won: 2}, esli: {played: 2, won: 1}}};
    if (P.has('newblof')) d.blof = {...d.blof, played: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, bluffs: 0, caught: 0, timesCaught: 0, wrongChallenges: 0, byMode: {'1v1': {played: 0, won: 0}, '3': {played: 0, won: 0}, '4': {played: 0, won: 0}, esli: {played: 0, won: 0}}};
    d.lastGame = 'blof';
    d.quests = {date: new Date().toISOString().slice(0, 10), list: [{id: 'blofCatch1', progress: 1, claimed: false}, {id: 'blofWin1', progress: 0, claimed: false}, {id: 'blofLie3', progress: 2, claimed: false}], bonus: false};
    d.lastMode.blof = (P.get('mode') as Mode) ?? '3';
    d.lastDifficulty = DIFF;
  }
  d.daily = {last: '', day: 2};
  d.chestAt = P.has('chest') ? 0 : Date.now() + 2 * 3600e3 + 14 * 60e3;
  pr.save();
  return pr;
}

/** Tam ekran arena zemini + CSS kartlar (masa katmanı yerine). */
function mockTable(): void {
  const m = document.createElement('div');
  m.className = 'mock';
  const SC: Record<string, string> = {'♥': 'h', '♦': 'd', '♣': 'cl', '♠': 's'};
  const card = (r: string, s: string, style: string) => `<div class="c ${SC[s]}" style="${style}"><b>${r}<small>${s}</small></b><i>${s}</i></div>`;
  const back = (style: string) => `<div class="c bk" style="${style}"><b></b></div>`;
  m.innerHTML = `${[0, 1, 2, 3].map(i => back(`left:calc(50% + ${(i - 1.5) * 14}vw - 6.5vw);top:22vh`)).join('')}
    ${card('9', '♣', 'left:calc(50% - 7.5vw);top:43vh;transform:rotate(7deg)')}${card('Q', '♦', 'left:calc(50% - 9.5vw);top:44.5vh;transform:rotate(-4deg)')}
    <div class="hand">${[['7', '♥'], ['J', '♣'], ['10', '♦'], ['A', '♠']].map(([r, s], i) => card(r, s, `left:calc(50% + ${(i - 1.5) * 20}vw - 12.5vw);top:${73 + Math.abs(i - 1.5)}vh;transform:rotate(${(i - 1.5) * 5}deg);z-index:${i}`)).join('')}</div>`;
  document.body.prepend(m);
}

const side = (side: number, seats: number[], o: Partial<SideScore>): SideScore =>
  ({side, seats, cards: 0, majority: 0, aces: 0, jacks: 0, club2: 0, diamond10: 0, pisti: 0, total: 0, ...o});

function demoResult(mode: Mode, r: string): {result: GameResult; outcome: 'win' | 'lose' | 'draw'} {
  if (mode === '4') {
    const sides = [
      side(0, [0], {cards: 16, majority: 3, aces: 1, jacks: 2, club2: 2, pisti: 10, total: 18}),
      side(1, [1], {cards: 12, aces: 1, jacks: 1, diamond10: 3, total: 5}),
      side(2, [2], {cards: 14, aces: 2, jacks: 1, pisti: 10, total: 13}),
      side(3, [3], {cards: 10, jacks: 0, total: 0}),
    ];
    if (r === 'lose') {
      sides[0].total = 9;
      sides[0].pisti = 0;
      return {result: {sides, winners: [2]}, outcome: 'lose'};
    }
    return {result: {sides, winners: [0]}, outcome: 'win'};
  }
  const seatsA = mode === 'esli' ? [0, 2] : [0], seatsB = mode === 'esli' ? [1, 3] : [1];
  const a = side(0, seatsA, {cards: 28, majority: 3, aces: 2, jacks: 3, club2: 2, pisti: 10, total: 20});
  const b = side(1, seatsB, {cards: 24, aces: 2, jacks: 1, diamond10: 3, total: 6});
  if (r === 'lose') return {result: {sides: [{...b, side: 0, seats: seatsA}, {...a, side: 1, seats: seatsB}], winners: [1]}, outcome: 'lose'};
  if (r === 'draw') return {result: {sides: [{...a, total: 12, pisti: 0}, {...b, total: 12, pisti: 10}], winners: [0, 1]}, outcome: 'draw'};
  return {result: {sides: [a, b], winners: [0]}, outcome: 'win'};
}

const OPP: Record<Mode, CharId[]> = {'1v1': ['riza'], '3': ['cem', 'defne'], '4': ['cem', 'riza', 'defne'], esli: ['cem', 'defne', 'riza']};

/** Blöf demo sonucu: r=win → ben bitirdim; r=lose → ilk bot bitirdi (eşlide rakip takımdan biri). */
function demoBlof(setup: ReturnType<typeof buildSetup>, r: string): BlofOutcome {
  const n = MODE_INFO[setup.mode].seats;
  const win = r !== 'lose';
  const winner = win ? 0 : 1;
  const seats = Array.from({length: n}, (_, seat) => ({
    seat,
    left: seat === winner ? 0 : [0, 4, 7, 2][seat] || 3,
    bluffs: [5, 3, 4, 2][seat],
    caught: [2, 1, 3, 0][seat],
    timesCaught: [1, 2, 0, 1][seat],
    wrongChallenges: [0, 1, 0, 1][seat],
  }));
  return {setup, outcome: win ? 'win' : 'lose', winner, seats};
}

/**
 * Galeri için belirlenimci çok elli maç: n el (Pişti el puanları 1'e 1/eşli 10–30, 4 kişi 0–19; Blöf'te bitiren sırayla döner).
 * extra: Pişti'de son elde en yüksekte eşitlik (uzatma eli). Maç bitmesin diye hedefe göre kırpılır.
 */
function demoSeries(game: Game, mode: Mode, len: MatchLength, n: number, extra = false, finish = false): SeriesState {
  let s = createSeries({game, mode, len, seed: 4242});
  const sides = Math.max(...MODE_INFO[mode].teams) + 1;
  const seats = MODE_INFO[mode].seats;
  for (let k = 0; k < (finish ? 60 : n) && !s.over; k++) {
    if (game === 'pisti') {
      const pts = Array.from({length: sides}, (_, i) => (sides === 2 ? [24, 11, 30, 9, 17, 22, 13][(k + i * 3) % 7] : [12, 3, 19, 6, 9, 0, 15][(k * 2 + i * 3) % 7]));
      if (extra && k === n - 1) {
        const t = s.totals.map((v, i) => v + pts[i]);
        const top = Math.max(...t);
        const goal = Math.max(top, Number(len) || 51);
        pts[0] += goal - t[0];
        pts[1] += goal - t[1];
      }
      const total = (i: number) => pts[i];
      const res = {sides: Array.from({length: sides}, (_, i) => side(i, sidesOf(mode).flatMap((t, st) => (t === i ? [st] : [])), {pisti: k % 3 === i ? 10 : 0, total: total(i)})), winners: [] as number[]};
      const best = Math.max(...pts);
      res.winners = pts.flatMap((p, i) => (p === best ? [i] : []));
      const next = recordPisti(s, res);
      if (next.over && !extra && !finish) break;
      s = next;
    } else {
      const winner = [2, 0, 1, 3, 0][k % 5] % seats;
      s = recordBlof(s, {winner, handCounts: Array.from({length: seats}, (_, i) => (i === winner ? 0 : [5, 3, 8, 2, 6][(i + k) % 5]))});
    }
  }
  return s;
}

async function main(): Promise<void> {
  if (!S) {
    const g = document.createElement('div');
    g.className = 'gal';
    g.innerHTML = `<h1>Kahvehane Pişti — Ekran Galerisi</h1>${LIST.map(s => `<a href="?s=${s}">${s}</a>`).join('')}
      <p>Dondurulmuş (ekran görüntüsü): ${LIST.map(s => `<a href="?s=${s}&anim=0">${s}</a>`).join('')}</p>
      <p>İlk açılış: <a href="?s=onboarding&p=new">hikâye</a> · Zengin profil: <a href="?s=home&rich=1">home</a> · Kasa boş: <a href="?s=home&poor=1">home</a> · Sandık hazır: <a href="?s=home&chest=1">home</a></p>`;
    document.body.append(g);
    return;
  }
  const sc = new Screens(document.body, sounds);
  sc.onCosmeticsChanged = (k, id) => console.debug('kuşanıldı', k, id);
  (window as unknown as {__sc: Screens}).__sc = sc;
  const pr = demoProfile();
  const mode = (P.get('mode') as Mode) ?? (G === 'blof' ? '3' : '1v1');
  if (P.get('mode')) {
    pr.data.lastMode[G] = mode;
    pr.save();
  }
  const click = (sel: string, ms: number) => setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.click(), ms);
  switch (S) {
    case 'splash':
      sc.splash().progress(0.62);
      break;
    case 'onboarding':
      if (pr.data.onboarded) {
        ri('khg.profile3');
      }
      if (P.get('jump') === 'gallery') click('.kh-ob__skip', 300);
      await sc.onboarding(new Profile());
      sc.home(new Profile());
      break;
    case 'home': {
      sc.home(pr);
      const tab = P.get('tab');
      if (tab) click(`.kh-nav__btn[data-tab=${tab}]`, 200);
      const sub = P.get('sub');
      if (sub) click(`.kh-stab[data-t=${sub}]`, 700);
      if (P.has('poke')) click('.kh-hero3__tap', 4800);
      break;
    }
    case 'product': {
      sc.home(pr);
      const k = P.get('k') ?? 'deck', id = P.get('id') ?? 'yildizli';
      click('.kh-nav__btn[data-tab=shop]', 150);
      click(`.kh-stab[data-t=${k}]`, 600);
      click(`.kh-item[data-k=${k}][data-id=${id}]`, 1100);
      break;
    }
    case 'versus':
      sc.versus(buildSetup(pr, mode, OPP[mode], 1, 'klasik', undefined, {game: G, difficulty: DIFF}), 500);
      break;
    case 'results': {
      mockTable();
      const r = P.get('r') ?? 'win';
      const lvl = P.has('lvl');
      const setup = buildSetup(pr, mode, OPP[mode], 1, 'klasik', undefined, {game: G, difficulty: DIFF});
      const blof = G === 'blof' ? demoBlof(setup, r) : undefined;
      const len = lengthFor(G, P.get('len'));
      const series = isLong(len) ? demoSeries(G, mode, len, 0, false, true) : undefined;
      const demo = blof ? {result: undefined, outcome: blof.outcome} : demoResult(mode, r);
      const result = demo.result;
      const outcome = series ? outcomeFor(series, sidesOf(mode)[0]) : demo.outcome;
      const delta = outcome === 'win' ? 500 : outcome === 'lose' ? -500 : 0;
      const before = {level: lvl ? 3 : 3, xp: lvl ? 240 : 120, xpNext: xpNext(3)};
      const after = lvl ? {level: 4, xp: 30, xpNext: xpNext(4)} : {level: 3, xp: 190, xpNext: xpNext(3)};
      const d: ResultsData = {setup, result, blof, series, outcome, myPisti: blof ? 0 : 2, myValePisti: blof ? 0 : 1, stake: 500, coinsDelta: delta, coinsBefore: 11950,
        coinsAfter: 11950 + (outcome === 'win' ? 1000 : outcome === 'draw' ? 500 : 0) + (lvl ? 1000 : 0), xpGain: 70, before, after, levelReward: lvl ? 1000 : 0,
        streak: Number(P.get('streak') ?? (outcome === 'win' ? 2 : 0))};
      sc.results(d, pr.data.equipped.frame).then(x => console.debug('sonuç:', x));
      break;
    }
    case 'handchooser':
      mockTable();
      sc.handChooser().then(l => console.debug('el düzeni seçildi:', l));
      break;
    case 'pause':
      mockTable();
      sc.pause().then(r => console.debug('mola:', r));
      break;
    case 'settings':
      mockTable();
      sc.settings({sfx: true, voice: true, music: false, haptics: true, quality: 'auto'}, s => console.debug('ayar', s),
        BLOF.available() ? {value: P.get('hand') === 'group' || P.get('hand') === 'spread' ? (P.get('hand') as HandLayout) : undefined, live: P.has('live'), onChange: h => console.debug('el düzeni', h)} : undefined);
      break;
    case 'rules':
      mockTable();
      sc.rules(G);
      break;
    case 'daily':
      sc.home(pr);
      click('.kh-hw.is-daily', 900);
      break;
    case 'online':
      sc.home(pr);
      click('.kh-onl', 900);
      break;
    case 'friends':
      sc.home(pr);
      click('.kh-onl', 900);
      click('.kh-tz__tab[data-t=friends]', 1500);
      break;
    case 'bailout':
      pr.data.coins = 40;
      pr.save();
      sc.home(pr);
      click('.kh-play2', 1200);
      break;
    case 'wipe':
      sc.home(pr);
      setTimeout(() => sc.cover(), 800);
      break;
    case 'lensheet':
      sc.home(pr).then(a => console.debug('ana ekran:', a));
      click('.kh-play2', 1200);
      break;
    case 'interim': {
      mockTable();
      const len = lengthFor(G, P.get('len') ?? (G === 'blof' ? '3' : '101'));
      const series = demoSeries(G, mode, len, Number(P.get('n') ?? 1), P.has('extra'));
      const setup = buildSetup(pr, mode, OPP[mode], 1, 'klasik', undefined, {game: G, difficulty: DIFF});
      // uygulamadaki seçimle aynı: önde olan bot övünür / oyuncu öndeyse arkadan gelen söylenir
      const sp = interimSpeaker(series, setup.players, []);
      const ia = sc.interim({setup, series, stake: 500, frame: pr.data.equipped.frame, speaker: sp ? {seat: sp.seat, pose: sp.pose} : undefined, autoMs: P.has('auto') ? 6000 : 0});
      const line = sp?.moment ? pickLine(sp.char, sp.moment)?.text : undefined;
      if (line) setTimeout(() => ia.bubble.show(line, null, 4000), 900);
      ia.done.then(r => console.debug('ara skor:', r));
      break;
    }
    case 'resume': {
      const len = lengthFor(G, P.get('len') ?? (G === 'blof' ? '3' : '101'));
      const series = demoSeries(G, mode, len, Number(P.get('n') ?? 2));
      const setup = buildSetup(pr, mode, OPP[mode], 1, 'klasik', undefined, {game: G, difficulty: DIFF, tutorial: false});
      sc.home(pr, undefined, {series, players: setup.players, stake: 500, frame: pr.data.equipped.frame, onDecline: () => console.debug('maç bırakıldı')}).then(a => console.debug('ana ekran:', a));
      break;
    }
  }
}

main();
