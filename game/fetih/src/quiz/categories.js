// Kategoriler: çarkın dilimleri. Her birinin rengi ve simgesi (SVG yolu) var.
// "fetih" dilimi Trivia Crack'teki taç gibi: kategoriyi oyuncu seçer.

export const CATS = {
	tarih: { name: 'Tarih', color: '#e0583a', icon: 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6' },
	cografya: { name: 'Coğrafya', color: '#2f9bd8', icon: 'M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
	spor: { name: 'Spor', color: '#f2a51a', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3.5l3 2.2-1.1 3.6h-3.8L9 8.7zM5.5 11l2.7.6 1.2 3.5-1.8 2.6M18.5 11l-2.7.6-1.2 3.5 1.8 2.6' },
	bilim: { name: 'Bilim', color: '#33b86b', icon: 'M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M7.5 14h9' },
	sanat: { name: 'Sanat & Edebiyat', color: '#a55bd6', icon: 'M12 3a9 9 0 0 0 0 18c1.4 0 1.6-1 1-2-.7-1.2 0-2.5 1.4-2.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3zM7.5 12a1.3 1.3 0 1 0 0-.1M10 7.5a1.3 1.3 0 1 0 0-.1M15 7.5a1.3 1.3 0 1 0 0-.1' },
	eglence: { name: 'Genel Kültür', color: '#ec4f93', icon: 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z' },
};

/** Çark dilimleri (sırasıyla). 'fetih' özel dilim: oyuncu kategori seçer. */
export const WHEEL = ['tarih', 'cografya', 'spor', 'fetih', 'bilim', 'sanat', 'eglence'];

export const FETIH_SLICE = { name: 'Fetih!', color: '#ffd23a', icon: 'M5 20h14M6 20l1.5-9 4.5 4 4.5-4L18 20M12 4l1.6 3.2 3.4.5-2.5 2.4.6 3.4L12 12l-3.1 1.5.6-3.4L7 7.7l3.4-.5z' };
