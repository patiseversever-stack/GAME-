// Doku katmanları: büyük ve yumuşak görseller (ışık hâlesi, zemin ışığı, ışın çarkı, şok halkası) için küçük <canvas>.
//
// Neden: canlandırılan (transform/opacity) her DOM öğesi bileşimcide ayrı bir katmandır ve Chrome onu animasyonun EN BÜYÜK
// ölçeğinde, ekran çözünürlüğünde tarar (dpr 2,6 telefonda tam ekran bir gradyan ≈ 10 MB, 2,6× büyüyen bir hâle ≈ 17 MB
// GPU karo belleği). Pişti/alış anında bunlardan onlarcası birden doğunca karo bütçesi aşılıyor: eksik karolar koyu zemin
// renginde çiziliyor (ekran kararıyor), portreler ve kahraman parça parça/geç görünüyordu.
// <canvas> ise bileşimcide kendi piksel boyutunda bir DOKU katmanıdır (ör. 256² = 256 KB): ekranda ne kadar büyütülürse
// büyütülsün yeniden taranmaz, karo belleği tutmaz; yumuşak gradyanlar küçük dokudan büyütülünce gözle ayırt edilmez.

/** Belirtilen piksel boyutunda tuval (CSS boyutu çağıranın sınıfından/stilinden). */
export function texCanvas(cls: string, w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.className = cls;
  c.width = w;
  c.height = h;
  return c;
}

/** 2B bağlam (yoksa null: çok eski WebView — görsel boş kalır, oyun sürer). */
export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return c.getContext('2d');
  } catch {
    return null;
  }
}

/** '#rgb' / '#rrggbb' / 'rgb(a)(…)' → aynı rengin verilen saydamlıkta rgba() hâli (gradyanın sönen ucu için). */
export function withAlpha(color: string, a: number): string {
  const c = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (hex) {
    const hx = hex[1].length === 3 ? hex[1].replace(/./g, ch => ch + ch) : hex[1];
    const n = parseInt(hx, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    if (p.length === 3) return `rgba(${p.join(',')},${a})`;
  }
  return c;
}

/**
 * Tuvali merkezden dairesel gradyanla doldur. stops: [konum 0..1, renk]. add: üstüne ekle (silme).
 * far: yarıçap köşeye kadar (CSS `radial-gradient(circle, …)` = farthest-corner); yoksa kenara (closest-side).
 */
export function radial(c: HTMLCanvasElement, stops: ReadonlyArray<readonly [number, string]>, add = false, far = false): void {
  const g = ctx2d(c);
  if (!g) return;
  const w = c.width, h = c.height, r = far ? Math.hypot(w, h) / 2 : Math.min(w, h) / 2;
  if (!add) g.clearRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  for (const [o, col] of stops) gr.addColorStop(Math.max(0, Math.min(1, o)), col);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

/**
 * Çentik halkası (saat kadranı): her `period`° bir `deg`° genişliğinde çizgi, yalnız [rIn, rOut] halkasında. Yarıçaplar CSS
 * `radial-gradient(circle, …)` maskesindeki gibi köşeye göre (farthest-corner) oran.
 */
export function ticks(c: HTMLCanvasElement, color: string, deg: number, rIn: number, rOut: number, period = 15): void {
  const g = ctx2d(c);
  if (!g) return;
  const N = c.width, R = N / 2, F = (N / 2) * Math.SQRT2;
  g.clearRect(0, 0, N, N);
  g.fillStyle = color;
  g.beginPath();
  for (let a = 0; a < 360; a += period) {
    g.moveTo(R, R);
    g.arc(R, R, F, ((a - 90) * Math.PI) / 180, ((a + deg - 90) * Math.PI) / 180);
    g.closePath();
  }
  g.fill();
  g.globalCompositeOperation = 'destination-in';
  g.lineWidth = (rOut - rIn) * F;
  g.strokeStyle = '#000';
  g.beginPath();
  g.arc(R, R, ((rIn + rOut) / 2) * F, 0, Math.PI * 2);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
}

/** Parlayan halka (şok dalgası): `box` CSS kutusunun içinde `border` px kalınlığında çizgi + iki yanında `blur` px ışıma.
 * Tuvalin CSS boyutu box + 2·pad olmalı (ışıma kutunun dışına taşar). Tek dairesel gradyan (gölge bulanıklığı YOK: yazılım
 * tuvalinde shadowBlur ana iş parçacığında pahalı; gradyan hem ucuz hem aynı görünüm). */
export function glowRing(c: HTMLCanvasElement, color: string, box: number, pad: number, border: number, blur: number): void {
  const g = ctx2d(c);
  if (!g) return;
  const N = c.width, E = box + 2 * pad, R = N / 2;
  g.clearRect(0, 0, N, N);
  const o = (cssR: number): number => Math.max(0, Math.min(1, cssR / (E / 2)));
  const r0 = box / 2 - border, r1 = box / 2; // çizginin iç ve dış kenarı
  const gr = g.createRadialGradient(R, R, 0, R, R, R);
  const stops: Array<[number, number]> = [
    [r0 - blur * 0.8, 0], [r0 - blur * 0.45, 0.12], [r0 - blur * 0.18, 0.4], [r0, 0.95],
    [r1, 0.95], [r1 + blur * 0.2, 0.42], [r1 + blur * 0.5, 0.14], [r1 + blur, 0],
  ];
  let last = -1;
  for (const [r, a] of stops) {
    const t = o(r);
    if (t <= last) continue;
    last = t;
    gr.addColorStop(t, withAlpha(color, a));
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, N, N);
}
