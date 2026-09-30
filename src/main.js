// Uygulama girişi: ana menü → oyun. (Geliştirme parametreleri: ?mode=&seed=&difficulty=&resume=1&mute=1)
import { Settings, applyDocumentSettings } from './meta/settings.js';
import { Profile } from './meta/profile.js';
import { AudioManager, NullAudio } from './audio/audio-manager.js';
import { GameController, hasSavedGame, savedSummary, clearSavedGame } from './ui/game-controller.js';
import { FINISH_LABEL } from './game/scoring.js';

const q = new URLSearchParams(location.search);
const app = document.getElementById('app');
const settings = new Settings();
const profile = new Profile();
for (const [k, s] of [['theme', 'theme'], ['rack', 'rack'], ['tiles', 'tiles'], ['speed', 'botSpeed'], ['motion', 'motion']]) if (q.get(k)) settings.set(s, q.get(k));
if (q.get('text')) settings.set('textScale', Number(q.get('text')));
applyDocumentSettings(settings, app);
const audio = q.get('mute') ? new NullAudio() : new AudioManager(settings);
window.__okey = { settings, profile, audio };

const overlay = (html, cls = '') => {
  const el = document.createElement('div');
  el.className = 'ov ' + cls;
  el.innerHTML = `<div class="ov__card">${html}</div>`;
  app.appendChild(el);
  return el;
};
const goHome = () => { location.href = location.pathname; };

const ui = {
  pauseMenu(ctl) {
    const el = overlay(`<h2>Duraklatıldı</h2><button class="btn btn--primary btn--lg" data-a="go">Devam</button><button class="btn btn--lg" data-a="home">Ana menü (kaydedilir)</button>`);
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'go') el.remove();
      if (a === 'home') { ctl.save?.(); goHome(); }
    };
  },
  howTo() {
    const el = overlay(`<h2>Nasıl oynanır?</h2><p>Sıra sendeyken <b>desteden</b> ya da <b>soldaki çöplükten</b> bir taş çek. Taşları ıstakada sürükleyerek düzenle; perleri (aynı sayı farklı renk ya da aynı renk ardışık) oluştur. Sonra bir taşı <b>sağ alttaki çöplüğe sürükleyerek</b> at.</p><p>Elini bitirmek için 14 taşı perlere ayır ve son taşı “Bitir” olarak at. Okey (★) her taşın yerine geçer; gösterge bir fazlası okeydir.</p><p><b>101:</b> ilk açışta perlerin toplamı en az 101 (ya da 5 çift) olmalı; sonra açılmış perlere taş işleyebilirsin.</p><button class="btn btn--primary" data-a="x">Tamam</button>`);
    el.onclick = (e) => e.target.closest('[data-a]') && el.remove();
  },
  discardHistory() {},
  restart(cfg) { start(cfg.mode, cfg.difficulty); },
  roundResult: async (o) => {
    const { game: g, roster, result: r, matchOver, winnerSeat } = o;
    const name = (s) => (s === 0 ? 'Sen' : roster[s].name);
    const title = r.winner === null ? 'El berabere bitti' : r.winner === 0 ? 'Eli kazandın! 🎉' : `${name(r.winner)} eli aldı`;
    const rows = g.state.scores.map((sc, i) => `<div class="ov__row${i === 0 ? ' me' : ''}"><span>${name(i)}</span><b>${sc}</b></div>`).join('');
    const el = overlay(`<h2>${title}</h2><p>${FINISH_LABEL?.[r.finish] || r.finishLabel || ''}</p>${rows}${matchOver ? '' : '<button class="btn btn--primary btn--lg" data-a="next">Sonraki el</button>'}<button class="btn btn--lg" data-a="again">Yeni oyun</button><button class="btn btn--lg" data-a="home">Ana menü</button>`);
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'next') { el.remove(); o.onNext(); }
      if (a === 'again') { clearSavedGame(); goHome(); }
      if (a === 'home') goHome();
    };
    if (winnerSeat === 0) window.__roundWon = true;
  },
};

let ctl = null;
async function start(mode, difficulty, seed) {
  app.querySelectorAll('.ov,.home').forEach((n) => n.remove());
  ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
  window.__okey.ctl = ctl;
  await ctl.newGame({ mode, difficulty, seed, rules: { matchType: 'single', rounds: 3 } });
  document.body.dataset.ready = '1';
}

function home() {
  const saved = hasSavedGame() ? savedSummary() : null;
  let diff = settings.get('difficulty') || 'normal';
  const el = document.createElement('div');
  el.className = 'home';
  el.innerHTML = `<div class="home__in"><div class="eyebrow">Patisever</div><h1 class="display">OKEY</h1>
    <div class="home__diff" role="group"><button data-d="casual">Kolay</button><button data-d="normal">Normal</button><button data-d="expert">Uzman</button></div>
    <div class="home__btns"><button class="btn btn--primary btn--lg" data-m="okey">Okey</button><button class="btn btn--primary btn--lg" data-m="okey101">101 Okey</button>
    ${saved ? `<button class="btn btn--lg" data-m="resume">Devam et · ${saved.mode === 'okey101' ? '101' : 'Okey'}</button>` : ''}<button class="btn btn--lg" data-m="how">Nasıl oynanır?</button></div></div>`;
  const mark = () => el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', b.dataset.d === diff));
  mark();
  el.onclick = async (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { diff = d.dataset.d; settings.set('difficulty', diff); mark(); return; }
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (!m) return;
    audio.unlock?.();
    if (m === 'how') return ui.howTo();
    if (m === 'resume') {
      el.remove();
      ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
      window.__okey.ctl = ctl;
      if (!(await ctl.resume())) goHome();
      return;
    }
    start(m, diff);
  };
  app.appendChild(el);
}

if (q.get('resume')) {
  ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
  window.__okey.ctl = ctl;
  ctl.resume().then(() => (document.body.dataset.ready = '1'));
} else if (q.get('mode')) start(q.get('mode'), q.get('difficulty') || 'normal', q.get('seed') ? Number(q.get('seed')) : undefined).catch((e) => { document.body.dataset.error = String(e && e.stack); });
else home();
