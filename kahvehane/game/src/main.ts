// Giriş noktası: sahneyi, masayı, kartları, arayüzü ve oyun akışını kurar.
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-ext-900.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/playfair-display/latin-ext-900.css';

import avatar from '../assets/riza_avatar.jpg';
import mKahkaha from '../assets/riza_kahkaha.jpg';
import mKizgin from '../assets/riza_kizgin.jpg';
import mSaskin from '../assets/riza_saskin.jpg';
import mUzgun from '../assets/riza_uzgun.jpg';

import {Stage} from './render/stage';
import {buildEnvironment} from './render/env';
import {buildCardAtlas} from './render/cardAtlas';
import {CardSystem} from './render/cards';
import {CAMERA, makeLayout} from './game/layout';
import {HandInput} from './input/hand';
import {TableView} from './game/table';
import {Match} from './game/match';
import {Hud, type Settings} from './ui/hud';
import {Sparks} from './fx/particles';
import {Sfx} from './audio/sfx';
import {rizaAmca} from './ai/characters';
import {detectTier, qualityFor, type Tier} from './quality';
import {haptic, setHaptics, store} from './platform/bridge';

const IMG: Record<string, string> = {riza_avatar: avatar, riza_kahkaha: mKahkaha, riza_kizgin: mKizgin, riza_saskin: mSaskin, riza_uzgun: mUzgun};

async function boot(): Promise<void> {
  const settings = store.get<Settings>('settings', {sound: true, haptics: true, quality: 'auto'});
  const tier: Tier = settings.quality === 'auto' || new URLSearchParams(location.search).has('q') ? detectTier() : settings.quality;
  const q = qualityFor(tier);
  const app = document.getElementById('app')!;
  const stage = new Stage(app, q, CAMERA);
  await buildEnvironment(stage);
  const atlas = await buildCardAtlas(q.atlasWidth);
  const cards = new CardSystem(stage, atlas);
  const layout = makeLayout(2);
  const hand = new HandInput(stage, cards, () => layout.pile);
  const sfx = new Sfx();
  sfx.setMuted(!settings.sound);
  setHaptics(settings.haptics);
  const char = rizaAmca(n => IMG[n]);
  const hud = new Hud(char);
  const sparks = new Sparks(stage, q.particles);
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

  const match = new Match(stage, table, hand, hud, sparks, sfx, char);
  hud.onMenu = () => {
    sfx.uiTap();
    hud.showSettings(
      {...settings},
      s => {
        const qChanged = s.quality !== settings.quality;
        Object.assign(settings, s);
        store.set('settings', settings);
        sfx.setMuted(!s.sound);
        setHaptics(s.haptics);
        if (qChanged) location.reload();
      },
      () => match.newGame(),
    );
  };
  table.reset(2);
  document.getElementById('boot')?.remove();
  stage.invalidate();
  (window as unknown as {__kh: unknown}).__kh = {stage, table, hand, match, cards, q};
  await match.loop();
}

boot().catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Yüklenemedi: ' + (err as Error).message;
});
