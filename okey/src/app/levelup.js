// Seviye atlama: tam ekran, sade ve törensel (≈3.5 sn, dokununca sona atlar).
// Halka kanun şeddiyle dolar → kapanınca ışık atımı, ince altın kıvılcımlar, lale ve yıldızlar süzülür; seviye numarası değişir.
// Ödül varsa halka sola kayar; ödüller arkası dönük kartlar olarak gelir ve sırayla dönerek açılır (ödül kutusunun açılması).
import { Celebration } from '../ui/effects.js';
import { rewardArt, hydrateArt } from './reward-art.js';
import { titleFor, KIND_NAME } from '../meta/progression.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const R = 88;
const C = 2 * Math.PI * R;
// kart arkası: çini sekiz köşe yıldız amblemi
const BACK = `<svg viewBox="0 0 100 130" aria-hidden="true"><defs><pattern id="lv2p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#14286a"/><path d="M10 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="rgba(244,240,230,.22)"/></pattern><linearGradient id="lv2g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d7ac4a"/><stop offset="1" stop-color="#8a6020"/></linearGradient></defs><rect width="100" height="130" fill="url(#lv2p)"/><rect x="6" y="6" width="88" height="118" rx="8" fill="none" stroke="url(#lv2g)" stroke-width="1.4"/><g transform="translate(50 65)"><rect x="-17" y="-17" width="34" height="34" fill="none" stroke="url(#lv2g)" stroke-width="2"/><rect x="-17" y="-17" width="34" height="34" fill="none" stroke="url(#lv2g)" stroke-width="2" transform="rotate(45)"/><circle r="6" fill="url(#lv2g)"/></g></svg>`;

// { host, from, to, unlocks:[{kind,...item}], avatar, audio, profile, calm } → Promise (kapanınca)
export function showLevelUp(o) {
  return new Promise((resolve) => {
    const { host, from, to, unlocks = [], avatar, audio, profile, calm } = o;
    const newTitle = unlocks.find((u) => u.kind === 'title') || null;
    const cards = unlocks.filter((u) => u.kind !== 'title').slice(0, 3);
    const equipable = [...cards].reverse().find((u) => u.kind === 'frame' || u.kind === 'effect' || u.kind === 'tiles');
    const el = document.createElement('div');
    el.className = 'lv2' + (cards.length ? ' has-rw' : '') + (calm ? ' is-calm' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `Seviye ${to}`);
    const title = newTitle ? newTitle.name : titleFor(to).name;
    el.innerHTML = `
      <div class="lv2__bg" aria-hidden="true"><i class="lv2-glow"></i><i class="lv2-rays"></i></div>
      <canvas class="lv2__fx" aria-hidden="true"></canvas>
      <div class="lv2__stage">
        <div class="lv2__hero">
          <div class="lv2-ring">
            <svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="lv2r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".55" stop-color="#f2c45a"/><stop offset="1" stop-color="#d4882a"/></linearGradient></defs>
              <circle cx="100" cy="100" r="${R}" class="trk"/><circle cx="100" cy="100" r="${R}" class="val" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${C.toFixed(1)}"/></svg>
            <i class="lv2-flash"></i>
            <div class="lv2-num"><small>Seviye</small><span class="lv2-n"><b class="old">${from}</b><b class="new">${to}</b></span></div>
          </div>
          <div class="lv2-copy"><span class="lv2-kick">${newTitle ? 'Yeni unvan' : to - from > 1 ? `${to - from} seviye birden` : 'Seviye atladın'}</span><h2>${esc(title)}</h2>
            <p>${cards.length ? `${cards.length} yeni ödül kazandın` : 'Masada adın büyüyor'}</p></div>
        </div>
        ${cards.length ? `<div class="lv2-cards">${cards.map((c, i) => `<div class="lv2-card" style="--i:${i}"><div class="lv2-card__in"><div class="lv2-card__back">${BACK}</div><div class="lv2-card__front"><span class="lv2-card__art">${rewardArt(c.kind, c, avatar)}</span><small>${KIND_NAME[c.kind]}</small><b>${esc(c.name)}</b></div></div></div>`).join('')}</div>` : ''}
      </div>
      <div class="lv2__actions">${equipable ? '<button class="lv2-btn lv2-btn--go" data-equip>Hemen kuşan</button>' : ''}<button class="lv2-btn" data-close>Devam</button></div>
      <p class="lv2__skip">Geçmek için dokun</p>`;
    host.appendChild(el);
    hydrateArt(el);
    const fx = new Celebration(el.querySelector('.lv2__fx'));
    const val = el.querySelector('.lv2-ring .val');
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let done = false;
    const phase = (p) => el.classList.add(p);
    const burst = () => {
      if (el.classList.contains('p-burst')) return;
      phase('p-burst');
      const r = el.querySelector('.lv2-ring').getBoundingClientRect();
      const h = el.getBoundingClientRect();
      fx.burstAt(r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, { calm });
    };
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      el.classList.add('is-skip', 'p-fill', 'p-copy', 'p-shift', 'p-cards', 'p-flip', 'p-done');
      val.style.strokeDashoffset = '0';
      burst();
    };
    requestAnimationFrame(() => {
      phase('p-in');
      audio?.fanfare?.('rast');
      requestAnimationFrame(() => {
        phase('p-fill');
        val.style.strokeDashoffset = '0';
      });
    });
    at(1150, burst);
    at(1550, () => phase('p-copy'));
    if (cards.length) {
      at(1750, () => phase('p-shift'));
      at(2050, () => phase('p-cards'));
      at(2550, () => {
        phase('p-flip');
        cards.forEach((_, i) => at(i * 220, () => audio?.play?.('place', { quiet: true, vol: 0.4 })));
      });
      at(3400, () => {
        done = true;
        phase('p-done');
      });
    } else
      at(2500, () => {
        done = true;
        phase('p-done');
      });
    const close = () => {
      timers.forEach(clearTimeout);
      el.classList.add('is-out');
      setTimeout(() => {
        fx.stop();
        el.remove();
        resolve();
      }, 360);
    };
    el.addEventListener('click', (e) => {
      const eq = e.target.closest('[data-equip]');
      if (eq) {
        profile?.equip?.(equipable.kind, equipable.id);
        if (equipable.kind === 'tiles') window.__okey?.settings?.set('tiles', equipable.id);
        eq.textContent = 'Kuşanıldı';
        eq.disabled = true;
        return;
      }
      if (e.target.closest('[data-close]')) return close();
      if (!el.classList.contains('p-done')) finish();
    });
  });
}
