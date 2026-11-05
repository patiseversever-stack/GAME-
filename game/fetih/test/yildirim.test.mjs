// Yıldırım çevrimiçi (sunucu otoriter): ifadelerin doğrusu istemciye gitmez; her basış act 'bz' ile sunucuya gelir,
// yargı, sayım ve 0,6 sn ceza kilidi sunucudadır; son değer istemcinin bildirdiği değil sunucunun saydığıdır.
//   node test/yildirim.test.mjs
await import('./kanca.mjs');
const { ADIM } = await import('../src/game/sunucu.js');
const { TYPES } = await import('../src/quiz/types.js');
const { publicView, LocalTransport, BotClient } = await import('../src/game/net.js');
const { Match } = await import('../src/game/match.js');

let fails = 0;
let checks = 0;
const ok = (c, msg) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 30) console.log('HATA: ' + msg);
	}
};

// 1) sunucu adımı (birim): sıra, yargı, ceza kilidi, geç cevap, son değer
{
	const A = ADIM.blitz;
	const items = Array.from({ length: 6 }, (_, i) => ({ t: 'İfade ' + i, ans: i % 2 === 0 }));
	let now = 0;
	const sent = [];
	const S = { v: { items, sec: 10 }, st: {}, t: () => now, send: (k, d) => sent.push([k, d]) };
	A.open(S);
	const last = () => sent[sent.length - 1][1];
	A.acts.bz(S, { k: 0, a: true });
	ok(last().ok === true && last().ans === true, 'doğru cevap doğru sayılmadı');
	A.acts.bz(S, { k: 2, a: true });
	ok(last().rejected, 'sırası gelmeyen ifade kabul edildi');
	now = 0.5;
	A.acts.bz(S, { k: 1, a: true });
	ok(last().ok === false && last().ans === false, 'yanlış cevap yanlış sayılmadı');
	now = 0.7; // ceza kilidi (0,6 − 0,15 ağ payı) sürüyor
	A.acts.bz(S, { k: 2, a: true });
	ok(last().rejected && last().locked, 'ceza kilidi sunucuda işlemiyor');
	now = 1.0;
	A.acts.bz(S, { k: 2, a: true });
	ok(last().ok === true, 'kilit bitince cevap alınmadı');
	now = 11;
	A.acts.bz(S, { k: 3, a: false });
	ok(last().late, 'süre bittikten sonra gelen cevap kabul edildi');
	const f = A.final(S, { score: 99, n: 99 });
	ok(f.score === 2 && f.n === 3, `son değer sunucunun sayımı değil: ${JSON.stringify(f)}`);
	// görünümde doğru yok
	const v = TYPES.blitz.prepare({ id: 'b', cat: 'bilim', diff: 1, type: 'blitz', q: 'Yıldırım', items }, Math.random);
	ok(publicView(TYPES.blitz, v).items.every((it) => !('ans' in it)), 'görünümde ifadelerin doğrusu var');
}

// 2) uzak koltuklu maçlar: uzak koltuğun cevapladığı her soru Yıldırım; skor olaylardaki 'bz' doğrularıyla aynı,
// hileci istemcinin bildirdiği skor sayılmaz
{
	const { kur } = await import('./sanal-saat.mjs');
	const { makeApp, makeUI } = await import('./dunya.mjs');
	const S = kur();
	class Zorla extends Match {
		pickTyped(cat, moment, who) {
			if (!who?.some((p) => p.ctl.remote) || moment === 'tie' || moment === 'golden') return super.pickTyped(cat, moment, who);
			const q = this.pick({ types: ['blitz'], who });
			this.qlog.push({ moment, type: q.type });
			this.recent.push(q.type);
			return q;
		}
	}
	// hiç basmadan "hepsini bildim" diyen istemci
	class Hileci extends BotClient {
		_recv(m) {
			if (m && m.t === 'req' && m.k === 'answer' && m.d.q.type === 'blitz') {
				this.act('acildi', {});
				return this.t.send({ v: 1, t: 'res', k: 'answer', d: { value: { score: 14, n: 14 }, time: 1 }, id: m.id, seat: m.seat });
			}
			super._recv(m);
		}
	}
	let blitzQ = 0;
	let scored = 0;
	for (const [mode, n, seed, Cls] of [['1v1', 2, 71, BotClient], ['ffa3', 3, 72, BotClient], ['1v1', 2, 73, Hileci]]) {
		const app = makeApp();
		const seats = Array.from({ length: n }, (_, i) => (i === 1 ? 'remote' : 'bot'));
		const [srv, cli] = LocalTransport.pair();
		let s = seed;
		const client = new Cls(cli, { skill: 0.6, R: () => ((s = (s * 16807) % 2147483647) / 2147483647) });
		const ev = [];
		const recv = client._recv.bind(client);
		cli.onmessage((m) => {
			if (m.t === 'ev') ev.push(m);
			recv(m);
		});
		const m = new Zorla(app, makeUI(), { mode, length: 'quick', bot: 'er', region: 'ege', seed, seats, transports: { 1: srv }, allBots: true, persist: false, serverPace: 1 });
		await S.surdur(m.run());
		const tag = `${mode}/${seed}/${Cls.name}`;
		let ask = null;
		let bz = [];
		for (const e of ev) {
			if (e.k === 'ask') {
				ask = e.d;
				bz = [];
			} else if (e.k === 'bz') bz.push(e.d);
			else if (e.k === 'reveal' && ask?.q.type === 'blitz' && ask.who.includes(1)) {
				blitzQ++;
				const mine = e.d.results.find((r) => r.i === 1);
				const good = bz.filter((x) => x.ok).length;
				const counted = bz.filter((x) => !x.rejected && !x.late).length;
				ok(ask.v.items.every((it) => !('ans' in it)), `${tag}: soru görünümünde ifadelerin doğrusu var`);
				ok(mine?.value && mine.value.score === good && mine.value.n === counted, `${tag}: sunucunun skoru (${JSON.stringify(mine?.value)}) 'bz' olaylarıyla (${good}/${counted}) uyuşmuyor`);
				if (Cls === Hileci) ok(mine.value.score === 0, `${tag}: hileci istemcinin bildirdiği skor sayıldı (${mine.value.score})`);
				else if (good > 0) scored++;
				const full = e.d.answer;
				ok(full.items.every((it) => typeof it.ans === 'boolean'), `${tag}: cevap ekranında ifadelerin doğrusu yok`);
			}
		}
	}
	ok(blitzQ >= 6, `uzak koltuk yeterince Yıldırım cevaplamadı (${blitzQ})`);
	ok(scored > 0, 'dürüst uzak koltuk hiç doğru sayılmadı (eskiden her cevap yanlıştı)');
	console.log(`uzak koltuklu 3 maç: ${blitzQ} Yıldırım sorusu, ${scored} soruda dürüst istemciye doğru sayıldı`);
	S.kaldir?.();
}

console.log(`${checks} denetim, ${fails} hata`);
if (fails) process.exit(1);
