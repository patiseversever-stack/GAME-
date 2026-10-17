// Büyük tuvali (deste atlası) PNG Blob'a çevirme — ana iş parçacığını bekletmeden.
//
// Neden: hızlandırılmış (GPU) tuvalde `toBlob`, bütün çizimin GPU'da bitmesini bekleyip pikselleri EŞZAMANLI geri okur. 2304×2877'lik
// atlas için bu, açılışta ve markette deste değişiminde ana iş parçacığını uzun süre kilitliyordu (yazılım GPU'lu ölçüm ortamında
// 23–42 sn, telefonda yüzlerce ms). Burada tuvalin anlık görüntüsü GPU'da kalan bir ImageBitmap olarak bir işçiye aktarılır; geri
// okuma ve PNG kodlaması işçide olur. Pikseller aynı (kayıpsız PNG), kartlar aynı keskinlikte. İşçi / OffscreenCanvas yoksa
// eski yol (toBlob).
let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, (b: Blob | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./atlasBlob.worker.ts', import.meta.url), {type: 'module'});
    worker.onmessage = (e: MessageEvent<{id: number; blob: Blob | null}>) => {
      pending.get(e.data.id)?.(e.data.blob);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      for (const r of pending.values()) r(null);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export async function canvasToPng(c: HTMLCanvasElement): Promise<Blob | null> {
  const w = typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function' ? getWorker() : null;
  if (w) {
    try {
      const bm = await createImageBitmap(c);
      const blob = await new Promise<Blob | null>(res => {
        const id = ++seq;
        pending.set(id, res);
        w.postMessage({id, bm}, [bm]);
      });
      if (blob) return blob;
    } catch {
      /* işçi yolu olmadı: eski yol */
    }
  }
  return new Promise<Blob | null>(res => c.toBlob(res, 'image/png'));
}
