// Kayıt: ana oyun kendi kayıt fonksiyonlarını verirse onları kullanır; yoksa localStorage.
// Gizli sekmede ya da kapalı depolamada hata vermez, sadece bellekte tutar.

export function createStore(host, ns = 'ulukayin.v1') {
	if (host && typeof host.get === 'function' && typeof host.set === 'function') return host;
	let mem = {};
	try {
		mem = JSON.parse(localStorage.getItem(ns) || '{}') || {};
	} catch (e) {
		mem = {};
	}
	return {
		get: (k) => mem[k],
		set: (k, v) => {
			mem[k] = v;
			try {
				localStorage.setItem(ns, JSON.stringify(mem));
			} catch (e) {
				/* depolama kapalı: bellekte kalır */
			}
		},
	};
}
