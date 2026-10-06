// Vitrin önyükleyici: 3D çalışabilir mi karar verir; ağır modülleri (three.js, GSAP) sonradan yükler.
// 3D yoksa ya da "hareketi azalt" açıksa poster görseli ve düz metin akışı gösterilir.
import { canUse3D } from '../gl';


export function initShowcase() {
  const root = document.querySelector<HTMLElement>('[data-showcase]');
  const pre = document.querySelector<HTMLElement>('[data-preloader]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const poster = params.has('poster');

  let seen = false;
  try { seen = sessionStorage.getItem('aksoy-pre') === '1'; } catch { /* yok say */ }
  const usePre = !!pre && !seen && !reduce && !poster;
  if (!usePre) pre?.remove();

  const num = pre?.querySelector<HTMLElement>('[data-pre-num]');
  const bar = pre?.querySelector<HTMLElement>('[data-pre-bar]');
  let target = 0.12, shown = 0, done = false;
  const startedAt = performance.now();

  const revealHero = () => document.documentElement.classList.add('is-intro');

  function finishPre(after?: () => void) {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('aksoy-pre', '1'); } catch { /* yok say */ }
    if (pre) {
      pre.classList.add('is-done');
      dispatchEvent(new Event('aksoy:intro'));
      setTimeout(() => pre.remove(), 1300);
      setTimeout(() => { revealHero(); after?.(); }, 380);
    } else {
      revealHero();
      after?.();
    }
  }

  let onReady: (() => void) | undefined;
  if (usePre && pre) film(pre, () => done, () => finishPre(onReady));
  function tick() {
    if (done) return;
    shown += (target - shown) * 0.08;
    if (target >= 1 && shown > 0.985) shown = 1;
    const v = Math.round(shown * 100);
    if (num) num.textContent = String(v).padStart(3, '0');
    if (bar) bar.style.transform = `scaleX(${shown})`;
    // Açılış filmi (çizim, gerçek uç, logo) yaklaşık 4,8 sn sürer
    const minTime = performance.now() - startedAt > 4800 && !(window as any).__pfFreeze;
    if (shown >= 1 && minTime) { finishPre(onReady); return; }
    requestAnimationFrame(tick);
  }

  // "Hareketi azalt" açık olsa da 3D çalışır (sakin modda); yalnızca WebGL2 yoksa düz görünüm.
  if (!root || !canUse3D()) {
    root?.classList.add('is-static');
    // 3D olmasa da açılış (logo ve yazı) bir kez oynar; yükleme beklenmez
    if (usePre) { target = 1; requestAnimationFrame(tick); }
    else finishPre();
    return;
  }

  // Perde yoksa metin hemen görünür; 3D hazır olunca arkadan devreye girer.
  if (!usePre && !poster) finishPre();

  if (usePre) {
    requestAnimationFrame(tick);
    // Ağ yavaşsa perdeyi en geç 7,5 sn'de kaldır; poster görünür kalır, 3D hazır olunca devreye girer.
    setTimeout(() => { target = 1; shown = 1; finishPre(onReady); }, 7500);
  }

  const go = () =>
    import('./showcase')
      .then((m) => {
        target = 0.4;
        return m.startShowcase(root, { onProgress: (p) => (target = Math.max(target, p)), poster, reduce });
      })
      .then((api) => {
        target = 1;
        if (!usePre || done) { if (!usePre) finishPre(); api.intro(); }
        else onReady = () => api.intro();
      })
      .catch((err) => {
        console.warn('3D vitrin başlatılamadı, statik görünüme geçiliyor.', err);
        root.classList.add('is-static');
        target = 1;
        finishPre();
      });

  if (usePre || poster) go();
  else if ('requestIdleCallback' in window) (window as any).requestIdleCallback(go, { timeout: 600 });
  else setTimeout(go, 200);
}

/**
 * Açılış filminin zamanlaması: imleç koordinatları okunur, gerçek uç çizimin üstünde belirir
 * ve logodaki yerine uçar. "Geç" düğmesi filmi bitirir.
 */
function film(pre: HTMLElement, isDone: () => boolean, skip: () => void) {
  const svg = pre.querySelector<SVGSVGElement>('[data-pf-draw]');
  const cursor = pre.querySelector<SVGGElement>('[data-pf-cursor]');
  const real = pre.querySelector<HTMLElement>('[data-pf-real]');
  const slot = pre.querySelector<HTMLElement>('[data-pf-slot]');
  const xEl = pre.querySelector<HTMLElement>('[data-pf-x]');
  const yEl = pre.querySelector<HTMLElement>('[data-pf-y]');
  pre.querySelector('[data-pf-skip]')?.addEventListener('click', skip);
  if (!svg || !real || !slot) return;
  // Telefonda kadraj önden ve yandan görünüşe yaklaşır (pafta kenarları dışarıda kalır)
  if (matchMedia('(max-width: 700px)').matches) svg.setAttribute('viewBox', '150 105 650 440');
  const t0 = performance.now();
  const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3).replace('.', ',').padStart(7, '0');
  // İmleç konumu (çizim birimi) → mm: önden görünüş merkezi sıfır, 14 birim = 1 mm
  const readout = () => {
    if (isDone() || performance.now() - t0 > 3600) return;
    if (cursor && xEl && yEl) {
      const m = new DOMMatrix(getComputedStyle(cursor).transform);
      xEl.textContent = fmt((m.e - 360) / 14);
      yEl.textContent = fmt((300 - m.f) / 14);
    }
    requestAnimationFrame(readout);
  };
  requestAnimationFrame(readout);
  const place = (x: number, y: number, size: number) => {
    real.style.setProperty('--rx', `${x}px`);
    real.style.setProperty('--ry', `${y}px`);
    real.style.setProperty('--rs', `${size}px`);
  };
  // Gerçek uç: önden görünüşün merkezinde, çizilen uç boyunda
  const showReal = () => {
    if (isDone()) return;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const p = new DOMPoint(360, 300).matrixTransform(ctm);
      place(p.x, p.y, 360 * ctm.a);
    }
    pre.classList.add('is-real');
  };
  // Logoya uçuş ve AKSOY
  const lock = () => {
    if (isDone()) return;
    const r = slot.getBoundingClientRect();
    place(r.left + r.width / 2, r.top + r.height / 2, r.width);
    pre.classList.add('is-lock');
  };
  // Test kancası: zamanlayıcılar kurulmaz, adımlar elle çağrılır
  if ((window as any).__pfFreeze) { (window as any).__pf = { showReal, lock }; return; }
  setTimeout(showReal, 2650);
  setTimeout(lock, 3350);
}
