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
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    const p = el.requestFullscreen({ navigationUI: 'hide' });
    p?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } catch {}
}

export function createHome({ host, settings, profile, audio, saved, onStart, onResume, ui }) {
  const root = document.createElement('div');
  root.className = 'home3';
  let diff = settings.get('difficulty') || 'normal';
  const prog = profile.progress();
  const goals = profile.d.daily.goals;
  const doneGoals = goals.filter((g) => g.done).length;
  const roster = settings.get('playerAvatar');
  const pct = Math.round((prog.into / prog.need) * 100);
  root.innerHTML = `
    <div class="h3-vignette"></div>
    <div class="h3-top">
      <button class="h3-ic" data-a="fs" aria-label="Tam ekran">${icon('expand')}</button>
      <button class="h3-ic" data-a="sound" aria-label="Ses">${icon(settings.get('sfx') ? 'volumeOn' : 'volumeOff')}</button>
    </div>
    <section class="h3-brand">
      <small>PATISEVER</small>
      <h1>OKEY</h1>
      <p>İki oyun, tek masa.</p>
      <button class="h3-profile" data-a="profile" aria-label="Profil">
        <span class="h3-ring" style="--p:${pct}"><i>${avatarSVG(roster)}</i></span>
        <span class="h3-lvl"><b>Seviye ${prog.level}</b><em>${prog.into} / ${prog.need} XP</em></span>
      </button>
      ${saved ? `<button class="h3-resume" data-a="resume"><span>Devam et</span><em>${saved.mode === 'okey101' ? '101 Okey' : 'Okey'} · El ${saved.round}</em></button>` : ''}
    </section>
    <section class="h3-modes">
      <button class="mtile" data-m="okey" aria-label="Okey oyna">
        <span class="mtile__face mtile__face--star"><i class="mtile__star"></i><b>OKEY</b></span>
        <span class="mtile__cap">Klasik · 14 taş</span>
      </button>
      <button class="mtile" data-m="okey101" aria-label="101 Okey oyna">
        <span class="mtile__face"><b class="mtile__num">101</b><span class="mtile__marks"><i class="r"></i><i class="b"></i><i class="k"></i><i class="y"></i></span></span>
        <span class="mtile__cap">Açıl, işle, cezadan kaç</span>
      </button>
      <div class="h3-diff" role="radiogroup" aria-label="Zorluk">
        <button role="radio" data-d="casual">Kolay</button><button role="radio" data-d="normal">Normal</button><button role="radio" data-d="expert">Uzman</button>
      </div>
    </section>
    <nav class="h3-dock">
      <button data-a="goals"><i>${icon('target')}</i><span>Görevler</span>${doneGoals < goals.length ? `<em>${goals.length - doneGoals}</em>` : ''}</button>
      <button data-a="ach"><i>${icon('trophy')}</i><span>Başarımlar</span></button>
      <button data-a="stats"><i>${icon('chart')}</i><span>İstatistik</span></button>
      <button data-a="how"><i>${icon('help')}</i><span>Nasıl oynanır</span></button>
      <button data-a="settings"><i>${icon('cog')}</i><span>Ayarlar</span></button>
    </nav>`;
  host.appendChild(root);

  let menu3d = null;
  if (webglAvailable() && settings.get('quality') !== 'dom') {
    try {
      menu3d = new MenuStage(root, { quality: settings.get('quality') });
      root.insertBefore(menu3d.canvas, root.firstChild);
    } catch (e) {
      console.warn('Menü 3B başlatılamadı', e);
    }
  }
  const mark = () => root.querySelectorAll('[data-d]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.d === diff)));
  mark();

  const open = {
    goals() {
      const rows = goals.map((g) => `<div class="goal${g.done ? ' is-done' : ''}"><div><b>${esc(g.text)}</b><div class="bar"><i style="width:${Math.round((g.progress / g.target) * 100)}%"></i></div></div><span>${g.done ? '✓ +50 XP' : g.progress + '/' + g.target}</span></div>`).join('');
      sheet(host, { title: 'Günlük görevler', body: `<div class="goals">${rows}</div><p class="sheet__p">Görevler her gün yenilenir. Tamamlanan her görev 50 XP verir.</p>`, actions: [{ label: 'Tamam', primary: true }] });
    },
    ach() {
      const got = profile.d.achievements;
      const items = ACHIEVEMENTS.map((a) => `<div class="ach${got[a.id] ? ' is-got' : ''}"><i>${got[a.id] ? icon('trophy') : icon('lock')}</i><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`).join('');
      sheet(host, { title: `Başarımlar · ${Object.keys(got).length}/${ACHIEVEMENTS.length}`, body: `<div class="achs">${items}</div>`, actions: [{ label: 'Tamam', primary: true }] });
    },
    stats() {
      const s = profile.d.stats;
      const row = (k, v) => `<div class="statrow"><span>${k}</span><b>${v}</b></div>`;
      sheet(host, { title: 'İstatistikler', body: `<div class="stats">${row('Oynanan el', s.rounds)}${row('Kazanılan el', s.wins)}${row('Okey maçı', `${s.matches.okey.won}/${s.matches.okey.played}`)}${row('101 maçı', `${s.matches.okey101.won}/${s.matches.okey101.played}`)}${row('Galibiyet serisi', `${s.streak} (en iyi ${s.bestStreak})`)}${row('101’de açılış', s.open101)}</div>`, actions: [{ label: 'Tamam', primary: true }] });
    },
    profile() {
      sheet(host, { title: 'Profil', body: `<div class="stats">${row2('Seviye', prog.level)}${row2('Sonraki seviyeye', `${prog.need - prog.into} XP`)}</div>`, actions: [{ label: 'Tamam', primary: true }] });
      function row2(k, v) {
        return `<div class="statrow"><span>${k}</span><b>${v}</b></div>`;
      }
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
      setTimeout(() => onStart(m.dataset.m, diff), menu3d ? 560 : 120);
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
