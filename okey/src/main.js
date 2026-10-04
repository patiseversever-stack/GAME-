// Uygulama girişi: ana menü → oyun. (Geliştirme parametreleri: ?mode=&seed=&difficulty=&resume=1&mute=1)
import { Settings, applyDocumentSettings } from './meta/settings.js';
import { Profile } from './meta/profile.js';
import { AudioManager, NullAudio } from './audio/audio-manager.js';
import { GameController, hasSavedGame, savedSummary, clearSavedGame } from './ui/game-controller.js';
import { resultScreen, historySheet, settingsSheet } from './app/overlays.js';
import { createHome, replayIntro, gyroHint } from './app/home.js';
import { openHub } from './app/hub.js';
import { pauseScreen } from './app/pause.js';
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

let history = [];
let ctl = null;
let homeView = null;

// Ana menüye sayfayı yeniden yüklemeden dön (uygulama WebView'ı aynı sayfada kalır)
const goHome = () => {
  ctl?.destroy();
  ctl = null;
  window.__okey.ctl = null;
  homeView?.destroy();
  homeView = null;
  app.classList.remove('gl-on', 'is-myturn');
  app.querySelectorAll('.sheet-wrap,.rot-hint,.sort-menu').forEach((n) => n.remove());
  home();
};

const ui = {
  pauseMenu(ctl) {
    pauseScreen(app, {
      summary: () => historySheet(app, ctl, history),
      rules: () => ui.howTo(),
      settings: () => settingsSheet(app, settings),
      menu: () => {
        ctl.save?.();
        goHome();
      },
    });
  },
  howTo: () => openHub('how', app),
  discardHistory(ctl) {
    historySheet(app, ctl, history);
  },
  settings() {
    settingsSheet(app, settings);
  },
  restart(cfg) {
    clearSavedGame();
    start(cfg.mode, cfg.difficulty);
  },
  // sonuç ekranındaki "Tekrar" denetleyicinin kendi onAgain'ini kullanır (aynı modu yeniden başlatır)
  roundResult: async (o) => {
    history.push({ round: o.result.round, winner: o.result.winner, finish: o.result.finish, deltas: o.result.deltas.slice() });
    resultScreen(app, o, history);
  },
};

ui.coach = createCoach(app, settings);
window.__okey.ui = ui;
settings.subscribe((k) => {
  if (k === 'textScale') setTimeout(() => ctl?.scene?.layout(true), 30);
});
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
  // önceki oyun/menü tamamen temizlenir: aynı sayfada art arda oyun başlatılabilir
  ctl?.destroy();
  homeView?.destroy();
  homeView = null;
  history = [];
  app.classList.remove('gl-on', 'is-myturn');
  app.querySelectorAll('.sheet-wrap,.ov,.home,.home3,.rot-hint,.sort-menu').forEach((n) => n.remove());
  delete document.body.dataset.ready;
  delete document.body.dataset.error;
  ctl = new GameController({ host: app, settings, profile, audio, ui, onExit: goHome });
  window.__okey.ctl = ctl;
  await ctl.newGame({ mode, difficulty, seed, rules: { matchType: 'single', rounds: 3 } });
  document.body.dataset.ready = '1';
  rotateHint();
}

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

// Uygulama kabuğu arayüzü: menü görünür olunca giriş yeniden oynar; tek başına sayfada jiroskop ipucu bir kez gösterilir
window.__okeyReplayIntro = replayIntro;
window.__okeyGyroHint = gyroHint;
setTimeout(() => window.PatiOkeyHost || gyroHint(), 3300);
