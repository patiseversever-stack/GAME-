// Ulu Kayın — Gündönümü'nün ikinci modu.
//
// Ana oyuna bağlamak için tek giriş noktası:
//
//   import { createUluKayin } from './ulu-kayin/src/index.js';
//   const mode = await createUluKayin({ container: document.body, hooks: { onExit, onReward } });
//   mode.open();          // modu aç (başlık ekranı)
//   mode.close();         // modu kapat (ana oyuna dön)
//   mode.destroy();       // tamamen boşalt
//
// Ayrıntılar: ENTEGRASYON.md

import { App } from './app.js';
import { createStore } from './core/store.js';

export async function createUluKayin(opts = {}) {
	const store = createStore(opts.store);
	const root = document.createElement('div');
	root.className = 'uk-root';
	root.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;';
	(opts.container || document.body).appendChild(root);
	const app = new App({ container: root, store, hooks: opts.hooks || {}, quality: opts.quality || 'auto', power: opts.power || 'auto' });
	await app.init();
	const api = {
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
	return api;
}
