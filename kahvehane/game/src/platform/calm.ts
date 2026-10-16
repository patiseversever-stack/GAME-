// Sakin mod: dekoratif SONSUZ animasyonlar kare üretmeyi (ve pili/GPU'yu) tüketmesin.
// - Boşta (varsayılan 5 sn dokunuş yok): tüm sonsuz döngüler duraklar; ilk dokunuşta devam eder.
// - Düşük cihazda (always): dekoratif döngüler hiç başlamaz; yalnız oyun için gerekli olanlar (KEEP) çalışır.
// Ayrıca ekranda görünmeyen (ekran dışı sekme sayfası, boyutsuz öğe) sonsuz döngüler duraklatılır: görünmeyen şeye
// her karede stil hesabı yapılmasın (pil + ana iş parçacığı). Görünür olunca devam eder.
// Sonlu animasyonlara (giriş, uçuş, efekt) dokunmaz. Hem CSS hem WAAPI döngüleri için çalışır.
// Test/hata ayıklama: ?calm=0 kapatır, ?idle=800 bekleme süresini kısaltır.

/** Düşük cihazda bile çalışması gereken küçük göstergeler (kullanılabilirlik) */
const KEEP = '.c2__hot, .kh-badge__turn, .kh-hint__glow, .kh-keep';

export function initCalm(o: {always: boolean; idleMs?: number}): void {
  const qs = new URLSearchParams(location.search);
  if (qs.get('calm') === '0') return;
  const idleMs = Number(qs.get('idle')) || o.idleMs || 5000;
  const paused = new Set<Animation>();
  let calm = false;
  let last = performance.now();
  const root = document.documentElement;

  const isLoop = (a: Animation): boolean => {
    try {
      return a.effect?.getComputedTiming().iterations === Infinity;
    } catch {
      return false;
    }
  };
  const essential = (a: Animation): boolean => {
    const t = (a.effect as KeyframeEffect | null)?.target as Element | null | undefined;
    return !!t && !!t.closest?.(KEEP);
  };
  const pause = (a: Animation, force: boolean): void => {
    if (a.playState !== 'running' || !isLoop(a)) return;
    if (!force && essential(a)) return;
    a.pause();
    paused.add(a);
  };

  const sleep = (): void => {
    calm = true;
    root.classList.add('kh-calm');
    for (const a of document.getAnimations()) pause(a, true);
  };
  const wake = (): void => {
    calm = false;
    root.classList.remove('kh-calm');
    for (const a of paused) {
      try {
        if (a.playState === 'paused') a.play();
      } catch {
        /* animasyon kaldırılmış */
      }
    }
    paused.clear();
  };

  // yeni başlayan CSS döngüleri (ekran değişimi vb.): sakin modda veya düşük cihazda hemen duraklat
  document.addEventListener(
    'animationstart',
    e => {
      if (!calm && !o.always) return;
      for (const a of (e.target as Element).getAnimations({subtree: true})) pause(a, calm);
    },
    true,
  );
  if (o.always) for (const a of document.getAnimations()) pause(a, false);

  // görünmeyen sonsuz döngüler (ekran dışı sekme sayfası / boyutsuz kap): duraklat, görününce sürdür
  const parked = new Set<Animation>();
  const onScreen = (t: Element): boolean => {
    const vw = innerWidth, vh = innerHeight, m = 60;
    const seen = (e: Element): boolean => {
      const r = e.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && r.right > -m && r.left < vw + m && r.bottom > -m && r.top < vh + m;
    };
    if (seen(t)) return true;
    // kendisi boyutsuz ama içindekiler görünüyor olabilir (konum/ölçek kabı)
    const r0 = t.getBoundingClientRect();
    if (r0.width > 1 && r0.height > 1) return false; // gerçek boyutlu ve ekran dışı
    for (let c = t.firstElementChild, i = 0; c && i < 3; c = c.nextElementSibling, i++) if (seen(c)) return true;
    return false;
  };
  const sweep = (): void => {
    for (const a of parked) {
      const t = (a.effect as KeyframeEffect | null)?.target as Element | null | undefined;
      if (!t || !t.isConnected || a.playState === 'idle' || a.playState === 'finished') parked.delete(a);
      else if (onScreen(t)) {
        parked.delete(a);
        try {
          a.play();
        } catch {
          /* kaldırılmış */
        }
      }
    }
    for (const a of document.getAnimations()) {
      if (a.playState !== 'running' || !isLoop(a) || essential(a)) continue;
      const t = (a.effect as KeyframeEffect | null)?.target as Element | null | undefined;
      if (t && t.isConnected && !onScreen(t)) {
        a.pause();
        parked.add(a);
      }
    }
  };

  const touch = (): void => {
    last = performance.now();
    if (calm) wake();
  };
  for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'] as const) window.addEventListener(ev, touch, {passive: true, capture: true});
  window.setInterval(() => {
    if (document.hidden) return;
    if (!calm && performance.now() - last > idleMs) sleep();
    else if (!calm) sweep();
  }, 800);
}
