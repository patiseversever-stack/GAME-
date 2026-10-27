// Tek başına sayfa: oyunu tam ekran açar.

import { createDomino } from './index.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');

createDomino({
	container: document.body,
	quality: q == null ? 'auto' : q,
}).then((game) => {
	window.__dm = game;
	const boot = document.getElementById('uk-boot');
	if (boot) boot.remove();
	if (!params.has('debug')) game.open();
});
