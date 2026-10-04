// Seviye atlama: tam ekran kutlama (≈3.6 sn, dokununca geçer).
// Zemin kararır, çini yıldız deseni belirir; XP halkası kanun şeddiyle dolar ve patlar; lale ve yıldızlar saçılır,
// yeni seviye numarası düşer, unvan yazılır; ödül varsa çini kakmalı sandık sallanıp açılır, kartlar yükselir.
import { Celebration } from '../ui/effects.js';
import { rewardCard } from './reward-art.js';
import { titleFor } from '../meta/progression.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const TULIP = 'M0 14C-7 10-9 1-6.5-8L-4-3.5 0-12 4-3.5 6.5-8C9 1 7 10 0 14Z';
const CHEST = `<svg class="lvu-chest" viewBox="0 0 160 136" aria-hidden="true"><defs>
<linearGradient id="lvw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5428"/><stop offset=".55" stop-color="#5e3615"/><stop offset="1" stop-color="#3a1f0a"/></linearGradient>
<linearGradient id="lvl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c6531"/><stop offset="1" stop-color="#5a3313"/></linearGradient>
<linearGradient id="lvb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".35" stop-color="#d7ac4a"/><stop offset=".7" stop-color="#8a6020"/><stop offset="1" stop-color="#e2bd62"/></linearGradient>
<linearGradient id="lvc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a55b0"/><stop offset="1" stop-color="#14286a"/></linearGradient>
<radialGradient id="lvg" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="#fff6cf"/><stop offset=".4" stop-color="#ffd36a" stop-opacity=".85"/><stop offset="1" stop-color="#ffb02e" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="80" cy="128" rx="66" ry="7" fill="rgba(0,0,0,.45)"/>
<g class="lvu-chest__glow"><path d="M30 60 L-10 -60 L170 -60 L130 60Z" fill="url(#lvg)" opacity=".85"/><ellipse cx="80" cy="60" rx="58" ry="10" fill="#fff3c0"/></g>
<g class="lvu-chest__base"><rect x="14" y="58" width="132" height="64" rx="6" fill="url(#lvw)" stroke="#2a1405" stroke-width="2"/>
<path d="M20 72h120M20 88h120M20 104h120" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
<rect x="54" y="68" width="52" height="44" rx="5" fill="url(#lvc)" stroke="url(#lvb)" stroke-width="3"/>
<g transform="translate(80 92) scale(1.25)"><path d="${TULIP}" fill="#f4f0e6" stroke="#0e1d4d" stroke-width=".8"/></g>
<circle cx="64" cy="77" r="2" fill="#2f9c95"/><circle cx="96" cy="77" r="2" fill="#2f9c95"/><circle cx="64" cy="104" r="2" fill="#c23a2c"/><circle cx="96" cy="104" r="2" fill="#c23a2c"/>
<path d="M14 70V64a6 6 0 016-6h10v6H20v6zM146 70v-6a6 6 0 00-6-6h-10v6h10v6zM14 110v6a6 6 0 006 6h10v-6H20v-6zM146 110v6a6 6 0 01-6 6h-10v-6h10v-6z" fill="url(#lvb)" stroke="#5a3a0c" stroke-width=".8"/>
<rect x="72" y="56" width="16" height="16" rx="3" fill="url(#lvb)" stroke="#5a3a0c"/><path d="M80 61a2.4 2.4 0 012 4l1 4h-6l1-4a2.4 2.4 0 012-4z" fill="#3a2508"/></g>
<g class="lvu-chest__lid"><path d="M12 60V42Q12 18 80 15Q148 18 148 42V60Z" fill="url(#lvl)" stroke="#2a1405" stroke-width="2"/>
<path d="M30 58V26M130 58V26" stroke="url(#lvb)" stroke-width="7"/>
<rect x="40" y="38" width="80" height="14" rx="3" fill="#2f9c95" stroke="url(#lvb)" stroke-width="2"/>
${[52, 66, 80, 94, 108].map((x) => `<path transform="translate(${x} 45)" d="M0-4.5L1.3-1.3 4.5 0 1.3 1.3 0 4.5-1.3 1.3-4.5 0-1.3-1.3Z" fill="#f4f0e6"/>`).join('')}
<path d="M16 42Q16 22 80 19" stroke="rgba(255,230,180,.35)" stroke-width="2" fill="none"/></g></svg>`;

// 8 köşe yıldızlı çini kafes (arka plan deseni)
const PATTERN = `<svg class="lvu__pat" aria-hidden="true"><defs><pattern id="lvp" width="72" height="72" patternUnits="userSpaceOnUse"><g fill="none" stroke="rgba(232,191,98,.5)" stroke-width="1"><rect x="22" y="22" width="28" height="28"/><rect x="22" y="22" width="28" height="28" transform="rotate(45 36 36)"/><circle cx="36" cy="36" r="6" stroke="rgba(90,170,200,.55)"/><path d="M0 22v-8h8M72 22v-8h-8M0 50v8h8M72 50v8h-8M22 0h-8v8M50 0h8v8M22 72h-8v-8M50 72h8v-8" stroke="rgba(90,170,200,.4)"/><path d="M0 36h8M64 36h8M36 0v8M36 64v8"/></g></pattern><radialGradient id="lvm" cx=".5" cy=".46" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="lvk"><rect width="100%" height="100%" fill="url(#lvm)"/></mask></defs><rect width="100%" height="100%" fill="url(#lvp)" mask="url(#lvk)"/></svg>`;

const C = 2 * Math.PI * 86;

// { host, from, to, unlocks:[{kind,...item}], avatar (svg ya da kimlik), audio, profile, calm } → Promise (kapanınca)
export function showLevelUp(o) {
  return new Promise((resolve) => {
    const { host, from, to, unlocks = [], avatar, audio, profile, calm } = o;
    const newTitle = unlocks.find((u) => u.kind === 'title') || null;
    const cards = unlocks.filter((u) => u.kind !== 'title');
    const equipable = [...cards].reverse().find((u) => u.kind === 'frame' || u.kind === 'effect' || u.kind === 'tiles');
    const el = document.createElement('div');
    el.className = 'lvu' + (cards.length ? ' has-box' : '') + (calm ? ' is-calm' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `Seviye ${to}`);
    const ticks = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const r0 = i % 4 ? 97 : 95;
      return `<path d="M${(100 + Math.cos(a) * r0).toFixed(1)} ${(100 + Math.sin(a) * r0).toFixed(1)}L${(100 + Math.cos(a) * 100).toFixed(1)} ${(100 + Math.sin(a) * 100).toFixed(1)}"/>`;
    }).join('');
    el.innerHTML = `
      <div class="lvu__veil"></div>${PATTERN}<div class="lvu__rays"></div><canvas class="lvu__fx"></canvas>
      <div class="lvu__stage">
        <div class="lvu__main">
          <div class="lvu__ring">
            <i class="lvu__shock"></i><i class="lvu__shock lvu__shock--2"></i>
            <svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="lvr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#f0bf55"/><stop offset="1" stop-color="#b9781e"/></linearGradient></defs>
              <circle cx="100" cy="100" r="86" class="lvu__trk"/><circle cx="100" cy="100" r="86" class="lvu__val" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${C.toFixed(1)}"/>
              <g class="lvu__ticks">${ticks}</g><circle cx="100" cy="100" r="72" class="lvu__disc"/></svg>
            <div class="lvu__num"><b class="lvu__old">${from}</b><b class="lvu__new">${to}</b><small>SEVİYE</small></div>
          </div>
          <div class="lvu__text"><span class="lvu__eyebrow">Seviye atladın</span><h2>${newTitle ? esc(newTitle.name) : esc(titleFor(to).name)}</h2>
            <p>${newTitle ? 'Yeni unvan kazandın' : to - from > 1 ? `${to - from} seviye birden!` : 'Masada adın büyüyor'}</p></div>
        </div>
        ${cards.length ? `<div class="lvu__reward"><div class="lvu__box">${CHEST}</div><div class="lvu__cards">${cards.slice(0, 3).map((c, i) => rewardCard(c, avatar, i)).join('')}${cards.length > 3 ? `<div class="rw-more">+${cards.length - 3}</div>` : ''}</div></div>` : ''}
      </div>
      <div class="lvu__actions">${equipable ? `<button class="lvu__btn lvu__btn--gold" data-equip>Hemen kuşan</button>` : ''}<button class="lvu__btn" data-close>Devam</button></div>
      <p class="lvu__skip">Geçmek için dokun</p>`;
    host.appendChild(el);
    const fx = new Celebration(el.querySelector('.lvu__fx'));
    const val = el.querySelector('.lvu__val');
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let done = false;
    const phase = (p) => el.classList.add(p);
    const burst = () => {
      if (el.classList.contains('p-burst')) return;
      phase('p-burst');
      const r = el.querySelector('.lvu__ring').getBoundingClientRect();
      const h = el.getBoundingClientRect();
      const rays = el.querySelector('.lvu__rays');
      rays.style.left = r.left - h.left + r.width / 2 + 'px';
      rays.style.top = r.top - h.top + r.height / 2 + 'px';
      fx.burstAt(r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, { calm });
    };
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      el.classList.add('is-skip', 'p-fill', 'p-text', 'p-box', 'p-open', 'p-cards', 'p-done');
      val.style.strokeDashoffset = '0';
      burst();
    };
    // akış
    requestAnimationFrame(() => {
      phase('p-in');
      audio?.fanfare?.('rast');
      requestAnimationFrame(() => {
        phase('p-fill');
        val.style.strokeDashoffset = '0';
      });
    });
    at(1150, burst);
    at(1450, () => phase('p-text'));
    if (cards.length) {
      at(1900, () => phase('p-box'));
      at(2600, () => {
        phase('p-open');
        audio?.play?.('open', { quiet: true });
      });
      at(2800, () => phase('p-cards'));
      at(3700, () => {
        done = true;
        phase('p-done');
      });
    } else
      at(2600, () => {
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
      }, 380);
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-equip]')) {
        profile?.equip?.(equipable.kind, equipable.id);
        if (equipable.kind === 'tiles') window.__okey?.settings?.set('tiles', equipable.id);
        const b = e.target.closest('[data-equip]');
        b.textContent = 'Kuşanıldı';
        b.disabled = true;
        return;
      }
      if (e.target.closest('[data-close]')) return close();
      if (!el.classList.contains('p-done')) finish();
    });
  });
}
