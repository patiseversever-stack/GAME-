// Sefer (kampanya): yedi bölge, bölge başına dört sahne (üçü sıradan, sonuncusu bölge komutanı),
// bir de bonus "Büyük Fetih". Yıldız, kilit açma ve kayıt burada.
//
// Akış (arayüz için):
//   const c = app.campaign;
//   c.regions()                     → harita ekranı: [{key, name, unlocked, cleared, stars, maxStars, needStars, stages:[…]}]
//   c.stage(id)                     → sahne tanımı (komutanlar, mod, hedefler)
//   c.status(id)                    → {unlocked, stars, tries}
//   h.start(c.cfgFor(id))           → sahneyi başlat (cfg.campaign=true, cfg.stage=id)
// Maç bitince Match `c.report(...)` çağırır; ödül özeti `ui.end(m, ranking, rewards)` ile gelir.
//
// Yıldız kuralları (sahne kazanılırsa):
//   ★   kazan
//   ★★  kazan ve bölgenin en az %45'ine sahip ol
//   ★★★ kazan, kalen hiç kule kaybetmesin ve doğruluğun %60'ı geçsin

import { Progress } from './progress.js';
import { REGION_THEME } from './commanders.js';

export const REGION_ORDER = ['ege', 'marmara', 'akdeniz', 'icanadolu', 'karadeniz', 'guneydogu', 'dogu'];
export const REGION_NAMES = {
	marmara: 'Marmara',
	ege: 'Ege',
	akdeniz: 'Akdeniz',
	icanadolu: 'İç Anadolu',
	karadeniz: 'Karadeniz',
	dogu: 'Doğu Anadolu',
	guneydogu: 'Güneydoğu',
	all: 'Tüm Türkiye',
};

// Bölgeye giriş için gereken toplam yıldız (önceki bölgenin komutanını yenmek de şart)
export const STAR_GATE = [0, 3, 7, 11, 16, 21, 27];

export const STAR_RULES = ['Kazan', "Bölgenin en az %45'ine sahip ol", "Kalen hiç kule kaybetmesin ve doğruluğun %60'ı geçsin"];

// Komutan seçkisi: [ad, unvan, kostüm, söz]. Sıra: A, B, C, D (D takım arkadaşı), patron.
const ROSTER = {
	ege: {
		boss: ['Ege Beyi Karaefe', 'Zeybeklerin Başı', 'zeybek', 'Ege’yi kolay kimseye vermem!'],
		men: [
			['Poyraz Reis', 'Denizci', 'korsan', 'Rüzgâr benden yana!'],
			['Sevim Usta', 'Zeytinyağı Şefi', 'asci', 'Tarifim sağlam, bilgim daha sağlam.'],
			['Tolga Efe', 'Genç Zeybek', 'zeybek', 'Dağlar beni dinler.'],
			['Nilay', 'Bağ Rehberi', 'mezun', 'Birlikte güçlüyüz!'],
		],
		stages: ['Zeytin Bahçesi', 'Liman Kasabası', 'Kuşadası Yolu', 'Ege Beyi’nin Kalesi'],
	},
	marmara: {
		boss: ['Boğaz Paşası', 'İki Kıtanın Bekçisi', 'osmanli_kaptan', 'Boğaz’dan geçen bana uğrar.'],
		men: [
			['Cemal Usta', 'Simitçi', 'simitci', 'Simit sıcak, soru daha sıcak!'],
			['Kaptan Nilüfer', 'Vapur Kaptanı', 'osmanli_kaptan', 'Rota belli, hedef net.'],
			['Barış', 'Kramponlu', 'futbolcu', 'Gol atar gibi bilirim.'],
			['Defne', 'İstanbullu', 'mezun', 'Hadi bir hamle yapalım.'],
		],
		stages: ['Çiftlik Yolu', 'Kapalıçarşı', 'Boğaz Kıyısı', 'Boğaz Paşası’nın Kalesi'],
	},
	akdeniz: {
		boss: ['Akdeniz Sultanı Güneş', 'Sahillerin Hâkimi', 'selcuklu_emir', 'Güneş doğdu, sıra bende.'],
		men: [
			['Nazlı', 'Narenciye Bahçıvanı', 'asci', 'Portakal gibi tatlı, limon gibi keskin.'],
			['Kaan', 'Dalgıç', 'astronot', 'Derin sularda yüzerim.'],
			['Ece', 'Antik Kent Rehberi', 'ogretmen', 'Tarih benim mahallem.'],
			['Gökçe', 'Yelkenci', 'korsan', 'Rüzgâr arkamızda!'],
		],
		stages: ['Narenciye Vadisi', 'Antik Kent', 'Toros Geçidi', 'Güneş Sultanı’nın Kalesi'],
	},
	icanadolu: {
		boss: ['Bozkır Kağanı Börü', 'Bozkırın Efendisi', 'gokturk_kagan', 'Bozkır uzundur, hafızam daha uzun.'],
		men: [
			['Hakkı Usta', 'Pastırmacı', 'asci', 'Çemen gibi sağlam!'],
			['Meral Öğretmen', 'Ankara Hocası', 'ogretmen', 'Ödevini yapan kazanır.'],
			['Alp Okçu', 'Bozkır Okçusu', 'gokturk_okcu', 'Hedefi on ikiden vururum.'],
			['Ayça', 'Peri Bacası Rehberi', 'mezun', 'Yolu ben bilirim.'],
		],
		stages: ['Peri Bacaları', 'Tuz Gölü Kıyısı', 'Erciyes Eteği', 'Kağan’ın Çadırı'],
	},
	karadeniz: {
		boss: ['Fırtına Reisi Dumrul', 'Dalgaların Efendisi', 'kurtulus_subay', 'Fırtınayı bile yenerim!'],
		men: [
			['Rabia', 'Çaycı', 'kral_cay', 'Tavşan kanı, taze bilgi.'],
			['Kerem', 'Yayla Çobanı', 'kurtulus_gonullu', 'Yayladan indim, dağlar benimle.'],
			['Yusuf', 'Hamsi Kaptanı', 'korsan', 'Ağ dolu, kafa dolu.'],
			['Zehra', 'Yaylacı', 'mezun', 'El ele verelim.'],
		],
		stages: ['Çay Bahçeleri', 'Yayla Yolu', 'Sis Dağı', 'Fırtına Reisi’nin Kalesi'],
	},
	guneydogu: {
		boss: ['Taş Kale Beyi Aslan', 'Kervan Yolunun Bekçisi', 'selcuklu_sipahi', 'Kale taştan, irade çelikten.'],
		men: [
			['Mahir Usta', 'Kebapçı', 'asci', 'Közde pişer, bilgide yenilmez.'],
			['Dilan', 'Bakırcı', 'selcuklu_sipahi', 'Çekiç ne kadar vurursa o kadar parlar.'],
			['Şehzade', 'Baklavacı', 'osmanli_akinci', 'Bilgi kat kat, tatlı gibi.'],
			['Cihan', 'Kervan Rehberi', 'mezun', 'Yolculuk başlasın!'],
		],
		stages: ['Fıstık Bahçesi', 'Çarşı Hanı', 'Mozaik Kenti', 'Aslan’ın Taş Kalesi'],
	},
	dogu: {
		boss: ['Dağların Hanı Kürşat', 'Yüksek Yaylaların Efendisi', 'ninja', 'Zirveye ancak en iyi çıkar.'],
		men: [
			['Yiğit', 'Kayakçı', 'astronot', 'Karda iz bırakmam, rakibi geçerim.'],
			['Gülizar', 'Göl Rehberi', 'ogretmen', 'Van’ın mavisi gözümde.'],
			['Bora', 'Kars Süvarisi', 'osmanli_akinci', 'Atım hızlı, bilgim daha hızlı.'],
			['Elif', 'Dağcı', 'mezun', 'Zirvede buluşuruz!'],
		],
		stages: ['Karlı Yayla', 'Göl Kıyısı', 'Dağ Geçidi', 'Han’ın Zirve Kalesi'],
	},
};

const FINAL = {
	id: 'final',
	name: 'Büyük Fetih',
	boss: ['Cihan Hakanı', 'Bütün Haritanın Sahibi', 'osmanli_sultan', 'Hepinizi tek tek geçtim, sıra sende.'],
	men: [
		['Karaefe', 'Ege Beyi', 'zeybek', 'Yine mi sen?'],
		['Güneş', 'Akdeniz Sultanı', 'selcuklu_emir', 'Rövanş vakti!'],
		['Dumrul', 'Fırtına Reisi', 'kurtulus_subay', 'Bu sefer fırtına seninle.'],
	],
};

const skillOf = (r, k) => Math.min(0.93, 0.33 + r * 0.08 + [-0.02, 0, 0.02, 0.07][k]);

/** Sahne tanımlarını üret (veri, çalışma anında bir kez). */
function buildStages() {
	const out = [];
	REGION_ORDER.forEach((key, r) => {
		const R = ROSTER[key];
		const base = (m, i) => ({ name: m[0], title: m[1], costume: m[2], quote: m[3], ...i });
		const boss = base(R.boss, { boss: true });
		const [A, B, C, D] = R.men.map((m) => base(m, {}));
		const defs = [
			{ mode: '1v1', opp: [A] },
			{ mode: 'ffa3', opp: [B, C] },
			{ mode: 'team', opp: [B, { ...D, ally: true }, C] },
			{ mode: '1v1', opp: [boss], boss: true },
		];
		defs.forEach((d, k) => {
			const skill = skillOf(r, k);
			out.push({
				id: `${key}-${k + 1}`,
				region: key,
				order: r,
				n: k + 1,
				name: R.stages[k],
				mode: d.mode,
				length: 'quick',
				boss: !!d.boss,
				opp: d.opp.map((o, i) => ({ ...o, skill: o.ally ? skill - 0.05 : o.boss ? skill : skill + (i % 2 ? 0.015 : -0.015) })),
				skill,
				diffBias: -0.25 + r * 0.14 + (d.boss ? 0.25 : k * 0.06),
				// patron: başlangıçta 2 ek il, 1 ek joker
				perks: d.boss ? { startProvinces: 2, botJokers: 1 } : { startProvinces: 0, botJokers: 0 },
			});
		});
	});
	// bonus: bütün Türkiye, 4 kişi, uzun
	out.push({
		id: 'final-1',
		region: 'all',
		order: 7,
		n: 1,
		name: FINAL.name,
		mode: 'ffa4',
		length: 'long',
		boss: true,
		opp: [
			...FINAL.men.slice(0, 2).map((m) => ({ name: m[0], title: m[1], costume: m[2], quote: m[3], skill: 0.82 })),
			{ name: FINAL.boss[0], title: FINAL.boss[1], costume: FINAL.boss[2], quote: FINAL.boss[3], skill: 0.9, boss: true },
		],
		skill: 0.85,
		diffBias: 0.9,
		perks: { startProvinces: 3, botJokers: 1 },
	});
	return out;
}

export const STAGES = buildStages();
const BY_ID = new Map(STAGES.map((s) => [s.id, s]));
const levelKey = (skill) => (skill < 0.45 ? 'caylak' : skill < 0.63 ? 'er' : skill < 0.79 ? 'usta' : 'efsane');

export class Campaign {
	constructor(progress, store) {
		this.progress = progress;
		this.store = store;
		const s = (store && store.get && store.get('campaign')) || null;
		this.d = s && typeof s === 'object' ? { v: 1, stages: {}, cleared: [], ...s } : { v: 1, stages: {}, cleared: [] };
	}

	save() {
		try {
			this.store?.set?.('campaign', this.d);
		} catch (e) {
			/* kayıt kapalı */
		}
	}

	stage(id) {
		return BY_ID.get(id) || null;
	}

	stars(id) {
		return this.d.stages[id]?.stars || 0;
	}

	totalStars() {
		let n = 0;
		for (const s of STAGES) n += this.stars(s.id);
		return n;
	}

	regionName(key) {
		return REGION_NAMES[key] || key;
	}

	regionCleared(key) {
		return this.d.cleared.includes(key);
	}

	regionUnlocked(key) {
		if (key === 'all') return REGION_ORDER.every((k) => this.regionCleared(k));
		const r = REGION_ORDER.indexOf(key);
		if (r <= 0) return r === 0;
		return this.regionCleared(REGION_ORDER[r - 1]) && this.totalStars() >= STAR_GATE[r];
	}

	stageUnlocked(id) {
		const s = BY_ID.get(id);
		if (!s || !this.regionUnlocked(s.region)) return false;
		if (s.n === 1) return true;
		return this.stars(`${s.region}-${s.n - 1}`) > 0;
	}

	status(id) {
		return { unlocked: this.stageUnlocked(id), stars: this.stars(id), tries: this.d.stages[id]?.tries || 0, wins: this.d.stages[id]?.wins || 0 };
	}

	/** Harita ekranı için bölge listesi (sıralı; en sonda bonus). */
	regions() {
		return [...REGION_ORDER, 'all'].map((key, r) => {
			const stages = STAGES.filter((s) => s.region === key).map((s) => ({ ...s, ...this.status(s.id) }));
			const boss = stages.find((s) => s.boss);
			return {
				key,
				name: this.regionName(key),
				order: r,
				unlocked: this.regionUnlocked(key),
				cleared: this.regionCleared(key),
				stars: stages.reduce((a, s) => a + s.stars, 0),
				maxStars: stages.length * 3,
				needStars: key === 'all' ? 0 : STAR_GATE[r] || 0,
				boss: boss ? boss.opp[boss.opp.length - 1] : null,
				stages,
			};
		});
	}

	/** Oynanacak sıradaki sahne (kilidi açık, henüz geçilmemiş ilk sahne). */
	next() {
		for (const s of STAGES) if (this.stageUnlocked(s.id) && this.stars(s.id) === 0) return s.id;
		const open = STAGES.filter((s) => this.stageUnlocked(s.id) && this.stars(s.id) < 3);
		return open.length ? open[0].id : null;
	}

	/** `h.start(cfg)` için yapılandırma. extra: eklemek/ezmek istediklerin. */
	cfgFor(id, extra = {}) {
		const s = BY_ID.get(id);
		if (!s) throw new Error('Bilinmeyen sahne: ' + id);
		const theme = REGION_THEME[s.region] || [];
		return {
			mode: s.mode,
			length: s.length,
			region: s.region,
			bot: levelKey(s.skill),
			campaign: true,
			stage: s.id,
			opponents: s.opp.map((o) => ({ ...o, costume: o.costume || theme[0] })),
			diffBias: s.diffBias,
			perks: s.perks,
			ranked: false,
			...extra,
		};
	}

	/** Sonuçtan yıldız (0 = yenildi). res: { won, share, towersLost, accuracy } */
	starsFor(res) {
		if (!res.won) return 0;
		let n = 1;
		if (res.share >= 0.45) n = 2;
		if (n === 2 && res.towersLost === 0 && res.accuracy >= 0.6) n = 3;
		return n;
	}

	/**
	 * Maç sonucunu kaydet. Dönüş: { stars, prevStars, newStars, firstClear, boss, unlocked:[…], regionCleared, items:[…] }
	 */
	report(id, res) {
		const s = BY_ID.get(id);
		if (!s) return null;
		const rec = this.d.stages[id] || (this.d.stages[id] = { stars: 0, tries: 0, wins: 0 });
		const stars = this.starsFor(res);
		const prev = rec.stars;
		const beforeUnlocked = new Set([...STAGES.filter((x) => this.stageUnlocked(x.id)).map((x) => x.id)]);
		const beforeRegions = REGION_ORDER.concat('all').filter((k) => this.regionUnlocked(k));
		rec.tries++;
		if (stars > 0) rec.wins++;
		rec.stars = Math.max(prev, stars);
		let regionCleared = false;
		if (s.boss && stars > 0 && !this.d.cleared.includes(s.region)) {
			this.d.cleared.push(s.region);
			regionCleared = true;
		}
		this.save();
		const items = this.progress ? this.progress.grantAuto({ campaign: this }) : [];
		const unlocked = STAGES.filter((x) => !beforeUnlocked.has(x.id) && this.stageUnlocked(x.id)).map((x) => x.id);
		const regions = REGION_ORDER.concat('all').filter((k) => !beforeRegions.includes(k) && this.regionUnlocked(k));
		return { stars, prevStars: prev, newStars: Math.max(0, stars - prev), firstClear: prev === 0 && stars > 0, boss: s.boss, unlocked, regions, regionCleared, items: items.map((x) => ({ kind: x.kind, id: x.id, name: x.name })) };
	}
}

/** App'e `progress` ve `campaign` ekler (yoksa). app.js tek satırla çağırır; Match de güvenlik ağı olarak çağırır. */
export function ensureSystems(app) {
	if (!app.progress) app.progress = new Progress(app.store, app.hooks || {});
	if (!app.campaign) app.campaign = new Campaign(app.progress, app.store);
	return { progress: app.progress, campaign: app.campaign };
}
