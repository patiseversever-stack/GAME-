// Tek başına test sayfası: modu tam ekran açar. Ana oyuna bağlarken bu dosya kullanılmaz.

import { createUluKayin } from './index.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');

createUluKayin({
	container: document.body,
	quality: q == null ? 'auto' : q,
	debug: params.has('debug'),
}).then((mode) => {
	window.__uk = mode;
	if (!params.has('debug')) mode.open();
});
