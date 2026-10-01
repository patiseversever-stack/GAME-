// Uygulama girişi: ana menü → oyun. (Geliştirme parametreleri: ?mode=&seed=&difficulty=&resume=1&mute=1)
import { Settings, applyDocumentSettings } from './meta/settings.js';
import { Profile } from './meta/profile.js';
import { AudioManager, NullAudio } from './audio/audio-manager.js';
import { GameController, hasSavedGame, savedSummary, clearSavedGame } from './ui/game-controller.js';
import { resultScreen, historySheet, sheet, settingsSheet } from './app/overlays.js';
import { createHome } from './app/home.js';
import { icon } from './ui/icons.js';
const history = [];
import { createCoach } from './app/coach.js';
import { woodTexture } from './ui/wood.js';
import { loadRackModel } from './render3d/rack-model.js';

const q = new URLSearchParams(location.search);
const app = document.getElementById('app');
const settings = new Settings();
const profile = new Profile();
for (const [k, s] of [['theme', 'theme'], ['rack', 'rack'], ['tiles', 'tiles'], ['speed', 'botSpeed'], ['motion', 'motion']]) if (q.get(k)) settings.set(s, q.get(k));
if (q.get('quality')) settings.set('quality', q.get('quality'));
if (q.get('text')) settings.set('textScale', Number(q.get('text')));
applyDocumentSettings(settings, app);
document.documentElement.style.setProperty('--wood', woodTexture());
// ıstaka modeli (en ağır varlık) hemen çözülmeye başlar: menü ve masa hazır bulur
if (q.get('quality') !== 'dom') loadRackModel();
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
    const items = [
      { icon: 'chart', label: 'Oyun özeti', c: 'c-blue', run: () => historySheet(app, ctl, history) },
      { icon: 'book', label: 'Kurallar', c: 'c-violet', run: () => ui.howTo() },
      { icon: 'cog', label: 'Ayarlar', c: 'c-teal', run: () => settingsSheet(app, settings) },
      { icon: 'back', label: 'Ana menü', c: 'c-slate', close: true, run: () => { ctl.save?.(); goHome(); } },
    ];
    const body = document.createElement('div');
    body.className = 'pause4';
    body.innerHTML = `<p class="sheet__p pause4__note">${icon('check')}<span>Oyun kaydedildi — istediğin an kaldığın yerden sürer.</span></p>
      <div class="pause4__grid">${items.map((it, i) => `<button class="pause4__item" data-pi="${i}"><i class="${it.c}">${icon(it.icon)}</i><span>${it.label}</span></button>`).join('')}</div>`;
    const sh = sheet(app, { title: 'Duraklatıldı', body, actions: [{ label: 'Oyuna dön', primary: true }], cls: 'is-pause' });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pi]');
      if (!b) return;
      const it = items[+b.dataset.pi];
      if (it.close) sh.close();
      it.run();
    });
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
  settings() { settingsSheet(app, settings); },
  restart(cfg) { clearSavedGame(); start(cfg.mode, cfg.difficulty); },
  roundResult: async (o) => {
    history.push({ round: o.result.round, winner: o.result.winner, finish: o.result.finish, deltas: o.result.deltas.slice() });
    resultScreen(app, { ...o, onAgain: () => { clearSavedGame(); goHome(); } }, history);
  },
};

ui.coach = createCoach(app, settings);
window.__okey.ui = ui;
settings.subscribe((k) => { if (k === 'textScale') setTimeout(() => ctl?.scene?.layout(true), 30); });
let ctl = null;
// Dikey tutulan telefonda: masa yatayda çok daha geniş; tek seferlik, kapatılabilir ipucu
let rotateDismissed = false;
function rotateHint() {
  try {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const mq = matchMedia('(orientation: portrait)');
    let el = null;
    const upd = () => {
      if (mq.matches && !rotateDismissed && ctl) {
        if (el) return;
        el = document.createElement('button');
        el.className = 'rot-hint';
        el.innerHTML = '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M3 12h2M19 12h2"/><path d="M20.5 8.5c.9 1 1.5 2.4 1.5 3.5"/></svg><span>Daha geniş masa için telefonu yatay çevir</span><i>×</i>';
        el.onclick = () => {
          rotateDismissed = true;
          el.remove();
          el = null;
        };
        app.appendChild(el);
        setTimeout(() => el?.classList.add('is-out'), 9000);
        setTimeout(() => el?.remove(), 9400);
      } else if (el) {
        el.remove();
        el = null;
      }
    };
    mq.addEventListener?.('change', upd);
    setTimeout(upd, 1200);
  } catch {}
}
async function start(mode, difficulty, seed) {
  app.querySelectorAll('.ov,.home').forEach((n) => n.remove());
  ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
  window.__okey.ctl = ctl;
  await ctl.newGame({ mode, difficulty, seed, rules: { matchType: 'single', rounds: 3 } });
  document.body.dataset.ready = '1';
  rotateHint();
}

let homeView = null;
function home() {
  const saved = hasSavedGame() ? savedSummary() : null;
  homeView = createHome({
    host: app,
    settings,
    profile,
    audio,
    saved,
    ui,
    onStart: (m, diff) => {
      homeView?.destroy();
      homeView = null;
      start(m, diff);
    },
    onResume: async () => {
      homeView?.destroy();
      homeView = null;
      ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
      window.__okey.ctl = ctl;
      if (!(await ctl.resume())) goHome();
      else rotateHint();
    },
  });
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
