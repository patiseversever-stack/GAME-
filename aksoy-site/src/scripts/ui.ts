// Genel arayüz: başlık çubuğu, mobil menü, kaydırmada belirme, masaüstünde yumuşak kaydırma.
import Lenis from 'lenis';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

/* Yumuşak kaydırma: yalnızca masaüstü fare/trackpad; dokunmatikte yerel kaydırma korunur. */
let lenis: Lenis | null = null;
if (finePointer && !reduce) {
  lenis = new Lenis({ autoRaf: true, lerp: 0.075, wheelMultiplier: 0.8, anchors: { offset: -80 } });
}
(window as any).__lenis = lenis;

export function lockScroll(on: boolean) {
  document.documentElement.style.overflow = on ? 'hidden' : '';
  if (lenis) on ? lenis.stop() : lenis.start();
}
(window as any).__lockScroll = lockScroll;

/* Başlık çubuğu: kaydırınca arka plan, aşağı inerken gizlen, yukarı çıkınca görün. */
const header = document.querySelector<HTMLElement>('[data-header]');
let lastY = scrollY;
let ticking = false;
function onScroll() {
  const y = scrollY;
  if (header) {
    header.classList.toggle('is-scrolled', y > 12);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 420) header.classList.add('is-hidden');
    else if (goingUp || y < 120) header.classList.remove('is-hidden');
  }
  lastY = y;
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
onScroll();

/* Mobil menü */
const menu = document.querySelector<HTMLElement>('[data-menu]');
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
function setMenu(open: boolean) {
  if (!menu) return;
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menuBtn?.setAttribute('aria-expanded', String(open));
  lockScroll(open);
  if (open) menu.querySelector<HTMLElement>('nav a')?.focus({ preventScroll: true });
}
menuBtn?.addEventListener('click', () => setMenu(true));
document.querySelector('[data-menu-close]')?.addEventListener('click', () => setMenu(false));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.classList.contains('is-open')) setMenu(false); });

/* Kaydırmada belirme */
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
);
document.querySelectorAll('.reveal, .split-line, [data-reveal]').forEach((el) => io.observe(el));
(window as any).__reveal = (el: Element) => io.observe(el);

/* Küçük bildirim */
let toastTimer = 0;
export function toast(msg: string) {
  const t = document.querySelector<HTMLElement>('.toast');
  if (!t) return;
  t.querySelector('span')!.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('is-on'), 2400);
}
(window as any).__toast = toast;

/* Manyetik düğmeler (yalnızca masaüstü) */
if (finePointer && !reduce) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}
