// Ağ katmanı: maçın kararlarını ve cevaplarını bir "kontrolcü" (controller) arkasına soyutlar.
// Bugün her koltuk yerel (arayüz ya da bot); yarın sunucu aynı `Match`'i sürer ve uzak oyuncuları
// bir Transport üzerinden konuşturur. Match hiçbir zaman "bu oyuncu insan mı, bot mu, uzakta mı"
// diye bakmaz; koltuğun `ctl` nesnesine sorar.
//
// ===================================================================================================
// MESAJ ŞEMASI (protokol 1). Taşıyıcı JSON'a çevrilebilir düz nesne taşır.
//
//   Zarf:  { v: 1, t: tür, id?: sayı, seat?: koltuk, k: ad, d: veri }
//
//   t = 'req'   sunucu → koltuk   cevap beklenen istek (id zorunlu)
//   t = 'res'   koltuk → sunucu   isteğe cevap (aynı id; d = sonuç)
//   t = 'act'   koltuk → sunucu   isteksiz eylem ('joker', 'ayril')
//   t = 'ev'    sunucu → koltuk   olay yayını (cevap beklenmez)
//   t = 'hello' sunucu → koltuk   katılım: { seat, protocol, cfg, snapshot }
//
//   İstekler (t='req'):
//     k='pick'     d={ kind:'free'|'attack', options:[il indeksi,…], text }          → res.d = il indeksi
//     k='category' d={}                                                                → res.d = kategori anahtarı
//     k='answer'   d={ q, v, time, extra, who:[koltuk,…], phase, cat, attacker, defender, target, film }
//                                                                                      → res.d = { value, time }
//                  time: sorunun süre bütçesi (sn), sunucu sorunun verisinden hesaplar (src/quiz/timing.js; v.sec ile
//                  aynı). İstemci saati bununla kurar, kendisi yeniden hesaplamaz (publicView şıkları sildiği için
//                  istemcideki hesap farklı çıkabilir). film: cevap ekranının süresi (ms, quiz/mac.js filmMs).
//                  v1.2: cevap süresini SUNUCU ölçer (res.d.time yok sayılır): kart açılınca istemci act 'acildi'
//                  gönderir, saat onun varışıyla başlar (onay 3 sn gelmezse isteğin gönderilişiyle); süre = cevabın
//                  varışı − saat başı, [0, time + ekstra]. Yeni tiplerde son değer de sunucunun kaydıdır (sunucu.js).
//   Eylemler (t='act'):
//     k='joker'    d={ id }                  sunucu match.useJoker(id, koltuk) çağırır; sonuç 'ev' ile döner
//     k='ayril'    d={}                      koltuk botla devam eder
//     k='harf'     d={ ch }                  adam asmaca harf denemesi; sunucu yalnız o koltuğa 'harf' olayı döner
//     k='acildi'   d={}                      kart açıldı (soru saati sunucuda bu an başlar; ipuçları buna göre akar)
//   Yeni tiplerin eylemleri (v1.2, yalnız soruyu cevaplayan koltuktan ve soru açıkken; ayrıntı src/game/sunucu.js):
//     k='harf'     d={}                      Harf Al: rastgele kapalı kutu → ev 'harf' { i, c } (puanı sunucu sayar)
//     k='il'       d={ il: plaka }           İl Avı → ev 'il' { il, km, dir, found, left, hint } · Kimim → ev 'il'
//                                           { il, ok, lock } (yanlışta kilit, doğru dokunuşun ipucu sırası sunucu saatinden)
//     k='yer'      d={ w }                   Yanlışı Bul (bir kez): → ev 'yer' { w, ok, opts? } (seçenekler yer doğruysa)
//     k='halat'    d={ k, c }                Halat: basış, sunucu damgalar → ev 'halat' { k, ok, r } + herkese 'ip'
//     k='fitil'    d={ k, c }                Fitil: ortak motorda (sunucu) cevap → herkese 'top' { ev:[olaylar] }
//   Olaylar (t='ev'), k:
//     'state'   d=snapshot()                tam durum: maç başında (harita ve koltuklar) ve yeniden bağlanmada
//     'phase'   d={ phase, round, order?, tied? }  baskent|yayilma|fetih|altin (order: o fetih turunun saldırı sırası,
//                                           koltuklar; tied: altın soruya kalan taraflar)
//     'turn'    d={ player, round }         saldırı sırası bu koltukta
//     'attack'  d={ player, defender, target, capital }  saldırı ilan edildi
//     'result'  d={ kind, player, defender, target, left? }  düello sonucu: conquer|tower|shield|defend|nobody
//     'owner'   d={ i, p, value }           il sahibi ya da değeri değişti (p=-1 boş; savunmada değer +100)
//     'score'   d={ scores:[…], hp:[…], alive:[…] }  puan, kale kulesi ve hayatta olma (yalnız değişince)
//     'ask'     d={ q, v, time, who, title, phase, attacker, defender, target }  soru açıldı (bütün uzak koltuklara;
//                                           izleyen de kartı görür. time: süre bütçesi, sn)
//     'reveal'  d={ results:[{i,value,time,correct,err}], answer, film }  answer: sunucudaki tam soru görünümü (cevap,
//                                           değerler; Şive'de heat: gerçek dokunuşlar, Az Bilinen'de pct: gerçek oranlar);
//                                           film: cevap ekranının süresi (ms). Sunucu bu süre dolunca ilerler (serverPace)
//     'ipucu'   d={ k, text, il?, bolge? }   Kimim (her 3 sn) ve Kayıp İl (v.hintAt) ipuçları, sunucunun saatinde
//     'ip'      d={ nets:[…], t }            Halat: iki tarafın neti (halatın konumu), her basışta bütün uzak koltuklara
//     'top'     d={ ev:[{type,k,t,face,…}] } Fitil: tur olayları (open, ans, close, boom) bütün uzak koltuklara
//     'harf'    d={ ch, at:[konum,…] }       adam asmaca: koltuğun denediği harfin kelimedeki yerleri (yalnız o koltuğa)
//     'wheel'   d={ player, cat }
//     'joker'   d={ player, id, effect }    etkinin tamamı yalnız kullananın koltuğuna; diğerleri { id, kind } (süre
//                                           jokerinde add, sabotajda victims/by/cut/blurMs) görür. Rakibin yarı yarıyası
//                                           elenen şıkları, aralığı, harfleri ya da bölgeyi soru sürerken ele vermez.
//     'sabotage' d={ victims, by, cut, blurMs }  yalnız kurban koltuğa: süresinden cut sn düşer
//     'shield'  d={ player, target }
//     'elim'    d={ player, by }
//     'over'    d={ ranking, reason, rewards? }
//
//   Saat: her koltuğun soru saati ayrıdır (ekstra süre yalnız kullananın, sabotaj yalnız kurbanın süresini değiştirir).
//   v1.2: süre sunucu saatinden (kart açılış onayı 'acildi' + cevabın varışı); eski açık (istemcinin bildirdiği süre)
//   kapandı. Gizli yapı adları (Kuşbakışı, Gölge) maça tuzlu anlamsız kimlikle (q.sid) gider; tuz 'hello' cfg.salt.
//
//   Güvenlik: uzak koltuğa giden soru `publicView(T, v)` ile ayıklanır (SECRET: doğru şık, sıra, değerler,
//   çiftler, konum, kelime gizli); cevap 'reveal' olayında gelir. Doğrulama sunucuda: gelen il `options`
//   içinde değilse, cevap süresi dışındaysa reddedilir; yargı (judge) sunucudaki tam görünümle yapılır.
//   test/net.test.mjs bankadaki her sorunun görünümünde cevap kalmadığını denetler.
// ===================================================================================================

import { TYPES } from '../quiz/types.js';

export const PROTOCOL = 1;

const envelope = (t, k, d, extra = {}) => ({ v: PROTOCOL, t, k, d, ...extra });

// ------------------------------------------------------------------------ taşıyıcı

/**
 * Bellek içi çift uçlu taşıyıcı. `LocalTransport.pair()` → [sunucu ucu, istemci ucu].
 * clone: mesajı JSON'dan geçir (gerçek ağdaki serileştirme kısıtını sınar). latency: ms.
 * Gerçek WebSocket taşıyıcısı da aynı üç yöntemi sağlamalı: send(msg), onmessage(fn), close().
 */
export class LocalTransport {
	constructor({ latency = 0, clone = true } = {}) {
		this.latency = latency;
		this.clone = clone;
		this.peer = null;
		this.fn = null;
		this.queue = [];
		this.closed = false;
		this.sent = 0;
	}

	static pair(opts) {
		const a = new LocalTransport(opts);
		const b = new LocalTransport(opts);
		a.peer = b;
		b.peer = a;
		return [a, b];
	}

	onmessage(fn) {
		this.fn = fn;
		for (const m of this.queue.splice(0)) fn(m);
	}

	send(msg) {
		if (this.closed || !this.peer) return;
		const m = this.clone ? JSON.parse(JSON.stringify(msg)) : msg;
		this.sent++;
		const peer = this.peer;
		const go = () => peer._recv(m);
		if (this.latency > 0) setTimeout(go, this.latency);
		else Promise.resolve().then(go);
	}

	_recv(m) {
		if (this.closed) return;
		if (this.fn) this.fn(m);
		else this.queue.push(m);
	}

	close() {
		this.closed = true;
		if (this.peer) this.peer.closed = true;
	}
}

// ------------------------------------------------------------------------ kontrolcüler

/** Doğru cevabı ayıkla (çevrimiçi). Tip kendi görünümünü `T.publicView(v)` ile verebilir. */
export function publicView(T, v, ctx = {}) {
	if (T?.publicView) return T.publicView(v, ctx);
	const out = JSON.parse(JSON.stringify(v)); // derin kopya: sunucudaki v'ye dokunulmaz
	if (typeof out.right === 'number') delete out.right; // doğru şıkkın sırası (match'te right sağ sütun yazılarıdır)
	if (out.q) {
		delete out.q.ans;
		if (Array.isArray(out.opts)) delete out.q.a; // şıklar zaten v.opts'ta (karışık)
	}
	SECRET[out.q?.type]?.(out);
	return out;
}

/** Boşluk ve noktalama kalır, harfler '_' (adam asmaca, anagram: istemci yalnız kelimenin kalıbını bilir). */
const maskOf = (w) => [...String(w || '')].map((c) => (/[\s\-'’.]/.test(c) ? c : '_')).join('');

/**
 * Tiplere özgü gizliler: istemci soruyu çizebilir ama cevabı çıkaramaz. Doğru cevap ve değerler cevap
 * açılınca 'reveal' olayında (answer: sunucudaki tam görünüm) gelir; istemci onu görünüme katıp gösterir.
 */
const SECRET = {
	pin(o) {
		delete o.target;
		delete o.q.lat;
		delete o.q.lon;
	},
	hang(o) {
		o.mask = maskOf(o.word); // harf denemeleri sunucuya sorulur: act 'harf' → ev 'harf' { ch, at }
		delete o.word;
		delete o.q.w;
	},
	anagram(o) {
		o.mask = maskOf(o.word); // taşlar kelimenin karışık harfleridir (tipin doğası); sıra gizli
		delete o.word;
		delete o.q.w;
	},
	cross(o) {
		if (o.L) {
			o.L.cells = o.L.cells.map(({ r, c }) => ({ r, c }));
			o.L.words = o.L.words.map(({ w, ...rest }) => ({ ...rest, len: [...w].length }));
		}
		if (o.q.words) o.q.words = o.q.words.map(({ clue }) => ({ clue }));
	},
	order(o) {
		o.q.items = o.q.items.map(({ t }) => ({ t })); // değerler (yıl, sayı) ve doğru sıra gizli
		delete o.correct;
	},
	match(o) {
		delete o.q.pairs; // sol ve sağ sütun yazıları (left, right) kalır; hangisinin hangisiyle eşi olduğu gizli
		delete o.ord;
	},
	hilo(o) {
		const t = (s) => (s && typeof s === 'object' ? { t: s.t } : s);
		o.q.left = t(o.q.left);
		o.q.right = t(o.q.right);
		if (Array.isArray(o.sides)) o.sides = o.sides.map(t);
	},
	odd(o) {
		delete o.q.odd;
		delete o.q.why;
		delete o.q.opts; // asıl sıra farklı olanın yerini verir; karışık şıklar v.opts'ta
	},
	blitz(o) {
		if (Array.isArray(o.items)) o.items = o.items.map(({ t }) => ({ t }));
		delete o.q.items;
	},
	// img: görsel kimliği (ids) çizim için gider; kimlik adları cevabı ele vermesin diye görsel paketi
	// çevrimiçi sürümde anlamsız adlarla (karma) yayımlanmalı
};

/** Yerel insan koltuğu: kararları arayüzden alır. */
export class UIController {
	constructor(match) {
		this.m = match;
		this.kind = 'ui';
		this.remote = false;
	}
	pick(p, kind, options, text, sec) {
		return this.m.ui.pickProvince(this.m, options, text, sec);
	}
	category(p, sec) {
		return this.m.ui.chooseCategory(this.m, sec);
	}
}

/** Bot koltuğu: kararları match.botChoose verir; arayüze yalnızca gösterim yapar. */
export class BotController {
	constructor(match) {
		this.m = match;
		this.kind = 'bot';
		this.remote = false;
	}
	async pick(p, kind, options) {
		const i = this.m.botChoose(p, options, kind);
		await this.m.ui.botPick(this.m, p, i);
		return i;
	}
	async category(p) {
		return this.m.botCategory(p);
	}
}

/**
 * Sunucu tarafında uzak koltuğun vekili. İstek gönderir, cevabı bekler; süre aşımında null döner
 * (Match o durumda bot kararına düşer, yani bağlantısı kopan oyuncunun yerine bot oynar).
 */
export class RemoteController {
	constructor(transport, { seat = 0, timeoutMs = 30000 } = {}) {
		this.t = transport;
		this.kind = 'remote';
		this.remote = true;
		this.seat = seat;
		this.timeoutMs = timeoutMs;
		this.nextId = 1;
		this.pending = new Map();
		this.onAct = null; // (k, d) => void; Match joker eylemlerini buradan alır
		this.onRes = null; // (k) => void; bir isteğin cevabı geldi (zaman uyumlu: aynı paketten sonra gelen eylemden önce)
		this.closed = false;
		transport.onmessage((m) => this._recv(m));
	}

	_recv(m) {
		if (!m || m.v !== PROTOCOL) return;
		if (m.t === 'res') {
			const p = this.pending.get(m.id);
			if (p) {
				this.pending.delete(m.id);
				clearTimeout(p.timer);
				this.onRes?.(p.k);
				p.resolve(m.d ?? null);
			}
		} else if (m.t === 'act') {
			if (m.k === 'ayril') this.drop();
			this.onAct?.(m.k, m.d);
		}
	}

	request(k, d, ms = this.timeoutMs) {
		if (this.closed) return Promise.resolve(null);
		const id = this.nextId++;
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				resolve(null);
			}, ms);
			this.pending.set(id, { resolve, timer, k });
			this.t.send(envelope('req', k, d, { id, seat: this.seat }));
		});
	}

	event(name, data) {
		if (!this.closed) this.t.send(envelope('ev', name, data, { seat: this.seat }));
	}

	hello(data) {
		this.t.send(envelope('hello', 'hello', data, { seat: this.seat }));
	}

	drop() {
		this.closed = true;
		for (const p of this.pending.values()) {
			clearTimeout(p.timer);
			p.resolve(null);
		}
		this.pending.clear();
	}

	// sec: seçim süresi (istemci sayacı); sunucu ağ payıyla biraz daha bekler, sonra seçimi bot yapar
	async pick(p, kind, options, text, sec) {
		const r = await this.request('pick', { kind, options, text, time: sec }, sec ? (sec + 3) * 1000 : this.timeoutMs);
		return typeof r === 'number' && options.includes(r) ? r : null;
	}

	async category(p, sec) {
		const r = await this.request('category', { time: sec }, sec ? (sec + 3) * 1000 : this.timeoutMs);
		return typeof r === 'string' ? r : null;
	}

	async answer(p, payload, ms) {
		const r = await this.request('answer', payload, ms);
		return r && typeof r === 'object' && 'value' in r ? r : null;
	}
}

/**
 * İstemci tarafı örnek: bir transport ucuna bağlanıp istekleri bot gibi cevaplar.
 * Gerçek istemci (telefon uygulaması) aynı mesajları arayüze bağlar. Test ve "sunucusuz yapay zekâ" içindir.
 */
export class BotClient {
	constructor(transport, { skill = 0.6, R = Math.random } = {}) {
		this.t = transport;
		this.skill = skill;
		this.R = R;
		this.log = [];
		this.hello = null;
		this.waiters = new Map(); // olay adı → bekleyen çözücüler (yeni tiplerin eylem cevapları)
		this.listeners = new Map(); // olay adı → sürekli dinleyici (Fitil 'top', Halat 'ip')
		transport.onmessage((m) => this._recv(m));
	}

	_recv(m) {
		if (!m || m.v !== PROTOCOL) return;
		this.log.push(m.t + ':' + m.k);
		if (m.t === 'hello') this.hello = m.d;
		if (m.t === 'ev') {
			this.listeners.get(m.k)?.(m.d);
			const w = this.waiters.get(m.k);
			if (w && w.length) w.shift()(m.d);
			return;
		}
		if (m.t !== 'req') return;
		let d = null;
		if (m.k === 'pick') d = m.d.options[Math.floor(this.R() * m.d.options.length)];
		else if (m.k === 'category') d = ['tarih', 'cografya', 'spor', 'bilim', 'sanat', 'eglence'][Math.floor(this.R() * 6)];
		else if (m.k === 'answer') {
			// kart açıldı: saat sunucuda bu onayla başlar (cevap süresini sunucu ölçer)
			this.act('acildi', {});
			const play = OYNA[m.d.q.type];
			if (play) {
				// yeni tipler: eylemlerle oynanır (gizli olan sunucuda; cevapları olaylarla gelir)
				play(this, m.d).then(
					(value) => this.t.send(envelope('res', m.k, { value, time: 0 }, { id: m.id, seat: m.seat })),
					() => this.t.send(envelope('res', m.k, { value: null, time: 0 }, { id: m.id, seat: m.seat })),
				);
				return;
			}
			// istemci görünümü ayıklanmıştır (cevap yok): bot bazı tiplerde cevap üretemez, o zaman boş cevap verir
			const T = TYPES[m.d.q.type];
			try {
				const b = T.bot(m.d.v, this.skill, this.R);
				d = { value: b.value, time: b.time };
			} catch (e) {
				d = { value: null, time: m.d.time ?? 5 };
			}
		}
		this.t.send(envelope('res', m.k, d, { id: m.id, seat: m.seat }));
	}

	/** Eylem gönder (t='act'). */
	act(k, d) {
		this.t.send(envelope('act', k, d));
	}

	/** Bir sonraki k olayını bekle (ms içinde gelmezse null). */
	wait(k, ms = 4000) {
		return new Promise((resolve) => {
			const list = this.waiters.get(k) || [];
			this.waiters.set(k, list);
			let done = false;
			const fn = (d) => {
				if (done) return;
				done = true;
				resolve(d);
			};
			list.push(fn);
			setTimeout(() => {
				const i = list.indexOf(fn);
				if (i >= 0) list.splice(i, 1);
				fn(null);
			}, ms);
		});
	}

	sleep(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}

	/** [lo, hi) arasında rastgele tamsayı. */
	int(n) {
		return Math.floor(this.R() * n);
	}
}

/**
 * İstemci botunun yeni tipleri oynayışı (yalnız ayıklanmış görünümle; cevabı bilmez, eylemlerin cevaplarıyla ilerler).
 * Gerçek istemcinin göndereceği eylemlerin aynısı: sınama (test/net.test.mjs) sunucu adımlarını bunlarla yürütür.
 */
const plates = () => Array.from({ length: 81 }, (_, i) => i + 1);
const pickOpt = (c, v) => c.int(v.opts?.length || v.facts?.length || 4);
const OYNA = {
	async harfal(c, d) {
		const n = d.v.n || 5;
		const got = new Map();
		for (let k = 0, m = c.int(3); k < m; k++) {
			c.act('harf', {});
			const r = await c.wait('harf');
			if (r && r.i >= 0) got.set(r.i, r.c);
		}
		await c.sleep(400 + c.int(1500));
		const g = Array.from({ length: n }, (_, i) => got.get(i) || 'AEIKLMNRST'[c.int(10)]).join('');
		return { g, al: [...got.keys()] };
	},
	async ilavi(c, d) {
		const left = plates();
		const taps = [];
		for (let k = 0; k < (d.v.tries || 4); k++) {
			await c.sleep(900 + c.int(1800));
			const il = left.splice(c.int(left.length), 1)[0];
			c.act('il', { il });
			taps.push(il);
			const r = await c.wait('il');
			if (!r || r.found) break;
		}
		return { taps };
	},
	async kimim(c, d) {
		const taps = [];
		await c.sleep(1500 + c.int(9000));
		for (let k = 0; k < 2; k++) {
			const il = 1 + c.int(81);
			c.act('il', { il });
			taps.push(il);
			const r = await c.wait('il');
			if (!r || r.ok) break;
			await c.sleep((r.lock || 2) * 1000 + 200);
		}
		return { taps, at: 0 };
	},
	async sive(c) {
		await c.sleep(2000 + c.int(6000));
		return { il: 1 + c.int(81) };
	},
	async yanlis(c, d) {
		await c.sleep(2000 + c.int(6000));
		const w = c.int(d.v.words?.length || 1);
		c.act('yer', { w });
		const r = await c.wait('yer');
		return { w, f: r?.ok && r.opts ? c.int(r.opts.length) : null };
	},
	async halat(c, d) {
		const items = d.v.items || [];
		const log = [];
		const t0 = performance.now();
		for (let k = 0; items.length && k < 60; k++) {
			await c.sleep(700 + c.int(900));
			const it = items[k % items.length];
			const ch = c.int(it.o?.length || 2);
			c.act('halat', { k, c: ch });
			log.push([k, ch, (performance.now() - t0) / 1000]);
			const r = await c.wait('halat', 2000);
			if (!r || r.late) break;
		}
		return { log };
	},
	async fitil(c, d) {
		// açılan her mini soruya ~1 sn sonra rastgele bas; patlayınca dur (sunucu kendi kaydını kullanır)
		return new Promise((resolve) => {
			let over = false;
			const end = () => {
				if (over) return;
				over = true;
				c.listeners.delete('top');
				resolve({ side: 0, me: { log: [] }, vs: { sheet: [] } });
			};
			c.listeners.set('top', (e) => {
				for (const x of e?.ev || []) {
					if (x.type === 'boom') return end();
					if (x.type === 'open') setTimeout(() => !over && c.act('fitil', { k: x.k, c: c.int(2) }), 600 + c.int(900));
				}
			});
			setTimeout(end, (d.time + 8) * 1000);
		});
	},
	async mancinik(c, d) {
		await c.sleep(1500 + c.int(5000));
		const q = d.v.q || {};
		return Math.round((q.min ?? 0) + c.R() * ((q.max ?? 100) - (q.min ?? 0)));
	},
	async azbilinen(c, d) {
		await c.sleep(1500 + c.int(5000));
		return c.int(d.v.pool?.length || 1);
	},
	async kayip(c, d) {
		// ipuçlarından birini bekler, sonra seçer
		await c.wait('ipucu', 9000);
		return pickOpt(c, d.v);
	},
	async tufan(c, d) {
		await c.sleep(1500 + c.int(5000));
		return pickOpt(c, d.v);
	},
	async kusbakisi(c, d) {
		await c.sleep(1500 + c.int(5000));
		return pickOpt(c, d.v);
	},
	async golge(c, d) {
		await c.sleep(1500 + c.int(5000));
		return pickOpt(c, d.v);
	},
	async ikidogru(c, d) {
		await c.sleep(1500 + c.int(5000));
		return pickOpt(c, d.v);
	},
};
