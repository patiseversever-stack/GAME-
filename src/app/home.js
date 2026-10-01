// Ana menü: 3B masa sahnesi üstünde dev fildişi taş düğmeler (Okey / 101 Okey), profil, günlük görevler, başarımlar, istatistikler.
import { MenuStage } from '../render3d/menu-stage.js';
import { webglAvailable } from '../render3d/stage.js';
import { sheet } from './overlays.js';
import { ACHIEVEMENTS, xpForNext } from '../meta/profile.js';
import { avatarSVG } from '../ui/avatars.js';
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

export function createHome({ host, settings, profile, audio, saved, onStart, onResume, ui }) {
  const root = document.createElement('div');
  root.className = 'home3 h4';
  let diff = settings.get('difficulty') || 'normal';
  const prog = profile.progress();
  const goals = profile.d.daily.goals;
  const doneGoals = goals.filter((g) => g.done).length;
  const roster = settings.get('playerAvatar');
  const pname = settings.get('playerName') || 'Oyuncu';
  const pct = Math.round((prog.into / prog.need) * 100);
  const streak = profile.d.stats?.streak || 0;
  root.innerHTML = `
    <div class="h4-shade"></div>
    <div class="h4-rays"></div>
    <header class="h4-top">
      <button class="h4-profile" data-a="profile" aria-label="Profil">
        <span class="h4-ring" style="--p:${pct}"><i>${avatarSVG(roster)}</i><b>${prog.level}</b></span>
        <span class="h4-who"><b>${esc(pname)}</b><span class="h4-xp"><s style="width:${pct}%"></s></span><em>${prog.into} / ${prog.need} XP</em></span>
      </button>
      <div class="h4-chips">
        <button class="h4-chip" data-a="goals"><i>${icon('target')}</i><b>${doneGoals}/${goals.length}</b><span>Görev</span></button>
        <span class="h4-chip h4-chip--fire"><i>${icon('bolt')}</i><b>${streak}</b><span>Seri</span></span>
      </div>
      <div class="h4-icons">
        <button class="h4-ic" data-a="fs" aria-label="Tam ekran">${icon('expand')}</button>
        <button class="h4-ic" data-a="sound" aria-label="Ses">${icon(settings.get('sfx') ? 'volumeOn' : 'volumeOff')}</button>
        <button class="h4-ic" data-a="settings" aria-label="Ayarlar">${icon('cog')}</button>
      </div>
    </header>
    <section class="h4-brand">
      <div class="h4-crest"><i></i><small>PATISEVER</small><i></i></div>
      <h1 class="h5-logo" aria-label="OKEY">${[["O", "r"], ["K", "b"], ["E", "k"], ["Y", "y"]].map(([ch, c], i) => `<span class="h5-lt h5-lt--${c}" style="--i:${i}"><b>${ch}</b><i></i></span>`).join("")}</h1>
      <p class="h4-sub"><span>Klasik</span><i></i><span>101</span><i></i><span>Çevrimdışı</span></p>
      ${saved ? `<button class="h4-resume" data-a="resume"><span class="h4-resume__ic">${icon('play')}</span><span><b>Devam et</b><em>${saved.mode === 'okey101' ? '101 Okey' : 'Okey'} · El ${saved.round}</em></span></button>` : ''}
    </section>
    <section class="h4-modes">
      <button class="h4-card" data-m="okey" aria-label="Okey oyna">
        <span class="h4-halo"></span>
        <span class="h4-tile h4-tile--gold"><i class="h4-star"></i><b>OKEY</b></span>
        <span class="h4-plate"><b>Klasik Okey</b><em>14 taş · gösterge · okey</em></span>
        <span class="h4-play">${icon('play')}<b>OYNA</b></span>
      </button>
      <button class="h4-card" data-m="okey101" aria-label="101 Okey oyna">
        <span class="h4-halo"></span>
        <span class="h4-tile"><b class="h4-num">101</b><span class="h4-marks"><i class="r"></i><i class="b"></i><i class="k"></i><i class="y"></i></span></span>
        <span class="h4-plate"><b>101 Okey</b><em>Aç · işle · cezadan kaç</em></span>
        <span class="h4-play">${icon('play')}<b>OYNA</b></span>
      </button>
      <div class="h4-diff" role="radiogroup" aria-label="Zorluk">
        <span>Rakip</span><button role="radio" data-d="casual">Kolay</button><button role="radio" data-d="normal">Normal</button><button role="radio" data-d="expert">Uzman</button>
      </div>
    </section>
    <nav class="h4-dock">
      <button data-a="goals"><i>${icon('target')}</i><span>Görevler</span>${doneGoals < goals.length ? `<em>${goals.length - doneGoals}</em>` : ''}</button>
      <button data-a="ach"><i>${icon('trophy')}</i><span>Başarımlar</span></button>
      <button data-a="stats"><i>${icon('chart')}</i><span>İstatistik</span></button>
      <button data-a="how"><i>${icon('book')}</i><span>Kurallar</span></button>
    </nav>`;
  host.appendChild(root);

  let menu3d = null;
  if (webglAvailable() && settings.get('quality') !== 'dom') {
    try {
      menu3d = new MenuStage(root, { quality: settings.get('quality'), gyro: settings.get('gyro') !== false });
      root.insertBefore(menu3d.canvas, root.firstChild);
      menu3d.onClack = (v) => audio.play?.('place', { vol: 0.12 + 0.25 * v });
      window.__menu = menu3d;
    } catch (e) {
      console.warn('Menü 3B başlatılamadı', e);
    }
  }
  const mark = () => root.querySelectorAll('[data-d]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.d === diff)));
  mark();

  const open = {
    goals() {
      const tones = ['blue', 'violet', 'amber', 'pink'];
      const ics = ['target', 'bolt', 'star', 'trophy'];
      const rows = goals
        .map((g, i) => {
          const pctG = Math.min(100, Math.round((g.progress / g.target) * 100));
          const t = tones[i % tones.length];
          return `<div class="goal6 t-${t}${g.done ? ' is-done' : ''}"><span class="goal6__medal">${icon(ics[i % ics.length])}</span>
            <div class="goal6__main"><div class="goal6__top"><b>${esc(g.text)}</b><em>${g.progress}/${g.target}</em></div><div class="bar6"><i style="width:${pctG}%"></i></div></div>
            ${g.done ? `<span class="goal6__done">${icon('check')}</span>` : `<span class="goal6__xp">${icon('star')}50<small>XP</small></span>`}</div>`;
        })
        .join('');
      sheet(host, { title: 'Günlük görevler', sub: `${doneGoals} / ${goals.length} tamamlandı`, icon: 'target', tone: 'blue', body: `<div class="goals6">${rows}</div><p class="foot6">${icon('refresh')}<span>Görevler her gün yenilenir. Her görev 50 XP verir.</span></p>`, actions: [{ label: 'Tamam', primary: true }] });
    },
    ach() {
      const got = profile.d.achievements;
      const tones = ['amber', 'violet', 'teal', 'pink', 'mint', 'blue'];
      const items = ACHIEVEMENTS.map((a, i) => {
        const on = got[a.id];
        return `<div class="ach6 t-${tones[i % tones.length]}${on ? ' is-got' : ''}"><span class="ach6__medal">${on ? icon('trophy') : icon('lock')}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`;
      }).join('');
      sheet(host, { title: 'Başarımlar', sub: `${Object.keys(got).length} / ${ACHIEVEMENTS.length} kazanıldı`, icon: 'trophy', tone: 'amber', body: `<div class="achs6">${items}</div>`, actions: [{ label: 'Tamam', primary: true }] });
    },
    stats() {
      const s = profile.d.stats;
      const tile = (ic, tone, val, label) => `<div class="stat6 t-${tone}"><span class="stat6__medal">${icon(ic)}</span><b>${val}</b><small>${label}</small></div>`;
      sheet(host, {
        title: 'İstatistikler',
        sub: 'Masadaki yolculuğun',
        icon: 'chart',
        tone: 'violet',
        body: `<div class="stats6">${tile('layers', 'blue', s.rounds, 'Oynanan el')}${tile('trophy', 'amber', s.wins, 'Kazanılan el')}${tile('star', 'mint', `${s.matches.okey.won}/${s.matches.okey.played}`, 'Okey maçı')}${tile('target', 'pink', `${s.matches.okey101.won}/${s.matches.okey101.played}`, '101 maçı')}${tile('bolt', 'teal', `${s.streak}`, `Seri · en iyi ${s.bestStreak}`)}${tile('hand', 'violet', s.open101, '101’de açılış')}</div>`,
        actions: [{ label: 'Tamam', primary: true }],
      });
    },
    profile() {
      sheet(host, {
        title: esc(pname),
        sub: `Seviye ${prog.level}`,
        icon: 'user',
        tone: 'mint',
        body: `<div class="prof6"><div class="prof6__xp"><b>${prog.into}<small> / ${prog.need} XP</small></b><div class="bar6"><i style="width:${pct}%"></i></div><p>Sonraki seviyeye <b>${prog.need - prog.into} XP</b></p></div></div>`,
        actions: [{ label: 'Tamam', primary: true }],
      });
    },
  };

  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]');
    if (d) {
      diff = d.dataset.d;
      settings.set('difficulty', diff);
      mark();
      audio.play?.('tap');
      return;
    }
    const m = e.target.closest('[data-m]');
    if (m) {
      audio.unlock?.();
      audio.play?.('tap');
      m.classList.add('is-pressed');
      root.classList.add('is-leaving');
      tryFullscreen();
      menu3d?.dive();
      setTimeout(() => onStart(m.dataset.m, diff), menu3d ? 620 : 120);
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    audio.unlock?.();
    audio.play?.('tap');
    if (a === 'fs') return document.fullscreenElement ? document.exitFullscreen?.() : tryFullscreen();
    if (a === 'sound') {
      settings.set('sfx', !settings.get('sfx'));
      e.target.closest('button').innerHTML = icon(settings.get('sfx') ? 'volumeOn' : 'volumeOff');
      return;
    }
    if (a === 'resume') {
      tryFullscreen();
      return onResume();
    }
    if (a === 'how') return ui.howTo();
    if (a === 'settings') return ui.settings();
    open[a]?.();
  });

  return {
    el: root,
    destroy() {
      menu3d?.destroy();
      root.remove();
    },
  };
}
