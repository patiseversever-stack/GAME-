// Ödüllü reklam köprüsü. Oyun reklam SDK'sı taşımaz; reklamı uygulama kabuğu gösterir ve sonucu bildirir.
//
// Uygulama tarafı (React Native) şu yollardan birini sağlar:
//  1) window.PatiOkeyHost.showRewardedAd({ placement }) → Promise<boolean | { rewarded: boolean }>
//  2) WebView mesajı: oyun ReactNativeWebView.postMessage(JSON.stringify({ type: 'OKEY_REWARDED_AD_REQUEST', id, placement }))
//     gönderir; uygulama sonucu window.__okeyAdResult(id, rewarded) çağırarak ya da
//     window.postMessage({ type: 'OKEY_REWARDED_AD_RESULT', id, rewarded }) ile döndürür.
// İkisi de yoksa (tarayıcı, önizleme) açıkça "test reklamı" yazan bir demo pencere açılır; gerçek reklam değildir.
import { icon } from '../ui/icons.js';

const pending = new Map();
let seq = 0;
const TIMEOUT = 120000;

function settle(id, rewarded, reason) {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  clearTimeout(p.timer);
  p.resolve({ ok: !!rewarded, reason: rewarded ? 'rewarded' : reason || 'dismissed' });
}
// uygulama → oyun
window.__okeyAdResult = (id, rewarded, reason) => settle(String(id), rewarded, reason);
const onMessage = (e) => {
  let d = e.data;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      return;
    }
  }
  if (d && d.type === 'OKEY_REWARDED_AD_RESULT') settle(String(d.id), d.rewarded, d.reason);
};
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage); // Android WebView

export const adMode = () => (window.PatiOkeyHost?.showRewardedAd ? 'host' : window.ReactNativeWebView?.postMessage ? 'bridge' : 'demo');

// → Promise<{ ok: boolean, reason }>
export function requestRewardedAd(placement, host = document.body) {
  const mode = adMode();
  if (mode === 'host') {
    return Promise.resolve()
      .then(() => window.PatiOkeyHost.showRewardedAd({ placement }))
      .then((r) => ({ ok: r === true || !!r?.rewarded, reason: r === true || r?.rewarded ? 'rewarded' : r?.reason || 'dismissed' }))
      .catch((e) => ({ ok: false, reason: String(e?.message || 'error') }));
  }
  if (mode === 'bridge') {
    const id = 'ad' + Date.now().toString(36) + ++seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => settle(id, false, 'timeout'), TIMEOUT);
      pending.set(id, { resolve, timer });
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OKEY_REWARDED_AD_REQUEST', id, placement }));
      } catch {
        settle(id, false, 'error');
      }
    });
  }
  return demoAd(host);
}

// Tarayıcı demosu: 5 sn geri sayım, sonra "Ödülü al". Açıkça test olduğu yazar.
function demoAd(host) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'adm';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Test reklamı');
    const C = 2 * Math.PI * 22;
    el.innerHTML = `<div class="adm__card">
      <span class="adm__tag">TEST REKLAMI</span>
      <div class="adm__art">${icon('ad')}</div>
      <b class="adm__title">Burada ödüllü reklam oynar</b>
      <p class="adm__note">Bu bir test penceresidir. Uygulamada gerçek ödüllü reklam gösterilir.</p>
      <div class="adm__row"><span class="adm__ring"><svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="22"/><circle class="adm__val" cx="25" cy="25" r="22" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${C.toFixed(1)}"/></svg><b>5</b></span>
      <button class="adm__btn" data-claim disabled>Ödülü al</button><button class="adm__skip" data-skip>Vazgeç</button></div></div>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    const val = el.querySelector('.adm__val');
    const n = el.querySelector('.adm__ring b');
    const claim = el.querySelector('[data-claim]');
    let left = 5;
    requestAnimationFrame(() => requestAnimationFrame(() => (val.style.strokeDashoffset = '0')));
    const tick = setInterval(() => {
      left--;
      n.textContent = String(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        claim.disabled = false;
        el.classList.add('is-ready');
      }
    }, 1000);
    const close = (ok) => {
      clearInterval(tick);
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 260);
      resolve({ ok, reason: ok ? 'rewarded' : 'dismissed', demo: true });
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-claim]') && !claim.disabled) close(true);
      else if (e.target.closest('[data-skip]')) close(false);
    });
  });
}
