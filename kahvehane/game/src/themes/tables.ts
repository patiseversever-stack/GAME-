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
import {SWATCH_B} from './swatches2';

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
  {
    id: 'ebru',
    name: 'Ebru Salonu',
    desc: 'Yığının çevresinde dönen bülbül yuvası ebrusu.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #1a2870 0%, #0e1850 45%, #080f36 80%, #050a26 100%)',
      '--ar-rays': 'rgba(255, 226, 160, .05)',
      '--ar-rays-op': '.3',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(3, 5, 24, .55) 100%)',
      '--ar-ring': 'rgba(236, 196, 108, .62)',
      '--ar-glow-n': 'rgba(220, 70, 90, .3)',
      '--ar-pool': 'rgba(6, 8, 30, .45)',
    },
    paint: (w, h, dpr) => import('./ebru').then(m => m.paintEbru(w, h, dpr)),
    swatch: SWATCH_B.ebru,
  },
  {
    id: 'kapadokya',
    name: 'Kapadokya Şafağı',
    desc: 'Şafakta peri bacalarının üstünde süzülen balonlar.',
    vars: {
      '--ar-bg': 'linear-gradient(180deg, #3d2a7a 0%, #8a3f9a 35%, #e0577f 62%, #ff9a5a 80%, #5a2a44 100%)',
      '--ar-rays': 'rgba(255, 230, 200, .06)',
      '--ar-rays-op': '.35',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 58%, rgba(30, 8, 40, .45) 100%)',
      '--ar-ring': 'rgba(255, 220, 170, .7)',
      '--ar-glow-n': 'rgba(255, 170, 200, .32)',
      '--ar-pool': 'rgba(40, 14, 64, .4)',
    },
    paint: (w, h, dpr) => import('./kapadokya').then(m => m.paintKapadokya(w, h, dpr)),
    swatch: SWATCH_B.kapadokya,
  },
  {
    id: 'bogaz',
    name: 'Boğaz Gecesi',
    desc: 'Ay ışığında Boğaz: Galata, ışıklı köprü, yakamoz.',
    vars: {
      '--ar-bg': 'linear-gradient(180deg, #03061a 0%, #2c2c86 28%, #141a5c 32%, #02041a 100%)',
      '--ar-rays': 'rgba(200, 220, 255, .05)',
      '--ar-rays-op': '.3',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 58%, rgba(1, 2, 14, .5) 100%)',
      '--ar-ring': 'rgba(255, 226, 150, .62)',
      '--ar-glow-n': 'rgba(120, 150, 255, .3)',
      '--ar-pool': 'rgba(2, 4, 24, .42)',
    },
    paint: (w, h, dpr) => import('./bogaz').then(m => m.paintBogaz(w, h, dpr)),
    swatch: SWATCH_B.bogaz,
  },
  {
    id: 'neon',
    name: 'Neon Kahvehane',
    desc: 'Tuğla duvar, pembe tabela, buharı tüten neon çay.',
    vars: {
      '--ar-bg': 'radial-gradient(120% 75% at 50% 46%, #2a1238 0%, #170a22 50%, #07040d 100%)',
      '--ar-rays': 'rgba(255, 120, 220, .05)',
      '--ar-rays-op': '.25',
      '--ar-pattern-op': '0',
      '--ar-vig': 'radial-gradient(120% 90% at 50% 50%, rgba(0, 0, 0, 0) 58%, rgba(0, 0, 0, .55) 100%)',
      '--ar-ring': 'rgba(255, 70, 200, .75)',
      '--ar-glow-n': 'rgba(255, 60, 190, .3)',
      '--ar-pool': 'rgba(10, 2, 20, .45)',
    },
    paint: (w, h, dpr) => import('./neon').then(m => m.paintNeon(w, h, dpr)),
    swatch: SWATCH_B.neon,
  },
];

export function tableById(id: string): TableTheme {
  return TABLES.find(t => t.id === id) ?? TABLES[0];
}
