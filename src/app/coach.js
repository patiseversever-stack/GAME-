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
  const show = (id, text, at, place = 'top') => {
    if (!settings.get('tutorial') || seen.has(id)) return;
    seen.add(id);
    writeJSON(KEY, [...seen]);
    hide();
    const el = document.createElement('div');
    el.className = 'coach-bub is-' + place;
    el.setAttribute('role', 'status');
    el.innerHTML = `<p>${text}</p><button class="coach-bub__ok">Tamam</button>`;
    el.style.left = at.x + 'px';
    el.style.top = at.y + 'px';
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      hide();
    });
    host.appendChild(el);
    cur = el;
    setTimeout(() => cur === el && hide(), 9000);
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
        show('open101', 'İlk açışında ıstakadaki perlerin toplamı <b>en az 101</b> olmalı (ya da 5 çift). Perleri boşlukla ayır; puanlar üstlerinde görünür.', { x: r.x + r.w / 2, y: r.y - 8 });
      }
      if (ev === 'turn' && s.turn.seat === 0 && s.turn.needsDraw) {
        show('draw', 'Sıra sende: <b>desteye dokun</b> ya da taşı ıstakada istediğin yere sürükle. Soldaki çöplükten de alabilirsin.', { x: L.stock.cx, y: L.stock.cy - L.stock.h / 2 - 10 });
      }
      if (ev === 'draw') {
        const p = L.piles[0];
        show('discard', 'Taşları sürükleyerek diz. <b>Diz</b> düğmesi perleri senin için gruplar. Sonra bir taşı <b>buraya sürükleyerek</b> at.', { x: p.cx - p.w, y: p.cy - p.h / 2 - 10 });
      }
    },
    hide,
  };
}
