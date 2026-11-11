// Soru hafızası (tekrarsız soru motoru) sınaması:  node test/hafiza.test.mjs [--n=40]
//
//  1. Hafiza birimi: görme, yaş, kardeş anahtarı, JSON gidiş-dönüş, eski kayıttan (son 400 kimlik) geçiş, kırpma.
//  2. Yerel oyuncu: aynı ilerleme kaydıyla art arda N maç (gerçek Match, sahte dünya). Hiçbir soru, o an aynı tip ve
//     kategoride görülmemiş soru varken ikinci kez çıkmamalı; aynı maçta aynı bilginin (kardeş) iki sorusu çıkmamalı.
//     Rapor: toplam soru, farklı soru, ilk tekrarın maçı, tip başına havuz ve "kaç maç sonra tekrar başlar" tahmini.
//  3. Maçı yarıda bırakma: sorulan soru anında kayda geçer (maç sonu beklenmez).
//  4. Çevrimiçi: iki uzak koltuğun özetleri (ozet) sunucuya gider; maç, iki koltuğun da görmediği sorulardan seçer.
await import('./kanca.mjs');
const { Match } = await import('../src/game/match.js');
const { Progress } = await import('../src/game/progress.js');
const { Hafiza, kardes, bayat } = await import('../src/quiz/hafiza.js');
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

// ---------------------------------------------------------------- 1) birim
{
	const h = new Hafiza();
	h.yeniMac();
	h.gor({ id: 'a', type: 'choice', a: ['Selanik', 'Manastır', 'İzmir', 'Edirne'] });
	h.yeniMac();
	h.gor({ id: 'b', type: 'hang', w: 'SELANİK' });
	ok(h.yas('a') === 1 && h.yas('b') === 0 && h.yas('c') === Infinity, 'yaş');
	ok(kardes({ type: 'hang', w: 'SELANİK' }) === kardes({ type: 'choice', a: ['Selanik'] }), 'kardeş: aynı cevap aynı anahtar');
	ok(kardes({ type: 'mancinik', src: 'n1', id: 'dn-mc1' }) === kardes({ type: 'num', id: 'n1' }), 'kardeş: Mancınık ↔ kaynak tahmin sorusu');
	const j = JSON.parse(JSON.stringify(h));
	const h2 = new Hafiza(j);
	ok(h2.n === 2 && h2.yas('a') === 1 && h2.yas('b') === 0, 'JSON gidiş-dönüş');
	ok(bayat({ id: 'z', type: 'choice', a: ['Selanik'] }, [h2], new Set()) === 0.5, 'bayatlık: kardeşi yeni görülmüş');
	ok(bayat({ id: 'a', type: 'choice', a: ['Selanik'] }, [h2], new Set()) === 2, 'bayatlık: görülmüş');
	ok(bayat({ id: 'q', type: 'tf' }, [h2], new Set()) === 0, 'bayatlık: taze');
	const old = new Hafiza(['x', 'y']);
	ok(old.yas('x') === 1 && old.size === 2, 'eski kayıttan geçiş');
	const big = new Hafiza();
	big.yeniMac();
	for (let i = 0; i < 16000; i++) big.gor({ id: 'k' + i });
	ok(big.size === 15000 && big.yas('k0') === Infinity && big.yas('k15999') === 0, 'kırpma: en eskiler düşer');
	ok(JSON.stringify(big.ozet()).length < 120000, 'çevrimiçi özet küçük');
	// ilerleme kaydı: eski 'seen' dizisi hafızaya geçer
	const st = memStore();
	st.set('progress', { v: 1, seen: ['eski-1', 'eski-2'] });
	const pr = new Progress(st, {});
	ok(pr.hafiza.yas('eski-1') < Infinity && pr.hafiza.yas('yok') === Infinity, 'ilerleme: eski görülenler hafızada');
	pr.save();
	ok(st.get('progress').hafiza?.v === 2, 'ilerleme: hafıza kaydediliyor');
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
	const a = new Hafiza();
	for (let i = 0; i < 5; i++) a.yeniMac();
	a.gor({ id: 'x' }); // a'da bu maç (yaş 0)
	const b = new Hafiza();
	for (let i = 0; i < 10; i++) b.yeniMac();
	b.m.set('x', 8); // b'de 2 maç önce
	b.m.set('y', 10); // b'de bu maç
	b.m.set('z', 7); // b'de 3 maç önce
	a.birlestir(b);
	ok(a.yas('x') === 0 && a.yas('y') === 0 && a.yas('z') === 3, `birlestir yaşları korumalı (x ${a.yas('x')}, y ${a.yas('y')}, z ${a.yas('z')})`);
	ok([...a.m.keys()].indexOf('z') < [...a.m.keys()].indexOf('y'), 'birlestir sonrası kayıt görülme sırasında olmalı (kırpma eskiyi atar)');
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
	m3.players[1].mem.gor({ id: 'yarim-soru' });
	m3.abort();
	ok(new Hafiza(depo.get('yarim')).yas('yarim-soru') < Infinity, 'yarıda kalan maçta hesap kaydı yazılmadı');
	setHafizaDeposu(null);
	console.log(`   1. maç ${gordu.size} soru; ikinci maç (yeni cihaz) ${m2.log.length} soru, tekrar ${tekrar.length}`);
}

console.log(`\nhafiza.test.mjs: ${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
