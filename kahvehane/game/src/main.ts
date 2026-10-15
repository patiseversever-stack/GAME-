// Giriş noktası: profil, 2B Pişti Arena masası (kuşanılmış deste + masa teması), sesler, ekranlar ve uygulama akışı.
// Test bayrakları: ?auto=1 (kendiliğinden oynar; &mode=4|esli), ?seed=123 (sabit deste), ?reset=1 (profili sil → ilk açılış hikâyesi),
// ?skipintro=1 (hikâyeyi atla, varsayılan karakterle başla), ?q=low|mid|high (kalite).
import {buildSkinAtlas} from './render/skinAtlas';
import {deckById} from './skins/index';
import {tableById} from './themes/tables';
import {Table2D} from './table2d/table';
import {Sfx} from './audio/sfx';
import {VoicePlayer} from './audio/voice';
import {Screens, type Settings} from './ui/screens';
import {ASSETS} from './ui/assets';
import {runApp} from './game/app';
import {Profile} from './game/profile';
import type {Mode} from './game/types';
import {detectTier, type Tier} from './quality';
import {setHaptics, store} from './platform/bridge';

const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto');
const MODE = (['1v1', '4', 'esli'] as Mode[]).find(m => m === Q.get('mode'));
const SEED = Q.get('seed') ? Number(Q.get('seed')) | 0 : undefined;

/** ?reset=1: profili (ve eski kayıtları) sil; adres çubuğundan bayrağı kaldır ki yenileyince tekrar silinmesin. */
if (Q.has('reset')) {
  for (const k of ['profile3', 'profile', 'daily', 'notify.online']) {
    try {
      localStorage.removeItem('kh.' + k);
    } catch {
      /* gizli mod */
    }
  }
  Q.delete('reset');
  history.replaceState(null, '', location.pathname + (Q.toString() ? '?' + Q : '') + location.hash);
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
  const tier: Tier = settings.quality === 'auto' || Q.has('q') ? detectTier() : settings.quality;
  // düşük seviyede meta ekranların süs döngüleri (dönen hüzmeler, nefes) durur
  if (tier === 'low') document.documentElement.classList.add('kh-low');
  const profile = new Profile();
  if (!profile.data.onboarded && (Q.has('skipintro') || AUTO)) profile.completeOnboarding('riza', profile.data.name);
  const sfx = new Sfx();
  const voice = new VoicePlayer(() => sfx.context);
  const screens = new Screens(document.body, {
    tap: () => sfx.uiTap(),
    whoosh: () => sfx.cardThrow(0.4),
    coin: n => sfx.coin(n),
    reward: () => sfx.win(),
    flip: () => sfx.cardFlip(),
    deal: () => sfx.deal(),
    shuffle: () => sfx.shuffle(),
    slam: () => sfx.cardLand(1),
    fanfare: () => sfx.pisti(false),
    lose: () => sfx.lose(),
  });
  const splash = screens.splash();
  splash.progress(0.15);

  const width = atlasWidth(tier);
  const atlas = await buildSkinAtlas(await deckById(profile.data.equipped.deck).load(), width);
  splash.progress(0.6);
  const table = new Table2D(document.getElementById('app')!, atlas, {
    deal: () => sfx.deal(),
    land: i => sfx.cardLand(i),
    flip: () => sfx.cardFlip(),
    slide: () => sfx.cardSlide(0.6),
    whoosh: p => sfx.cardThrow(p),
  }, tier === 'low');
  table.setTheme(tableById(profile.data.equipped.table));
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
  // markette/koleksiyonda kuşanınca: deste → atlas yeniden kurulur; masa → tema (son istek kazanır)
  let deckTok = 0;
  const applyCosmetics = async (kind: string, id: string) => {
    if (kind === 'table') table.setTheme(tableById(id));
    else if (kind === 'deck') {
      const tok = ++deckTok;
      const a = await buildSkinAtlas(await deckById(id).load(), width);
      if (tok === deckTok) table.setAtlas(a);
    }
  };
  splash.progress(1);
  document.getElementById('boot')?.remove();
  await splash.done();
  // ilk dokunuşta ses motorunu aç (iOS)
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  (window as unknown as {__kh: unknown}).__kh = {table, screens, tier, profile};
  await runApp({table, sfx, voice, screens, profile, settings, applySettings, applyCosmetics, auto: AUTO, autoMode: MODE, seed: SEED});
}

boot().catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Yüklenemedi: ' + (err as Error).message;
});
