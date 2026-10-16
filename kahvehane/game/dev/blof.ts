// Blöf deneme sayfası (menüsüz): masa + HUD + Blöf arayüzü.
// Gerçek oyun (BlofMatch → LocalHost → motor + botlar):
//   ?mode=1v1|3|4|esli &auto=1 (koltuk 0 kendiliğinden) &seed=3 &diff=kolay|orta|zor &tut=1 (öğretici) &loop=1 &me=dursun &opp=riza,cem,defne
// Sahne (ekran görüntüsü için, motor yok):
//   ?scene=table&hand=26&pile=9&out=6&rank=7&sel=2   (masa yerleşimi, seçili kartlar, eylem çubuğu)
//   ?scene=open                                       (turu sen açıyorsun: değer seçici)
//   ?scene=window                                     (BLÖF düğmesi + dolan halka)
//   ?scene=reveal&lie=1                               (blöf anı: çağrı → ağır çekim açılış → damga → yığın uçar)
// Ortak: &deck=yildizli &table=arena &low=1 &anim=0
// Hata ayıklama: window.__b → {table, hud, fx, sfx, match, t, ui, ready, done, outcome, run(name)}
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '../src/ui/theme.css';
import '../src/ui/ui.css';
import {trackAnimations} from '../src/platform/anim';
import {initCalm} from '../src/platform/calm';
import {buildSkinAtlas} from '../src/render/skinAtlas';
import {deckById} from '../src/skins/index';
import {tableById} from '../src/themes/tables';
import {Table2D} from '../src/table2d/table';
import {BlofTable, type BlofSounds} from '../src/table2d/blofTable';
import {BlofHud, claimText} from '../src/ui/blofHud';
import {Sfx} from '../src/audio/sfx';
import {VoicePlayer} from '../src/audio/voice';
import {Fx} from '../src/ui/fx';
import {HudView} from '../src/ui/hud';
import {BlofMatch} from '../src/game/blofMatch';
import {charById, ROSTER} from '../src/game/roster';
import {MODE_INFO, type BlofOutcome, type MatchSetup, type Mode, type SeatPlayer, type Difficulty} from '../src/game/types';
import {mulberry32} from '../src/core/rng';
import {rankOf} from '../src/core/types';

trackAnimations();
const Q = new URLSearchParams(location.search);
const mode = (Q.get('mode') ?? '1v1') as Mode;
const info = MODE_INFO[mode] ?? MODE_INFO['1v1'];
const n = info.seats;
const me = charById(Q.get('me') ?? 'dursun');
const oppIds = (Q.get('opp') ?? '').split(',').filter(Boolean);
const pool = ROSTER.filter(c => c.id !== me.id);
const opps = Array.from({length: n - 1}, (_, i) => charById(oppIds[i] ?? (n === 2 ? 'riza' : pool[i % pool.length].id)));
const players: SeatPlayer[] = [
  {seat: 0, char: me, name: Q.get('name') ?? 'Misafir', human: true, team: info.teams[0], level: 7, personality: me.personality, think: me.think},
  ...opps.map((c, i) => ({seat: i + 1, char: c, name: c.name, human: false, team: info.teams[i + 1], level: [9, 18, 28][c.difficulty - 1], personality: c.personality, think: c.think})),
];
const low = Q.has('low');
if (Q.get('calm') !== '0') initCalm({always: low});

function atlasWidth(): number {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const handCss = Math.min(innerWidth * 0.245, innerHeight * 0.138);
  const need = Math.ceil((handCss * dpr * 8) / 256) * 256;
  return Math.max(1024, Math.min(low ? 1536 : 2560, need));
}

const sfx = new Sfx();
const voice = new VoicePlayer(() => sfx.context);
const atlas = await buildSkinAtlas(await deckById(Q.get('deck') ?? 'yildizli').load(), atlasWidth());
const table = new Table2D(document.getElementById('app')!, atlas, {
  deal: () => sfx.deal(),
  land: i => sfx.cardLand(i),
  flip: () => sfx.cardFlip(),
  slide: () => sfx.cardSlide(0.6),
  whoosh: p => sfx.cardThrow(p),
}, low);
table.setTheme(tableById(Q.get('table') ?? 'arena'));
await table.ready;
const layer = document.createElement('div');
layer.className = 'kh-ui';
document.body.append(layer);
const fx = new Fx(layer);
const hud = new HudView(layer, fx);
table.onDeck = (c, x, y) => hud.setDeck(c, x, y);
hud.setCoins(12450);
hud.onMenu = () => console.log('menü');
window.addEventListener('pointerdown', () => void sfx.unlock(), {once: true});
// atlas PNG'ye çevrilip yüklenene dek bekle (kartlar boş görünmesin)
await new Promise(r => setTimeout(r, 400));

const g = {
  table, hud, fx, sfx, match: null as BlofMatch | null, t: null as BlofTable | null, ui: null as BlofHud | null,
  ready: false, done: false, outcome: null as BlofOutcome | null, step: '',
  freeze: () => document.getAnimations().forEach(a => a.pause()),
};
(window as unknown as {__b: typeof g}).__b = g;

const scene = Q.get('scene');
if (!scene) {
  const match = new BlofMatch({table, hud, sfx, voice, auto: Q.has('auto')});
  g.match = match;
  let seed = Q.has('seed') ? Number(Q.get('seed')) | 0 : undefined;
  for (;;) {
    const setup: MatchSetup = {
      game: 'blof', mode, players, dealer: 0, seed, fx: 'klasik',
      difficulty: (Q.get('diff') ?? 'orta') as Difficulty,
      tutorial: Q.has('tut') ? true : false,
    };
    g.ready = true;
    const out = await match.play(setup);
    g.outcome = out;
    g.done = true;
    console.log('el bitti', out?.outcome, 'kazanan', out?.winner, JSON.stringify(out?.seats));
    if (!Q.has('loop')) break;
    await new Promise(r => setTimeout(r, 1500));
    if (seed !== undefined) seed++;
  }
} else {
  // ───────── sahneler: motorsuz, doğrudan masa + arayüz ─────────
  const snd: BlofSounds = {deal: () => sfx.deal(), land: i => sfx.cardLand(i), flip: () => sfx.cardFlip(), slide: p => sfx.cardSlide(p ?? 0.5), whoosh: p => sfx.cardThrow(p), tick: i => sfx.tick(i), shuffle: () => sfx.shuffle()};
  const t = new BlofTable(table, snd);
  const ui = new BlofHud(hud.el, {tap: () => sfx.uiTap(), tick: i => sfx.tick(i), slam: () => sfx.cardLand(0.9)});
  g.t = t;
  g.ui = ui;
  t.onLayout = L => ui.layout(L);
  hud.setGame('blof');
  hud.setSounds(sfx);
  hud.show(players, mode);
  hud.setDeck(0, 0, 0);
  t.reset(n);
  ui.reset();
  ui.layout(t.L);
  ui.show(true);
  const seed = Number(Q.get('seed') ?? 5) | 0;
  const rnd = mulberry32(seed);
  const deck = Array.from({length: 52}, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const handN = Number(Q.get('hand') ?? Math.floor(52 / n));
  const pileN = Number(Q.get('pile') ?? (scene === 'open' ? 0 : 7));
  const outN = Number(Q.get('out') ?? 0);
  const rank = Number(Q.get('rank') ?? 7);
  const mine = deck.slice(0, handN);
  const others = 52 - handN;
  const extra = pileN + outN;
  const counts = new Array<number>(n).fill(0);
  counts[0] = handN;
  const each = Math.floor((others - extra) / (n - 1));
  for (let s = 1; s < n; s++) counts[s] = each;
  counts[1] += others - extra - each * (n - 1) + extra; // fazlası + yığına gidecekler 1. koltuktan
  const order: number[] = [];
  const left = counts.slice();
  for (let k = 0; order.length < 52; k++) {
    const s = k % n;
    if (left[s] > 0) {
      order.push(s);
      left[s]--;
    }
  }
  await t.deal(order, mine);
  const shown = counts.slice();
  const stats = () => hud.setStats(shown.map(c => ({cards: c, pisti: 0})));
  stats();
  const held = new Array<number>(14).fill(0);
  for (const id of mine) held[rankOf(id)]++;
  ui.setHeld(held);
  // kenar + yığın: 1. koltuktan atışlar
  let o = outN;
  while (o > 0) {
    const k = Math.min(4, o);
    await t.play(1, k);
    o -= k;
  }
  if (outN) {
    await t.discard();
    ui.setOut(outN);
    shown[1] -= outN;
  }
  let p = pileN;
  let who = 1;
  const pileFrom: number[] = [];
  while (p > 0) {
    const k = Math.min(p, 1 + ((p * 7) % 3));
    const s = n === 2 ? 1 : who;
    await t.play(s, k);
    pileFrom.push(s);
    shown[1] -= 0;
    p -= k;
    who = who % (n - 1) + 1;
  }
  shown[1] = counts[1] - outN - pileN;
  stats();
  for (let s = 1; s < n; s++) hud.alert(s, shown[s] > 0 && shown[s] <= 2);
  ui.setPile(pileN);
  if (pileN) {
    ui.setClaim(rank);
    ui.setLast(players[n === 2 ? 1 : 1].name.split(' ')[0], 3);
  }
  t.setSelectable(true);
  const selN = Number(Q.get('sel') ?? 0);
  // &selr=9: seçilecek kartların değeri (yoksa turun değeri); seçim gruptan yapılır (gerçek dokunuş yolu)
  const selR = Number(Q.get('selr') ?? rank);
  const pickSel = () => {
    const grp = mine.filter(c => rankOf(c) === selR).sort((a, b) => a - b);
    const ids = grp.slice(-selN);
    if (ids.length < selN) ids.push(...mine.filter(c => !ids.includes(c)).slice(0, selN - ids.length));
    t.selectIds(ids);
    return ids.length;
  };
  const quick = () => {
    const held = t.hand.filter(c => rankOf(c.id) === rank);
    const on = held.filter(c => c.sel).length;
    const k = t.selected().length;
    ui.setQuick(held.length && on < Math.min(4, held.length) && k < 4 ? rank : null, Math.min(4, held.length));
  };
  ui.onQuick = r => t.selectRank(r);
  hud.setTurn(0);
  if (scene === 'table') {
    const k = selN ? pickSel() : 0;
    ui.setBar({mode: 'follow', rank, sel: k, canPass: true});
    quick();
    t.onSelect = ids => {
      ui.setBar({mode: 'follow', rank, sel: ids.length, canPass: true});
      quick();
    };
    t.onReject = () => {
      hud.showHint('En fazla 4 kart atılır');
      ui.shakePlay();
      setTimeout(() => hud.showHint(null), 1400);
    };
  } else if (scene === 'open') {
    ui.setClaim(null);
    ui.setBar({mode: 'open', rank: null, sel: 0, canPass: false});
    ui.openPicker(true);
    ui.onRank = r => {
      t.preselect(r);
      ui.setBar({mode: 'open', rank: r, sel: t.selected().length, canPass: false});
    };
    t.onSelect = ids => ui.setBar({mode: 'open', rank: ui.picking ? null : rank, sel: ids.length, canPass: false});
  } else if (scene === 'window') {
    hud.setTurn(-1);
    hud.say(claimText(3, rank) + '!', null, 4000, 1);
    ui.setBar({mode: 'wait', rank, sel: 0, canPass: false});
    ui.openBlof(5000, {letGo: true});
    t.setPileTap(true, 5000);
  } else if (scene === 'reveal') {
    hud.setTurn(-1);
    const lie = Q.get('lie') !== '0';
    const caller = 0, liar = 1;
    const m = Number(Q.get('m') ?? 3);
    const notMine = deck.filter(c => !mine.includes(c));
    const sameRank = notMine.filter(c => rankOf(c) === rank);
    const other = notMine.filter(c => rankOf(c) !== rank);
    const cards = lie ? [sameRank[0], other[0], sameRank[1] ?? other[1]].slice(0, m) : sameRank.slice(0, m);
    await t.play(liar, m);
    hud.say(claimText(m, rank) + '!', null, 1400, liar);
    ui.setPile(pileN + m);
    await new Promise(r => setTimeout(r, 900));
    g.step = 'call';
    ui.openBlof(5000, {letGo: true});
    await new Promise(r => setTimeout(r, 700));
    ui.closeBlof(true);
    sfx.cardLand(1);
    table.shake(0.35);
    table.tint('#ff2e4d', 0.55, 650);
    hud.react(caller, 'kizgin', 1500);
    hud.react(liar, 'saskin', 2200);
    void ui.call({x: t.L.u * 3.2, y: t.L.barY}, t.pilePoint());
    await new Promise(r => setTimeout(r, 420));
    g.step = 'reveal';
    sfx.drumRoll(0.3 + m * 0.27);
    ui.focusClaim(true, t.revealTop(m) - t.L.claim.d * 0.62 - t.L.u * 0.3);
    await t.reveal(cards, rank, {step: 265});
    g.step = 'stamp';
    const loser = lie ? liar : caller;
    if (lie) {
      table.impact('big');
      table.tint('#ff2e4d', 0.7, 900);
      hud.react(liar, 'kizgin', 2300);
      hud.react(caller, 'kahkaha', 2000);
      hud.say('Vay vay… beni yakaladın ha?', 'saskin', 2200, liar);
    } else {
      table.tint('#3dff86', 0.6, 900);
      table.pulse('#3dff86', 1.6, t.pilePoint());
      table.sparkle('#7dffa8', 16, 1.4, t.pilePoint());
      hud.react(caller, 'saskin', 2300);
      hud.react(liar, 'zafer', 2000);
      hud.say('Doğruydu evlat! Al yığını, afiyet olsun.', 'kahkaha', 2200, liar);
    }
    void ui.stamp(lie ? 'caught' : 'truth', loser === 0 ? `Yığın sana: ${pileN + m} kart` : `${players[loser].name.split(' ')[0]} yığını alıyor · ${pileN + m} kart`, t.revealTop(m) + t.L.ch * t.revealScale(m) * 0.8, 1550);
    await new Promise(r => setTimeout(r, 650));
    g.step = 'take';
    ui.focusClaim(false);
    const pileIds = notMine.filter(c => !cards.includes(c)).slice(0, pileN).concat(cards);
    await t.take(loser, loser === 0 ? pileIds : undefined, (i, total) => hud.tickCards(loser, shown[loser] + Math.round(((i + 1) / total) * (pileN + m))));
    ui.setPile(0);
    ui.setClaim(null);
    ui.setLast(null);
    g.step = 'done';
  }
  g.ready = true;
}
