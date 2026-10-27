// Fetih Ligi — Türkiye haritasında soru bilerek il fethedilen bilgi yarışması.
//
//   import { createFetih } from './fetih/src/index.js';
//   const game = await createFetih({ container: document.body });
//   game.open(); game.close(); game.destroy();

import { App } from './app.js';
import { createStore } from './core/store.js';

export async function createFetih(opts = {}) {
	const store = createStore(opts.store);
	const root = document.createElement('div');
	root.className = 'fl-root';
	root.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:hidden;background:#1b2a4a;touch-action:none;';
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
