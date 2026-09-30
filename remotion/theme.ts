// Gece Postası film teması: oyunun kendi paleti + sinematik vurgu.
// Tüm renkler, yazı aileleri, eğriler ve yay (spring) ayarları tek yerde.
import { Easing } from 'remotion';

export const C = {
  night: '#070d0c', // gece mürekkebi (en koyu)
  night2: '#0e1916',
  night3: '#172322', // oyunun arka plan/tema rengi
  paper: '#efe6d2', // gazete kâğıdı (krem)
  paper2: '#e3d6bb',
  cream: '#f6efdc',
  ink: '#182e25', // oyunun koyu yeşil mürekkebi
  ink2: '#26352f',
  sage: '#cfd9cc', // ipucu hücreleri
  sage2: '#b9c9b8',
  amber: '#f0c27a', // oyunun vurgu rengi (lamba ışığı)
  amber2: '#e2a955',
  bronze: '#9b7340',
  wood: '#3b271c',
} as const;

export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  text: "Gelasio, Georgia, serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // hızlı başlayıp uzun süzülen
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // kontrollü hızlanma / yavaşlama
  whip: Easing.bezier(0.7, 0, 0.2, 1), // kamera savurma
  in: Easing.bezier(0.55, 0, 0.9, 0.35),
  soft: Easing.bezier(0.45, 0.05, 0.15, 1),
} as const;

export const SPRING = {
  pop: { damping: 11, stiffness: 190, mass: 0.6 }, // harf basma (hafif sekme)
  land: { damping: 16, stiffness: 110, mass: 0.9 }, // sayfa inişi
  soft: { damping: 200 }, // sekmesiz itiş
} as const;

export const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Sahne süreleri (saniye). Filmler bu değerlerden kare hesaplar.
export const SURE = {
  murekkep: 1.3,
  dizgi: 1.9,
  kesisim: 1.5,
  sayfa: 1.6,
  bindirme: 0.3, // sahneler arası örtüşme
  dongu: 4,
  cikis: 1.6,
} as const;

export const TR_ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
export const TR_OZEL = new Set(['Ç', 'Ğ', 'İ', 'Ö', 'Ş', 'Ü', 'I']);
