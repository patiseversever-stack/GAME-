// Kart tarzı (deste kaplaması) sözleşmesi. Her tarz bu arayüzü dışa aktarır.
// Çizim alanı: genişlik w, yükseklik h = w / 0.7. Köşe yarıçapı ~0.08·w; kartın dışı SAYDAM kalır, gölge çizilmez.
export type Suit = 'S' | 'H' | 'D' | 'C'; // maça, kupa, karo, sinek
export interface Skin {
  id: string;
  name: string; // Türkçe görünen ad
  desc: string; // tek cümle
  /** Yazı tipleri / görseller yüklenir. */
  prepare(): Promise<void>;
  /** rank: 1 = As, 2..10, 11 = Vale (J), 12 = Kız (Q), 13 = Papaz (K) */
  drawFace(g: CanvasRenderingContext2D, w: number, h: number, suit: Suit, rank: number): void;
  drawBack(g: CanvasRenderingContext2D, w: number, h: number): void;
}
