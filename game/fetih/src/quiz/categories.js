// Kategoriler: çarkın dilimleri. Her birinin rengi ve simgesi var.
// Simgeler tek tip çizgi gliflerdir (24×24, aynı kalınlık ve aynı optik boy; ico() ile çizilir, dolgu yok).
// "fetih" dilimi Trivia Crack'teki taç gibi: kategoriyi oyuncu seçer.

export const CATS = {
	tarih: { name: 'Tarih', color: '#e0583a', icon: 'M3.5 9.2L12 4.2l8.5 5zM6.2 12v5.2M10 12v5.2M14 12v5.2M17.8 12v5.2M4.5 17.6h15M3.2 20.6h17.6' },
	cografya: {
		name: 'Coğrafya',
		color: '#2f9bd8',
		icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3.2 12h17.6M12 3.2c2.5 2.4 3.7 5.3 3.7 8.8s-1.2 6.4-3.7 8.8M12 3.2c-2.5 2.4-3.7 5.3-3.7 8.8s1.2 6.4 3.7 8.8',
	},
	spor: {
		name: 'Spor',
		color: '#ff8a1e',
		icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8.7l3.14 2.28-1.2 3.69h-3.88l-1.2-3.69zM12 8.7V3M15.14 10.98l5.42-1.76M13.94 14.67l3.35 4.61M10.06 14.67l-3.35 4.61M8.86 10.98L3.44 9.22',
	},
	bilim: { name: 'Bilim', color: '#33b86b', icon: 'M9 3.2h6M10 3.2v6L4.9 18.2a1.9 1.9 0 0 0 1.7 2.8h10.8a1.9 1.9 0 0 0 1.7-2.8L14 9.2v-6M7.3 14.6h9.4' },
	sanat: {
		name: 'Sanat & Edebiyat',
		color: '#a55bd6',
		icon: 'M12 3a9 9 0 0 0 0 18c1.6 0 2.1-1.2 1.4-2.3-.8-1.3.1-2.9 1.7-2.9H17a4 4 0 0 0 4-4c0-4.9-4-8.8-9-8.8zM6.7 12a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0M8.7 7.8a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0M13.5 7.6a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0M16.1 11a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0',
	},
	eglence: { name: 'Genel Kültür', color: '#ec4f93', icon: 'M12 3.2a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.4v.6h5v-.6c0-1 .3-1.8 1.1-2.4A6 6 0 0 0 12 3.2zM9.6 19.2h4.8M10.6 21.6h2.8' },
};

/** Çark dilimleri (sırasıyla). 'fetih' özel dilim: oyuncu kategori seçer. */
export const WHEEL = ['tarih', 'cografya', 'spor', 'fetih', 'bilim', 'sanat', 'eglence'];

export const FETIH_SLICE = { name: 'Fetih!', color: '#f5b324', icon: 'M3.5 18.5h17M4.5 15.5L3.2 7.2l5 3.8L12 5l3.8 6 5-3.8-1.3 8.3z' };
