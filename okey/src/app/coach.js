// Bağlamsal öğretici: her ipucu bir kez, ilgili yere işaret eden balon. Dokununca kapanır; ayarlardan kapatılabilir.
// Balon, hedefin üst/alt/sol/sağ yanlarından masadaki hiçbir öğeyle (plaka, deste, çöplük, ıstaka, HUD) çakışmayanına yerleşir.
import { readJSON, writeJSON } from '../meta/storage.js';

const KEY = 'patisever.tips.v1';
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const fromC = (o) => ({ x: o.cx - o.w / 2, y: o.cy - o.h / 2, w: o.w, h: o.h });

function obstacles(L) {
  const list = [L.hud, L.action, L.rack?.rect, L.plate, L.stock && fromC(L.stock)];
  for (const s of [1, 2, 3]) {
    const st = L.seats?.[s];
    if (st?.panel) list.push(st.panel);
    if (st?.rack) list.push(st.rack);
  }
  for (const p of L.piles || []) if (p) list.push(fromC(p));
  return list.filter((r) => r && r.w > 0);
}

export function createCoach(host, settings) {
  const seen = new Set(readJSON(KEY, []) || []);
  let cur = null;
  const hide = () => {
    cur?.remove();
    cur = null;
  };
  // target: işaret edilen öğenin dikdörtgeni
  const show = (id, text, target, L) => {
    if (!settings.get('tutorial') || seen.has(id)) return;
    seen.add(id);
    writeJSON(KEY, [...seen]);
    hide();
    const el = document.createElement('div');
    el.className = 'coach-bub';
    el.setAttribute('role', 'status');
    el.innerHTML = `<p>${text}</p>`;
    el.style.visibility = 'hidden';
    host.appendChild(el);
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const W = host.clientWidth || innerWidth;
    const H = host.clientHeight || innerHeight;
    const gap = 9;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    const cands = [
      ['top', cx - bw / 2, target.y - gap - bh],
      ['bottom', cx - bw / 2, target.y + target.h + gap],
      ['right', target.x + target.w + gap, cy - bh / 2],
      ['left', target.x - gap - bw, cy - bh / 2],
    ];
    const obs = obstacles(L).filter((r) => overlap(r, target) < target.w * target.h * 0.5);
    let best = null;
    for (const [side, x0, y0] of cands) {
      const x = Math.max(6, Math.min(W - bw - 6, x0));
      const y = Math.max(6, Math.min(H - bh - 6, y0));
      const r = { x, y, w: bw, h: bh };
      let cost = obs.reduce((a, o) => a + overlap(r, o), 0) + overlap(r, target) * 4;
      cost += Math.abs(x - x0) + Math.abs(y - y0); // ekrana sığmak için kaydırma cezası
      if (!best || cost < best.cost) best = { side, x, y, cost };
      if (cost === 0) break;
    }
    el.classList.add('is-' + best.side);
    el.style.left = best.x + 'px';
    el.style.top = best.y + 'px';
    // ok: hedefe doğru
    const ax = best.side === 'top' || best.side === 'bottom' ? Math.max(12, Math.min(bw - 12, cx - best.x)) : null;
    const ay = best.side === 'left' || best.side === 'right' ? Math.max(10, Math.min(bh - 10, cy - best.y)) : null;
    if (ax !== null) el.style.setProperty('--ax', ax + 'px');
    if (ay !== null) el.style.setProperty('--ay', ay + 'px');
    el.style.visibility = '';
    el.animate?.([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      hide();
    });
    cur = el;
    setTimeout(() => cur === el && hide(), 6000);
  };
  return {
    attach() {},
    notify(ev, ctl) {
      const sc = ctl?.scene;
      if (!sc?.L) return;
      const L = sc.L;
      const s = ctl.game.state;
      if (ev === 'gameStart' && s.rules.mode === 'okey101') {
        const r = L.rack.rect;
        show('open101', 'İlk açış: perlerin toplamı <b>en az 101</b> ya da 5 çift', { x: r.x + r.w * 0.3, y: r.y, w: r.w * 0.4, h: 10 }, L);
      }
      if (ev === 'turn' && s.turn.seat === 0 && s.turn.needsDraw) {
        show('draw', '<b>Dokun</b> ya da ıstakaya sürükle', fromC(L.stock), L);
      }
      if (ev === 'draw') {
        show('discard', 'Bir taşı <b>buraya sürükle</b>', fromC(L.piles[0]), L);
      }
    },
    hide,
  };
}
