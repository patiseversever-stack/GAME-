// Giriş noktası: 2B Pişti Arena masası, kart atlası, sesler, ekranlar ve uygulama akışı.
import {buildCardAtlas} from './render/cardAtlas';
import {Table2D} from './table2d/table';
import {Sfx} from './audio/sfx';
import {VoicePlayer} from './audio/voice';
import {Screens, type Settings} from './ui/screens';
import {ASSETS} from './ui/assets';
import {runApp, type OpponentDef} from './game/app';
import {detectTier, type Tier} from './quality';
import {setHaptics, store} from './platform/bridge';

const AUTO = new URLSearchParams(location.search).has('auto');

function opponents(): OpponentDef[] {
  const a = ASSETS;
  const moods = {kahkaha: a.riza_kahkaha, kizgin: a.riza_kizgin, saskin: a.riza_saskin, uzgun: a.riza_uzgun};
  return [
    {id: 'riza', name: 'Rıza Amca', title: 'Kırk yıllık usta', portrait: a.riza_portrait, blink: a.riza_blink, moods, difficulty: 2,
      personality: {memory: 0.88, skill: 0.85, jackPatience: 0.75}, think: [0.45, 0.95]},
    {id: 'cem', name: 'Cem', title: 'Algoritması var', portrait: a.cem_avatar, moods, difficulty: 1, locked: true,
      personality: {memory: 0.7, skill: 0.7, jackPatience: 0.5}, think: [0.35, 0.7]},
    {id: 'dursun', name: 'Kahveci Dursun', title: 'Çaylar ondan', portrait: a.dursun_avatar, moods, difficulty: 1, locked: true,
      personality: {memory: 0.6, skill: 0.6, jackPatience: 0.5}, think: [0.4, 0.8]},
    {id: 'defne', name: 'Defne', title: 'Poker yüzü', portrait: a.defne_avatar, moods, difficulty: 3, locked: true,
      personality: {memory: 0.97, skill: 0.95, jackPatience: 0.85}, think: [0.5, 1.0]},
  ];
}

/** Atlas genişliği: eldeki kart ekranda kaç fiziksel piksel kaplıyorsa ona yetecek kadar (bellek sınırlı). */
function atlasWidth(tier: Tier): number {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const handCss = Math.min(innerWidth * 0.245, innerHeight * 0.138);
  const need = Math.ceil((handCss * dpr * 8) / 256) * 256;
  return Math.max(1024, Math.min(tier === 'low' ? 1536 : tier === 'mid' ? 2048 : 2560, need));
}

async function boot(): Promise<void> {
  const settings = store.get<Settings>('settings2', {sfx: true, voice: true, music: true, haptics: true, quality: 'auto'});
  const forced = new URLSearchParams(location.search).has('q');
  const tier: Tier = settings.quality === 'auto' || forced ? detectTier() : settings.quality;
  const sfx = new Sfx();
  const voice = new VoicePlayer(() => sfx.context);
  const screens = new Screens(document.body, {tap: () => sfx.uiTap(), whoosh: () => sfx.cardThrow(0.4), coin: n => sfx.coin(n), reward: () => sfx.win()});
  const splash = screens.splash();
  splash.progress(0.15);

  const atlas = await buildCardAtlas(atlasWidth(tier));
  splash.progress(0.6);
  const table = new Table2D(document.getElementById('app')!, atlas, {
    deal: () => sfx.deal(),
    land: i => sfx.cardLand(i),
    flip: () => sfx.cardFlip(),
    slide: () => sfx.cardSlide(0.6),
    whoosh: p => sfx.cardThrow(p),
  }, tier === 'low');
  table.onDeck = (n, x, y) => screens.hud.setDeck(n, x, y);
  table.reset();
  splash.progress(0.8);
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
  await splash.done();
  // ilk dokunuşta ses motorunu aç (iOS)
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  (window as unknown as {__kh: unknown}).__kh = {table, screens, tier};
  await runApp({table, sfx, voice, screens, opponents: opponents(), settings, applySettings, auto: AUTO});
}

boot().catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Yüklenemedi: ' + (err as Error).message;
});
