// Giriş noktası: sahne, masa, kartlar, sesler, ekranlar ve uygulama akışını kurar.
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/playfair-display/900.css';

import {Stage} from './render/stage';
import {buildEnvironment} from './render/env';
import {buildCardAtlas} from './render/cardAtlas';
import {CardSystem} from './render/cards';
import {CAMERA, makeLayout} from './game/layout';
import {HandInput} from './input/hand';
import {TableView} from './game/table';
import {Sparks} from './fx/particles';
import {Shockwave} from './fx/ring';
import {Sfx} from './audio/sfx';
import {VoicePlayer} from './audio/voice';
import {Screens, type Settings} from './ui/screens';
import {ASSETS} from './ui/assets';
import {runApp, type OpponentDef} from './game/app';
import {detectTier, qualityFor, type Tier} from './quality';
import {haptic, setHaptics, store} from './platform/bridge';

const AUTO = new URLSearchParams(location.search).has('auto');

function opponents(): OpponentDef[] {
  const a = ASSETS;
  const moods = {kahkaha: a.riza_kahkaha, kizgin: a.riza_kizgin, saskin: a.riza_saskin, uzgun: a.riza_uzgun};
  return [
    {id: 'riza', name: 'Rıza Amca', title: 'Kırk yıllık usta', portrait: a.riza_portrait, blink: a.riza_blink, moods, difficulty: 2,
      personality: {memory: 0.88, skill: 0.85, jackPatience: 0.75}, think: [0.7, 1.5]},
    {id: 'cem', name: 'Cem', title: 'Algoritması var', portrait: a.cem_avatar, moods, difficulty: 1, locked: true,
      personality: {memory: 0.7, skill: 0.7, jackPatience: 0.5}, think: [0.5, 1.1]},
    {id: 'dursun', name: 'Kahveci Dursun', title: 'Çaylar ondan', portrait: a.dursun_avatar, moods, difficulty: 1, locked: true,
      personality: {memory: 0.6, skill: 0.6, jackPatience: 0.5}, think: [0.6, 1.3]},
    {id: 'defne', name: 'Defne', title: 'Poker yüzü', portrait: a.defne_avatar, moods, difficulty: 3, locked: true,
      personality: {memory: 0.97, skill: 0.95, jackPatience: 0.85}, think: [0.9, 1.8]},
  ];
}

async function boot(): Promise<void> {
  const settings = store.get<Settings>('settings2', {sfx: true, voice: true, music: true, haptics: true, quality: 'auto'});
  const forced = new URLSearchParams(location.search).has('q');
  const tier: Tier = settings.quality === 'auto' || forced ? detectTier() : settings.quality;
  const q = qualityFor(tier);
  const sfx = new Sfx();
  const voice = new VoicePlayer(() => sfx.context);
  const screens = new Screens(document.body, {tap: () => sfx.uiTap(), whoosh: () => sfx.cardThrow(0.4), coin: n => sfx.coin(n), reward: () => sfx.win()});
  const splash = screens.splash();
  splash.progress(0.1);

  const app = document.getElementById('app')!;
  const stage = new Stage(app, q, CAMERA);
  await buildEnvironment(stage);
  splash.progress(0.4);
  const atlas = await buildCardAtlas(q.atlasWidth);
  const cards = new CardSystem(stage, atlas);
  splash.progress(0.7);
  const layout = makeLayout(2);
  const hand = new HandInput(stage, cards, () => layout.pile);
  const table = new TableView(stage, cards, layout, hand, {
    deal: () => sfx.deal(),
    land: i => sfx.cardLand(i),
    flip: () => sfx.cardFlip(),
    throwWhoosh: p => sfx.cardThrow(p),
  });
  hand.onPick = () => {
    sfx.cardSlide(0.8);
    haptic('light');
  };
  hand.onSelect = () => sfx.cardSlide(0.5);
  window.addEventListener('resize', () => setTimeout(() => hand.layout(false), 60));
  const sparks = new Sparks(stage, q.particles);
  const ring = new Shockwave(stage);
  table.reset(2);
  stage.onRender(() => {
    const o = {x: 0, y: 0};
    table.topScreen('deck', o);
    screens.hud.setDeck(table.deck.length, o.x, o.y + 44);
  });
  try {
    await voice.load(ASSETS.voiceManifest ?? '');
  } catch {
    /* ses yoksa konuşma balonu */
  }
  const applySettings = (s: Settings) => {
    const qChanged = s.quality !== settings.quality;
    Object.assign(settings, s);
    store.set('settings2', settings);
    sfx.setMuted(!s.sfx);
    voice.setEnabled(s.voice);
    setHaptics(s.haptics);
    if (qChanged) location.reload();
  };
  applySettings({...settings});
  splash.progress(1);
  document.getElementById('boot')?.remove();
  stage.invalidate();
  await splash.done();
  // ilk dokunuşta ses motorunu aç (iOS)
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  (window as unknown as {__kh: unknown}).__kh = {stage, table, hand, cards, q, screens};
  await runApp({stage, table, hand, sparks, ring, sfx, voice, screens, opponents: opponents(), settings, applySettings, auto: AUTO});
}

boot().catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Yüklenemedi: ' + (err as Error).message;
});
