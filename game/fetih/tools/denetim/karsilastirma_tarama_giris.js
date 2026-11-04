import { TYPES } from '/home/user/GAME-/game/fetih/src/quiz/types.js';
import { BANK } from '/home/user/GAME-/game/fetih/src/data/bank.js';
const T = TYPES.hilo;
const H = BANK.filter((q) => q.type === 'hilo');
const ctls = [];
for (const q of H) {
  for (const R of [() => 0.2, () => 0.8]) { // iki yerleşim: sol/sağ değişsin
    const v = T.prepare(q, R);
    const wrap = document.createElement('div');
    wrap.className = 'w'; wrap.dataset.id = q.id;
    wrap.innerHTML = `<h3>${q.q}</h3><div class="body"></div>`;
    document.body.appendChild(wrap);
    ctls.push([T.mount(wrap.querySelector('.body'), v, { answer() {} }), v]);
  }
}
window.reveal = () => ctls.forEach(([c, v]) => c.reveal([{ value: 0, color: '#e0402f' }, { value: 1, color: '#2f6be0' }, { value: v.right, color: '#2fb45a' }]));
window.audit = () => {
  const out = [];
  const R = (e) => e.getBoundingClientRect();
  const hit = (a, b, pad = 0) => a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;
  const lines = (el) => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].filter((x) => x.width > 1); };
  // VS elması: döndürülmüş kare; içine girme sınaması merkeze olan |dx|+|dy| ile (eşkenar dörtgen)
  const inDiamond = (rect, d) => { const cx = (d.left + d.right) / 2, cy = (d.top + d.bottom) / 2, h = (d.right - d.left) / 2; const px = Math.max(rect.left, Math.min(cx, rect.right)), py = Math.max(rect.top, Math.min(cy, rect.bottom)); return Math.abs(px - cx) + Math.abs(py - cy) < h - 2; };
  for (const w of document.querySelectorAll('.w')) {
    const id = w.dataset.id;
    const box = w.querySelector('.fl-hilo');
    const vs = R(box.querySelector('.vs'));
    const bx = R(box);
    const h3 = R(w.querySelector('h3'));
    for (const b of box.querySelectorAll('.fl-hl')) {
      const nm = b.querySelector('.nm'), pl = b.querySelector('.pl');
      const rp = R(pl);
      const isA = b.classList.contains('a');
      const ln = lines(nm);
      const fs = parseFloat(getComputedStyle(nm).fontSize);
      const nl = new Set(ln.map((x) => Math.round(x.top))).size;
      if (nm.scrollWidth > nm.clientWidth + 1) out.push(`${id}: isim yatayda taşıyor (${nm.textContent})`);
      if (nl > 4) out.push(`${id}: isim ${nl} satır (${nm.textContent})`);
      if (fs < 16) out.push(`${id}: isim çok küçüldü ${fs}px (${nm.textContent})`);
      const vtxt = [...lines(b.querySelector('.val')), ...lines(b.querySelector('.vl u'))];
      // eğik kenar: a'nın sağı yukarıdan aşağı 26 px içeri, b'nin solu yukarıdan aşağı 26 px dışarı
      const edge = (y) => { const k = (y - rp.top) / (rp.bottom - rp.top); return isA ? rp.right - 26 * k : rp.left + 26 * (1 - k); };
      for (const r of [...ln, ...vtxt]) {
        if (isA ? r.right > edge(r.bottom) + 1 : r.left < edge(r.top) - 1) out.push(`${id}: yazı eğik kenardan taşıyor (${isA ? 'a' : 'b'})`);
        if (inDiamond(r, vs)) out.push(`${id}: yazı VS elmasına biniyor (${(r.width|0)}px)`);
      }
      for (const r of ln) for (const v of vtxt) if (hit(r, v, 1)) out.push(`${id}: isim ile değer çakışıyor`);
      const wh = b.querySelector('.wh');
      if (wh) for (const d of wh.querySelectorAll('.fl-who')) { const rw = R(d); for (const r of ln) if (hit(rw, r, 1)) out.push(`${id}: rozet isme biniyor`); for (const v of vtxt) if (hit(rw, v, 1)) out.push(`${id}: rozet değere biniyor`); if (inDiamond(rw, vs)) out.push(`${id}: rozet VS'ye biniyor`); if (rw.bottom > rp.bottom || rw.top < rp.top) out.push(`${id}: rozet levha dışında`); }
    }
    const df = box.querySelector('.df');
    if (df) { const r = R(df); if (r.left < bx.left - 1 || r.right > bx.right + 1) out.push(`${id}: fark çipi taşıyor (${df.textContent})`); for (const t of box.querySelectorAll('.fl-hl.right')) { const ok = R(t); } }
  }
  return [...new Set(out)];
};
