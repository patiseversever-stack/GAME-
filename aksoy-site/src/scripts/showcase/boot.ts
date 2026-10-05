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
  function tick() {
    if (done) return;
    shown += (target - shown) * 0.08;
    if (target >= 1 && shown > 0.985) shown = 1;
    const v = Math.round(shown * 100);
    if (num) num.textContent = String(v).padStart(3, '0');
    if (bar) bar.style.transform = `scaleX(${shown})`;
    // Açılış canlandırması (işaret, harfler, alt yazı) yaklaşık 3 sn sürer
    const minTime = performance.now() - startedAt > 3000;
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
    // Ağ yavaşsa perdeyi en geç 5,5 sn'de kaldır; poster görünür kalır, 3D hazır olunca devreye girer.
    setTimeout(() => { target = 1; shown = 1; finishPre(onReady); }, 5500);
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
