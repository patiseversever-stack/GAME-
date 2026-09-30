// Rakip koltuk panelleri: avatar, isim, zorluk noktaları, taş sayısı, düşünme göstergesi, kapalı taş rafı.
// Kısa durum mesajları ("açtı · 85") panelin dışında küçük bir balon olarak çıkar → panel küçük kalır.
import { avatarSVG } from './avatars.js';

const LEVEL_DOTS = { casual: 1, normal: 2, expert: 3 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SeatView {
  // cfg: { seat, name, avatar, difficulty, orient:'v'|'h' }
  constructor(layer, cfg) {
    this.cfg = cfg;
    this.el = document.createElement('div');
    this.el.className = `seat seat--${cfg.orient}`;
    this.el.dataset.seat = String(cfg.seat);
    const dots = LEVEL_DOTS[cfg.difficulty] || 2;
    this.el.innerHTML = `
      <div class="seat__glow"></div>
      <div class="seat__card">
        <div class="seat__main">
          <div class="seat__avatar">${avatarSVG(cfg.avatar)}<svg class="seat__ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" pathLength="100"/></svg></div>
          <div class="seat__text">
            <div class="seat__name"></div><div class="seat__score num"></div>
            <div class="seat__sub"><span class="seat__count num">0</span><span class="lvl" title="Seviye">${[1, 2, 3].map((i) => `<i class="${i <= dots ? 'on' : ''}"></i>`).join('')}</span><span class="seat__think" aria-hidden="true"><i></i><i></i><i></i></span></div>
          </div>
        </div>
        <div class="seat__backs"></div>
      </div>
      <div class="seat__status"></div>`;
    if (cfg.seat === 1) this.el.classList.add('seat--right');
    this.$name = this.el.querySelector('.seat__name');
    this.$count = this.el.querySelector('.seat__count');
    this.$status = this.el.querySelector('.seat__status');
    this.$backs = this.el.querySelector('.seat__backs');
    this.$name.textContent = cfg.name;
    this.rendered = -1;
    this._statusTimer = 0;
    layer.appendChild(this.el);
  }

  place(rect, sizeClass) {
    const s = this.el.style;
    s.left = rect.x + 'px';
    s.top = rect.y + 'px';
    s.width = rect.w + 'px';
    s.height = rect.h + 'px';
    const v = this.cfg.orient === 'v';
    // avatar: dikey panelde genişlik ve yükseklikle, yatay panelde yükseklikle sınırlı
    const av = v ? Math.min(rect.w - 14, rect.h * 0.4, 76) : Math.min(rect.h - 10, 76);
    this.av = clamp(Math.round(av), 24, 76);
    s.setProperty('--av', this.av + 'px');
    this.el.dataset.size = sizeClass;
    this.el.classList.toggle('is-compact', rect.h < 92 && v ? true : rect.h < 50);
    this.rect = rect;
    this.rendered = -1; // kapalı taş rafını yeniden hesapla
    this._layoutBacks();
    requestAnimationFrame(() => this.sync3d());
  }

  _layoutBacks() {
    if (!this.rect) return;
    const n = Math.max(this.count ?? 0, 1);
    const v = this.cfg.orient === 'v';
    const r = this.rect;
    const st = this.el.style;
    if (v) {
      // dikey panel: ekran kenarında dikey taş şeridi (gerçek masadaki rakip ıstakası)
      const room = Math.max(40, r.h - 14);
      const step = Math.min(8, Math.max(2.4, room / n));
      const thick = Math.max(3.4, Math.min(8, step * 1.25));
      st.setProperty('--bh', Math.round(clamp(r.w * 0.2, 8, 12)) + 'px'); // taşın dışa uzanan boyu
      st.setProperty('--bw', thick.toFixed(1) + 'px'); // kalınlık
      st.setProperty('--bm', (step - thick).toFixed(1) + 'px');
    } else {
      const room = Math.max(44, r.w - (this.av || 32) - 100);
      const bh = clamp(r.h * 0.34, 9, 17);
      const slot = room / n;
      const gap = slot >= 7.5 ? 2 : 0;
      const bw = slot >= 7.5 ? Math.min(10, slot - gap) : Math.max(3.4, slot * 1.5);
      const step = slot >= 7.5 ? bw + gap : slot;
      st.setProperty('--bh', Math.round(bh) + 'px');
      st.setProperty('--bw', bw.toFixed(1) + 'px');
      st.setProperty('--bm', (step - bw).toFixed(1) + 'px');
    }
  }

  setCount(n) {
    this.count = n;
    this.$count.textContent = String(n);
    if (this.rendered !== n) {
      this.rendered = n;
      const cur = this.$backs.children.length;
      if (cur < n) {
        const frag = document.createDocumentFragment();
        for (let i = cur; i < n; i++) frag.appendChild(document.createElement('i'));
        this.$backs.appendChild(frag);
      } else while (this.$backs.children.length > n) this.$backs.lastChild.remove();
      this._layoutBacks();
    }
    this.sync3d();
  }

  // 3B çizici varsa rakip ıstakasını orada çiz (DOM şeridi gizli kalır)
  sync3d() {
    if (!this.stage || !this.el.isConnected) return;
    const b = this.$backs.getBoundingClientRect();
    if (!b.width) return;
    this.stage.setOpponent(this.cfg.seat, { x: b.left, y: b.top, w: b.width, h: b.height }, this.count || 0, this.cfg.orient === 'v');
  }

  // Yeni taş geldiğinde (çekme/alma) küçük "pop"
  pop() {
    const last = this.$backs.lastElementChild;
    if (last && last.animate) last.animate([{ transform: 'scale(1.6)', opacity: 0.5 }, { transform: 'scale(1)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
  }

  setScore(v) {
    const el = this.el.querySelector('.seat__score');
    if (el && el.textContent !== String(v)) el.textContent = String(v);
  }

  setActive(on) {
    const was = this.el.classList.contains('is-active');
    this.el.classList.toggle('is-active', !!on);
    // sıra halkası: her yeni sırada baştan dolar
    if (on && !was) {
      const c = this.el.querySelector('.seat__ring circle');
      if (c) {
        c.style.animation = 'none';
        void c.getBoundingClientRect();
        c.style.animation = '';
      }
    }
  }

  // text: kısa bildirim balonu (≈2 sn); thinking: sayı yanında nokta animasyonu
  setStatus(text, { thinking = false, good = false } = {}) {
    clearTimeout(this._statusTimer);
    this.el.classList.toggle('is-thinking', !!thinking);
    const st = this.$status;
    if (!text) {
      st.textContent = '';
      st.classList.remove('is-on', 'is-good');
      return;
    }
    st.textContent = text;
    st.classList.toggle('is-good', !!good);
    st.classList.add('is-on');
    this._statusTimer = setTimeout(() => st.classList.remove('is-on'), 2600);
  }

  // Tile'ın bu koltuğa girişi/çıkışı için hedef nokta (ekran koordinatı)
  anchor() {
    const r = this.rect;
    if (this.cfg.orient === 'v') {
      const b = this.$backs.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + Math.min(b.height, 60) / 2 };
    }
    return { x: r.x + r.w / 2, y: r.y + r.h - 8 };
  }

  destroy() {
    clearTimeout(this._statusTimer);
    this.el.remove();
  }
}
