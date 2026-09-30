// Filmin tek zaman çizelgesi (saniye, 30 kare/sn). Her sahnenin yerel 0 anı "start"tır; sahne, bir önceki sahnenin
// kapısının içinde o andan itibaren yaşamaya başlar. zoom: bu sahnenin kapısına dalış penceresi (sonunda bir sonraki
// sahne ekranı kimlik dönüşümüyle devralır). Tarih sayacı ve alt yazılar da buradan beslenir.
import type { Era } from '../components/Odometer';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export type Beat = {
  readonly id: 'papirus' | 'parsomen' | 'matbaa' | 'bulmaca' | 'harfler' | 'gece';
  readonly start: number;
  readonly zoom?: readonly [number, number];
  readonly era: Era;
  readonly caption: { readonly text: string; readonly at: readonly [number, number] };
};

export const BEATS: readonly Beat[] = [
  { id: 'papirus', start: 0, zoom: [2.5, 3.5], era: { year: 3000, bc: true, label: 'MISIR' }, caption: { text: 'Önce sazdan bir sayfa…', at: [1.35, 2.95] } },
  { id: 'parsomen', start: 2.5, zoom: [5.6, 6.6], era: { year: 190, bc: true, label: 'BERGAMA' }, caption: { text: '…sonra deriden.', at: [3.75, 6.0] } },
  { id: 'matbaa', start: 5.6, zoom: [9.2, 10.2], era: { year: 1450, bc: false, label: 'MAINZ' }, caption: { text: 'Harfler kurşuna döküldü.', at: [6.85, 9.6] } },
  { id: 'bulmaca', start: 9.2, zoom: [12.4, 13.4], era: { year: 1913, bc: false, label: 'NEW YORK' }, caption: { text: 'Kelimeler kesişti.', at: [10.45, 12.8] } },
  { id: 'harfler', start: 12.4, zoom: [15.8, 16.8], era: { year: 1928, bc: false, label: 'ANKARA' }, caption: { text: 'Ve yirmi dokuz harfimiz.', at: [13.65, 16.2] } },
  { id: 'gece', start: 15.8, era: { year: 2026, bc: false, label: 'BU GECE' }, caption: { text: 'Bu gece sayfa senin.', at: [17.1, 19.6] } },
];

// Son sahnede: logonun oturduğu an, dikişsiz döngü ve oyuna geçiş (çıkış)
export const LOOP = { start: 19.8, dur: 6 } as const;
export const OUTRO = { start: LOOP.start + LOOP.dur, dur: 1.2 } as const;
export const TOTAL = OUTRO.start + OUTRO.dur;

export const sec = (s: number) => Math.round(s * FPS);
