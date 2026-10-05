// Ana menü: 3B masa sahnesi üstünde eğik fildişi taş mod kartları (Klasik / 101 Okey), profil kapsülü ve profil merkezi
// (görevler, başarımlar, istatistik, kurallar — hub.js), köşede söz yazan ıstaka ve onun üstünde OKEY logosu.
import { MenuStage } from '../render3d/menu-stage.js';
import { webglAvailable } from '../render3d/stage.js';
import { openHub, setHubData } from './hub.js';
import { ACHIEVEMENTS } from '../meta/profile.js';
import { avatarSVG } from '../ui/avatars.js';
import { framedAvatar } from '../ui/frame-ui.js';
import { levelTier } from '../meta/progression.js';
import { openBazaar } from './bazaar.js';
import { frameURL, FRAME_IDS } from '../render3d/tile-themes/frames.js';
import { icon } from '../ui/icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function tryFullscreen() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
  } catch {}
  try {
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    const p = el.requestFullscreen({ navigationUI: 'hide' });
    p?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } catch {}
}

// Uygulama kabuğu menüyü filmin arkasında hazırlar; görünür olunca giriş baştan oynar (window.__okeyReplayIntro):
// kamera süzülür, lamba ısınır, ıstaka büyüyüp sözünü dağıtır, logo harfleri tıkla düşer.
let current = null;
export function replayIntro() {
  try {
    const m = current?.menu3d;
    const h = current?.root;
    const now = performance.now();
    if (m?.running) {
      m.t0 = now;
      m._last = 0;
      m.rackBorn = now;
      m.burst = m.calm ? 3 : 8;
      m.fallTimer = 0.6;
    }
    if (h) {
      h.classList.remove('h6-replay');
      void h.offsetWidth;
      h.classList.add('h6-replay');
    }
    logoClacks(current?.audio);
    setTimeout(gyroHint, 2900);
  } catch {}
}

// Tek seferlik jiroskop ipucu ("Telefonunu eğ, masa seninle hareket etsin")
export function gyroHint() {
  try {
    const m = current?.menu3d;
    const h = current?.root;
    if (!m || !h || m.gyroOff || !m.gyroSeen || localStorage.getItem('okey.gyroHint')) return;
    localStorage.setItem('okey.gyroHint', '1');
    const el = document.createElement('div');
    el.className = 'h6-gyro';
    el.setAttribute('role', 'status');
    el.innerHTML = '<i class="h6-gyro__ph" aria-hidden="true"></i><span>Telefonunu eğ, masa seninle hareket etsin</span>';
    h.appendChild(el);
    setTimeout(() => el.remove(), 4700);
  } catch {}
}

// OKEY logosunun harfleri tek tek düşerken tıkırdar (yalnız ses, titreşim yok)
function logoClacks(audio) {
  [0, 1, 2, 3].forEach((i) =>
    setTimeout(
      () => {
        try {
          audio?.play?.('place', { quiet: true, vol: 0.2 });
        } catch {}
      },
      1250 + i * 200,
    ),
  );
}

export function createHome({ host, settings, profile, audio, saved, onStart, onResume, ui }) {
  const root = document.createElement('div');
  root.className = 'home3 h4';
  const diff = settings.get('difficulty') || 'normal';
  const prog = profile.progress();
  const goals = profile.d.daily.goals;
  const doneGoals = goals.filter((g) => g.done).length;
  const roster = settings.get('playerAvatar');
  const pname = settings.get('playerName') || 'Oyuncu';
  const pct = Math.round((prog.into / prog.need) * 100);
  // Üst çubuk: solda profil kapsülü (bekleyen görev rozeti, profil merkezini açar) ve "Devam et"; sağda ses/ayarlar.
  // Logo sağ köşedeki 3B ıstakanın üstünde durur (MenuStage._anchor); mod kartları solda eğik iki fildişi taş.
  root.innerHTML = `
    <div class="h4-shade"></div>
    <div class="h4-rays"></div>
    <header class="h4-top">
      <button class="h4-profile" data-a="profile" aria-label="Profil" data-goals="${goals.length - doneGoals}">
        <span class="h4-ring has-frame" style="--p:${pct}">${framedAvatar(roster, profile.equipped('frame'))}<b class="lvl lvl--${levelTier(prog.level)}">${prog.level}</b></span>
        <span class="h4-who"><b>${esc(pname)}</b><span class="h4-xp"><s style="width:${pct}%"></s></span><em><span class="h4-ttl">${esc(profile.equipped('title').name)}</span>${prog.into} / ${prog.need} XP</em></span>
      </button>
      ${saved ? `<button class="h4-resume" data-a="resume"><span class="h4-resume__ic">${icon('play')}</span><span><b>Devam et</b><em>${saved.mode === 'okey101' ? '101 Okey' : 'Okey'} · El ${saved.round}</em></span></button>` : ''}
      <button class="h4-bazaar" data-a="bazaar" aria-label="Çarşı">${icon('bazaar')}<span>Çarşı</span></button>
      <div class="h4-icons">
        <button class="h4-ic" data-a="sound" aria-label="Ses">${icon(settings.get('sfx') ? 'volumeOn' : 'volumeOff')}</button>
        <button class="h4-ic" data-a="settings" aria-label="Ayarlar">${icon('cog')}</button>
      </div>
    </header>
    <section class="h4-brand">
      <div class="h4-crest"><i></i><small>PATISEVER</small><i></i></div>
      <h1 class="h5-logo" aria-label="OKEY">${[
        ['O', 'r'],
        ['K', 'b'],
        ['E', 'k'],
        ['Y', 'y'],
      ]
        .map(([ch, c], i) => `<span class="h5-lt h5-lt--${c}" style="--i:${i}"><b>${ch}</b><i></i></span>`)
        .join('')}</h1>
    </section>
    <section class="h4-modes">
      <button class="h4-card" data-m="okey" aria-label="Okey oyna">
        <span class="h4-halo"></span>
        <span class="h4-tile h4-tile--gold"><i class="h4-star"></i><b class="h6-name">Klasik Okey</b><small class="h6-sub">Elini per yap, ilk bitiren kazanır</small><span class="h4-play">${icon('play')}<b>OYNA</b></span></span>
      </button>
      <button class="h4-card" data-m="okey101" aria-label="101 Okey oyna">
        <span class="h4-halo"></span>
        <span class="h4-tile"><b class="h4-num">101</b><span class="h4-marks"><i class="r"></i><i class="b"></i><i class="k"></i><i class="y"></i></span><b class="h6-name">101 Okey</b><small class="h6-sub">101 ile aç, en düşük puan kazanır</small><span class="h4-play">${icon('play')}<b>OYNA</b></span></span>
      </button>
    </section>`;
  host.appendChild(root);
  logoClacks(audio);

  let menu3d = null;
  if (webglAvailable() && settings.get('quality') !== 'dom') {
    try {
      menu3d = new MenuStage(root, { quality: settings.get('quality'), gyro: settings.get('gyro') !== false });
      root.insertBefore(menu3d.canvas, root.firstChild);
      menu3d.onClack = (v) => audio.play?.('place', { quiet: true, vol: 0.12 + 0.25 * v });
      window.__menu = menu3d;
    } catch (e) {
      console.warn('Menü 3B başlatılamadı', e);
    }
  }
  current = { root, menu3d, audio };
  // kuşanılan çerçeve / unvan değişince kapsül yerinde yenilenir (Ödüller, Çarşı, seviye atlama)
  const paintCapsule = () => {
    const p = profile.progress();
    const ring = root.querySelector('.h4-ring');
    ring.innerHTML = `${framedAvatar(settings.get('playerAvatar'), profile.equipped('frame'))}<b class="lvl lvl--${levelTier(p.level)}">${p.level}</b>`;
    const ttl = root.querySelector('.h4-ttl');
    if (ttl) ttl.textContent = profile.equipped('title').name;
  };
  // çerçeveler menü sakinken arka planda boyanır (IndexedDB'ye yazılır): Ödüller ve Çarşı anında dolu açılır
  const warm = setTimeout(() => FRAME_IDS.forEach((id) => frameURL(id, false)), 2500);
  const offProfile = profile.onChange((ev) => (ev?.equip || ev?.grant || ev?.ad || ev?.adopt) && paintCapsule());
  // ad / avatar değişince (ilk açılış, profil düzenleme) kapsül ve profil merkezi verisi yenilenir
  const offSettings = settings.subscribe((k) => {
    if (k !== 'playerName' && k !== 'playerAvatar') return;
    paintCapsule();
    const nm = root.querySelector('.h4-who > b');
    if (nm) nm.textContent = settings.get('playerName') || 'Oyuncu';
    setHubData({ e: profile, h: profile.progress(), u: profile.d.daily.goals, p: settings.get('playerName') || 'Oyuncu', Ra: ACHIEVEMENTS, av: avatarSVG(settings.get('playerAvatar')) });
  });
  audio.setMusicWanted?.(true, 'menu'); // menüde ney ve ud taksimi (ilk dokunuşta başlar)
  setHubData({ e: profile, h: prog, u: goals, p: pname, Ra: ACHIEVEMENTS, av: avatarSVG(roster) });

  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]');
    if (m) {
      audio.unlock?.();
      audio.play?.('tap');
      m.classList.add('is-pressed');
      root.classList.add('is-leaving');
      tryFullscreen();
      menu3d?.dive();
      // rakip seviyesi Ayarlar › Oynanış'ta seçilir
      setTimeout(() => onStart(m.dataset.m, settings.get('lastDifficulty') || diff), menu3d ? 620 : 120);
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    audio.unlock?.();
    audio.play?.('tap');
    if (a === 'sound') {
      settings.set('sfx', !settings.get('sfx'));
      e.target.closest('button').innerHTML = icon(settings.get('sfx') ? 'volumeOn' : 'volumeOff');
      return;
    }
    if (a === 'resume') {
      tryFullscreen();
      return onResume();
    }
    if (a === 'profile') return openHub('prof');
    if (a === 'bazaar') return openBazaar({ host, profile, settings, audio });
    if (a === 'settings') return ui.settings();
  });

  return {
    el: root,
    destroy() {
      offProfile();
      offSettings();
      clearTimeout(warm);
      document.querySelector('.bz2')?.remove();
      menu3d?.destroy();
      root.remove();
      if (current?.root === root) current = null;
    },
  };
}
