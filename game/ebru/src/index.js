// Ebru — suyun üstünde akan boyalarla oynanan oyun.
//
//   import { createEbru } from './ebru/src/index.js';
//   const game = await createEbru({ container: document.body, hooks: { onExit } });
//   game.open();     // başlık ekranı
//   game.close();    // gizle, döngüyü durdur
//   game.destroy();  // tamamen boşalt

import { App } from './app.js';
import { createStore } from './core/store.js';

export async function createEbru(opts = {}) {
	const store = createStore(opts.store);
	const root = document.createElement('div');
	root.className = 'eb-root';
	root.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:hidden;background:#0e0d14;touch-action:none;';
	(opts.container || document.body).appendChild(root);
	const app = new App({ container: root, store, hooks: opts.hooks || {}, quality: opts.quality || 'auto', power: opts.power || 'auto' });
	await app.init();
	return {
		app,
		open() {
			root.style.display = '';
			app.start();
		},
		close() {
			app.stop();
			root.style.display = 'none';
		},
		destroy() {
			app.destroy();
			root.remove();
		},
	};
}
