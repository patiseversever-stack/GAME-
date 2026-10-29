// YENİ · DENEME SORU TİPLERİ: yalnız soru galerisinde (dist/SoruGalerisi.html) oynanır. Maç dönüşümüne (TYPE_WEIGHTS,
// banka) GİRMEZ; kullanıcı galeride deneyip karar verince benimsenen tip `TYPES`e taşınır, süresi timing.js'in
// parts() işlevine bir `case` olarak girer. Ayrıntılı kavram listesi ve gerekçeler: ref/yeni-soru-tipleri/defter.md
//
// Sözleşme `TYPES` ile aynı: { time, label, kind, needsMap?, keep?, jokers?, prepare, mount, judge, bot, fmt?, sub?,
// joker? }. Süre bütçesi aynı modelden (d_ortak.js stamp → timing.js sabitleri ve PROFILE girdisi).
//
//   kusbakisi  Kuşbakışı      kamera bir maketin dibinden yükselir; erken bilen kazanır (3B harita, yapılar)
//   kosu       Fetih Koşusu   kurala uyan illeri süre bitmeden bul; her doğru il senin rengine boyanır (3B harita)
//   ilavi      İl Avı         siluet + sıcak-soğuk: yanlış il uzaklığın rengine boyanır, ipucu açılır (3B harita)
//   baglanti   Bağlantı       12 taş, dörderli 3 gizli grup; tuzak taşlar (harita dışı, akıl yürütme)
//
// Örnek sorular (DENEME_SAMPLES) elle yazıldı ve doğrulandı (kaynaklar defterde). Harita verisi (il adı, plaka, bölge,
// komşuluk, sınır çizgisi) src/data/turkiye.json'dan yalnız okunur.

import { kusbakisi } from './d_kusbakisi.js';
import { kosu } from './d_kosu.js';
import { ilavi } from './d_ilavi.js';
import { baglanti } from './d_baglanti.js';
export { bindApp } from './d_ortak.js';

export const DENEME_TYPES = { kusbakisi, kosu, ilavi, baglanti };

/** Galeri sırası: [tip, galerideki adı, bir satırlık tanıtım]. */
export const DENEME_ORDER = [
	['kusbakisi', 'Kuşbakışı', 'Kamera maketin dibinden yükselir'],
	['kosu', 'Fetih Koşusu', 'Kurala uyan illeri fethet'],
	['ilavi', 'İl Avı · Sıcak Soğuk', 'Siluet, uzaklık rengi, ipucu'],
	['baglanti', 'Bağlantı Duvarı', '12 taş, 3 gizli grup'],
];

const KB = (id, diff, q, site, il, a, extra = {}) => ({ id, cat: 'cografya', diff, type: 'kusbakisi', q, site, il, a, ...extra });
const KS = (id, diff, q, ids, frame) => ({ id, cat: 'cografya', diff, type: 'kosu', q, ids, frame });
const IA = (id, diff, il, hints) => ({ id, cat: 'cografya', diff, type: 'ilavi', q: 'Siluetteki gizli ili haritada bul!', il, hints });
const BG = (id, cat, diff, groups) => ({ id, cat, diff, type: 'baglanti', q: 'Taşları dörderli 3 gruba ayır', groups: groups.map(([n, w]) => ({ n, w })) });

export const DENEME_SAMPLES = {
	kusbakisi: [
		KB('dn-kb1', 1, 'Kamera hangi ilin üzerinde?', 'galata', 34, ['İstanbul', 'İzmir', 'Çanakkale', 'Edirne'], { yaw: 0.5 }),
		KB('dn-kb2', 2, 'Burası hangi il?', 'pamukkale', 20, ['Denizli', 'Aydın', 'Muğla', 'Burdur'], { yaw: -0.4 }),
		KB('dn-kb3', 2, 'Kamera hangi ilde?', 'sumela', 61, ['Trabzon', 'Rize', 'Giresun', 'Artvin'], { yaw: 0.2 }),
		KB('dn-kb4', 2, 'Denizin içindeki bu kale hangi ilde?', 'kizkalesi', 33, ['Mersin', 'Antalya', 'Muğla', 'Hatay'], { yaw: -0.8 }),
		KB('dn-kb5', 3, 'Kamera hangi yapının başında?', 'nemrut', 2, ['Nemrut Dağı', 'Göbeklitepe', 'Zeugma', 'Harran'], { yaw: 0.05 }),
		KB('dn-kb6', 3, 'Bu saray hangi ilde?', 'ishakpasa', 4, ['Ağrı', 'Kars', 'Van', 'Erzurum'], { yaw: -0.3 }),
	],
	kosu: [
		// kadraj: Ege ve bir halka komşusu (cevabı ele vermeyecek kadar geniş, illere dokunulacak kadar yakın)
		KS('dn-ks1', 1, 'Ege Bölgesi’nin 8 ilini fethet!', [3, 9, 20, 35, 43, 45, 48, 64], [17, 10, 16, 11, 26, 42, 32, 15, 7]),
		KS('dn-ks2', 2, 'Plakası 10 ile 19 arasındaki illeri fethet!', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 'all'),
		KS('dn-ks3', 2, 'Adı K harfiyle başlayan illeri fethet!', [36, 37, 38, 39, 40, 41, 42, 43, 46, 70, 71, 78, 79], 'all'),
		KS('dn-ks4', 2, 'İran’a sınırı olan illeri fethet!', [76, 4, 65, 30], 'dogu,guneydogu'),
		KS('dn-ks5', 2, 'Suriye’ye sınırı olan illeri fethet!', [31, 79, 27, 63, 47, 73], [1, 80, 46, 44, 2, 21, 72, 56, 30, 33]),
	],
	ilavi: [
		IA('dn-ia1', 1, 31, ['Akdeniz Bölgesi’nde', 'Suriye’ye sınırı var', 'Plakası 31']),
		IA('dn-ia2', 2, 57, ['Karadeniz kıyısında', 'Türkiye’nin en kuzey ucu İnceburun burada', 'Plakası 57']),
		IA('dn-ia3', 2, 17, ['Marmara Bölgesi’nde', 'Toprakları iki kıtaya yayılır', 'Plakası 17']),
		IA('dn-ia4', 2, 48, ['Ege Bölgesi’nde', 'Bodrum, Marmaris ve Fethiye bu ilde', 'Plakası 48']),
		IA('dn-ia5', 3, 53, ['Karadeniz Bölgesi’nde', 'Çayıyla ünlü', 'Plakası 53']),
	],
	baglanti: [
		BG('dn-bg1', 'eglence', 1, [
			['İstanbul’daki saraylar', ['Topkapı', 'Dolmabahçe', 'Çırağan', 'Yıldız']],
			['Gökyüzünde görülür', ['Ay', 'Güneş', 'Bulut', 'Gökkuşağı']],
			['Türkiye’yi çevreleyen denizler', ['Ege', 'Marmara', 'Akdeniz', 'Karadeniz']],
		]),
		BG('dn-bg2', 'tarih', 2, [
			['Padişah lakapları', ['Yavuz', 'Kanuni', 'Yıldırım', 'Fatih']],
			['İstanbul’un ilçeleri', ['Beşiktaş', 'Kadıköy', 'Üsküdar', 'Sarıyer']],
			['Hava olayları', ['Şimşek', 'Dolu', 'Kırağı', 'Sis']],
		]),
		BG('dn-bg3', 'cografya', 1, [
			['Dağlar', ['Ağrı', 'Erciyes', 'Uludağ', 'Palandöken']],
			['Göller', ['Van', 'Tuz', 'Eğirdir', 'Salda']],
			['İller', ['Sinop', 'Rize', 'Bitlis', 'Kars']],
		]),
		BG('dn-bg4', 'sanat', 2, [
			['Halk çalgıları', ['Kemençe', 'Bağlama', 'Ney', 'Tulum']],
			['Peynirler', ['Kaşar', 'Lor', 'Çökelek', 'Örgü']],
			['Kebaplar', ['Adana', 'Urfa', 'İskender', 'Beyti']],
		]),
		BG('dn-bg5', 'spor', 3, [
			['Futbol terimleri', ['Ofsayt', 'Korner', 'Penaltı', 'Taç']],
			['Basketbol terimleri', ['Turnike', 'Ribaund', 'Pivot', 'Üçlük']],
			['Voleybol terimleri', ['Manşet', 'Servis', 'Blok', 'Smaç']],
		]),
	],
};
