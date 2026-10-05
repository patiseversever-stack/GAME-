// İlk açılış: ad ve avatar seçimi (profil merkezinden düzenleme olarak da açılır).
// Ad canlı denetlenir (meta/name-filter.js): biçim, küfür / hakaret, sahte yetkili. Uygun olmayan ad kaydedilmez.
import { ROSTER, avatarSVG } from '../ui/avatars.js';
import { framedAvatar } from '../ui/frame-ui.js';
import { checkName, NAME_MAX } from '../meta/name-filter.js';
import { icon } from '../ui/icons.js';
import { istanbulSVG } from '../ui/illustrations.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// { host, settings, profile, audio, mode: 'first' | 'edit' } → Promise<{ name, avatar } | null>
export function openOnboarding(o) {
  return new Promise((resolve) => {
    const { host, settings, profile, audio } = o;
    const edit = o.mode === 'edit';
    const cur = settings.get('playerName');
    let name = edit && cur && cur !== 'Oyuncu' ? cur : '';
    let av = settings.get('playerAvatar') || ROSTER[0].id;
    const frame = profile?.equipped?.('frame') || 'sade';
    const el = document.createElement('div');
    el.className = 'ob' + (edit ? ' is-edit' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', edit ? 'Profili düzenle' : 'Hoş geldin');
    el.innerHTML = `
      <div class="ob__bg" aria-hidden="true"><i class="ob-amb"></i><i class="ob-amb ob-amb--2"></i><div class="ob-ill">${istanbulSVG()}</div></div>
      <div class="ob__wrap">
        <section class="ob__left">
          <div class="ob-preview"><i class="ob-glow"></i><span class="ob-fav">${framedAvatar(av, frame)}</span><i class="ob-floor"></i></div>
          <div class="ob-pick" role="radiogroup" aria-label="Avatar">${ROSTER.map((r) => `<button role="radio" data-av="${r.id}" aria-checked="${r.id === av}" aria-label="${esc(r.name)}">${avatarSVG(r.id)}</button>`).join('')}</div>
        </section>
        <section class="ob__right">
          <span class="ob-eyebrow">Patisever Okey</span>
          <h1>${edit ? 'Profilini düzenle.' : 'Hoş geldin.'}</h1>
          <p class="ob-sub">${edit ? 'Adın ve avatarın masada böyle görünecek.' : 'Masada seni nasıl tanısınlar? Bir ad ve avatar seç.'}</p>
          <label class="ob-field"><span class="ob-field__lbl">Kullanıcı adı</span>
            <span class="ob-input"><input type="text" inputmode="text" autocomplete="nickname" autocapitalize="words" spellcheck="false" maxlength="${NAME_MAX + 4}" placeholder="Örneğin Kahvehane Ustası" value="${esc(name)}"><i class="ob-state" aria-hidden="true"></i><em class="ob-count">0/${NAME_MAX}</em></span>
            <span class="ob-msg" role="status"></span></label>
          <button class="ob-cta" data-go disabled>${edit ? 'Kaydet' : 'Masaya otur'}</button>
          <p class="ob-fine">${icon('lock')}<span>Adın çevrim içi masalarda ve sıralamalarda görünecek. Küfür, hakaret ya da yetkili taklidi içeren adlar kabul edilmez.</span></p>
        </section>
      </div>
      ${edit ? `<button class="ob__x" data-x aria-label="Kapat">${icon('close')}</button>` : ''}`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    const input = el.querySelector('input');
    const msg = el.querySelector('.ob-msg');
    const cta = el.querySelector('[data-go]');
    const count = el.querySelector('.ob-count');
    const field = el.querySelector('.ob-input');
    let touched = !!name;
    function validate() {
      const v = input.value;
      const r = checkName(v);
      count.textContent = `${r.name.length}/${NAME_MAX}`;
      field.classList.toggle('is-ok', r.ok);
      field.classList.toggle('is-bad', !r.ok && touched && v.trim().length > 0);
      msg.textContent = r.ok ? 'Bu ad uygun' : touched && v.trim() ? r.reason : '3–16 karakter: harf, rakam, boşluk ve . _ -';
      msg.className = 'ob-msg' + (r.ok ? ' is-ok' : touched && v.trim() ? ' is-bad' : '');
      cta.disabled = !r.ok;
      return r;
    }
    validate();
    if (!edit) setTimeout(() => input.focus({ preventScroll: true }), 650);
    input.addEventListener('input', () => {
      touched = true;
      validate();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !cta.disabled) save();
    });
    function setAvatar(id) {
      av = id;
      el.querySelectorAll('[data-av]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.av === id)));
      const box = el.querySelector('.ob-fav');
      box.classList.remove('is-swap');
      void box.offsetWidth;
      box.innerHTML = framedAvatar(id, frame);
      box.classList.add('is-swap');
    }
    function save() {
      const r = validate();
      if (!r.ok) return;
      settings.set('playerName', r.name);
      settings.set('playerAvatar', av);
      settings.set('onboarded', true);
      audio?.play?.('win', { quiet: true });
      close({ name: r.name, avatar: av });
    }
    function close(res) {
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 380);
      resolve(res);
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-av]');
      if (b) {
        audio?.unlock?.();
        audio?.play?.('tap');
        return setAvatar(b.dataset.av);
      }
      if (e.target.closest('[data-go]')) return save();
      if (e.target.closest('[data-x]')) return close(null);
    });
  });
}
