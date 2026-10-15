// Görsel adresleri tek yerde. assets/art/* dosyaları import.meta.glob ile aranır: dosya yoksa derleme bozulmaz,
// yerine SVG/CSS yedeği kullanılır. Yeni sanat aynı adla klasöre bırakılınca (png/webp/jpg) kendiliğinden devreye girer.
// Arena görünümünde logo kodla çizilir (parts.ts → wordmarkHtml), zemin CSS'tir: eski altın logo ve kahvehane
// fotoğrafı pakete girmez (logo.* globdan dışlanır, kahvehane_bg hiç içe aktarılmaz).
import rizaAvatar from '../../assets/riza_avatar.jpg';
import rizaKahkaha from '../../assets/riza_kahkaha.jpg';
import rizaKizgin from '../../assets/riza_kizgin.jpg';
import rizaSaskin from '../../assets/riza_saskin.jpg';
import rizaUzgun from '../../assets/riza_uzgun.jpg';
import type {Opponent} from './types';

const ART = import.meta.glob(['../../assets/art/*', '!../../assets/art/logo.*'], {eager: true, query: '?url', import: 'default'}) as Record<string, string>;
const UI = import.meta.glob('../../assets/ui/*', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;
const VOICE = import.meta.glob('../../assets/voice/manifest.json', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

const EXT = ['png', 'webp', 'jpg', 'jpeg', 'avif', 'svg'];

/** assets/art/<ad>.<uzantı> varsa adresi, yoksa undefined. */
export function art(name: string): string | undefined {
  const base = name.replace(/\.[a-z0-9]+$/i, '');
  for (const e of EXT) {
    const u = ART[`../../assets/art/${base}.${e}`];
    if (u) return u;
  }
  return undefined;
}

const ui = (n: string): string => UI[`../../assets/ui/${n}`] ?? '';

/** Saydam (kesilmiş) görsel mi? (PNG/WebP büst → rozet/kartta taşan yerleşim) */
export const isCutout = (url: string): boolean => /\.(png|webp)(\?|#|$)|^data:image\/(png|webp)/i.test(url);

const coinFallback = ui('coin.svg');

/** Oyunun kullandığı tüm görseller (her zaman dolu adres). */
export const ASSETS = {
  icon_coin: art('icon_coin') ?? coinFallback,
  icon_chest: art('icon_chest') ?? ui('placeholder.svg'),
  icon_trophy: art('icon_trophy') ?? ui('placeholder.svg'),
  icon_star: art('icon_star') ?? ui('placeholder.svg'),
  icon_gift: art('icon_gift') ?? ui('placeholder.svg'),
  riza_portrait: art('riza_portrait') ?? rizaAvatar,
  riza_blink: art('riza_blink') ?? art('riza_portrait') ?? rizaAvatar,
  riza_kahkaha: rizaKahkaha,
  riza_kizgin: rizaKizgin,
  riza_saskin: rizaSaskin,
  riza_uzgun: rizaUzgun,
  riza_avatar: rizaAvatar,
  cem_avatar: art('cem_avatar') ?? ui('silhouette.svg'),
  dursun_avatar: art('dursun_avatar') ?? ui('silhouette.svg'),
  defne_avatar: art('defne_avatar') ?? ui('silhouette.svg'),
  silhouette: ui('silhouette.svg'),
  tulip: ui('tulip.svg'),
  voiceManifest: VOICE['../../assets/voice/manifest.json'] as string | undefined,
};

/** Henüz gelmemiş olabilecek sanat: yoksa CSS ile çizilir. */
export const OPTIONAL_ART = {
  badge_frame: art('badge_frame'),
  pisti_text: art('pisti_text'),
  vale_pisti_text: art('vale_pisti_text'),
  kazandin_text: art('kazandin_text'),
  kaybettin_text: art('kaybettin_text'),
  steam: art('steam'),
};

/** Galeri ve hızlı deneme için örnek rakipler (oyun kendi listesini verir). */
export function demoOpponents(): Opponent[] {
  const a = ASSETS;
  const moods = {kahkaha: a.riza_kahkaha, kizgin: a.riza_kizgin, saskin: a.riza_saskin, uzgun: a.riza_uzgun};
  return [
    {id: 'riza', name: 'Rıza Amca', title: 'Kırk yıllık usta', portrait: a.riza_portrait, blink: a.riza_blink, moods, difficulty: 2},
    {id: 'cem', name: 'Cem', title: 'Algoritması var', portrait: a.cem_avatar, moods, difficulty: 1, locked: true},
    {id: 'dursun', name: 'Kahveci Dursun', title: 'Çaylar ondan', portrait: a.dursun_avatar, moods, difficulty: 1, locked: true},
    {id: 'defne', name: 'Defne', title: 'Poker yüzü', portrait: a.defne_avatar, moods, difficulty: 3, locked: true},
  ];
}
