// Soru hafızası (tekrarsız soru motoru) sınaması:  node test/hafiza.test.mjs [--n=40]
//
//  1. Hafiza birimi: görme, yaş, kardeş anahtarı, JSON gidiş-dönüş (seyrek ve yoğun biçim), yaş doygunluğu, bozuk girdi,
//     sıra kaydının eksiksizliği (maç havuzundaki her kimliğin sırası var).
//  1b. Göç: v1 'seen' dizisi ve v2 kaydı kayıpsız çevrilir; sırası olmayan kimlik düşer ve sayılır (dusen); ilerleme
//     kaydı (Progress) eski biçimi okuyup v3 yazar.
//  1c. Bayatlık eskisiyle aynı: eski (kimlik → maç) başvuru hafızasıyla aynı rastgele geçmiş; bayat() ve seçicinin
//     gördüğü eskilik (en çok 200) her soruda aynı. Eski hafızanın v2 dökümünden çevrilen kayıt da aynı.
//  1d. 100 bin sahte soru: bütün sorular görülmüş, kardeş kaydı dolu: kayıt ≤ 250 KB, yazma (gor + toJSON + JSON) ≤ 2 ms.
//  2. Yerel oyuncu: aynı ilerleme kaydıyla art arda N maç (gerçek Match, sahte dünya). Hiçbir soru, o an aynı tip ve
//     kategoride görülmemiş soru varken ikinci kez çıkmamalı; aynı maçta aynı bilginin (kardeş) iki sorusu çıkmamalı.
//     Rapor: toplam soru, farklı soru, ilk tekrarın maçı, tip başına havuz ve "kaç maç sonra tekrar başlar" tahmini.
//  3. Maçı yarıda bırakma: sorulan soru anında kayda geçer (maç sonu beklenmez).
//  4. Çevrimiçi: iki uzak koltuğun özetleri (ozet) sunucuya gider; maç, iki koltuğun da görmediği sorulardan seçer.
//  5. İstemci 'hello' alınca özetini kendisi gönderir.
//  6. Hesap: sunucu deposu, birleştirme (v3 ve eski v2 özet, eski v2 depo kaydı).
await import('./kanca.mjs');
const { Match } = await import('../src/game/match.js');
const { Progress } = await import('../src/game/progress.js');
const { Hafiza, kardes, bayat, eskilik, ikizler, siraOf, kimlikOf, siraSayisi, siraKur, siraCoz, K_MAX } = await import('../src/quiz/hafiza.js');
const { siraKodla } = await import('../tools/soru/sira.mjs');
const { makeApp, makeUI, memStore } = await import('./dunya.mjs');
const { LocalTransport, BotClient } = await import('../src/game/net.js');
const { kur } = await import('./sanal-saat.mjs');

const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const N = Number(opt.n || 40);
let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 40) console.log('  HATA: ' + m);
	}
};
const REGIONS = ['ege', 'marmara', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
// sırası olan gerçek kimlikler (hafıza yalnız kayıttaki kimlikleri tutar)
const ID = Array.from({ length: 12 }, (_, i) => kimlikOf(i * 97));
const SAYI = siraSayisi();
const R0 = (seed) => {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

/** Eski hafıza (v2, kimlik → maç; kırpmasız): bayatlık ve göç karşılaştırması için başvuru. */
class EskiHafiza {
	constructor() {
		this.n = 0;
		this.m = new Map();
		this.k = new Map();
	}
	yeniMac() {
		this.n++;
	}
	gor(q) {
		if (!q?.id) return;
		this.m.delete(q.id);
		this.m.set(q.id, this.n);
		const k = kardes(q);
		if (k) {
			this.k.delete(k);
			this.k.set(k, this.n);
		}
	}
	yas(id) {
		const t = this.m.get(id);
		return t == null ? Infinity : this.n - t;
	}
	kYas(key) {
		const t = key ? this.k.get(key) : undefined;
		return t == null ? Infinity : this.n - t;
	}
	toJSON() {
		const pack = (map) => {
			const g = {};
			for (const [id, t] of map) g[t] = g[t] ? g[t] + ' ' + id : id;
			return g;
		};
		return { v: 2, n: this.n, g: pack(this.m), k: pack(this.k) };
	}
}

// ---------------------------------------------------------------- 1) birim
console.log('1) Birim: yaş, kardeş, gidiş-dönüş, doygunluk, sıra kaydı');
{
	const [A, B, C] = ID;
	const h = new Hafiza();
	h.yeniMac();
	h.gor({ id: A, type: 'choice', a: ['Selanik', 'Manastır', 'İzmir', 'Edirne'] });
	h.yeniMac();
	h.gor({ id: B, type: 'hang', w: 'SELANİK' });
	ok(h.yas(A) === 1 && h.yas(B) === 0 && h.yas(C) === Infinity && h.yas('kayitta-yok') === Infinity, 'yaş');
	ok(kardes({ type: 'hang', w: 'SELANİK' }) === kardes({ type: 'choice', a: ['Selanik'] }), 'kardeş: aynı cevap aynı anahtar');
	ok(kardes({ type: 'mancinik', src: 'n1', id: 'dn-mc1' }) === kardes({ type: 'num', id: 'n1' }), 'kardeş: Mancınık ↔ kaynak tahmin sorusu');
	// açık kardeş: kökü başka sorunun cevabını açan tahmin sorusu o cevabın anahtarını taşır; Mancınık ikizi de (kaynaktan kopya)
	const dg = { type: 'num', id: 'san-wd-dogum-Q7243', kardes: 'a:tolstoy' };
	ok(kardes(dg) === kardes({ type: 'choice', a: ['Tolstoy'] }), 'kardeş: açık anahtar cevap anahtarıyla aynı');
	ok(kardes({ ...dg, id: 'dn-mc-' + dg.id, src: dg.id, type: 'mancinik' }) === kardes(dg), 'kardeş: açık anahtarlı kaynağın Mancınık ikizi aynı anahtar');
	const j = JSON.parse(JSON.stringify(h));
	ok(j.v === 3 && typeof j.k === 'string' && (typeof j.s === 'string') !== (typeof j.y === 'string'), 'v3 kaydı: base64 alanlar');
	const h2 = new Hafiza(j);
	ok(h2.n === 2 && h2.yas(A) === 1 && h2.yas(B) === 0 && h2.size === 2, 'JSON gidiş-dönüş');
	ok(h2.kYas('a:selanik') === 0, 'kardeş anahtarı gidiş-dönüşte kalır');
	ok(bayat({ id: C, type: 'choice', a: ['Selanik'] }, [h2], new Set()) === 0.5, 'bayatlık: kardeşi yeni görülmüş');
	ok(bayat({ id: A, type: 'choice', a: ['Selanik'] }, [h2], new Set()) === 2, 'bayatlık: görülmüş');
	ok(bayat({ id: ID[5], type: 'tf' }, [h2], new Set()) === 0, 'bayatlık: taze');
	ok(bayat({ id: ID[5], type: 'choice', a: ['Selanik'] }, [h2], new Set(['a:selanik'])) === 3.5, 'bayatlık: kardeşi bu maçta sorulmuş');
	// yaş doygunluğu: 254'ten sonra "çok eski" (seçici eskiliği 200'de keser, bayatlık 30'da ayırır: davranış aynı)
	const d = new Hafiza();
	d.yeniMac();
	d.gor({ id: A, type: 'num' });
	ok(d.kYas('q:' + A) === 0, 'kardeş anahtarı yazıldı');
	for (let i = 0; i < 40; i++) d.yeniMac();
	d.gor({ id: B });
	ok(d.yas(A) === 40 && bayat({ id: A }, [d], new Set()) === 1, 'yaş 40: daha eski (+1)');
	for (let i = 0; i < 300; i++) d.yeniMac();
	ok(d.yas(A) === 254 && d.yas(B) === 254 && Math.min(200, eskilik({ id: A }, [d])) === 200, 'yaş doygunluğu (254)');
	ok(d.kYas('q:' + A) === Infinity, 'kardeş anahtarı pencere dışında düşer');
	ok(new Hafiza(JSON.parse(JSON.stringify(d))).yas(A) === 254, 'doygun yaş gidiş-dönüşte kalır');
	// seyrek ve yoğun biçim
	const az = new Hafiza();
	az.yeniMac();
	for (let i = 0; i < 50; i++) az.gor({ id: kimlikOf(i * 211) });
	const jaz = az.toJSON();
	const cok = new Hafiza();
	cok.yeniMac();
	for (let i = 0; i < siraSayisi(); i += 2) cok.gor({ id: kimlikOf(i) });
	cok.yeniMac();
	for (let i = 1; i < siraSayisi(); i += 6) cok.gor({ id: kimlikOf(i) });
	const jcok = cok.toJSON();
	ok(typeof jaz.s === 'string' && typeof jcok.y === 'string', `az görmüşte seyrek, çok görmüşte yoğun biçim (${Object.keys(jaz)} / ${Object.keys(jcok)})`);
	const geri = (h, j) => {
		const g = new Hafiza(JSON.parse(JSON.stringify(j)));
		for (let i = 0; i < siraSayisi(); i++) if (g.y[i] !== h.y[i]) return false;
		return g.size === h.size;
	};
	ok(geri(az, jaz) && geri(cok, jcok), 'seyrek ve yoğun biçim gidiş-dönüş');
	ok(JSON.stringify(jaz).length < 400, `50 soru görmüş oyuncunun kaydı küçük (${JSON.stringify(jaz).length} bayt)`);
	// bozuk ya da kötü niyetli girdi: hata yok, boş ya da sınırlı kayıt
	for (const bad of [{ v: 3, y: '!!!' }, { v: 3, s: '////////' }, { v: 3, k: 12 }, { v: 2, g: 'x', k: [] }, { v: 3, n: 'x', y: 5 }, 'metin', 7]) {
		let e = null;
		try {
			new Hafiza(bad).toJSON();
		} catch (x) {
			e = x;
		}
		ok(!e, 'bozuk kayıt hata vermemeli: ' + JSON.stringify(bad) + ' ' + e);
	}
	ok(new Hafiza({ v: 3, y: '!!!' }).size === 0, 'geçersiz base64 yok sayılır');
	// sıra kaydının eksiksizliği: maç havuzundaki her soru (ve Mancınık kaynağı, Halat turunun maddeleri) kayıtta
	const pool = new Match(makeApp(), makeUI(), { mode: 'ffa3', length: 'quick', allBots: true, persist: false, seed: 1 }).pool;
	const eksik = [];
	for (const q of pool) for (const id of [q.id, q.src, ...(q.srcs || [])]) if (id && siraOf(id) < 0) eksik.push(id);
	ok(!eksik.length, `sırası olmayan ${eksik.length} kimlik (node tools/soru/sira.mjs --guncelle): ${eksik.slice(0, 5).join(', ')}`);
	ok(siraOf(kimlikOf(123)) === 123 && siraOf('kayitta-yok') === -1, 'siraOf / kimlikOf');
	// bütün banka görülmüşken çevrimiçi özet küçük (eskisi 10 000 kimlikte ~150 KB'tı)
	const big = new Hafiza();
	big.yeniMac();
	for (const q of pool) big.gor(q);
	const oz = JSON.stringify(big.ozet()).length;
	ok(oz < 120000, `çevrimiçi özet küçük (${oz} bayt)`);
	console.log(`   kayıt ${siraSayisi()} sıra; bütün havuz (${pool.length}) görülmüşken özet ${(oz / 1024).toFixed(1)} KB, 50 soruda ${JSON.stringify(jaz).length} bayt`);
}

// ---------------------------------------------------------------- 1b) göç
console.log('1b) Göç: v1, v2 ve ilerleme kaydı');
{
	const [A, B, C, D] = ID;
	// v1: son görülen kimlikler (hepsi bir önceki maçta)
	const v1 = new Hafiza([A, B, 'eski-yok-1']);
	ok(v1.yas(A) === 1 && v1.yas(B) === 1 && v1.size === 2 && v1.dusen === 1, `v1: kimlikler bir önceki maçta, bilinmeyen düşer (düşen ${v1.dusen})`);
	// v2: { n, g: { maç: 'id …' }, k: { maç: 'anahtar …' } }
	const v2 = { v: 2, n: 10, g: { 8: `${A} ${B}`, 10: C, 3: 'yok-1 yok-2', 1: D }, k: { 9: 'a:selanik q:x', 2: 'a:eski' } };
	const h = new Hafiza(v2);
	ok(h.n === 10 && h.yas(A) === 2 && h.yas(B) === 2 && h.yas(C) === 0 && h.yas(D) === 9, 'v2: maç yaşları korunur');
	ok(h.dusen === 2 && h.size === 4, `v2: sırası olmayan 2 kimlik düşer (düşen ${h.dusen}, kalan ${h.size})`);
	ok(h.kYas('a:selanik') === 1 && h.kYas('q:x') === 1 && h.kYas('a:eski') === 8, 'v2: kardeş anahtarları maç yaşıyla');
	const h3 = new Hafiza(JSON.parse(JSON.stringify(h)));
	ok(h3.yas(D) === 9 && h3.kYas('a:eski') === 8 && h3.n === 10, 'v2 → v3 → okuma');
	// kayıpsız: bütün kayıttaki kimlikler, rastgele maçlarda görülmüş (eski biçim) → v3: her kimlikte aynı yaş, hiçbiri düşmez
	const R = R0(11);
	const E = new EskiHafiza();
	for (let m = 0; m < 120; m++) {
		E.yeniMac();
		for (let i = 0; i < 200; i++) E.gor({ id: kimlikOf(Math.floor(R() * siraSayisi())) });
	}
	const eJ = JSON.parse(JSON.stringify(E.toJSON()));
	const t0 = performance.now();
	const Y = new Hafiza(eJ);
	const ms = performance.now() - t0;
	let fark = 0;
	for (const [id] of E.m) if (Y.yas(id) !== E.yas(id)) fark++;
	ok(fark === 0 && Y.size === E.m.size && Y.dusen === 0, `v2 göçü kayıpsız olmalı (${fark} farklı yaş, ${Y.size}/${E.m.size}, düşen ${Y.dusen})`);
	// bankadan silinmiş ya da hiç kayıtta olmayan kimlikler düşer, sayılır
	eJ.g[E.n] += ' silinmis-1 silinmis-2 silinmis-3';
	ok(new Hafiza(eJ).dusen === 3, 'v2: bilinmeyen 3 kimlik düşmeli');
	console.log(`   v2 göçü: ${E.m.size} kimlik ${ms.toFixed(1)} ms, eski kayıt ${(JSON.stringify(eJ).length / 1024).toFixed(0)} KB → yeni ${(JSON.stringify(Y).length / 1024).toFixed(1)} KB`);
	// ilerleme kaydı: v1 'seen' dizisi hafızaya geçer, v3 yazılır
	const st = memStore();
	st.set('progress', { v: 1, seen: [A, B, 'eski-yok'] });
	const pr = new Progress(st, {});
	ok(pr.hafiza.yas(A) === 1 && pr.hafiza.yas(C) === Infinity && pr.hafiza.dusen === 1, 'ilerleme: eski görülenler hafızada');
	pr.save();
	ok(st.get('progress').hafiza?.v === 3 && !st.get('progress').seen.length, 'ilerleme: hafıza v3 kaydediliyor');
	ok(new Progress(st, {}).hafiza.yas(B) === 1, 'ilerleme: v3 kayıt yeniden okunur');
	ok([...pr.seenSet()].sort().join() === [A, B].sort().join(), 'ilerleme: seenSet görülen kimlikler');
	// ilerleme kaydı: v2 hafıza
	const st2 = memStore();
	st2.set('progress', { v: 1, seen: [], hafiza: v2 });
	const pr2 = new Progress(st2, {});
	ok(pr2.hafiza.yas(D) === 9 && pr2.hafiza.kYas('a:eski') === 8, 'ilerleme: v2 hafıza çevrilir');
	pr2.gordu();
	ok(st2.get('progress').hafiza?.v === 3 && new Hafiza(st2.get('progress').hafiza).yas(D) === 9, 'ilerleme: v2 → v3 (gordu)');
}

// ---------------------------------------------------------------- 1c) bayatlık eskisiyle aynı
console.log('1c) Bayatlık ve eskilik eski hafızayla aynı');
{
	const pool = new Match(makeApp(), makeUI(), { mode: 'ffa3', length: 'quick', allBots: true, persist: false, seed: 4 }).pool;
	const twin = ikizler(pool);
	const R = R0(23);
	const insan = [0, 1].map(() => ({ e: new EskiHafiza(), y: new Hafiza() }));
	let denendi = 0;
	let fark = 0;
	let farkGoc = 0;
	const ornek = [];
	const karsilastir = (H) => {
		const usedK = new Set();
		for (let i = 0; i < 30; i++) {
			const k = kardes(pool[Math.floor(R() * pool.length)]);
			if (k) usedK.add(k);
		}
		const E = H.map((x) => x.e);
		const Y = H.map((x) => x.y);
		const G = H.map((x) => new Hafiza(JSON.parse(JSON.stringify(x.e.toJSON())))); // eski kaydın göçü
		for (let i = 0; i < 2500; i++) {
			const q = pool[Math.floor(R() * pool.length)];
			const be = bayat(q, E, usedK, twin);
			const by = bayat(q, Y, usedK, twin);
			const bg = bayat(q, G, usedK, twin);
			const ee = Math.min(200, eskilik(q, E, twin));
			const ey = Math.min(200, eskilik(q, Y, twin));
			denendi++;
			if (be !== by || ee !== ey) {
				fark++;
				if (ornek.length < 3) ornek.push(`${q.id}: bayat ${be}/${by} eskilik ${ee}/${ey}`);
			}
			if (be !== bg || Math.min(200, eskilik(q, G, twin)) !== ee) farkGoc++;
		}
	};
	const sor = (h, q) => {
		// Match.pick'in yazdığı gibi: soru, Mancınık kaynağı, Halat turunun maddeleri
		h.gor(q);
		if (q.src) h.gor({ id: q.src });
		if (q.srcs) for (const id of q.srcs) h.gor({ id });
	};
	for (let m = 1; m <= 320; m++) {
		for (const x of insan) x.e.yeniMac(), x.y.yeniMac();
		// her maç ~40 soru; ikinci insan her maçı oynamaz (sayaçlar ayrışır)
		for (let i = 0; i < 40; i++) {
			const q = pool[Math.floor(R() * pool.length)];
			for (const [j, x] of insan.entries()) if (j === 0 || m % 3) sor(x.e, q), sor(x.y, q);
		}
		if (m === 3 || m === 31 || m === 80 || m === 260 || m === 320) {
			karsilastir([insan[0]]);
			karsilastir(insan);
		}
	}
	ok(fark === 0, `bayatlık/eskilik eskisinden farklı: ${fark}/${denendi} (${ornek.join('; ')})`);
	ok(farkGoc === 0, `eski kaydın göçüyle bayatlık farklı: ${farkGoc}/${denendi}`);
	console.log(`   ${denendi} karşılaştırma (1 ve 2 insan, 320 maça dek): ${fark} fark, göçte ${farkGoc} fark`);
}

// ---------------------------------------------------------------- 1d) 100 bin soru: boyut ve yazma süresi
console.log('1d) 100 bin sahte soru: kayıt boyutu ve yazma süresi');
{
	// dört aile, ailede ardışık numara (kayıt grupları gerçek bankadaki gibi)
	const ids = Array.from({ length: 100000 }, (_, i) => `sahte-${['ch', 'tf', 'nu', 'hg'][i % 4]}-${i}`).sort((a, b) => (a.slice(0, 9) < b.slice(0, 9) ? -1 : a.slice(0, 9) > b.slice(0, 9) ? 1 : 0));
	const kodlu = JSON.stringify({ v: 1, n: ids.length, bos: [], r: siraKodla(ids) });
	let t = performance.now();
	const cozuldu = siraCoz(JSON.parse(kodlu));
	siraKur(cozuldu);
	const kurMs = performance.now() - t;
	try {
		ok(siraSayisi() === 100000 && siraOf(ids[99996]) === 99996 && cozuldu.every((id, i) => id === ids[i]), '100 bin sahte kayıt kuruldu');
		const qs = ids.map((id, i) => ({ id, type: 'choice', a: ['Cevap ' + i.toString(36)] }));
		const h = new Hafiza();
		for (let i = 0; i < qs.length; ) {
			h.yeniMac();
			for (let k = 0; k < 40 && i < qs.length; k++, i++) h.gor(qs[i]);
		}
		// kardeş kaydı dolu (en kötü durum): son maçta K_MAX farklı anahtar
		h.yeniMac();
		for (let k = 0; k < K_MAX; k++) h.gor(qs[k * 13]);
		ok(h.size === 100000 && h.k.size === K_MAX, `bütün sorular görülmüş (${h.size}), kardeş ${h.k.size}`);
		const boy = JSON.stringify(h).length;
		ok(boy <= 250 * 1024, `kayıt ${(boy / 1024).toFixed(1)} KB > 250 KB`);
		// yazma: Progress.gordu() gibi: soru görülür, kayıt JSON'a çevrilir. Yük altında sapmasın: 3 turun en iyi medyanı
		let med = Infinity;
		for (let tur = 0; tur < 3; tur++) {
			const ts = [];
			for (let r = 0; r < 60; r++) {
				t = performance.now();
				h.gor(qs[(r * 7919) % qs.length]);
				JSON.stringify(h.toJSON());
				ts.push(performance.now() - t);
			}
			ts.sort((a, b) => a - b);
			med = Math.min(med, ts[ts.length >> 1]);
		}
		ok(med <= 2, `yazma ${med.toFixed(2)} ms > 2 ms`);
		t = performance.now();
		const g = new Hafiza(JSON.parse(JSON.stringify(h)));
		const okuMs = performance.now() - t;
		ok(g.size === 100000 && g.yas('sahte-tf-1') === h.yas('sahte-tf-1') && g.k.size === K_MAX, '100 bin: gidiş-dönüş');
		t = performance.now();
		h.yeniMac();
		const macMs = performance.now() - t;
		// tipik oyuncu: 150 maç × 40 soru
		const tip = new Hafiza();
		for (let m = 0; m < 150; m++) {
			tip.yeniMac();
			for (let k = 0; k < 40; k++) tip.gor(qs[(m * 40 + k) * 17 % qs.length]);
		}
		const tipBoy = JSON.stringify(tip).length;
		ok(tipBoy < 30 * 1024, `tipik oyuncunun kaydı ${(tipBoy / 1024).toFixed(1)} KB`);
		console.log(`   kayıt (sira.json biçimi) ${(kodlu.length / 1024).toFixed(1)} KB, çözme ${kurMs.toFixed(1)} ms · hepsi görülmüş: ${(boy / 1024).toFixed(1)} KB, yazma ${med.toFixed(2)} ms, okuma ${okuMs.toFixed(1)} ms, yeni maç ${macMs.toFixed(2)} ms · tipik oyuncu (6 000 soru) ${(tipBoy / 1024).toFixed(1)} KB`);
	} finally {
		siraKur(null); // sira.json'a dön
	}
	ok(siraSayisi() === SAYI && siraOf(ID[1]) === 97, 'sıra kaydı geri yüklendi');
}

/**
 * m.pick'i sarar: her seçimden önce "aynı istekte taze soru var mıydı" ölçülür, sonra seçilen kaydedilir. Mancınık
 * sorusu bankadaki tahmin sorusunun aynısıdır (aynı metin, aynı cevap): ikisinden biri görüldüyse öbürü de görülmüştür.
 */
const ids = (q) => (q.src ? [q.id, q.src] : [q.id]);
const srcOf = new Map();
function watch(m, everSeen, log, label) {
	for (const q of m.pool) if (q.src) srcOf.set(q.src, q.id);
	const was = (q) => everSeen.some((S) => ids(q).some((id) => S.has(id)) || (srcOf.has(q.id) && S.has(srcOf.get(q.id))));
	const pick = m.pick.bind(m);
	m.pick = (o = {}) => {
		const fit = (q) => (!o.types || o.types.includes(q.type)) && (!o.cat || q.cat === o.cat) && m.askable(q) && !m.used.has(q.id);
		const fresh = m.pool.some((q) => fit(q) && !was(q));
		const q = pick(o);
		// everSeen maç bitince güncellenir (maç içinde aynı soru zaten çıkmaz): seçimden önceki durumu gösterir
		log.push({ id: q.id, src: q.src, type: q.type, cat: q.cat, seen: was(q), fresh, label, k: kardes(q) });
		return q;
	};
}

// ---------------------------------------------------------------- 2) yerel oyuncu, art arda maçlar
console.log(`2) Yerel oyuncu: aynı kayıtla art arda ${N} maç`);
{
	const store = memStore();
	const progress = new Progress(store, {});
	const mine = new Set();
	const all = [];
	let firstRepeat = 0;
	const t0 = Date.now();
	for (let k = 0; k < N; k++) {
		const app = makeApp(store);
		app.progress = progress;
		const m = new Match(app, makeUI(), { mode: ['ffa3', '1v1', 'ffa4'][k % 3], length: k % 4 === 3 ? 'long' : 'quick', bot: 'er', region: REGIONS[k % 7], seed: 7000 + k });
		const log = [];
		watch(m, [mine], log, k);
		await m.run();
		const keys = new Map();
		for (const e of log) {
			if (e.seen && !firstRepeat) firstRepeat = k + 1;
			ok(!(e.seen && e.fresh), `maç ${k + 1}: ${e.id} (${e.type}/${e.cat}) tekrar etti, oysa taze soru vardı`);
			if (e.k) {
				ok(!keys.has(e.k) || keys.get(e.k) === e.id, `maç ${k + 1}: aynı bilgi iki kez (${keys.get(e.k)} ve ${e.id}: ${e.k})`);
				keys.set(e.k, e.id);
			}
		}
		for (const e of log) for (const id of ids(e)) mine.add(id);
		all.push(...log);
	}
	const uniq = new Set(all.map((e) => e.id)).size;
	const rep = all.filter((e) => e.seen);
	console.log(`   ${all.length} soru, ${uniq} farklı, ${rep.length} tekrar${firstRepeat ? ` (ilk tekrar ${firstRepeat}. maçta)` : ' (hiç tekrar yok)'} · ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
	// tekrarların dökümü: hangi tip/kategori havuzu tükendi
	const by = {};
	for (const e of rep) by[e.type + '/' + e.cat] = (by[e.type + '/' + e.cat] || 0) + 1;
	if (rep.length) console.log('   tükenen havuzlar (tekrar sayısı):', JSON.stringify(by));
	// kayıt: hafıza sorulanların hepsini tutuyor
	const h = new Progress(store, {}).hafiza;
	ok([...mine].every((id) => h.yas(id) < Infinity), 'kayıttaki hafıza bütün sorulanları içermeli');
	// tip başına: maç başına ortalama kaç soru, havuz kaç soru → yaklaşık kaç maç tekrarsız
	const per = {};
	for (const e of all) per[e.type] = (per[e.type] || 0) + 1;
	const pool = {};
	for (const q of new Match(makeApp(), makeUI(), { mode: 'ffa3', length: 'quick', allBots: true, persist: false, seed: 1 }).pool) pool[q.type] = (pool[q.type] || 0) + 1;
	const rows = Object.entries(per)
		.map(([t, n]) => [t, pool[t] || 0, n / N, (pool[t] || 0) / (n / N)])
		.sort((a, b) => a[3] - b[3]);
	console.log('   tip: havuz / maç başına soru → tekrarsız maç sayısı (yaklaşık)');
	for (const [t, P, r, x] of rows) console.log(`     ${t.padEnd(10)} ${String(P).padStart(5)} / ${r.toFixed(2).padStart(5)} → ${x === Infinity ? '∞' : Math.floor(x)}`);
}

// ---------------------------------------------------------------- 3) maçı yarıda bırakma
console.log('3) Yarıda bırakılan maç: sorulan soru anında kayıtta');
{
	const store = memStore();
	const progress = new Progress(store, {});
	const app = makeApp(store);
	app.progress = progress;
	let asked = null;
	let m;
	const ui = makeUI({
		question(mm, ctx) {
			if (!asked) {
				asked = ctx.q.id;
				mm.aborted = true; // oyuncu çıktı
			}
			return { human: null };
		},
	});
	m = new Match(app, ui, { mode: '1v1', length: 'quick', bot: 'er', region: 'ege', seed: 31 });
	try {
		await m.run();
	} catch {}
	const saved = store.get('progress');
	ok(!!asked && new Hafiza(saved?.hafiza).yas(asked) < Infinity, 'yarıda bırakılan maçta sorulan soru kayda geçmemiş');
}

// ---------------------------------------------------------------- 4) çevrimiçi: uzak koltukların hafızası
console.log('4) Çevrimiçi: iki uzak koltuğun hafızası birleşir');
{
	const base = new Match(makeApp(), makeUI(), { mode: 'ffa4', length: 'quick', allBots: true, persist: false, seed: 2 });
	const ids = base.pool.map((q) => q.id);
	// koltuk 1 havuzun %40'ını, koltuk 2 başka %40'ını görmüş
	const h1 = new Hafiza();
	const h2 = new Hafiza();
	h1.yeniMac();
	h2.yeniMac();
	const S1 = new Set();
	const S2 = new Set();
	ids.forEach((id, i) => {
		if (i % 5 < 2) h1.gor({ id }), S1.add(id);
		else if (i % 5 < 4) h2.gor({ id }), S2.add(id);
	});
	const app = makeApp();
	const [a1, c1] = LocalTransport.pair();
	const [a2, c2] = LocalTransport.pair();
	let s = 9;
	const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	new BotClient(c1, { skill: 0.7, R });
	new BotClient(c2, { skill: 0.7, R });
	const m = new Match(app, makeUI(), { mode: 'ffa4', length: 'quick', bot: 'er', region: 'ege', seed: 77, seats: ['bot', 'remote', 'remote', 'bot'], transports: { 1: a1, 2: a2 }, allBots: true, persist: false, hafiza: { 1: JSON.parse(JSON.stringify(h1.ozet())), 2: JSON.parse(JSON.stringify(h2.ozet())) } });
	const log = [];
	watch(m, [S1, S2], log, 'net');
	const VS = kur();
	await VS.surdur(m.run());
	VS.kaldir();
	const hit = log.filter((e) => e.seen);
	ok(log.length > 5, 'çevrimiçi maçta soru sorulmadı');
	ok(hit.every((e) => !e.fresh), `uzak koltukların gördüğü soru tekrar etti: ${hit.filter((e) => e.fresh).map((e) => e.id).slice(0, 5).join(', ')}`);
	console.log(`   ${log.length} soru, ${hit.length} tanesi koltuklardan birinin gördüğü (yalnız taze kalmayan havuzlarda)`);
	// 'hafiza' eylemi: sonradan gelen özet de kullanılır
	const p1 = m.players[1];
	ok(m.remoteAct(p1, 'hafiza', h1.ozet()) === true && p1.mem.yas(ids[0]) < Infinity, "'hafiza' eylemi koltuğun hafızasını kurmalı");
}

// ---------------------------------------------------------------- 5) istemci özeti kendisi gönderir ('hafiza' eylemi)
console.log("5) İstemci 'hello' alınca özetini gönderir, gördüğünü kaydeder");
{
	const base = new Match(makeApp(), makeUI(), { mode: '1v1', length: 'quick', allBots: true, persist: false, seed: 3 });
	const h = new Hafiza();
	h.yeniMac();
	const S = new Set();
	// istemci havuzun üçte ikisini görmüş (özet sınırsız: kaydın kendisi)
	base.pool.forEach((q, i) => i % 3 && (h.gor(q), S.add(q.id)));
	const [a1, c1] = LocalTransport.pair();
	let s = 5;
	const cl = new BotClient(c1, { skill: 0.7, R: () => ((s = (s * 16807) % 2147483647) / 2147483647), hafiza: h.ozet() });
	const m = new Match(makeApp(), makeUI(), { mode: '1v1', length: 'quick', bot: 'er', region: 'marmara', seed: 88, seats: ['bot', 'remote'], transports: { 1: a1 }, allBots: true, persist: false });
	const log = [];
	watch(m, [S], log, 'net2');
	const VS = kur();
	await VS.surdur(m.run());
	VS.kaldir();
	ok(!!m.players[1].mem, "istemcinin 'hafiza' eylemi sunucuya ulaşmadı");
	ok(log.filter((e) => e.seen && e.fresh).length === 0, 'istemcinin gördüğü soru tekrar etti');
	ok(log.every((e) => cl.hafiza.yas(e.id) < Infinity), 'istemci sorulanları kendi hafızasına yazmadı');
	console.log(`   ${log.length} soru, istemcinin gördüklerinden ${log.filter((e) => e.seen).length}`);
}

// ---------------------------------------------------------------- 6) hesaba bağlı hafıza (sunucu deposu)
console.log('6) Hesap: sunucu kaydı maçtan maça taşınır, cihaz değişse de soru tekrar etmez');
{
	const { setHafizaDeposu, hesapHafizasi } = await import('../src/game/sunucu.js');
	// birleştirme: iki kaydın sayaçları farklı; "kaç maç önce" korunur, ikisinde olan kimlikte yakın olan kalır
	const [x, y, z, w] = ID;
	const a = new Hafiza();
	for (let i = 0; i < 5; i++) a.yeniMac();
	a.gor({ id: x }); // a'da bu maç (yaş 0)
	a.yeniMac();
	a.gor({ id: w, type: 'num' }); // a'da bu maç; x artık 1 maç önce
	// b eski biçimde (v2 özet: eski istemci, geçiş dönemi): x 2, y 0, z 3, w 6 maç önce; kardeş 'a:selanik' 1 maç önce
	const bEski = { v: 2, n: 10, g: { 8: x, 10: y, 7: z, 4: w }, k: { 9: 'a:selanik' } };
	const yaslar = (h) => [x, y, z, w].map((id) => h.yas(id)).join(',');
	const a3 = new Hafiza(JSON.parse(JSON.stringify(a)));
	a.birlestir(bEski);
	ok(yaslar(a) === '1,0,3,0' && a.kYas('a:selanik') === 1 && a.kYas('q:' + w) === 0, `birlestir (v2 özet) yaşları korumalı (${yaslar(a)})`);
	// aynı özet v3 biçiminde: aynı sonuç
	a3.birlestir(JSON.parse(JSON.stringify(new Hafiza(bEski).ozet())));
	ok(yaslar(a3) === '1,0,3,0' && a3.kYas('a:selanik') === 1, `birlestir (v3 özet) aynı sonucu vermeli (${yaslar(a3)})`);
	ok(a3.n === 6 && a.n === 6, 'birlestir bu kaydın sayacını korur');
	// bilinmeyen kimlik taşıyan eski özet: düşer, sayılır
	ok(new Hafiza().birlestir({ v: 2, n: 3, g: { 3: `${x} kayitta-yok` } }).dusen === 1, 'eski özetteki bilinmeyen kimlik düşmeli');
	// depo
	const depo = new Map();
	setHafizaDeposu({ oku: (h) => depo.get(h) || null, yaz: (h, k) => depo.set(h, JSON.parse(JSON.stringify(k))) });
	ok(hesapHafizasi('yok', null).size === 0, 'yeni hesabın kaydı boş olmalı');
	const oyna = async (seed, ozet) => {
		const [a1, c1] = LocalTransport.pair();
		let s = seed;
		new BotClient(c1, { skill: 0.7, R: () => ((s = (s * 16807) % 2147483647) / 2147483647), hafiza: ozet });
		const m = new Match(makeApp(), makeUI(), { mode: '1v1', length: 'quick', bot: 'er', region: 'ege', seed, seats: ['bot', 'remote'], transports: { 1: a1 }, allBots: true, persist: false, hesap: { 1: 'oyuncu-42' } });
		const log = [];
		watch(m, [], log, 'hesap' + seed);
		const VS = kur();
		await VS.surdur(m.run());
		VS.kaldir();
		return { m, log };
	};
	const m1 = await oyna(101, null);
	const k1 = depo.get('oyuncu-42');
	ok(!!k1, 'maç sonunda hesabın kaydı depoya yazılmadı');
	const gordu = new Set(m1.log.map((e) => e.id));
	ok(gordu.size > 5 && [...gordu].every((id) => new Hafiza(k1).yas(id) < Infinity), 'depodaki kayıt maçta sorulanları içermeli');
	// ikinci maç: cihaz yeni (özet yok); sunucu kaydı yine de ilk maçın sorularını bilir
	const m2 = await oyna(202, null);
	const tekrar = m2.log.filter((e) => gordu.has(e.id));
	ok(m2.m.players[1].hesap === 'oyuncu-42' && !!m2.m.players[1].mem, 'hesaplı koltuk sunucu kaydıyla kurulmalı');
	ok(tekrar.length === 0, `cihaz değişince ilk maçın soruları tekrar etti: ${tekrar.map((e) => e.id).slice(0, 5).join(', ')}`);
	ok(new Hafiza(depo.get('oyuncu-42')).n >= 2, 'ikinci maç kayda yeni maç olarak işlenmeli');
	// maç yarıda kalırsa da yazılır
	depo.clear();
	const [a2, c2] = LocalTransport.pair();
	new BotClient(c2, { skill: 0.7, R: Math.random });
	const m3 = new Match(makeApp(), makeUI(), { mode: '1v1', length: 'quick', bot: 'er', region: 'ege', seed: 5, seats: ['bot', 'remote'], transports: { 1: a2 }, allBots: true, persist: false, hesap: { 1: 'yarim' } });
	m3.players[1].mem.gor({ id: ID[7] });
	m3.abort();
	ok(new Hafiza(depo.get('yarim')).yas(ID[7]) === 0, 'yarıda kalan maçta hesap kaydı yazılmadı');
	ok(depo.get('yarim')?.v === 3, 'depoya v3 yazılmalı');
	// geçiş dönemi: depoda eski (v2) kayıt, cihazdan eski (v2) özet: ikisi birleşir, depoya v3 yazılır
	depo.set('eski-hesap', { v: 2, n: 7, g: { 7: ID[8], 2: `${ID[9]} silinmis-soru` }, k: { 7: 'a:ankara' } });
	const eh = hesapHafizasi('eski-hesap', { v: 2, n: 40, g: { 39: ID[10], 40: ID[9] } });
	ok(eh.n === 8 && eh.yas(ID[8]) === 1 && eh.yas(ID[10]) === 1 && eh.yas(ID[9]) === 0 && eh.kYas('a:ankara') === 1 && eh.dusen === 1, `eski depo kaydı + eski özet (${[8, 9, 10].map((i) => eh.yas(ID[i]))}, düşen ${eh.dusen})`);
	const { hesapKaydet } = await import('../src/game/sunucu.js');
	ok(hesapKaydet('eski-hesap', eh) && depo.get('eski-hesap').v === 3 && new Hafiza(depo.get('eski-hesap')).yas(ID[9]) === 0, 'eski hesap kaydı v3 olarak yazılmalı');
	setHafizaDeposu(null);
	console.log(`   1. maç ${gordu.size} soru; ikinci maç (yeni cihaz) ${m2.log.length} soru, tekrar ${tekrar.length}`);
}

console.log(`\nhafiza.test.mjs: ${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
