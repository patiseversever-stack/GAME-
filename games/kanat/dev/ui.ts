// KANAT UI gallery: renders any screen with realistic mock data over a still backdrop.
//   npx vite --port 5184  →  http://localhost:5184/dev/ui.html?screen=menu&lang=tr
// Params: screen, variant, lang (tr|en), w, h (stage size), left=1, big=1, cb=1 (colour-blind), safe=0|1,
//         rm=1 (reduce motion), bg=<world id | image url>.
import { registerAssetPack } from '../src/core/assets.ts';
import { DEFAULT_SETTINGS, type Settings } from '../src/core/settings.ts';
import type { FlightState, WorldId } from '../src/sim/types.ts';
import { UI } from '../src/ui/UI.ts';
import { worldArtSvg } from '../src/ui/art.ts';
import { ICON_NAMES, iconSvg } from '../src/ui/icons.ts';
import { BADGE_IDS, PALETTE_IDS, PATTERN_IDS, POSTCARD_IDS, ROUTE_DIFFICULTY, TRAIL_IDS, WORLDS } from '../src/ui/content.ts';
import { getLang, t } from '../src/ui/i18n.ts';
import { careerShareText, dailyShareText, suruShareText, drawShareCard } from '../src/ui/share/index.ts';
import { loadFonts } from '../src/ui/fonts.ts';
import type {
  CollectionProps, DailyProps, DuelProps, GhostVM, MenuProps, ModesProps, PauseProps, PhotoProps, ResultsProps, RoutesProps, ScreenId, SettingsProps, SuruProps, UICallbacks, WorldsProps,
} from '../src/ui/types.ts';

declare global {
  interface Window { __shotReady?: boolean; __ui?: typeof UI; __sounds?: { type: string }[] }
}

// Vite serves public/ at the server root; the gallery lives under /dev/, so resolve assets from '/'.
registerAssetPack(async (path) => {
  const res = await fetch(`/${path}`);
  return res.ok ? res.arrayBuffer() : null;
});

const q = new URLSearchParams(location.search);
const screen = (q.get('screen') ?? 'index') as ScreenId | 'index' | 'hud' | 'share' | 'fonts' | 'icons' | 'toast';
const variant = q.get('variant') ?? '';
const lang = (q.get('lang') === 'en' ? 'en' : 'tr') as 'tr' | 'en';
const stage = document.getElementById('stage') as HTMLElement;
const bg = document.getElementById('bg') as HTMLElement;
const app = document.getElementById('app') as HTMLElement;

if (q.get('w') && q.get('h')) {
  stage.style.cssText = `position:fixed;left:50%;top:50%;width:${q.get('w')}px;height:${q.get('h')}px;transform:translate(-50%,-50%);inset:auto;`;
}
const portrait = (Number(q.get('h')) || innerHeight) >= (Number(q.get('w')) || innerWidth);

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  lang,
  leftHanded: q.get('left') === '1',
  reduceMotion: q.get('rm') === '1',
  kanat: { ...DEFAULT_SETTINGS.kanat, bigHud: q.get('big') === '1', colorBlind: q.get('cb') === '1' },
};

// ---------------------------------------------------------------- backdrop
const bgParam = q.get('bg');
const bgWorld: WorldId = (WORLDS as readonly string[]).includes(bgParam ?? '') ? (bgParam as WorldId) : 'kapadokya';
if (bgParam && !(WORLDS as readonly string[]).includes(bgParam)) {
  bg.innerHTML = `<img src="${bgParam}" alt="">`;
} else {
  bg.innerHTML = worldArtSvg(bgWorld, { w: portrait ? 780 : 1688, h: portrait ? 1688 : 780, id: 'bg', seed: 3 });
}

// ---------------------------------------------------------------- mock data
const today = { y: 2026, m: 10, d: 8 };
const menuProps = (): MenuProps => ({
  continueRoute: variant === 'new' ? undefined : { routeId: 'w1r3', stars: 2 },
  daily: variant === 'new' ? { n: 214, world: 'likya', unlocked: false, lockRoute: 1 } : { n: 214, world: 'likya', bestSec: 127.46, stars: 3, unlocked: true },
  rank: variant === 'new' ? { level: 1, xp: 120, xpNext: 900 } : { level: 12, xp: 1840, xpNext: 3000 },
  suru: variant === 'new' ? { unlocked: false, league: 0, lp: 0, lockRoute: 1 } : { unlocked: true, league: 2, lp: 145 },
  modes: { duel: variant !== 'new', free: variant !== 'new' },
  collection: { postcards: 7, badges: 9 },
  world: 'kapadokya',
});
const worldsProps = (): WorldsProps => ({
  totalStars: 23,
  worlds: [
    { id: 'kapadokya', stars: 11, unlocked: true, unlockAt: 0 },
    { id: 'likya', stars: 9, unlocked: true, unlockAt: 6 },
    { id: 'karadeniz', stars: 3, unlocked: true, unlockAt: 15 },
    { id: 'erciyes', stars: 0, unlocked: false, unlockAt: 26 },
    { id: 'pamukkale', stars: 0, unlocked: false, unlockAt: 38 },
  ],
  focus: (variant as WorldId) || undefined,
});
const TASKS: Record<string, { type: string; count?: number; value?: number }[]> = {
  r1: [{ type: 'gateChain', count: 6 }, { type: 'softLanding' }, { type: 'landWithin', value: 5 }],
  r2: [{ type: 'grazeCount', count: 3 }, { type: 'mult5Hold', value: 4 }, { type: 'noBounce' }],
  r3: [{ type: 'balloonThread', count: 5 }, { type: 'mult5Hold', value: 4 }, { type: 'landWithin', value: 2 }],
  r4: [{ type: 'noContact3Stars' }, { type: 'noThermal' }, { type: 'boldOpen' }],
};
const routesProps = (world: WorldId = 'kapadokya'): RoutesProps => {
  const w = WORLDS.indexOf(world) + 1;
  const stars = world === 'kapadokya' ? [3, 3, 2, 3] : world === 'likya' ? [3, 3, 2, 1] : [2, 1, 0, 0];
  return {
    world,
    stars: stars.reduce((a, b) => a + b, 0),
    selected: variant === 'r1' ? `w${w}r1` : undefined,
    routes: [1, 2, 3, 4].map((r, i) => ({
      id: `w${w}r${r}`,
      difficulty: ROUTE_DIFFICULTY[`w${w}r${r}`],
      stars: stars[i],
      bestScore: stars[i] ? [32410, 41275, 48210, 52980][i] : undefined,
      bestTimeSec: stars[i] ? [71.3, 84.9, 96.4, 104.2][i] : undefined,
      tasks: TASKS[`r${r}`].map((tk, k) => ({ id: `t${k}`, ...tk, done: k < stars[i] - (i === 2 ? 1 : 0) })),
      locked: world === 'karadeniz' && r === 4,
      startType: world === 'likya' ? 'ucurum' : world === 'karadeniz' ? 'sirt' : 'balon',
      slow: i === 1 && world === 'kapadokya',
    })),
  };
};
const modesProps = (): ModesProps => {
  const locked = variant === 'locked';
  return {
    careerStars: locked ? 3 : 23,
    daily: { unlocked: !locked, lockRoute: 1, n: 214 },
    duel: { unlocked: !locked, lockRoute: 2 },
    free: { unlocked: !locked, lockRoute: 3, worlds: ['kapadokya', 'likya', 'karadeniz'] },
    suru: { unlocked: !locked, lockRoute: 1, league: 2, lp: 145, dayN: 214 },
  };
};
const dailyProps = (): DailyProps => ({
  n: 214, world: 'likya', date: today, difficulty: 4, gates: 16,
  bestSec: variant === 'new' ? undefined : 127.46, stars: variant === 'new' ? undefined : 3, strip: variant === 'new' ? undefined : [2, 2, 3, 5, 5],
  attempts: variant === 'new' ? 0 : 3, botSec: 118.2, assisted: variant === 'assist',
});
const ghost: GhostVM = { name: 'Ayşe', route: { kind: 'daily', n: 214 }, metric: { kind: 'time', sec: 127.46 } };
const duelProps = (): DuelProps => {
  const code = 'KNT1-G214-eJzLSM3JyVcozy_KSQEAGgQEXQ';
  if (variant === 'card') return { code, ghost };
  if (variant === 'career') return { code, ghost: { name: 'Mehmet', route: { kind: 'career', routeId: 'w2r2' }, metric: { kind: 'score', value: 41275 }, oneTime: true } };
  if (variant === 'invalid') return { code: 'KNT1-G214-eJzLSM3J', error: 'invalid' };
  if (variant === 'version') return { code, error: 'version' };
  return {};
};
const suruProps = (): SuruProps => ({ league: 2, lp: 145, dayN: 214 });
const pauseProps = (): PauseProps => ({ mode: 'career', photoAllowed: variant !== 'daily', routeId: variant === 'daily' ? undefined : 'w1r3', dailyN: variant === 'daily' ? 214 : undefined, world: 'kapadokya', score: 18420, timeSec: 64.2 });
const resultsProps = (): ResultsProps => {
  const base: ResultsProps = {
    mode: 'career', half: false, world: 'kapadokya', routeId: 'w1r3', score: 48210, timeSec: 96.4, stars: 3, prevStars: 2,
    rows: [
      { kind: 'proximity', value: 30860 },
      { kind: 'grazes', value: 750, n: 3 },
      { kind: 'gates', value: 8400, a: 14, b: 14 },
      { kind: 'balloon', value: 3750, n: 4 },
      { kind: 'thermal', value: 300, n: 3 },
      { kind: 'landing', value: 1000, m: 1.6 },
      { kind: 'soft', value: 300 },
      { kind: 'bold', value: 300 },
    ],
    strip: [1, 2, 3, 3, 5], pbDelta: 1240, newBest: true, hasNext: true,
    tasksDone: [{ id: 't0', type: 'balloonThread', count: 5, done: true }],
  };
  if (variant === 'daily') return { ...base, mode: 'daily', routeId: undefined, dailyN: 214, world: 'likya', timeSec: 127.46, score: 0, stars: 3, prevStars: 2, rows: [{ kind: 'flight', value: 123.46 }, { kind: 'missed', value: 4, n: 2 }], strip: [2, 2, 3, 5, 5], pbDelta: -1.3, newBest: true, ghostDelta: -0.42, tasksDone: [] };
  if (variant === 'half') return { ...base, half: true, score: 9640, stars: 0, prevStars: 0, rows: [{ kind: 'proximity', value: 7840 }, { kind: 'grazes', value: 500, n: 2 }, { kind: 'gates', value: 1300, a: 3, b: 14 }], strip: [1, 2, 0, 0, 0], newBest: false, pbDelta: undefined, tasksDone: [] };
  if (variant === 'duel') return { ...base, mode: 'duel', routeId: undefined, dailyN: 214, world: 'likya', timeSec: 126.66, stars: 3, rows: [{ kind: 'flight', value: 126.66 }, { kind: 'missed', value: 0, n: 0 }], duel: { won: true, deltaSec: 0.8, opponent: 'Ayşe' }, newBest: false, pbDelta: undefined, tasksDone: [] };
  return base;
};
const CREDITS_TR = 'Yükseklik verisi: Mapzen Terrain Tiles (AWS Open Data) — © OpenStreetMap katkıda bulunanlar, USGS, SRTM, EU-DEM\nYazı tipleri: Barlow Condensed, Inter, Playfair Display — SIL Open Font License 1.1\nMüzik ve sesler: prosedürel sentez (Web Audio)';
const CREDITS_EN = 'Elevation data: Mapzen Terrain Tiles (AWS Open Data) — © OpenStreetMap contributors, USGS, SRTM, EU-DEM\nTypefaces: Barlow Condensed, Inter, Playfair Display — SIL Open Font License 1.1\nMusic and sound: procedural synthesis (Web Audio)';
const settingsProps = (): SettingsProps => ({ settings: currentSettings, currentTier: 'high', ultraCapable: true, version: '0.1.0 · sim 1', credits: getLang() === 'tr' ? CREDITS_TR : CREDITS_EN });
const collectionProps = (): CollectionProps => {
  const gotPc = new Set(['w1p1', 'w1p2', 'w1p4', 'w1p5', 'w2p1', 'w2p3', 'w3p1']);
  return {
    tab: (['postcards', 'wardrobe', 'badges'] as const).find((x) => x === variant) ?? 'postcards',
    postcards: POSTCARD_IDS.map((id) => ({ id, world: WORLDS[Number(id.charAt(1)) - 1], got: gotPc.has(id), date: gotPc.has(id) ? { y: 2026, m: 10, d: 2 + id.charCodeAt(3) % 6 } : undefined })),
    patterns: PATTERN_IDS.map((id, i) => ({ id, unlocked: i < 7, source: i < 2 ? { kind: 'start' } : i < 7 ? undefined : i % 3 === 0 ? { kind: 'usta', routeId: ROUTE_IDS_FOR(i) } : i % 3 === 1 ? { kind: 'rank', n: 8 + i } : { kind: 'postcards', world: WORLDS[i % 5] } })),
    palettes: PALETTE_IDS.map((id, i) => ({ id, unlocked: i < 5, source: i < 5 ? undefined : { kind: i % 2 ? 'rank' : 'weekly', n: 10 + i } })),
    trails: TRAIL_IDS.map((id, i) => ({ id, unlocked: i < 3, source: i < 3 ? undefined : { kind: i % 2 ? 'log' : 'usta', routeId: 'w2r3' } })),
    equipped: { pattern: 'kilim', palette: 'safak', trail: 'altinToz' },
    badges: BADGE_IDS.map((id, i) => ({ id, got: [0, 1, 3, 6, 9, 10, 17, 18, 29].includes(i) })),
  };
};
function ROUTE_IDS_FOR(i: number): string {
  return `w${(i % 5) + 1}r${(i % 4) + 1}`;
}
const photoProps = (): PhotoProps & { _tool?: string } => ({
  params: { fov: 54, roll: 0, exposure: 0.3, focus: 0.4, aperture: 0.55, filter: 'golden', grain: 0.2, frame: variant !== 'plain', logo: variant !== 'plain' },
  postcard: { id: 'w1p4', world: 'kapadokya' },
  date: today,
  world: 'kapadokya',
  _tool: variant === 'filter' ? 'filter' : variant === 'aperture' ? 'aperture' : undefined,
});

let currentSettings = settings;
const cb: UICallbacks = {
  getMenu: menuProps,
  getWorlds: worldsProps,
  getRoutes: (w) => routesProps(w),
  getModes: modesProps,
  getDaily: dailyProps,
  getSuru: suruProps,
  getCollection: collectionProps,
  getSettings: settingsProps,
  onSettingsChange: (s) => {
    currentSettings = s;
  },
  onDuelSubmit: async (code) => (code.length < 20 ? { ok: false, error: 'invalid' } : { ok: true, ghost }),
  onPause: () => UI.show('pause', pauseProps()),
  onResume: () => UI.show('flight', {}),
  onQuitToMenu: () => UI.show('menu', menuProps()),
  onContinue: () => UI.show('loading', { progress: 0.42, world: 'kapadokya' }),
  openPerfPanel: () => UI.toast('perf panel'),
  onResultsShare: () => UI.toast(t('toast.copied'), { icon: 'copy' }),
  onSound: (e) => {
    (window.__sounds ??= []).push(e);
  },
};

// ---------------------------------------------------------------- HUD mock
function flightState(o: Partial<FlightState> = {}): FlightState {
  return {
    tick: 3600, phase: 'flying', pos: [0, 900, 0], prevPos: [0, 900, 0], vel: [0, -8, -48], speed: 50.6, gamma: -0.16, psi: 0.2, phi: 0.3, cl: 0.6, heightAGL: 34,
    prox: { d: 5.2, cls: 'rock', nearest: [0, 0, 0], normal: [0, 1, 0], mult: 3, propId: -1 },
    score: 18420, combo: 1.75, comboTime: 9.2, timeSec: 64.23, gateIndex: 7, gatesPassed: 7, gatesMissed: 0, inThermal: -1, inLandingZone: false, canopyOpen: false, assist: 'full', energy: 12000,
    ...o,
  };
}

function showHud(): void {
  // Gallery only: freeze event popups mid-life so screenshots show them.
  const st = document.createElement('style');
  st.textContent = '.kn-pop.is-on{animation-delay:-420ms!important;animation-play-state:paused!important}';
  document.head.appendChild(st);
  UI.show('flight', {});
  const mode = variant.startsWith('daily') ? 'daily' : variant === 'free' ? 'free' : 'career';
  UI.hud.configure({ mode, gatesTotal: mode === 'daily' ? 16 : 0, colorBlind: settings.kanat.colorBlind, leftHanded: settings.leftHanded, bigHud: settings.kanat.bigHud });
  let s = flightState();
  if (variant === 'zone') s = flightState({ heightAGL: 142, inLandingZone: true, prox: { ...s.prox, d: 24, mult: 1 }, combo: 1.3, score: 41980, speed: 44 });
  if (variant === 'daily') s = flightState({ timeSec: 64.27, prox: { ...s.prox, d: 2.4, mult: 5 }, combo: 2.6, heightAGL: 18 });
  if (variant === 'x0') s = flightState({ prox: { ...s.prox, d: 40, mult: 0 }, combo: 1, heightAGL: 260, speed: 61 });
  if (variant.startsWith('ftue')) s = flightState({ phase: variant === 'ftue-jump' ? 'intro' : 'flying', score: 0, prox: { ...s.prox, d: 40, mult: 0 }, combo: 1, heightAGL: variant === 'ftue-flare' ? 3 : 380, inLandingZone: variant === 'ftue-chute', canopyOpen: variant === 'ftue-flare' });
  UI.hud.update(s);
  if (variant === '' || variant === 'cb') {
    UI.hud.onEvent({ type: 'graze', tick: 1, points: 750, strength: 1, pos: [0, 0, 0], cls: 'rock', side: 1 });
    UI.hud.setArrow(-1.1);
  }
  if (variant === 'daily') {
    UI.hud.setGhostDelta(-0.42);
    UI.hud.onEvent({ type: 'gate', tick: 1, index: 7, points: 900, chain: 5 });
    UI.hud.setArrow(2.3);
  }
  if (variant === 'balloon') UI.hud.onEvent({ type: 'balloonThread', tick: 1, a: 1, b: 2, points: 750, mult: 1 });
  if (variant === 'warn') UI.hud.setWarning('left');
  if (variant === 'ftue-jump') UI.hud.ftue('jump');
  if (variant === 'ftue-drag') UI.hud.ftue('drag');
  if (variant === 'ftue-chute') UI.hud.ftue('parachute');
  if (variant === 'ftue-flare') UI.hud.ftue('flare');
}

// ---------------------------------------------------------------- special pages
function page(html: string): void {
  app.innerHTML = `<div class="kn-ui" style="pointer-events:auto;overflow:auto;touch-action:auto;user-select:text;padding:24px;background:rgba(14,20,28,.92)">${html}</div>`;
}
function fontsPage(): void {
  const s = 'Ağaçlı Şelâle · İĞNEADA · ığdır · ÇÖŞÜ · 2:07.4';
  const rows: [string, string][] = [
    ['Barlow Condensed 600', `font-family:'Barlow Condensed';font-weight:600`],
    ['Barlow Condensed 700', `font-family:'Barlow Condensed';font-weight:700`],
    ['Barlow Condensed 600 italic', `font-family:'Barlow Condensed';font-weight:600;font-style:italic`],
    ['Inter 400', `font-family:'Inter';font-weight:400`],
    ['Inter 600', `font-family:'Inter';font-weight:600`],
    ['Inter 400 tabular', `font-family:'Inter';font-weight:400;font-variant-numeric:tabular-nums`],
    ['Playfair Display italic', `font-family:'Playfair Display';font-style:italic;font-weight:400`],
  ];
  page(`<div style="display:flex;flex-direction:column;gap:18px;color:#F5F1E8">${rows
    .map(([n, st]) => `<div><div style="font:600 12px Inter;letter-spacing:.12em;opacity:.6">${n}</div><div style="${st};font-size:30px;line-height:1.2">${s}</div><div style="${st};font-size:18px;opacity:.85">0123456789 · 48.210 · 1111 / 8888 · ×5 −0,42 km/s</div></div>`)
    .join('')}<div style="font:600 12px Inter;opacity:.6">fonts: ${[...document.fonts].filter((f) => f.status === 'loaded').length} loaded</div></div>`);
}
function iconsPage(): void {
  page(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:14px;color:#F5F1E8">${ICON_NAMES.map((n) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border:1px solid #FFFFFF22;border-radius:12px">${iconSvg(n, 'kn-icon')}<span style="font:500 11px Inter;opacity:.7">${n}</span></div>`).join('')}</div><style>.kn-icon{width:28px;height:28px}</style>`);
}
async function sharePage(): Promise<void> {
  const L = getLang();
  const line: [number, number][] = [];
  for (let i = 0; i <= 40; i++) line.push([i * 40 + Math.sin(i * 0.35) * 160, i * 25 + Math.cos(i * 0.22) * 120]);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const daily = variant !== 'career';
  await drawShareCard(canvas, daily
    ? { world: 'likya', dailyN: 214, metric: { kind: 'time', sec: 127.46 }, strip: [2, 2, 3, 5, 5], stars: 3, line, date: today, lang: L }
    : { world: 'kapadokya', routeId: 'w1r3', metric: { kind: 'score', value: 48210 }, strip: [1, 2, 3, 3, 5], stars: 3, line, date: today, lang: L });
  canvas.style.cssText = 'width:100%;max-width:540px;height:auto;border-radius:18px;display:block;margin:0 auto';
  const texts = [
    dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3 }, L),
    dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3, duelCode: 'KNT1-G214-eJzLSM3J', assisted: true, slow: true }, L),
    careerShareText({ world: 'kapadokya', routeId: 'w1r3', stars: 3, score: 48210, strip: [1, 2, 3, 3, 5] }, L),
    suruShareText({ sub: 'day', n: 214, place: 1, flocks: 15, peak: 486, encircles: 2, survived: true }, L),
  ];
  page(`<div id="sharewrap"></div><pre style="white-space:pre-wrap;font:14px/1.6 Inter;color:#F5F1E8;max-width:540px;margin:18px auto">${texts.join('\n\n')}</pre>`);
  document.getElementById('sharewrap')?.appendChild(canvas);
}
function indexPage(): void {
  const screens = ['loading', 'menu', 'menu&variant=new', 'worlds', 'routes', 'routes&variant=r1', 'modes', 'modes&variant=locked', 'suru', 'daily', 'duel', 'duel&variant=card', 'duel&variant=invalid', 'duel&variant=version', 'pause', 'results', 'results&variant=daily', 'results&variant=half', 'results&variant=duel', 'settings', 'collection', 'collection&variant=wardrobe', 'collection&variant=badges', 'photo', 'photo&variant=filter', 'unlock', 'help', 'inverted', 'assistOff', 'resume', 'toast', 'hud', 'hud&variant=zone', 'hud&variant=daily', 'hud&variant=ftue-jump', 'hud&variant=ftue-drag', 'hud&variant=ftue-chute', 'hud&variant=ftue-flare', 'hud&variant=warn', 'share', 'fonts', 'icons'];
  page(`<h1 style="font:700 28px 'Barlow Condensed';letter-spacing:.3em;color:#F5F1E8">KANAT UI</h1><ul style="columns:2;font:15px/2 Inter">${screens.map((s) => `<li><a style="color:#F2A541" href="?screen=${s}&lang=${lang}">${s}</a></li>`).join('')}</ul>`);
}

// ---------------------------------------------------------------- boot
async function boot(): Promise<void> {
  UI.mount(app, cb, { settings });
  window.__ui = UI;
  if (q.get('safe') !== '0') UI.setSafeArea(portrait ? { top: 47, bottom: 34, left: 0, right: 0 } : { top: 0, bottom: 21, left: 47, right: 47 });
  await UI.fontsReady;
  await loadFonts();
  switch (screen) {
    case 'index': indexPage(); break;
    case 'fonts': fontsPage(); break;
    case 'icons': iconsPage(); break;
    case 'share': await sharePage(); break;
    case 'hud': showHud(); break;
    case 'loading': UI.show('loading', { progress: 0.62, world: (variant as WorldId) || 'kapadokya', tip: 3 }); break;
    case 'menu': UI.show('menu', menuProps()); break;
    case 'worlds': UI.show('menu', menuProps()); UI.show('worlds', worldsProps()); break;
    case 'routes': UI.show('menu', menuProps()); UI.show('routes', routesProps((q.get('world') as WorldId) || 'kapadokya')); break;
    case 'modes': UI.show('menu', menuProps()); UI.show('modes', modesProps()); break;
    case 'suru': UI.show('menu', menuProps()); UI.show('suru', suruProps()); break;
    case 'daily': UI.show('menu', menuProps()); UI.show('daily', dailyProps()); break;
    case 'duel': UI.show('menu', menuProps()); UI.show('duel', duelProps()); break;
    case 'pause': showHud(); UI.show('pause', pauseProps()); break;
    case 'results': UI.show('results', resultsProps()); break;
    case 'settings': UI.show('menu', menuProps()); UI.show('settings', settingsProps()); break;
    case 'collection': UI.show('menu', menuProps()); UI.show('collection', collectionProps()); break;
    case 'photo': UI.show('flight', {}); UI.show('photo', photoProps()); break;
    case 'unlock': UI.show('menu', menuProps()); UI.show('unlock', variant === 'world' ? { kind: 'world', world: 'likya' } : { kind: (variant as 'daily') || 'daily' }); break;
    case 'help': showHud(); UI.show('help', {}); break;
    case 'inverted': showHud(); UI.show('inverted', {}); break;
    case 'assistOff': UI.show('results', resultsProps()); UI.show('assistOff', {}); break;
    case 'resume': showHud(); UI.show('resume', {}); break;
    case 'toast': UI.show('menu', menuProps()); UI.toast(t('toast.mediumSuggested'), { id: 'medium', action: t('common.apply'), icon: 'speed', ms: 60000 }); break;
    default: indexPage();
  }
  const settle = screen === 'results' || screen === 'assistOff' ? 3200 : 900;
  setTimeout(() => {
    window.__shotReady = true;
  }, settle);
}

void boot();
