// KANAT entry (integrator): platform boot → Game (loading → audio + world → benchmark/warm-up → ready → FTUE film
// or the live 3D menu). Audio never starts by itself: the first user gesture unlocks it (§7.3).
import { boot } from './core/boot.ts';
import { getAudioEngine } from './audio/AudioEngine.ts';
import { Game, GAME_VERSION } from './game/Game.ts';

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app missing');
  root.textContent = '';
  const audio = getAudioEngine();
  const app = await boot({
    version: GAME_VERSION,
    root,
    modes: ['career', 'daily', 'duel', 'free', 'suru'],
    capabilities: { haptics: true, share: true, storage: true, orientation: 'both', ghostCodes: 'K1', worlds: 5 },
    audio: {
      suspend: () => audio.suspend('host'),
      resume: () => audio.resume('host'),
      unlock: () => void audio.unlock(),
      setMuted: (muted) => audio.setVolumes({ muted }),
    },
  });
  // re-resume after iOS interruptions on later gestures (unlock is idempotent)
  audio.installAutoLifecycle(window);
  const game = new Game(app, root, audio);
  (globalThis as unknown as { __kanat?: Game }).__kanat = game;
  try {
    await game.start();
  } catch (err) {
    console.error('[kanat] start failed', err);
    app.bridge.error(String((err as Error)?.message ?? err), true);
    throw err;
  }
}

void main();
