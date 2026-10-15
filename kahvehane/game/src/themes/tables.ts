// Masa temaları kaydı. Mavi Arena varsayılandır (table.css'teki değerler); diğerleri CSS değişkeni ve/veya boyalı zemin verir.
// Boyamalar tembel yüklenir (yalnız kuşanılan masanın kodu iner) ve bir kez çizilir; Table2D sonucu boyuta göre önbelleğe alır.
//
// Not — `paint` dönüşü: boyalı (yumuşak) içerik w·dpr'den DÜŞÜK çözünürlükte dönebilir (ör. 1.5×); tuval CSS'te
// `width:100%;height:100%` ile gerilmelidir. Çini gibi keskin desenler tam dpr ile (en çok ~2.6 MP) çizilir.
//
// `swatch`: market küçük resmi — `background` kısaltmasıyla kullanılır (SVG minyatür, ortalanıp kırpılır).
//
// `--ar-pool` (ek, isteğe bağlı): yığın halkasının altındaki koyu havuz rengi (varsayılan rgba(10,16,70,.55)).
// Kızıl/Zümrüt gibi sıcak zeminlerde lacivert havuz morumsu durur; Table2D okursa havuz zeminle aynı tonda koyulaşır.
import type {TableTheme} from './contract';
import {SWATCH} from './swatches';

export const TABLES: readonly TableTheme[] = [
  {
    id: 'arena',
    name: 'Mavi Arena',
    desc: 'Işık hüzmeleri altında klasik arena.',
    vars: {},
    swatch: SWATCH.arena,
  },
  {
    id: 'gece',
    name: 'Yıldızlı Gece',
    desc: 'Girdaplı gökyüzünün altında oyna.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #0b1748 0%, #13276a 40%, #0c1a4e 72%, #060c2c 100%)',
      '--ar-rays': 'rgba(255, 232, 160, .06)',
      '--ar-rays-op': '.38',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 50%, rgba(3, 6, 28, .62) 100%)',
      '--ar-ring': 'rgba(250, 212, 104, .6)',
      '--ar-glow-n': 'rgba(80, 130, 245, .42)',
      '--ar-pool': 'rgba(4, 8, 36, .5)',
    },
    paint: (w, h, dpr) => import('./gece').then(m => m.paintGece(w, h, dpr)),
    swatch: SWATCH.gece,
  },
  {
    id: 'cini',
    name: 'Çini Salon',
    desc: 'Lacivert ve turkuaz çinilerle döşeli salon.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #14307a 0%, #0d215c 45%, #08163e 80%, #050c28 100%)',
      '--ar-rays': 'rgba(170, 236, 255, .055)',
      '--ar-rays-op': '.32',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 52%, rgba(2, 6, 26, .6) 100%)',
      '--ar-ring': 'rgba(95, 208, 196, .62)',
      '--ar-glow-n': 'rgba(70, 200, 210, .34)',
      '--ar-pool': 'rgba(4, 10, 40, .42)',
    },
    paint: (w, h, dpr) => import('./cini').then(m => m.paintCini(w, h, dpr)),
    swatch: SWATCH.cini,
  },
  {
    id: 'kizil',
    name: 'Kızıl Salon',
    desc: 'Kadife kırmızısı, altın ışıltı.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #8e1226 0%, #5e0716 45%, #34030c 78%, #1c0106 100%)',
      '--ar-rays': 'rgba(255, 214, 140, .07)',
      '--ar-rays-op': '.42',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 52%, rgba(16, 0, 4, .62) 100%)',
      '--ar-ring': 'rgba(255, 206, 120, .62)',
      '--ar-glow-n': 'rgba(255, 160, 110, .3)',
      '--ar-pool': 'rgba(40, 2, 12, .38)',
    },
    paint: (w, h, dpr) => import('./kadife').then(m => m.paintKizil(w, h, dpr)),
    swatch: SWATCH.kizil,
  },
  {
    id: 'zumrut',
    name: 'Zümrüt Kadife',
    desc: 'Derin yeşil kadife, nostaljik sıcaklık.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #1b7a4e 0%, #0e5134 45%, #072d1d 78%, #031a10 100%)',
      '--ar-rays': 'rgba(255, 220, 150, .06)',
      '--ar-rays-op': '.38',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 52%, rgba(0, 12, 6, .62) 100%)',
      '--ar-ring': 'rgba(240, 206, 130, .6)',
      '--ar-glow-n': 'rgba(255, 226, 150, .26)',
      '--ar-pool': 'rgba(0, 32, 18, .38)',
    },
    paint: (w, h, dpr) => import('./kadife').then(m => m.paintZumrut(w, h, dpr)),
    swatch: SWATCH.zumrut,
  },
];

export function tableById(id: string): TableTheme {
  return TABLES.find(t => t.id === id) ?? TABLES[0];
}
