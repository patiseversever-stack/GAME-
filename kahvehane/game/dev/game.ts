// Oyun içi doğrudan deneme sayfası (menü ekranları olmadan): masa + HUD + efektler + Match.play().
// URL: ?mode=1v1|4|esli &auto=1 (koltuk 0 kendiliğinden oynar) &seed=2 &fx=klasik|havai|yildiz|altin &me=riza
//      &opp=cem,dursun,defne &dealer=1 &table=arena &low=1 &loop=1 (bitince yeni el) &anim=0
// Hata ayıklama: window.__g → {table, hud, fx, sfx, match, events[], pisti(seat, jack, fx?), freeze(), tally()}
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '../src/ui/theme.css';
import '../src/ui/ui.css';
import {buildSkinAtlas} from '../src/render/skinAtlas';
import {deckById} from '../src/skins/index';
import {tableById} from '../src/themes/tables';
import {Table2D} from '../src/table2d/table';
import {Sfx} from '../src/audio/sfx';
import {VoicePlayer} from '../src/audio/voice';
import {Fx} from '../src/ui/fx';
import {HudView} from '../src/ui/hud';
import {ASSETS} from '../src/ui/assets';
import {Match, type MatchOutcome} from '../src/game/match';
import {charById, ROSTER} from '../src/game/roster';
import {MODE_INFO, type MatchSetup, type Mode, type SeatPlayer} from '../src/game/types';
import type {HudPisti} from '../src/ui/types';

const Q = new URLSearchParams(location.search);
const mode = (Q.get('mode') ?? '1v1') as Mode;
const info = MODE_INFO[mode] ?? MODE_INFO['1v1'];
const me = charById(Q.get('me') ?? 'dursun');
const oppIds = (Q.get('opp') ?? '').split(',').filter(Boolean);
const pool = ROSTER.filter(c => c.id !== me.id);
const opps = Array.from({length: info.seats - 1}, (_, i) => charById(oppIds[i] ?? (info.seats === 2 ? 'riza' : pool[i % pool.length].id)));

const players: SeatPlayer[] = [
  {seat: 0, char: me, name: Q.get('name') ?? 'Misafir', human: true, team: info.teams[0], level: 7, personality: me.personality, think: me.think},
  ...opps.map((c, i) => ({seat: i + 1, char: c, name: c.name, human: false, team: info.teams[i + 1], level: [9, 18, 28][c.difficulty - 1], personality: c.personality, think: c.think})),
];

function atlasWidth(low: boolean): number {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const handCss = Math.min(innerWidth * 0.245, innerHeight * 0.138);
  const need = Math.ceil((handCss * dpr * 8) / 256) * 256;
  return Math.max(1024, Math.min(low ? 1536 : 2560, need));
}

const low = Q.has('low');
const sfx = new Sfx();
const voice = new VoicePlayer(() => sfx.context);
const atlas = await buildSkinAtlas(await deckById(Q.get('deck') ?? 'yildizli').load(), atlasWidth(low));
const table = new Table2D(document.getElementById('app')!, atlas, {
  deal: () => sfx.deal(),
  land: i => sfx.cardLand(i),
  flip: () => sfx.cardFlip(),
  slide: () => sfx.cardSlide(0.6),
  whoosh: p => sfx.cardThrow(p),
}, low);
table.setTheme(tableById(Q.get('table') ?? 'arena'));
const layer = document.createElement('div');
layer.className = 'kh-ui';
document.body.append(layer);
const fx = new Fx(layer);
const hud = new HudView(layer, fx);
table.onDeck = (n, x, y) => hud.setDeck(n, x, y);
hud.setCoins(12450);
hud.onMenu = () => console.log('menü');
try {
  await voice.load(ASSETS.voiceManifest ?? '');
} catch {
  /* yalnız balon */
}
window.addEventListener('pointerdown', () => void sfx.unlock(), {once: true});

const events: {t: string; at: number; seat?: number; jack?: boolean}[] = [];
const origPisti = hud.pisti.bind(hud);
hud.pisti = (o: HudPisti) => {
  events.push({t: 'pisti', at: performance.now(), seat: o.seat, jack: o.jack});
  return origPisti(o);
};
const origTally = hud.tally.bind(hud);
hud.tally = o => {
  events.push({t: 'tally', at: performance.now()});
  return origTally(o);
};
const origCombo = hud.combo.bind(hud);
hud.combo = (s, n, x, y) => {
  events.push({t: 'combo', at: performance.now(), seat: s});
  origCombo(s, n, x, y);
};
const origShout = hud.shout.bind(hud);
hud.shout = (t, x, y, tone) => {
  events.push({t: 'shout', at: performance.now()});
  origShout(t, x, y, tone);
};

const match = new Match({table, hud, sfx, voice, auto: Q.has('auto')});
const g = {
  table, hud, fx, sfx, match, events, players, ready: false, outcome: null as MatchOutcome | null,
  pisti: (seat = 1, jack = false, id = Q.get('fx') ?? 'klasik') => {
    table.impact(jack ? 'jack' : 'pisti');
    sfx.pisti(jack);
    return hud.pisti({seat, jack, points: jack ? 20 : 10, fx: id, at: table.pilePoint(), low, line: seat ? 'Pişti! Çaylar senden evlat!' : undefined});
  },
  freeze: () => document.getAnimations().forEach(a => a.pause()),
};
(window as unknown as {__g: typeof g}).__g = g;

let dealer = Number(Q.get('dealer') ?? 1) % info.seats;
let seed = Q.has('seed') ? Number(Q.get('seed')) | 0 : undefined;
for (;;) {
  const setup: MatchSetup = {mode, players, dealer, seed, fx: Q.get('fx') ?? 'klasik'};
  g.ready = true;
  const out = await match.play(setup);
  g.outcome = out;
  console.log('el bitti', out?.outcome, out?.result.sides.map(s => s.total));
  if (!Q.has('loop')) break;
  await new Promise(r => setTimeout(r, 1500));
  dealer = (dealer + 1) % info.seats;
  if (seed !== undefined) seed++;
}
