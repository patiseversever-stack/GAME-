// Bağlamsal öğretici: her ipucu bir kez, ilgili yere işaret eden balon. Dokununca kapanır; ayarlardan kapatılabilir.
import { readJSON, writeJSON } from '../meta/storage.js';

const KEY = 'patisever.tips.v1';

export function createCoach(host, settings) {
  const seen = new Set(readJSON(KEY, []) || []);
  let cur = null;
  const hide = () => {
    cur?.remove();
    cur = null;
  };
  const show = (id, text, at, place = 'top', below = null) => {
    if (!settings.get('tutorial') || seen.has(id)) return;
    seen.add(id);
    writeJSON(KEY, [...seen]);
    hide();
    const el = document.createElement('div');
    el.className = 'coach-bub is-' + place;
    el.setAttribute('role', 'status');
    el.innerHTML = `<p>${text}</p>`;
    el.style.left = Math.max(90, Math.min(innerWidth - 90, at.x)) + 'px';
    el.style.top = at.y + 'px';
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      hide();
    });
    host.appendChild(el);
    // üstte yer yoksa (deste ekranın tepesindeyse) balon aşağıya geçer
    if (below !== null && at.y - el.offsetHeight < 6) {
      el.classList.replace('is-' + place, 'is-bottom');
      el.style.top = below + 'px';
    }
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
        show('open101', 'İlk açış: perlerin toplamı <b>en az 101</b> ya da 5 çift', { x: r.x + r.w / 2, y: r.y - 8 });
      }
      if (ev === 'turn' && s.turn.seat === 0 && s.turn.needsDraw) {
        show('draw', '<b>Dokun</b> ya da ıstakaya sürükle', { x: L.stock.cx, y: L.stock.cy - L.stock.h / 2 - 10 }, 'top', L.stock.cy + L.stock.h / 2 + 12);
      }
      if (ev === 'draw') {
        const p = L.piles[0];
        show('discard', 'Bir taşı <b>buraya sürükle</b>', { x: p.cx - p.w * 0.3, y: p.cy - p.h / 2 - 8 }, 'top', p.cy + p.h / 2 + 10);
      }
    },
    hide,
  };
}
