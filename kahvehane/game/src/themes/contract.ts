// Masa teması sözleşmesi. Table2D temayı uygular: `vars` kök öğeye CSS değişkeni olarak yazılır,
// `paint` varsa bir kez (ve ekran boyutu değişince) çizilen arka plan tuvali en alta yerleşir.
//
// Table2D'nin okuduğu CSS değişkenleri (hepsi isteğe bağlı; yoksa Mavi Arena varsayılanı):
//   --ar-bg        ana zemin (CSS background değeri; degrade olabilir)
//   --ar-rays      ışık hüzmesi rengi (rgba), --ar-rays-op hüzme opaklığı (0..1)
//   --ar-pattern-op takım deseni opaklığı (0..1)
//   --ar-vig       kenar karartması (CSS background değeri)
//   --ar-ring      yığın halkası kenar rengi (boşken)
//   --ar-glow-n    yığın boşken merkez parıltı rengi (rgba)
export interface TableTheme {
  id: string;
  /** Türkçe ad */
  name: string;
  /** Tek cümle */
  desc: string;
  vars: Record<string, string>;
  /** İsteğe bağlı boyalı zemin: w×h CSS pikseli, dpr ile çarpılmış tuval döner. Sonuç önbelleğe alınabilir. */
  paint?: (w: number, h: number, dpr: number) => HTMLCanvasElement | Promise<HTMLCanvasElement>;
  /** Market küçük önizlemesi için (yoksa paint/vars ile üretilir) */
  swatch?: string;
}
