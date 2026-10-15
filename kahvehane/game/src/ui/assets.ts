// Görsel adresleri tek yerde. assets/art/* dosyaları import.meta.glob ile aranır: dosya yoksa derleme bozulmaz,
// yerine SVG/CSS yedeği kullanılır. Yeni sanat aynı adla klasöre bırakılınca (png/webp/jpg) kendiliğinden devreye girer.
// Karakter portreleri ve hâlleri roster.ts'te (assets/chars/*); eski tekil Rıza fotoğrafları ve avatarları artık pakete girmez.
// Arena görünümünde logo kodla çizilir (parts.ts → wordmarkHtml), zemin CSS'tir (logo.* globdan dışlanır).

const ART = import.meta.glob(['../../assets/art/icon_*', '../../assets/art/*_text.*', '../../assets/art/badge_frame.*', '../../assets/art/steam.*'], {eager: true, query: '?url', import: 'default'}) as Record<string, string>;
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
  silhouette: ui('silhouette.svg'),
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
