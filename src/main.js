// Uygulama girişi: ana menü → oyun. (Geliştirme parametreleri: ?mode=&seed=&difficulty=&resume=1&mute=1)
import { Settings, applyDocumentSettings } from './meta/settings.js';
import { Profile } from './meta/profile.js';
import { AudioManager, NullAudio } from './audio/audio-manager.js';
import { GameController, hasSavedGame, savedSummary, clearSavedGame } from './ui/game-controller.js';
import { resultScreen, historySheet, sheet } from './app/overlays.js';
const history = [];

const q = new URLSearchParams(location.search);
const app = document.getElementById('app');
const settings = new Settings();
const profile = new Profile();
for (const [k, s] of [['theme', 'theme'], ['rack', 'rack'], ['tiles', 'tiles'], ['speed', 'botSpeed'], ['motion', 'motion']]) if (q.get(k)) settings.set(s, q.get(k));
if (q.get('text')) settings.set('textScale', Number(q.get('text')));
applyDocumentSettings(settings, app);
const audio = q.get('mute') ? new NullAudio() : new AudioManager(settings);
window.__okey = { settings, profile, audio };

const _overlay = (html, cls = '') => {
  const el = document.createElement('div');
  el.className = 'ov ' + cls;
  el.innerHTML = `<div class="ov__card">${html}</div>`;
  app.appendChild(el);
  return el;
};
const goHome = () => { location.href = location.pathname; };

const ui = {
  pauseMenu(ctl) {
    sheet(app, { title: 'Duraklatıldı', body: '<p class="sheet__p">Oyun kaydedildi. İstediğin zaman kaldığın yerden devam edebilirsin.</p>', actions: [
      { label: 'Devam', primary: true },
      { label: 'Oyun özeti', close: false, run: () => historySheet(app, ctl, history) },
      { label: 'Nasıl oynanır?', close: false, run: () => ui.howTo() },
      { label: 'Ana menü', run: () => { ctl.save?.(); goHome(); } },
    ] });
  },
  howTo() {
    sheet(app, { title: 'Nasıl oynanır?', body: `<div class="howto2">
      <p><b>1. Taş al.</b> Sıra sende iken ortadaki desteye dokun ya da soldaki çöplükten (yandan) al.</p>
      <p><b>2. Diz.</b> Taşları ıstakada sürükle. <b>Diz</b> düğmesi perleri otomatik gruplar; tekrar basınca çift, renk ve sayı dizilişine geçer.</p>
      <p><b>3. At.</b> Bir taşı sağdaki çöplüğe sürükle ya da seçip ikinci kez dokun.</p>
      <p><b>Per:</b> aynı renk ardışık (3-4-5) ya da aynı sayı farklı renk (7-7-7). <b>Okey</b> (yıldızlı) her taşın yerine geçer; göstergenin bir fazlasıdır.</p>
      <p><b>Okey:</b> 14 taşı perlere ayırıp son taşı atınca bitersin. Yedi çift de bitirir.</p>
      <p><b>101:</b> ilk açılışta perlerin toplamı en az 101 (ya da 5 çift) olmalı. Açtıktan sonra masadaki perlere taş işleyebilirsin. Yandan aldığın taşı açılışta ya da işlemede kullanmak zorundasın. En düşük puan kazanır.</p></div>`, actions: [{ label: 'Anladım', primary: true }] });
  },
  discardHistory(ctl) { historySheet(app, ctl, history); },
  restart(cfg) { clearSavedGame(); start(cfg.mode, cfg.difficulty); },
  roundResult: async (o) => {
    history.push({ round: o.result.round, winner: o.result.winner, finish: o.result.finish, deltas: o.result.deltas.slice() });
    resultScreen(app, { ...o, onAgain: () => { clearSavedGame(); goHome(); } }, history);
  },
};

window.__okey.ui = ui;
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
  const tile = (n, c, extra = '') => `<span class="mt mt--${c}${extra}"><b>${n}</b><i></i></span>`;
  el.innerHTML = `<div class="home__in">
    <header class="home__head"><div class="eyebrow">Patisever</div><h1 class="display">OKEY</h1></header>
    <div class="home__modes">
      <button class="mode" data-m="okey"><span class="mode__tiles">${tile(5, 'r')}${tile(6, 'r')}${tile(7, 'r')}${tile('★', 'j', ' mt--okey')}</span><span class="mode__t">Okey</span><span class="mode__d">14 taşı perlere diz, son taşı at, eli bitir.</span></button>
      <button class="mode" data-m="okey101"><span class="mode__tiles">${tile(10, 'k')}${tile(10, 'b')}${tile(10, 'y')}${tile(10, 'r')}</span><span class="mode__t">101 Okey</span><span class="mode__d">En az 101 puanla aç, perlere işle, cezadan kaç.</span></button>
    </div>
    <div class="home__bar">
      <div class="home__diff" role="group" aria-label="Zorluk"><button data-d="casual">Kolay</button><button data-d="normal">Normal</button><button data-d="expert">Uzman</button></div>
      ${saved ? `<button class="btn btn--lg" data-m="resume">Devam et · ${saved.mode === 'okey101' ? '101' : 'Okey'}</button>` : ''}
      <button class="btn btn--ghost" data-m="how">Nasıl oynanır?</button>
    </div></div>`;
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

// skor çiplerine dokununca oyun özeti (tek dokunuş)
app.addEventListener('click', (e) => {
  if (e.target.closest('.scorebar') && ctl?.game) historySheet(app, ctl, history);
});
