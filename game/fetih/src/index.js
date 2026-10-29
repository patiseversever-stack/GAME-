// Fetih Ligi — Türkiye haritasında soru bilerek il fethedilen bilgi yarışması.
//
//   import { createFetih } from './fetih/src/index.js';
//   const game = await createFetih({ container: document.body });
//   game.open(); game.close(); game.destroy();
//   Oyun dikey kilitlidir (core/portrait.js); gömen uygulama kendi kilidini kuruyorsa: { portrait: false }.

import { App } from './app.js';
import { createStore } from './core/store.js';
import { lockPortrait } from './core/portrait.js';

export async function createFetih(opts = {}) {
	const store = createStore(opts.store);
	const root = document.createElement('div');
	root.className = 'fl-root';
	// --vw / --vh: arayüz ölçüleri ekranın değil oyun alanının yüzdesi (dikey sütunda kart sütuna sığsın)
	root.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:hidden;background:#1b2a4a;touch-action:none;--vw:1vw;--vh:1vh;';
	(opts.container || document.body).appendChild(root);
	const portrait = opts.portrait === false ? null : lockPortrait(root);
	const app = new App({ container: root, store, hooks: opts.hooks || {}, quality: opts.quality || 'auto', power: opts.power || 'auto', gece: opts.gece ?? null });
	await app.init();
	portrait?.bind(app);
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
