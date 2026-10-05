// Kategori kartı 3D modellerini, ızgara ekrana yaklaşınca yükler. WebGL2 yoksa çizimler kalır.
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-model]'));
function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (els.length && hasWebGL2()) {
  const grid = els[0].parentElement!;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    import('./render').then((m) => m.startCards(els)).catch(() => {});
  }, { rootMargin: '600px 0px' });
  io.observe(grid);
}
