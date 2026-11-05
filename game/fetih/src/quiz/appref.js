// Uygulama bağı: soru tipleri haritaya, kameraya, arayüze ve sese buradan ulaşır (match.js ve galeri bindApp çağırır).
// Ayrı küçük modül: three.js ve grafik çekmeden (sunucu, node testleri) içe aktarılabilir.
let APP = null;
export const bindApp = (app) => {
	APP = app;
};
export const appOf = () => APP;

/** Efekt çal; ses motoru yoksa ya da hata verirse sessiz. */
export function playSfx(name, opts) {
	try {
		APP?.sfx?.play?.(name, opts);
	} catch {
		/* ses yoksa sessiz */
	}
}
