// Maç kuralları ve adalet sınamaları (v0.8 gece denetimi):
//   node test/kurallar.test.mjs [--n=500]
//
//  1. Koltuk dengesi: eşit yetenekli botlarla hiçbir koltuk yapısal avantaj almaz (eskiden son turu kapatan koltuk:
//     1'e 1'de 0. koltuk %53,8; 4 kişide %16,5 ile %31 arası). Sabit tohumlar: sonuç her çalıştırmada aynıdır.
//  2. Saldırı sırası: son tur puana göre (önde olan önce, geride olan son); eşlide takımlar dönüşümlü.
//  3. İlk tur sırası ve başkent seçim sırası koltuktan bağımsız ve eşit olasılıklı.
//  4. Puan eşitliği: birincilik eşitse altın soru; diğer eşitlikler il, kule, doğru sayısıyla; elenenlerde geç elenen önde.
//  5. Kalkan savunulan düellonun içinde kurulamaz (insan da bot gibi soruyu görmeden karar verir).
//  6. Soru saati koltuk başına: rakibin ekstra süresi insanın sayacını uzatmaz; sabotaj yalnız kurbanı keser.
//  7. Kule istatistiği: oyuncunun kendi yıktığı kuleler (botların birbirine yıktıkları sayılmaz).
import { Match, TURN_ORDER, TIE_BREAK } from '../src/game/match.js';
import { makeApp, makeUI } from './dunya.mjs';

const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const N = Number(opt.n || 500);
let fails = 0;
let checks = 0;
const ok = (c, msg) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 40) console.log('  HATA: ' + msg);
	}
};
const REGIONS = ['ege', 'marmara', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
const pct = (x) => (100 * x).toFixed(1) + '%';

function botMatch(cfg, ui = makeUI()) {
	const app = makeApp();
	const m = new Match(app, ui, { length: 'quick', bot: 'er', allBots: true, persist: false, ...cfg });
	return { app, m };
}

// ---------------------------------------------------------------- 1. koltuk dengesi
// iki taraflı modlarda örnek büyük (eski yanlılık 1'e 1'de %3,8 idi); sınırlar eski davranışı yakalar
const RUNS = { '1v1': 3 * N, ffa3: 2 * N, ffa4: 2 * N, team: 3 * N };
console.log(`1) Koltuk dengesi (eşit botlar; 1'e 1 ve eşli ${RUNS['1v1']}, 3–4 kişi ${RUNS.ffa3} maç)`);
const LIMITS = { '1v1': [0.465, 0.535], ffa3: [0.29, 0.38], ffa4: [0.205, 0.295], team: [0.465, 0.535] };
for (const mode of Object.keys(LIMITS)) {
	const wins = {};
	const n = RUNS[mode];
	for (let k = 0; k < n; k++) {
		const { app, m } = botMatch({ mode, region: REGIONS[k % 7], seed: 5000 + k * 13 });
		for (const p of m.players) p.skill = 0.6;
		await m.run();
		const r = app.lastSim;
		const key = m.mode.teams ? m.players[r.winnerSeat[0]].team : r.winnerSeat[0];
		wins[key] = (wins[key] || 0) + 1;
	}
	const sides = m0sides(mode);
	const shares = sides.map((s) => (wins[s] || 0) / n);
	const [lo, hi] = LIMITS[mode];
	console.log(`   ${mode.padEnd(5)} ${shares.map(pct).join(' / ')}`);
	for (let s = 0; s < shares.length; s++) ok(shares[s] >= lo && shares[s] <= hi, `${mode}: ${s}. ${mode === 'team' ? 'takım' : 'koltuk'} payı ${pct(shares[s])}, beklenen ${pct(lo)}–${pct(hi)}`);
}
function m0sides(mode) {
	return mode === 'team' || mode === '1v1' ? [0, 1] : mode === 'ffa3' ? [0, 1, 2] : [0, 1, 2, 3];
}

// ---------------------------------------------------------------- 2. saldırı sırası
console.log('2) Saldırı sırası');
{
	ok(TURN_ORDER.last === 'score' && TURN_ORDER.first === 'seed', 'TURN_ORDER varsayılanı değişti');
	const { m } = botMatch({ mode: 'ffa4', region: 'ege', seed: 1 });
	m.turnBase = m.players.slice();
	[100, 400, 300, 200].forEach((s, i) => (m.players[i].score = s));
	const ids = (a) => a.map((p) => p.i).join(',');
	ok(ids(m.turnOrder(1, 3)) === '0,1,2,3', '1. tur temel sırayla başlamalı: ' + ids(m.turnOrder(1, 3)));
	ok(ids(m.turnOrder(2, 3)) === '1,2,3,0', '2. tur bir kaymalı: ' + ids(m.turnOrder(2, 3)));
	ok(ids(m.turnOrder(3, 3)) === '1,2,3,0', 'son tur puana göre (önde önce, geride son): ' + ids(m.turnOrder(3, 3)));
	[300, 300, 100, 300].forEach((s, i) => (m.players[i].score = s));
	ok(ids(m.turnOrder(3, 3)) === '3,0,1,2', 'son turda eşit puanlılar kayan sırayı korumalı: ' + ids(m.turnOrder(3, 3)));
	const t = botMatch({ mode: 'team', region: 'ege', seed: 2 }).m;
	t.turnBase = t.players.slice();
	[100, 500, 100, 400].forEach((s, i) => (t.players[i].score = s)); // takım 0: 200, takım 1: 900
	const o = t.turnOrder(3, 3);
	ok(ids(o) === '3,2,1,0', 'eşlide son tur: önde olan takım başlar, takımlar dönüşümlü: ' + ids(o));
	ok(t.side(o[o.length - 1]) === 0, 'eşlide son saldırı geride olan takımın');
	// gerçek maçta son tur sırası olay olarak yayınlanır ve puana uyar
	const seen = [];
	const g = botMatch({ mode: 'ffa3', region: 'marmara', seed: 77 });
	g.m.on('phase', (d) => d.phase === 'fetih' && d.round === g.m.rounds && seen.push({ order: d.order, scores: g.m.players.map((p) => p.score) }));
	await g.m.run();
	ok(seen.length === 1, 'son tur olayı yok');
	if (seen[0]) {
		const sc = seen[0].order.map((i) => seen[0].scores[i]);
		ok(sc.every((s, k) => k === 0 || s <= sc[k - 1]), 'son tur sırası puana göre azalan değil: ' + JSON.stringify(sc));
	}
}

// ---------------------------------------------------------------- 3. ilk tur ve başkent sırası koltuktan bağımsız
console.log('3) İlk tur ve başkent seçim sırası');
{
	const first = [0, 0, 0, 0];
	const cap = [0, 0, 0, 0];
	const M = Math.max(400, N);
	for (let k = 0; k < M; k++) {
		const { m } = botMatch({ mode: 'ffa4', region: REGIONS[k % 7], seed: 9000 + k });
		let c = -1;
		const ch = m.choose.bind(m);
		m.choose = (p, kind, ...a) => {
			if (kind === 'capital' && c < 0) c = p.i;
			return ch(p, kind, ...a);
		};
		await m.placeCapitals();
		cap[c]++;
		m.turnBase = m.shuffle(m.players);
		first[m.turnOrder(1, 3)[0].i]++;
	}
	console.log(`   ilk saldıran: ${first.map((x) => pct(x / M)).join(' / ')}   ilk başkent seçen: ${cap.map((x) => pct(x / M)).join(' / ')}`);
	for (let s = 0; s < 4; s++) {
		ok(first[s] / M > 0.19 && first[s] / M < 0.31, `ilk saldıran ${s}. koltuk ${pct(first[s] / M)}`);
		ok(cap[s] / M > 0.19 && cap[s] / M < 0.31, `ilk başkent seçen ${s}. koltuk ${pct(cap[s] / M)} (eski sort(rastgele) 0. koltuğu %36 seçtiriyordu)`);
	}
}

// ---------------------------------------------------------------- 4. puan eşitliği ve sıralama
console.log('4) Puan eşitliği, altın soru, elenme sırası');
{
	ok(TIE_BREAK.golden, 'altın soru kapalı');
	// birincilik eşit: altın soru sorulur, kazanan öne geçer (puan değişmez)
	let golden = 0;
	let seatWins = [0, 0];
	for (let k = 0; k < 60; k++) {
		const banners = [];
		const { m } = botMatch({ mode: '1v1', region: 'ege', seed: 300 + k }, makeUI({ banner: (t) => banners.push(t) }));
		await m.placeCapitals();
		m.players[0].score = m.players[1].score = 2400;
		await m.goldenQuestion();
		if (banners.includes('EŞİTLİK!')) golden++;
		ok(m.tieWin === 0 || m.tieWin === 1, 'altın soru kazanan vermedi');
		const st = m.standings();
		ok(st[0].i === m.tieWin, 'altın soruyu kazanan birinci değil');
		ok(st[0].score === st[1].score, 'altın soru puanı değiştirmemeli');
		seatWins[st[0].i]++;
	}
	ok(golden === 60, `eşitlikte altın soru sorulmadı (${golden}/60)`);
	ok(seatWins[0] > 15 && seatWins[1] > 15, 'altın soru hep aynı koltuğa gidiyor: ' + seatWins);
	// eşit değilse altın soru yok
	{
		const banners = [];
		const { m } = botMatch({ mode: '1v1', region: 'ege', seed: 11 }, makeUI({ banner: (t) => banners.push(t) }));
		await m.placeCapitals();
		m.players[0].score = 2400;
		m.players[1].score = 2600;
		await m.goldenQuestion();
		ok(!banners.includes('EŞİTLİK!') && m.tieWin == null, 'puanlar farklıyken altın soru soruldu');
		ok(m.standings()[0].i === 1, 'yüksek puan birinci değil');
	}
	// altın sorusuz eşitlik: daha çok il öne geçer (koltuk sırası değil)
	{
		const { m } = botMatch({ mode: 'ffa3', region: 'ege', seed: 12 });
		await m.placeCapitals();
		const free = m.free();
		m.setOwner(free[0], 2, 200);
		m.setOwner(free[1], 2, 200);
		m.setOwner(free[2], 1, 200);
		for (const p of m.players) p.score = 1500;
		const st = m.standings();
		ok(st.map((p) => p.i).join(',') === '2,1,0', 'eşit puanda il sayısı belirlemeli: ' + st.map((p) => p.i).join(','));
	}
	// elenenler: geç elenen önde (ikisinin de puanı 0)
	{
		const { m } = botMatch({ mode: 'ffa4', region: 'ege', seed: 13 });
		await m.placeCapitals();
		await m.eliminate(m.players[3], m.players[0]);
		await m.eliminate(m.players[1], m.players[0]);
		const st = m.standings();
		ok(st[st.length - 1].i === 3 && st[st.length - 2].i === 1, 'elenme sırası: önce elenen sonda olmalı: ' + st.map((p) => p.i).join(','));
	}
	// tam maçlarda: eşit puanlı birincilik kalmaz (altın soru ayırır)
	let ties = 0;
	for (let k = 0; k < 300; k++) {
		const { m } = botMatch({ mode: ['1v1', 'ffa3', 'ffa4', 'team'][k % 4], region: REGIONS[k % 7], seed: 700 + k });
		await m.run();
		const st = m.standings();
		if (st[0].alive && st[1].alive && st[0].score === st[1].score) {
			ties++;
			ok(m.tieWin != null && (st[0].players ? st[0].team : st[0].i) === m.tieWin, 'eşit birincilik altın soruyla ayrılmadı');
		}
	}
	console.log(`   300 maçta ${ties} birincilik eşitliği, hepsi altın soruyla ayrıldı`);
}

// ---------------------------------------------------------------- 5. kalkan savunulan düelloda kurulamaz
console.log('5) Kalkan kuralı');
{
	// a) insan yalnız savunduğu düelloda kalkan kurmayı dener: hep reddedilmeli
	let blocked = 0;
	let tried = 0;
	const tryIn = (when) =>
		makeUI({
			question(m, ctx) {
				const me = m.humanPlayer;
				if (ctx.human && when(ctx, me) && !me.shield && me.jk.kalkan.left > 0) {
					tried++;
					const r = m.useJoker('kalkan');
					const row = m.jokerList().find((j) => j.id === 'kalkan');
					if (ctx.defender === me) {
						ok(!r.ok, 'savunduğu düelloda kalkan kuruldu');
						ok(row && !row.usable && row.why.includes('önce kurulur'), 'joker çubuğu savunmada kalkanı kullanılabilir gösteriyor');
						if (!r.ok) blocked++;
					} else ok(r.ok, 'saldırı ya da yayılma sorusunda kalkan kurulamadı: ' + r.reason);
				}
				const b = ctx.human ? ctx.T.bot(ctx.v, 0.6, m.R) : null;
				return { human: b ? { value: b.value, time: b.time } : null };
			},
		});
	for (let k = 0; k < 30; k++) {
		const m = new Match(makeApp(), tryIn((ctx, me) => ctx.defender === me), { mode: k % 2 ? 'ffa3' : '1v1', length: 'quick', bot: 'usta', region: REGIONS[k % 7], seed: 1200 + k, persist: false });
		await m.run();
		ok(m.duel === null, 'düello kaydı maç sonunda temizlenmedi');
		ok(m.humanPlayer.jk.kalkan.left === 1, 'reddedilen kalkanın hakkı düştü');
	}
	const triedA = tried;
	// b) saldırırken ya da yayılmada kurulur
	let armed = 0;
	for (let k = 0; k < 6; k++) {
		const m = new Match(makeApp(), tryIn((ctx, me) => ctx.defender !== me), { mode: '1v1', length: 'quick', region: REGIONS[k % 7], seed: 1300 + k, persist: false });
		await m.run();
		if (m.humanPlayer.jk.kalkan.left === 0) armed++;
	}
	console.log(`   savunmada ${blocked}/${triedA} deneme reddedildi; saldırı/yayılmada ${armed}/6 maçta kuruldu`);
	ok(blocked > 5 && blocked === triedA && armed === 6, 'kalkan kuralı sınanamadı');
}

// ---------------------------------------------------------------- 6. koltuk başına soru saati
console.log('6) Soru saati koltuk başına');
{
	let n = 0;
	const ui = makeUI({
		question(m, ctx) {
			const me = m.humanPlayer;
			if (ctx.human && n < 30) {
				const foe = ctx.who.find((p) => p !== me);
				if (foe) {
					foe.jk.sure = { left: 1, free: 1 };
					const mine = ctx.clock.extra; // bot sabotajı varsa eksi olabilir
					const theirs = m.cur.clocks.get(foe.i).extra;
					const r = m.useJoker('sure', foe);
					if (r.ok) {
						n++;
						ok(ctx.clock.extra === mine, `rakibin ekstra süresi insanın sayacını değiştirdi (${mine} → ${ctx.clock.extra} sn)`);
						ok(m.cur.clocks.get(foe.i).extra === theirs + r.effect.add, 'rakibin kendi saati uzamadı');
						if (me.jk.sure.left > 0) {
							const r2 = m.useJoker('sure');
							if (r2.ok) ok(ctx.clock.extra === mine + r2.effect.add, 'insanın ekstra süresi kendi sayacına eklenmedi');
						}
					}
				}
			}
			const b = ctx.human ? ctx.T.bot(ctx.v, 0.6, m.R) : null;
			return { human: b ? { value: b.value, time: b.time } : null };
		},
	});
	for (let k = 0; k < 6 && n < 30; k++) {
		const m = new Match(makeApp(), ui, { mode: 'ffa3', length: 'quick', region: REGIONS[k], seed: 1400 + k, persist: false });
		await m.run();
	}
	console.log(`   ${n} soruda rakip ekstra süre kullandı`);
	ok(n > 5, 'saat sınaması yetersiz');
}

// ---------------------------------------------------------------- 7. kule istatistiği ve botların kuşatması
console.log('7) Kuşatma ve kule istatistiği');
{
	let total = 0;
	for (let k = 0; k < 120; k++) {
		const { m } = botMatch({ mode: k % 2 ? 'ffa4' : 'ffa3', bot: 'usta', region: REGIONS[k % 7], seed: 1600 + k });
		const by = m.players.map(() => 0);
		m.on('result', (d) => d.kind === 'tower' && by[d.player]++);
		await m.run();
		ok(m.towersBy.join() === by.join(), 'yıkılan kule sayımı tutmuyor');
		ok(m.result(m.standings()).towers === by[0], `result().towers ${m.result(m.standings()).towers}, 0. koltuğun yıktığı ${by[0]}`);
		total += by.reduce((a, b) => a + b, 0);
	}
	console.log(`   'usta' botlarla 120 maçta ${total} kule yıkıldı`);
	ok(total > 100, 'kule sınaması yetersiz');
	// BOT_SIEGE: beceriyle sürekli artan kuşatma isteği (eskiden 'er' botlar maç başına 0,08 kuşatma yapıyordu)
	const sieges = {};
	for (const lv of ['caylak', 'er', 'usta']) {
		let c = 0;
		for (let k = 0; k < 150; k++) {
			const { m } = botMatch({ mode: '1v1', bot: lv, region: REGIONS[k % 7], seed: 1800 + k });
			m.on('attack', (d) => d.capital && c++);
			await m.run();
		}
		sieges[lv] = c / 150;
	}
	console.log(`   maç başına kuşatma: çaylak ${sieges.caylak.toFixed(2)}, er ${sieges.er.toFixed(2)}, usta ${sieges.usta.toFixed(2)}`);
	ok(sieges.caylak < sieges.er && sieges.er < sieges.usta, 'kuşatma isteği beceriyle artmıyor');
	ok(sieges.er > 0.6 && sieges.er < 3, `'er' botlar maç başına ${sieges.er.toFixed(2)} kuşatma (0,6–3 beklenir)`);
}

// ---------------------------------------------------------------- 8. ödül dökümü toplamla tutar
console.log('8) Ödül dökümü');
{
	const { Progress } = await import('../src/game/progress.js');
	const { memStore } = await import('./dunya.mjs');
	let n = 0;
	for (const length of ['quick', 'long'])
		for (const level of ['caylak', 'er', 'usta', 'efsane'])
			for (const won of [true, false])
				for (const stars of [0, 2]) {
					const p = new Progress(memStore(), {});
					const r = p.recordMatch({ won, rank: won ? 1 : 2, players: 3, stat: { q: 20, correct: 13 }, provinces: 7, towers: 1, length, level, stars, firstClear: stars > 0, boss: stars > 0 && won });
					const sx = r.lines.reduce((a, l) => a + l.xp, 0);
					const sg = r.lines.reduce((a, l) => a + l.gold, 0);
					ok(sx === r.xp && sg === r.gold, `${length}/${level}/${won}/${stars}: satırlar ${sx} XP ${sg} altın, toplam ${r.xp} XP ${r.gold} altın (bitiş ekranı dökümü tutmuyor)`);
					ok(p.xp === r.xp && p.gold === 150 + r.gold + r.levelUps.reduce((a, u) => a + u.gold, 0), `${length}/${level}: kayıttaki XP/altın ödülle tutmuyor`);
					n++;
				}
	console.log(`   ${n} ödül durumu: satırların toplamı = verilen XP ve altın`);
}

console.log(`\n${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
