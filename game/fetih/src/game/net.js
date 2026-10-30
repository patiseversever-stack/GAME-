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
//     k='answer'   d={ q, v, time, extra, who:[koltuk,…], phase, cat, attacker, defender, target }
//                                                                                      → res.d = { value, time }
//                  time: sorunun süre bütçesi (sn), sunucu sorunun verisinden hesaplar (src/quiz/timing.js; v.sec ile
//                  aynı). İstemci saati bununla kurar, kendisi yeniden hesaplamaz (publicView şıkları sildiği için
//                  istemcideki hesap farklı çıkabilir). Cevap süresi sunucuda [0, time + ekstra] aralığına kırpılır.
//   Eylemler (t='act'):
//     k='joker'    d={ id }                  sunucu match.useJoker(id, koltuk) çağırır; sonuç 'ev' ile döner
//     k='ayril'    d={}                      koltuk botla devam eder
//     k='harf'     d={ ch }                  adam asmaca harf denemesi; sunucu yalnız o koltuğa 'harf' olayı döner
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
//     'reveal'  d={ results:[{i,value,time,correct,err}], answer }  answer: sunucudaki tam soru görünümü (cevap, değerler)
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
//   Bilinen açık: cevap süresini istemci bildirir; sunucu yalnız [0, süre + kendi ekstra süresi] aralığına kırpar.
//   Gerçek sunucuda süre sunucu saatinden ölçülmeli (kart açılış onayı + varış zamanı).
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
		transport.onmessage((m) => this._recv(m));
	}

	_recv(m) {
		if (!m || m.v !== PROTOCOL) return;
		this.log.push(m.t + ':' + m.k);
		if (m.t === 'hello') this.hello = m.d;
		if (m.t !== 'req') return;
		let d = null;
		if (m.k === 'pick') d = m.d.options[Math.floor(this.R() * m.d.options.length)];
		else if (m.k === 'category') d = ['tarih', 'cografya', 'spor', 'bilim', 'sanat', 'eglence'][Math.floor(this.R() * 6)];
		else if (m.k === 'answer') {
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
}
