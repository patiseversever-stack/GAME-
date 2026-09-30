// Geliştirme girişi. (Ana menü ve ekranlar `app.js` ile gelecek.)
import { Settings, applyDocumentSettings } from './meta/settings.js';
import { Profile } from './meta/profile.js';
import { AudioManager, NullAudio } from './audio/audio-manager.js';
import { GameController } from './ui/game-controller.js';

const q = new URLSearchParams(location.search);
const app = document.getElementById('app');
const settings = new Settings();
const profile = new Profile();
if (q.get('theme')) settings.set('theme', q.get('theme'));
if (q.get('rack')) settings.set('rack', q.get('rack'));
if (q.get('tiles')) settings.set('tiles', q.get('tiles'));
if (q.get('speed')) settings.set('botSpeed', q.get('speed'));
if (q.get('motion')) settings.set('motion', q.get('motion'));
if (q.get('text')) settings.set('textScale', Number(q.get('text')));
applyDocumentSettings(settings, app);
const audio = q.get('mute') ? new NullAudio() : new AudioManager(settings);
window.__okey = { settings, profile, audio };

const ui = {
  pauseMenu() {},
  roundResult: async (o) => {
    window.__roundResult = o;
    app.dataset.roundEnd = '1';
  },
  discardHistory() {},
  restart() {},
};
const ctl = new GameController({ host: app, settings, profile, audio, ui, onExit() {} });
window.__okey.ctl = ctl;
const seed = q.get('seed') ? Number(q.get('seed')) : undefined;
const start = q.get('resume')
  ? ctl.resume() // kayıtlı oyuna devam (görsel QA: tools/make-save.mjs çıktısı localStorage'a konur)
  : ctl.newGame({ mode: q.get('mode') || 'okey', difficulty: q.get('difficulty') || 'normal', seed, rules: { matchType: 'single', rounds: Number(q.get('rounds') || 3) } });
start
  .then(() => (document.body.dataset.ready = '1'))
  .catch((e) => {
    console.error(e);
    document.body.dataset.error = String(e && e.stack);
  });
