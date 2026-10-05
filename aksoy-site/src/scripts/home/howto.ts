// "Nasıl çalışıyoruz" kartlarındaki küçük arayüz canlandırmaları.
// Kart görünür olunca bir kez başlar; hareket azaltılmışsa son hâli gösterilir.
const root = document.querySelector<HTMLElement>('[data-howto]');
if (root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [...root.querySelectorAll<HTMLElement>('[data-hstep]')];

  // Arama: sorgu yazılır, sonuç listesi değişir
  const QUERIES: [string, [string, string][]][] = [
    ['elmas uç', [['CNMG 120408', 'Tornalama · P M K'], ['CNMG 120404', 'Finiş · P M'], ['DNMG 150608', 'Profil · P M']]],
    ['MGMN', [['MGMN 200', 'Kanal · 2 mm'], ['MGMN 300', 'Kanal · 3 mm'], ['MGMN 400', 'Kanal · 4 mm']]],
    ['kılavuz M8', [['Helis Kılavuz M8', 'Kör delik'], ['Ucu Spiral Kılavuz M8', 'Boydan boya'], ['Ovalama Kılavuz M8', 'Talaşsız']]],
    ['ER32', [['ER32 Pens', 'Pens'], ['BT40 ER32-70', 'Pens tutucu'], ['BT30 ER32', 'Pens tutucu']]],
  ];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const search = async (el: HTMLElement) => {
    const typed = el.querySelector<HTMLElement>('[data-typed]')!;
    const list = el.querySelector<HTMLElement>('[data-results]')!;
    const fill = (rows: [string, string][]) => {
      list.innerHTML = rows.map(([c, t], i) => `<li class="${i === 0 ? 'is-hit' : ''}" style="--i:${i}"><b>${c}</b><span>${t}</span></li>`).join('');
    };
    let q = 0;
    for (;;) {
      await wait(2600);
      if (!document.body.contains(el)) return;
      // Eski sorguyu sil, yenisini harf harf yaz
      list.classList.add('is-out');
      for (let n = typed.textContent!.length; n >= 0; n--) { typed.textContent = typed.textContent!.slice(0, n); await wait(28); }
      q = (q + 1) % QUERIES.length;
      const [text, rows] = QUERIES[q];
      for (let n = 1; n <= text.length; n++) { typed.textContent = text.slice(0, n); await wait(70 + Math.random() * 50); }
      fill(rows);
      list.classList.remove('is-out');
    }
  };

  // Sepet: adetler sıfırdan sayar
  const cart = (el: HTMLElement) => {
    for (const o of el.querySelectorAll<HTMLOutputElement>('[data-qty]')) {
      const to = +o.dataset.qty!;
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1100);
        o.value = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  // Sohbet: mesaj gider, karşı taraf yazıyor, cevap gelir
  const chat = async (el: HTMLElement) => {
    await wait(900);
    el.classList.add('is-typing');
    await wait(1900);
    el.classList.remove('is-typing');
    el.classList.add('is-replied');
  };

  const run = (el: HTMLElement) => {
    el.classList.add('is-live');
    if (reduce) return;
    if (el.dataset.hstep === 'search') search(el);
    if (el.dataset.hstep === 'cart') cart(el);
    if (el.dataset.hstep === 'chat') chat(el);
  };

  if (reduce || !('IntersectionObserver' in window)) steps.forEach((s) => s.classList.add('is-live', 'is-still'));
  else {
    root.classList.add('hw-anim');
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); run(e.target as HTMLElement); }
    }, { threshold: 0.45 });
    steps.forEach((s) => io.observe(s));
  }

  // İmleci izleyen yumuşak ışık
  for (const s of steps) {
    s.addEventListener('pointermove', (e) => {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--mx', `${e.clientX - r.left}px`);
      s.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }
}
