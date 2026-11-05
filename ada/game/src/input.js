// Kontroller: kaydırma (telefon) ve klavye (bilgisayar). Hepsi kural motorunun hamle diline çevrilir.
export function createInput(target, { onAction, isZipZone }) {
  let start = null;
  let fired = false;
  const TH = 26;

  const down = (x, y) => {
    start = { x, y, t: performance.now() };
    fired = false;
  };
  const move = (x, y) => {
    if (!start || fired) return;
    const dx = x - start.x, dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
    fired = true;
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx < 0 ? 'left' : 'right');
    else onAction(dy < 0 ? 'jump' : 'slide');
  };
  const up = () => {
    if (start && !fired && performance.now() - start.t < 350) onAction(isZipZone() ? 'grab' : 'jump');
    start = null;
  };

  target.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; down(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  target.addEventListener('touchmove', (e) => { const t = e.changedTouches[0]; move(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  target.addEventListener('touchend', (e) => { up(); e.preventDefault(); }, { passive: false });
  target.addEventListener('mousedown', (e) => down(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', up);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') onAction('left');
    else if (k === 'arrowright' || k === 'd') onAction('right');
    else if (k === 'arrowup' || k === 'w') onAction('jump');
    else if (k === 'arrowdown' || k === 's') onAction('slide');
    else if (k === ' ') onAction(isZipZone() ? 'grab' : 'jump');
    else return;
    e.preventDefault();
  });
}
