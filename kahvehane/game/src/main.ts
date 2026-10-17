// Giriş noktası: profil, 2B Pişti Arena masası (kuşanılmış deste + masa teması), sesler, ekranlar ve uygulama akışı.
// Test bayrakları: ?auto=1 (kendiliğinden oynar; &mode=4|esli · Blöf için &game=blof&mode=1v1|3|4|esli&diff=kolay|orta|zor&hand=group|spread ·
// oyun uzunluğu &len=tek|51|101|151 (Pişti) · tek|3|5 (Blöf); yarım kalan maç varsa kendiliğinden devam eder),
// ?seed=123 (sabit deste), ?reset=1 (profili sil → ilk açılış hikâyesi), ?skipintro=1 (hikâyeyi atla, varsayılan karakterle başla),
// ?q=low|mid|high (kalite), ?blof=0 (Blöf'ü gizle), ?blofstub=1 (yalnız geliştirme: Blöf motoru yerine sahte el; arayüz akışını denemek için),
// ?banter=1 (test: botlar arası atışma her uygun anda — olasılık 1, el aralığı 0; ekran görüntüsü / ses denemesi için).
import {buildSkinAtlas} from './render/skinAtlas';
import {deckById} from './skins/index';
import {tableById} from './themes/tables';
import {Table2D} from './table2d/table';
import {Sfx} from './audio/sfx';
import {VoicePlayer} from './audio/voice';
import {speechFor} from './audio/speech';
import {menuTalk} from './game/talk';
import {QuickChat} from './game/quickChat';
import {Screens, type Settings} from './ui/screens';
import {ASSETS} from './ui/assets';
import {runApp} from './game/app';
import {Profile} from './game/profile';
import type {Difficulty, Game, HandLayout, MatchLength, Mode} from './game/types';
import {BLOF} from './game/blofAdapter';
import {detectTier, type Tier} from './quality';
import {setHaptics, store} from './platform/bridge';
import {initCalm} from './platform/calm';
import {whenIdle} from './platform/sched';
import {BANTER_RULES} from './ai/dialogue';
import {trackAnimations} from './platform/anim';

const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto');
const GAME: Game | undefined = Q.get('game') === 'blof' ? 'blof' : Q.get('game') === 'pisti' ? 'pisti' : undefined;
const MODE = (['1v1', '3', '4', 'esli'] as Mode[]).find(m => m === Q.get('mode'));
const DIFF = (['kolay', 'orta', 'zor'] as Difficulty[]).find(d => d === Q.get('diff'));
const HAND = (['group', 'spread'] as HandLayout[]).find(l => l === Q.get('hand'));
const SEED = Q.get('seed') ? Number(Q.get('seed')) | 0 : undefined;
const LEN = (['tek', '51', '101', '151', '3', '5'] as MatchLength[]).find(l => l === Q.get('len'));
if (Q.has('banter')) Object.assign(BANTER_RULES as {chance: number; minHands: number}, {chance: 1, minHands: 0});

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
  trackAnimations(); // havuz öğelerini hesap zorlamadan temizlemek için animasyonları kaydet
  const settings = store.get<Settings>('settings2', {sfx: true, voice: true, music: true, haptics: true, quality: 'auto'});
  const tier: Tier = settings.quality === 'auto' || Q.has('q') ? detectTier() : settings.quality;
  // düşük seviyede meta ekranların süs döngüleri (dönen hüzmeler, nefes) durur
  if (tier === 'low') document.documentElement.classList.add('kh-low');
  const profile = new Profile();
  if (!profile.data.onboarded && (Q.has('skipintro') || AUTO)) profile.completeOnboarding('riza', profile.data.name);
  initCalm({always: tier === 'low'}); // dekoratif sonsuz animasyonlar boşta/düşük cihazda kapanır
  const sfx = new Sfx();
  const voice = new VoicePlayer(() => sfx.context);
  // TEK konuşma yöneticisi: oyun replikleri, atışma, hızlı sohbet, galeri, market hepsi buradan; konuşurken efektler kısılır
  const speech = speechFor(voice, {duck: a => sfx.duck(a)});
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
  screens.talk = menuTalk(speech, voice);
  const chat = new QuickChat(screens.hud, () => screens.quickChat(), speech, voice, tier === 'low' ? 0 : 14, {
    get: () => store.get<boolean>('chat.muteOpp', false),
    set: on => store.set('chat.muteOpp', on),
  });
  const splash = screens.splash();
  splash.progress(0.15);

  const width = atlasWidth(tier);
  splash.progress(0.5);
  // masa hafif kurulur (boş kartlar); deste atlası ilk ekran göründükten sonra arka planda, parça parça çizilir
  const table = new Table2D(document.getElementById('app')!, null, {
    deal: () => sfx.deal(),
    land: i => sfx.cardLand(i),
    flip: () => sfx.cardFlip(),
    slide: () => sfx.cardSlide(0.6),
    whoosh: p => sfx.cardThrow(p),
  }, tier === 'low');
  table.setActive(false); // açılış/ana ekran/market sırasında masa çizilmez; maç başlayınca app.ts açar
  table.setTheme(tableById(profile.data.equipped.table));
  table.onDeck = (n, x, y) => screens.hud.setDeck(n, x, y);
  table.reset();
  splash.progress(0.8);
  const applySettings = (s: Settings) => {
    const qChanged = s.quality !== settings.quality;
    Object.assign(settings, s);
    store.set('settings2', settings);
    sfx.setMuted(!s.sfx);
    speech.setEnabled(s.voice); // kapalı: hiç ses yok, balonlar yine görünür
    setHaptics(s.haptics);
    if (qChanged) location.reload();
  };
  applySettings({...settings});
  // markette/koleksiyonda kuşanınca: deste → atlas yeniden kurulur; masa → tema (son istek kazanır)
  let deckTok = 0;
  const buildDeck = async (id: string): Promise<void> => {
    const tok = ++deckTok;
    const a = await buildSkinAtlas(await deckById(id).load(), width);
    if (tok === deckTok) await table.setAtlas(a);
  };
  const applyCosmetics = async (kind: string, id: string) => {
    if (kind === 'table') table.setTheme(tableById(id));
    else if (kind === 'deck') {
      table.ready = buildDeck(id);
      await table.ready;
    }
  };
  splash.progress(1);
  document.getElementById('boot')?.remove();
  // gerçek hazırlık yükleme ekranı görünürken yapılır: deste atlası (parça parça) + ses motoru (ilk dokunuşta takılma olmasın).
  // Maç başlarken app.ts table.ready'yi bekler; ana ekran geldiğinde hepsi hazırdır.
  table.ready = whenIdle(300).then(() => buildDeck(profile.data.equipped.deck)).then(() => void performance.mark('kh:deck'));
  // seslendirme: açılışta yalnız küçük manifest, boşta (yoksa / yüklenemezse yalnız balon); sesler ilk söylenişte iner
  void whenIdle(1500).then(() => voice.load(ASSETS.voiceManifest ?? '')).catch(() => undefined);
  const warm = table.ready.then(() => whenIdle(600)).then(() => sfx.prewarm()).then(() => void performance.mark('kh:audio'));
  await splash.done(warm);
  // ilk dokunuşta ses motorunu aç (iOS)
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  (window as unknown as {__kh: unknown}).__kh = {table, screens, tier, profile, speech, voice};
  if (import.meta.env.DEV && Q.has('blofstub')) BLOF.inject((await import('../dev/blofStub')).stubFactory);
  await runApp({table, sfx, voice, speech, chat, screens, profile, settings, applySettings, applyCosmetics, auto: AUTO, autoGame: GAME, autoMode: MODE, autoDifficulty: DIFF, autoHand: HAND, autoLen: LEN, seed: SEED});
}

boot().catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Yüklenemedi: ' + (err as Error).message;
});
