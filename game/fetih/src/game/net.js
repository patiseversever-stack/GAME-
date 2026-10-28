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
//   Eylemler (t='act'):
//     k='joker'    d={ id }                  sunucu match.useJoker(id, koltuk) çağırır; sonuç 'ev' ile döner
//     k='ayril'    d={}                      koltuk botla devam eder
//   Olaylar (t='ev'), k:
//     'state'   d=snapshot()                tam durum (yeniden bağlanma)
//     'phase'   d={ phase, round }          capital|expansion|attack|siege|end
//     'turn'    d={ player }
//     'owner'   d={ i, p, value }           il sahibi değişti (p=-1 boş)
//     'score'   d={ scores:[…], hp:[…] }
//     'ask'     d={ q, v, who, title }      soru açıldı (seyirci içi)
//     'reveal'  d={ results:[{i,value,time,correct,err}], answer }
//     'wheel'   d={ player, cat }
//     'joker'   d={ player, id, effect }    yalnızca herkese açık kısmı (oy yüzdesi gizli kalır)
//     'shield'  d={ player, target }
//     'elim'    d={ player, by }
//     'over'    d={ ranking, reason, rewards? }
//
//   Güvenlik notu: bugün `v` içinde doğru cevap bulunur (yerel güven). Çevrimiçi sürümde sunucu
//   `publicView(T, v)` ile doğru cevabı ayıklar; tipler gerekirse `T.publicView(v)` tanımlar. Kontroller
//   doğrulaması sunucuda yapılır: gelen il `options` içinde değilse, cevap süresi dışındaysa reddedilir.
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
export function publicView(T, v) {
	if (T?.publicView) return T.publicView(v);
	const out = { ...v };
	delete out.right;
	if (out.q) {
		out.q = { ...out.q };
		delete out.q.ans;
		if (Array.isArray(v.opts)) delete out.q.a; // şıklar zaten v.opts'ta (karışık)
	}
	return out;
}

/** Yerel insan koltuğu: kararları arayüzden alır. */
export class UIController {
	constructor(match) {
		this.m = match;
		this.kind = 'ui';
		this.remote = false;
	}
	pick(p, kind, options, text) {
		return this.m.ui.pickProvince(this.m, options, text);
	}
	category() {
		return this.m.ui.chooseCategory(this.m);
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
			this.pending.set(id, { resolve, timer });
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

	async pick(p, kind, options, text) {
		const r = await this.request('pick', { kind, options, text });
		return typeof r === 'number' && options.includes(r) ? r : null;
	}

	async category() {
		const r = await this.request('category', {});
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
			const T = TYPES[m.d.q.type];
			const b = T.bot(m.d.v, this.skill, this.R);
			d = { value: b.value, time: b.time };
		}
		this.t.send(envelope('res', m.k, d, { id: m.id, seat: m.seat }));
	}
}
