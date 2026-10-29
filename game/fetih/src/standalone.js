// Tek başına sayfa: oyunu tam ekran açar.

import { createFetih } from './index.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');

createFetih({ container: document.body, quality: q == null ? 'auto' : q, gece: params.get('gece') }).then((game) => {
	window.__fl = game;
	const boot = document.getElementById('uk-boot');
	if (boot) boot.remove();
	if (!params.has('debug')) game.open();
});
