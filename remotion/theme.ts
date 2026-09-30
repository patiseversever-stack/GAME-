// "Harflerin Gece Yolculuğu" — film teması.
// Gece mürekkebi, gaz lambası amberi, eski kâğıt tonları, matbaa kırmızısı ve pirinç. Tüm zamanlama saniye cinsinden.
import { Easing } from 'remotion';

export const C = {
  night: '#07080b',
  night2: '#0d1016',
  ink: '#16120d', // is mürekkebi (sıcak siyah)
  paper: '#ecdfc2',
  paperDim: '#c9b48a',
  sepia: '#8a6a43',
  amber: '#f0b45a', // gaz lambası
  amberHot: '#ffd796',
  gold: '#d4a54a', // varak
  goldDeep: '#8f6424',
  press: '#a8321f', // matbaa kırmızısı / Mısır kırmızı aşısı
  lapis: '#2e4a86', // tezhip mavisi
  moon: '#dfe6f2',
  brass: '#b38b4d',
  lead: '#8d9199',
} as const;

export const FONT = {
  didone: "'Playfair Display', Georgia, serif", // 19. yy gazete manşeti
  garamond: "'EB Garamond', Garamond, Georgia, serif", // klasik kitap
  roman: "Cinzel, 'Trajan Pro', serif", // Roma / Bergama yazıtı
  gothic: "'UnifrakturMaguntia', 'Old English Text MT', serif", // Gutenberg
  type: "'Courier Prime', 'Courier New', monospace", // daktilo notu
} as const;

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.6, 0, 0.9, 0.45),
  zoom: Easing.bezier(0.55, 0, 0.25, 1), // sonsuz zoom: yavaş başlar, hızlanır, yumuşak oturur
  soft: Easing.bezier(0.45, 0.05, 0.15, 1),
  slam: Easing.bezier(0.8, 0, 1, 0.6), // pres inişi
  dive: Easing.bezier(0.72, 0, 0.2, 1), // kapıya dalış: uzun sürünme, sert hızlanma, yumuşak iniş
} as const;

export const SPRING = {
  clack: { damping: 13, stiffness: 260, mass: 0.6 }, // dizgi harfi yerine oturur
  pop: { damping: 10, stiffness: 180, mass: 0.6 },
  soft: { damping: 200 },
  heavy: { damping: 18, stiffness: 90, mass: 1.2 },
} as const;

export const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const TR_ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
