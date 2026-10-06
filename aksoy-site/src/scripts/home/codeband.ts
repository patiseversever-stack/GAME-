// Kod şeridi: iki sıra ters yönde akar ve sayfa kaydırma hızına tepki verir (hızlanır, eğilir, geri sarar).
// Ortadaki okuma penceresi önünden geçen kodu yakalar; ürün adını ve grubunu harf harf çözerek yazar.
// Fareyle üzerine gelince akış yavaşlar ve ürün görseli imlecin yanında belirir.
const root = document.querySelector<HTMLElement>('[data-cband]');
if (root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  // Dar ekranda kodlar ekranı çabuk geçmesin: hız ekran genişliğiyle ölçeklenir
  const pace = () => Math.max(0.42, Math.min(1, innerWidth / 1440));
  // Parmakla kaydırma büyük adımlar üretir: dokunmatikte ivme etkisi kısılır
  const push = fine ? 0.5 : 0.08;
  const maxBoost = fine ? 60 : 24;
  type Row = { el: HTMLElement; track: HTMLElement; items: HTMLAnchorElement[]; dir: number; speed: number; x: number; half: number; offs: number[]; widths: number[] };
  const rows: Row[] = [...root.querySelectorAll<HTMLElement>('[data-cband-row]')].map((el) => {
    const track = el.querySelector<HTMLElement>('.cband__track')!;
    return { el, track, items: [...track.children] as HTMLAnchorElement[], dir: +el.dataset.cbandRow!, speed: el.classList.contains('cband__row--big') ? 46 : 34, x: 0, half: 1, offs: [], widths: [] };
  });
  const big = rows[0];
  const scan = root.querySelector<HTMLElement>('[data-cband-scan]')!;
  const catEl = root.querySelector<HTMLElement>('[data-cband-cat]')!;
  const nameEl = root.querySelector<HTMLElement>('[data-cband-name]')!;
  const isoEl = root.querySelector<HTMLElement>('[data-cband-iso]')!;
  const peek = root.querySelector<HTMLElement>('[data-cband-peek]')!;
  const peekImg = peek.querySelector('img')!;
  const peekTxt = peek.querySelector('span')!;

  const measure = () => {
    for (const r of rows) {
      r.half = r.track.scrollWidth / 2 || 1;
      r.offs = r.items.map((i) => i.offsetLeft);
      r.widths = r.items.map((i) => i.offsetWidth);
    }
    scan.style.top = `${big.el.offsetTop}px`;
    scan.style.height = `${big.el.offsetHeight}px`;
  };
  measure();
  document.fonts?.ready.then(measure);
  new ResizeObserver(measure).observe(root);

  // Harf harf çözülme: önce rastgele karakterler, sonra soldan sağa doğru metin
  const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVYZ0123456789°Ø·/';
  const jobs = new Map<HTMLElement, number>();
  const decode = (el: HTMLElement, text: string) => {
    if (reduce) { el.textContent = text; return; }
    cancelAnimationFrame(jobs.get(el) ?? 0);
    let f = 0;
    const total = 16;
    const step = () => {
      const k = f / total;
      const n = Math.floor(text.length * k);
      let out = text.slice(0, n);
      for (let i = n; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (f++ < total) jobs.set(el, requestAnimationFrame(step));
      else el.textContent = text;
    };
    step();
  };

  let lit: HTMLAnchorElement | null = null;
  let scanW = 0, scanX = 0, lockI = -1;
  const pick = () => {
    const cx = root.clientWidth / 2 - big.x;
    for (let i = 0; i < big.items.length; i++) {
      if (cx >= big.offs[i] && cx < big.offs[i] + big.widths[i]) {
        const a = big.items[i];
        if (a !== lit) {
          lit?.classList.remove('is-lit');
          a.classList.add('is-lit');
          lit = a;
          decode(catEl, (a.dataset.cat ?? '').toLocaleUpperCase('tr'));
          decode(nameEl, a.dataset.name ?? '');
          isoEl.textContent = a.dataset.iso ?? '';
        }
        return i;
      }
    }
    return -1;
  };

  /** Köşe çerçevesi yakalanan koda kilitlenir: onunla birlikte akar, sıradakine yumuşakça atlar */
  let dx = 0, dw = 0;
  const lockScan = (i: number, k: number) => {
    if (i < 0) return;
    const x = big.offs[i] + big.x, w = big.widths[i];
    if (i !== lockI) { if (lockI >= 0) { dx = scanX - x; dw = scanW - w; } lockI = i; }
    dx *= 1 - k; dw *= 1 - k;
    scanX = x + dx; scanW = w + dw;
    scan.style.transform = `translate3d(${scanX.toFixed(1)}px,0,0)`;
    scan.style.width = `${scanW.toFixed(1)}px`;
  };

  // Kaydırma hızı: aşağı kaydırınca akış hızlanır, yukarıda geri sarar
  let vel = 0, lastY = scrollY;
  addEventListener('scroll', () => { vel += scrollY - lastY; lastY = scrollY; }, { passive: true });

  let slow = 0, slowT = 0;
  let visible = false, raf = 0, last = 0;
  const loop = (t: number) => {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    slow += (slowT - slow) * 0.08;
    const boost = Math.max(-maxBoost, Math.min(maxBoost, vel));
    vel *= 0.88;
    for (const r of rows) {
      r.x += r.dir * (r.speed * pace() * dt * (1 - slow * 0.85) + boost * push);
      if (r.x <= -r.half) r.x += r.half;
      if (r.x > 0) r.x -= r.half;
      const skew = Math.max(-9, Math.min(9, -boost * (fine ? 0.22 : 0.12) * r.dir));
      r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    }
    lockScan(pick(), 0.2);
    raf = requestAnimationFrame(loop);
  };

  if (reduce) {
    root.classList.add('is-still');
    // Hareket yok: ilk kod okunur, şerit elle kaydırılabilir
    big.x = 0;
    lockScan(pick(), 1);
  } else {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    }).observe(root);
  }

  // Ürün görseli imlecin yanında. Şerit imlecin altından aktığı için altta kalan kod düzenli yeniden bulunur.
  let px = -1, py = -1, shownFor: HTMLAnchorElement | null = null;
  const updatePeek = () => {
    if (px < 0) return;
    const r = root.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + px, r.top + py) as HTMLElement | null;
    const a = hit?.closest<HTMLAnchorElement>('[data-cband] a[data-img]') ?? null;
    const left = px + 232 > r.width ? px - 228 : px + 28;
    peek.style.transform = `translate3d(${left}px, ${Math.max(8, Math.min(r.height - 220, py - 105))}px, 0)`;
    if (a !== shownFor) {
      shownFor = a;
      if (a) { peekImg.src = a.dataset.img!; peekTxt.innerHTML = '';
        const b = document.createElement('b'); b.textContent = a.dataset.code ?? '';
        peekTxt.append(b, document.createTextNode(a.dataset.name ?? '')); peek.classList.add('is-on'); }
      else peek.classList.remove('is-on');
    }
  };
  if (fine) {
    root.addEventListener('pointermove', (e) => { const r = root.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; updatePeek(); });
    root.addEventListener('pointerenter', () => { slowT = 1; });
    root.addEventListener('pointerleave', () => { slowT = 0; px = -1; shownFor = null; peek.classList.remove('is-on'); });
    setInterval(() => { if (visible && px >= 0) updatePeek(); }, 120);
  }
  // Klavyeyle gezilen kod okuma penceresine gelsin
  root.addEventListener('focusin', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a');
    const r = rows.find((x) => x.items.includes(a!));
    if (!a || !r) return;
    slowT = 1;
    r.x = -(r.offs[r.items.indexOf(a)] + r.widths[r.items.indexOf(a)] / 2 - root.clientWidth / 2);
  });
  root.addEventListener('focusout', () => { slowT = 0; });
}
