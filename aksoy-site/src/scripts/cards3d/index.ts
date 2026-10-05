// Kategori kartı 3D modellerini, ızgara ekrana yaklaşınca yükler. WebGL2 yoksa çizimler kalır.
import { canUse3D } from '../gl';
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-model]'));
if (els.length && canUse3D()) {
  const grid = els[0].parentElement!;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    import('./render').then((m) => m.startCards(els)).catch(() => {});
  }, { rootMargin: '600px 0px' });
  io.observe(grid);
}
