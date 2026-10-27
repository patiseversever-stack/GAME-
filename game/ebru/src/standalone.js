// Tek başına sayfa: oyunu tam ekran açar.

import { createEbru } from './index.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');

createEbru({
	container: document.body,
	quality: q == null ? 'auto' : q,
}).then((game) => {
	window.__eb = game;
	const boot = document.getElementById('uk-boot');
	if (boot) boot.remove();
	if (!params.has('debug')) game.open();
});
