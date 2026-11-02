// Tek başına sayfa: oyunu tam ekran açar.

import { createFetih } from './index.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');

createFetih({ container: document.body, quality: q == null ? 'auto' : q }).then((game) => {
	window.__fl = game;
	// gerçek cihazda ölçüm: köşede kare süresi sayacı (?perf ya da #perf: yayın sayfası yalnız #ekini geçirir)
	if (params.has('perf') || /perf/.test(location.hash)) game.app?.perfOverlay?.(true);
	const boot = document.getElementById('uk-boot');
	if (boot) boot.remove();
	if (!params.has('debug')) game.open();
});
