// HARF AL (deneme): Kelime Oyunu'nun çekirdeği. Tanım ve boş kutular; her harf 100 puan. "HARF AL" rastgele bir
// kutuyu açar ve kazanılacak puanı 100 düşürür (son harf alınamaz). Bilince kutuları alttaki HARF HAVUZUNDAN doldur ve
// GÖNDER: tek hak. Doğruysa kalan puan senin; yanlışsa 0. Eşit puanda hızlı olan önde.
//
// Harf havuzu (klavye yerine): cevabın harfleri (tekrar edenler dahil) ve 3–5 yem harf, karışık. Yemler sık Türkçe
// harflerden ve cevaptaki harflerin "eş"lerinden (kalın/ince ünlü, noktalı/noktasız, yumuşama p/b t/d ç/c k/g/ğ,
// akıcılar l/r m/n) seçilir; biri ünlü biri ünsüz, cevapta olan bir harften en çok bir fazla taş: harf sayarak
// elenemez. Taşa dokun: soldaki ilk boş kutuya uçar. Dolu kutuya dokun: taş havuzdaki yerine döner. ⌫ en sağdaki
// harfi geri alır. HARF AL (ve yarı yarıya) açılan harfin taşını havuzdan alıp kutusuna kilitler.
//
// Veri: q: tanım, w: cevap (4–10 harf, tek kelime).
// Görünüm: word, n (harf sayısı), pool (havuzdaki harfler, karışık; prepare'da R ile).
// Değer: { g: yazılan kelime, al: [alınan harflerin yeri…] }. Tür 'closest': err = alınan harf (bilemeyen 99).
// Çevrimiçi: publicView kelimeyi taşımaz (harf sayısı v.n ve havuz v.pool: hangi harfler olduğu belli, sırası değil);
// her HARF AL sunucuya sorulur (act 'harf' → { i, c }), gönderilen kelime sunucuda yargılanır.
// Joker: yarı yarıya → iki harf (kısa kelimede bir) BEDAVA açılır, puan düşmez.

import { css, esc, shuffle, pCorrect, clamp, buzz, physicalKeys, trUp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout, clearTimeout } from '../core/clock.js';
import { rng } from '../core/math.js';

const CSS = /* css */ `
/* HARF PANOSU: perçinli koyu pano; başlıkta kasa ve HARF AL kolu, altında harf yuvaları ve her yuvanın 100 puanlık jetonu.
   Altta HARF HAVUZU: lacivert tepside fildişi taşlar. Taşa dokununca taş yuvasına uçar (havuzdaki yeri kesik çizgili boş
   yuva olarak bekler); dolu yuvaya dokununca geri uçar. Alınan harf mavi, bedava harf altın taşla kilitlenir, jetonu düşer.
   Ölçüler .dn-ha'nın genişliğinden (kap birimi cqw): 10 harf ve 14 taş 320 px'e küçültmesiz sığar. */
.dn-ha{--pp:12px;--tp:6px;--tg:6px;--bhx:60px;--thx:50px;--chh:20px;container-type:inline-size;display:flex;flex-direction:column;gap:9px;align-items:stretch;user-select:none;-webkit-user-select:none;
  --bw:min(50px,calc((100cqw - 2 * var(--pp) - (var(--n) - 1) * 5px) / var(--n)));
  --tw:min(48px,calc((100cqw - 2 * var(--tp) - (var(--m) - 1) * var(--tg)) / var(--m)));
  --th:min(calc(var(--tw) * 1.12),var(--thx))}
.fl-q.cover .dn-ha{flex:1 1 auto;justify-content:flex-start}
.fl-q.cover .dn-ha .ha-havuz{margin-top:auto}
.ha-pano{position:relative;display:flex;flex-direction:column;gap:8px;padding:10px var(--pp) 11px;border-radius:14px;
  background:radial-gradient(120% 90% at 50% 0%,#262b40 0%,#141724 70%),#141724;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.1),inset 0 2px 0 rgba(255,255,255,.08),0 0 0 3px #0a0c14,0 14px 30px rgba(0,0,0,.55)}
.ha-pano::before,.ha-pano::after{content:'';position:absolute;top:8px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a93b0,#3a4058)}
.ha-pano::before{left:8px}.ha-pano::after{right:8px}
.ha-hd{display:flex;align-items:center;gap:10px;padding:0 6px}
.dn-ha-pts{flex:1;min-width:0;display:flex;align-items:baseline;gap:7px}
.dn-ha-pts small{font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;color:#8f97b8}
.dn-ha-pts b{font:400 34px/1 'Lilita One',sans-serif;color:#ffd25a;font-variant-numeric:tabular-nums;text-shadow:0 2px 0 #5a3a00,0 0 18px rgba(255,200,60,.35);transition:color .3s}
.dn-ha-pts b.drop{animation:dnHaDrop .45s}
.dn-ha-pts em{font-style:normal;font:italic 800 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:#8f97b8;white-space:nowrap}
.dn-ha-al{flex:none;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:108px;height:46px;padding:0 16px;border:0;border-radius:0;
  clip-path:polygon(9% 0,100% 0,91% 100%,0 100%);font:italic 900 20px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em;color:#fff;
  background:linear-gradient(180deg,#4fb6ff,#1a62c8);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -4px 0 rgba(0,0,0,.25);transition:transform .08s,filter .2s;touch-action:manipulation}
.dn-ha-al small{font:800 10.5px/1 'Fredoka',sans-serif;letter-spacing:.06em;color:#ffe6a0;margin-top:3px}
.dn-ha-al:active{transform:translateY(2px) scale(.98)}
.dn-ha-al:disabled{filter:grayscale(.8) brightness(.6)}
/* yuvalar ve jetonlar aynı ızgarada: her jeton kendi yuvasının altında */
.dn-ha-w,.ha-chips{display:flex;gap:5px;justify-content:center;flex-wrap:nowrap}
.ha-chips i{flex:0 0 var(--bw);min-width:0}
.dn-ha-w .ha-b{flex:0 0 var(--bw);min-width:0;height:min(calc(var(--bw) * 1.2),var(--bhx));position:relative;padding:0;border:0;border-radius:8px;display:grid;place-items:center;cursor:pointer;
  font:400 min(calc(var(--bw) * .66),31px)/1 'Lilita One',sans-serif;color:#1d2238;transform-origin:50% 60%;
  background:linear-gradient(180deg,#0a0d17,#171c2e);box-shadow:inset 0 2px 6px rgba(0,0,0,.65),inset 0 -1.5px 0 rgba(255,255,255,.08);touch-action:manipulation}
.dn-ha-w .ha-b:disabled{cursor:default;color:#1d2238}
.dn-ha-w .ha-b::after{content:'';position:absolute;left:4px;right:4px;bottom:4px;height:3px;border-radius:2px;background:rgba(255,255,255,.07)}
.dn-ha-w .ha-b.cur::after{background:#ffd25a;box-shadow:0 0 10px #ffd25a;animation:dnHaCur 1s ease-in-out infinite}
.dn-ha-w .ha-b span{position:relative;z-index:1}
/* dolu yuva: taşın yüzü (kilitli: mavi alınan, altın bedava) */
.dn-ha-w .ha-b.on,.dn-ha-w .ha-b.al,.dn-ha-w .ha-b.free{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7),0 3px 0 var(--te),0 5px 8px rgba(0,0,0,.4)}
.dn-ha-w .ha-b.on{--te:#b39c6e;background:linear-gradient(180deg,#fffdf4,#ece0c2)}
.dn-ha-w .ha-b.al{--te:#0f3f86;color:#fff;background:linear-gradient(180deg,#5cc0ff,#1d6ad0);text-shadow:0 2px 0 rgba(0,0,0,.25)}
.dn-ha-w .ha-b.free{--te:#9a6a00;color:#3a2200;background:linear-gradient(180deg,#ffe27a,#f5b324)}
.dn-ha-w .ha-b.on::after,.dn-ha-w .ha-b.al::after,.dn-ha-w .ha-b.free::after{display:none}
.dn-ha-w .ha-b.wait{background:linear-gradient(180deg,#0a0d17,#171c2e);box-shadow:inset 0 2px 6px rgba(0,0,0,.65)}
.dn-ha-w .ha-b.wait span{visibility:hidden}
.dn-ha-w .ha-b.land{animation:dnHaLand .3s cubic-bezier(.3,1.6,.5,1)}
.dn-ha-w .ha-b.lock{animation:dnHaFlip .5s ease-out}
.dn-ha-w.full{animation:dnHaNudge .3s}
.dn-ha.ready .dn-ha-w .ha-b.on{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7),0 3px 0 var(--te),0 0 0 2px rgba(255,210,90,.55),0 5px 10px rgba(0,0,0,.4)}
.dn-ha.sent .dn-ha-w .ha-b{animation:dnHaSent .4s cubic-bezier(.3,1.5,.5,1) both;animation-delay:calc(var(--k) * 40ms)}
/* cevap: doğruysa yuvalar sırayla zıplayıp yeşillenir; yanlışsa senin kelimen kırmızı titrer, sonra yuvalar dönüp doğruyu gösterir */
.dn-ha-w.rv .ha-b{--te:#07080d;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.dn-ha-w.rv.ok .ha-b{--te:#14602e;background:linear-gradient(180deg,#4fd67a,#1f9a4c);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45),0 3px 0 var(--te),0 0 14px rgba(80,230,130,.45);animation:dnHaPop .5s cubic-bezier(.3,1.7,.5,1) both;animation-delay:calc(var(--k) * 70ms)}
.dn-ha-w.rv.no{animation:flq-shake .4s}
.dn-ha-w.rv.no .ha-b{--te:#5a1208;background:linear-gradient(180deg,#ec6a55,#b8331f);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.35),0 3px 0 var(--te);animation:dnHaFlip .5s ease-out both;animation-delay:calc(.42s + var(--k) * 70ms)}
.dn-ha-w.rv.no .ha-b.ans{--te:#b39c6e;color:#1d2238;text-shadow:none;background:linear-gradient(180deg,#fffdf4,#ece0c2);box-shadow:inset 0 1.5px 0 #fff,0 3px 0 var(--te),0 0 0 2px rgba(255,120,100,.55)}
.ha-chips i{height:var(--chh);display:grid;place-items:center;border-radius:10px;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.04em;font-style:normal;color:#5a3a00;
  background:radial-gradient(circle at 40% 30%,#fff2b0,#f5b324 60%,#b8760a);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2),0 2px 0 #6a4000;transition:transform .45s cubic-bezier(.5,0,.8,.5),opacity .45s,filter .45s}
.ha-chips i.gone{transform:translateY(7px) rotate(-14deg);opacity:.28;filter:grayscale(1);text-decoration:line-through;text-decoration-thickness:2px}
.ha-chips i.free{background:radial-gradient(circle at 40% 30%,#e8fff0,#7fe8a0 60%,#2a9a52);color:#0b3a1c;box-shadow:inset 0 -2px 0 rgba(0,0,0,.2),0 2px 0 #145a2a}
.ha-chips.win i:not(.gone){animation:dnHaWin .6s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--k) * 60ms)}
.dn-ha-g{min-height:18px;text-align:center;font:500 13.5px/1.3 'Fredoka',sans-serif;color:#aab4d6}
.dn-ha-g s{color:#ff9a8a;text-decoration-thickness:2px}
.dn-ha-g b{color:#7dff9a;font-weight:700}
/* harf havuzu: lacivert tepsi, fildişi taşlar; kullanılan taşın yeri kesik çizgili yuva, alınan harfinki mühürlü */
.ha-havuz{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:var(--tg);padding:var(--tp);border-radius:14px;
  background:linear-gradient(180deg,#0d1120,#151a2d);box-shadow:inset 0 2px 8px rgba(0,0,0,.55),inset 0 0 0 1.5px rgba(255,255,255,.06),0 1px 0 rgba(255,255,255,.05)}
.dn-ha .ha-havuz .ha-t{flex:0 0 var(--tw);max-width:none;width:var(--tw);height:var(--th);margin:0;padding:0;border:0;border-radius:9px;display:grid;place-items:center;cursor:pointer;
  font:400 min(calc(var(--tw) * .62),calc(var(--th) * .64),28px)/1 'Lilita One',sans-serif;color:#1d2238;text-shadow:0 1px 0 rgba(255,255,255,.6);
  background:linear-gradient(180deg,#fffdf4,#ece0c2);box-shadow:inset 0 1.5px 0 #fff,0 3px 0 #b39c6e,0 5px 8px rgba(0,0,0,.45);transition:transform .08s,box-shadow .08s;touch-action:manipulation}
.dn-ha .ha-havuz .ha-t:active{transform:translateY(2px);box-shadow:inset 0 1.5px 0 #fff,0 1px 0 #b39c6e,0 2px 4px rgba(0,0,0,.4)}
.dn-ha .ha-havuz .ha-t.used,.dn-ha .ha-havuz .ha-t.wait{color:transparent;text-shadow:none;cursor:default;background:rgba(255,255,255,.025);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12);
  outline:1.5px dashed rgba(255,255,255,.16);outline-offset:-5px}
.dn-ha .ha-havuz .ha-t.seal{outline:0;background:rgba(0,0,0,.18);box-shadow:inset 0 1px 3px rgba(0,0,0,.5)}
.dn-ha .ha-havuz .ha-t.back{animation:dnHaLand .3s cubic-bezier(.3,1.6,.5,1)}
.dn-ha .ha-havuz.no{animation:dnHaNudge .3s}
/* alt sıra: ⌫ ve GÖNDER eğik levhalar (arena dili) */
.ha-act{display:flex;gap:8px;align-items:stretch;height:46px}
.dn-ha .ha-act .ha-bk{flex:0 0 74px;display:grid;place-items:center;padding:0;border:0;border-radius:0;color:#e9ecf6;cursor:pointer;
  clip-path:polygon(12% 0,100% 0,88% 100%,0 100%);background:linear-gradient(180deg,#30374f,#1e2337);box-shadow:inset 0 2px 0 rgba(255,255,255,.12);transition:transform .08s,filter .2s;touch-action:manipulation}
.dn-ha .ha-act .ha-bk svg{width:26px;height:22px}
.dn-ha .ha-act .ha-bk:active{transform:translateY(2px)}
.dn-ha .ha-act .ha-bk:disabled{filter:brightness(.55);cursor:default}
.dn-ha .ha-act .fl-send{flex:1 1 auto;width:auto;height:auto;margin:0;padding:0 10px;border:0;border-radius:0;clip-path:polygon(4% 0,100% 0,96% 100%,0 100%);
  font:italic 900 22px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.16em;color:#0b0c12;text-shadow:none;background:linear-gradient(180deg,#fff,#e6e9f2);box-shadow:none;transition:transform .08s,filter .2s}
.dn-ha .ha-act .fl-send:active{transform:translateY(2px);box-shadow:none}
.dn-ha .ha-act .fl-send:disabled{opacity:1;filter:none;color:rgba(255,255,255,.38);background:linear-gradient(180deg,#1a1f30,#141827);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.16)}
.dn-ha.ready .ha-act .fl-send:not(:disabled){background:linear-gradient(180deg,#ffe27a,#f5b324);animation:dnHaReady 1s ease-in-out infinite}
.dn-ha.sent .ha-havuz .ha-t{opacity:.55}
.dn-ha.done .ha-havuz,.dn-ha.done .ha-act,.dn-ha.done .dn-ha-al{display:none}
/* uçan taş: kartın üstünde ayrı katmanda (gövdenin taşma ölçüsüne ve küçültmesine girmez) */
.ha-fx{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:visible}
.ha-fly{position:absolute;display:grid;place-items:center;border-radius:8px;font-family:'Lilita One',sans-serif;font-style:normal;line-height:1;color:#1d2238;will-change:transform;
  background:linear-gradient(180deg,#fffdf4,#ece0c2);box-shadow:inset 0 1.5px 0 #fff,0 3px 0 #b39c6e,0 10px 16px rgba(0,0,0,.45)}
.ha-fly.al{color:#fff;background:linear-gradient(180deg,#5cc0ff,#1d6ad0);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6),0 3px 0 #0f3f86,0 0 16px rgba(80,180,255,.7)}
.ha-fly.free{color:#3a2200;background:linear-gradient(180deg,#ffe27a,#f5b324);box-shadow:inset 0 1.5px 0 #fff6c8,0 3px 0 #9a6a00,0 0 16px rgba(255,200,60,.7)}
@media (max-height:760px){.dn-ha{--bhx:52px;--thx:46px;gap:8px}.ha-act{height:44px}}
@media (max-height:700px){.dn-ha{--bhx:46px;--thx:42px;--chh:18px;gap:7px}.dn-ha-pts b{font-size:30px}.dn-ha-al{height:42px}.ha-pano{gap:6px;padding:8px var(--pp) 9px}.ha-act{height:42px}.dn-ha .ha-act .fl-send{font-size:20px}}
/* en kısa ekran (320×568): yuvalar kare, jetonlar ince, ipucu satırı kalkar; taşlar 34 px (dokunma payı klavye tuşunun
   iki katı), alt sıra 36 px. Gövde 1:1 sığar (ui._coverFit küçültmez). */
@media (max-height:600px){
  .dn-ha{--pp:8px;--tp:5px;--tg:5px;--bhx:40px;--thx:34px;--chh:15px;gap:6px}
  .dn-ha-g{display:none}
  .ha-pano{gap:5px;padding:5px var(--pp) 7px}
  .ha-pano::before,.ha-pano::after{top:5px}
  .dn-ha-pts b{font-size:26px}
  .dn-ha-al{height:34px;min-width:88px;padding:0 12px;font-size:17px}
  .dn-ha-al small{margin-top:1px;font-size:10px}
  .dn-ha-w .ha-b{height:min(var(--bw),var(--bhx))}
  .ha-chips i{font-size:10px}
  .ha-act{height:36px}
  .dn-ha .ha-act .fl-send{font-size:19px}
  .dn-ha .ha-act .ha-bk svg{width:22px;height:19px}
  .dn-ha.done .dn-ha-g{display:block}
}
@media (prefers-reduced-motion:reduce){.dn-ha *,.ha-fly{animation:none!important;transition:none!important}}
@keyframes dnHaFlip{0%{transform:perspective(200px) rotateX(0)}45%{transform:perspective(200px) rotateX(90deg)}75%{transform:perspective(200px) rotateX(-12deg)}100%{transform:none}}
@keyframes dnHaLand{0%{transform:scale(1.16,.84)}55%{transform:scale(.94,1.08)}100%{transform:none}}
@keyframes dnHaPop{0%{transform:scale(1)}40%{transform:scale(1.24) translateY(-5px)}70%{transform:scale(.95)}100%{transform:none}}
@keyframes dnHaSent{0%{transform:none}45%{transform:scale(.9)}100%{transform:none}}
@keyframes dnHaNudge{25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
@keyframes dnHaReady{50%{filter:brightness(1.12)}}
@keyframes dnHaDrop{30%{color:#ff7a6a;transform:scale(.88)}}
@keyframes dnHaCur{50%{opacity:.35}}
@keyframes dnHaWin{40%{transform:translateY(-10px) scale(1.2)}100%{transform:none}}
`;

// sayfa windows-1252 okunabilir: düzenli ifadede ASCII dışı harf yok (esbuild dizeleri kaçışlar, düzenli ifadeyi değil)
const norm = (s) => trUp(String(s ?? '')).replace(/[^A-Z\u00C7\u011E\u0130\u00D6\u015E\u00DC]/g, '');

// ---------------------------------------------------------------- harf havuzu

// Türkçe harf sıklığı (yaklaşık yüzde). J yok: yem olarak hemen sırıtır.
const FREQ = { A: 11.9, E: 8.9, 'İ': 8.6, N: 7.5, R: 6.9, L: 6, I: 5.1, K: 4.7, D: 4.7, M: 3.8, Y: 3.3, U: 3.2, T: 3, S: 3, B: 2.8, O: 2.5, 'Ü': 1.9, 'Ş': 1.8, Z: 1.5, G: 1.3, 'Ç': 1.2, H: 1.2, 'Ğ': 1.1, V: 1, C: 1, P: 0.9, 'Ö': 0.8, F: 0.4 };
// karışan eşler: kalın/ince ünlü, noktalı/noktasız, yumuşama, akıcılar
const EES = ['AE', 'Iİ', 'OÖ', 'UÜ', 'IU', 'CÇ', 'SŞ', 'GĞ', 'KG', 'KĞ', 'PB', 'TD', 'LR', 'MN', 'ZS', 'VF'];
const VOWELS = 'AEIİOÖUÜ';
const isV = (c) => VOWELS.includes(c);

/** Havuzdaki yem sayısı: kısa kelimede 3, uzunda 5; havuz en çok 14 taş (iki sıra yedi). */
export const nDecoy = (n) => Math.max(3, Math.min(5, Math.round(n / 2 + 0.5), 14 - n));

/** Yem harfler: sık harflerden ve cevaptaki harflerin eşlerinden; ilki ünlü, ikincisi ünsüz; cevapta olan bir harften en çok bir fazla. */
export function decoys(word, R, d = nDecoy([...word].length)) {
	const has = new Set([...word]);
	const wt = {};
	// sıklık biraz düzleştirilir (en sık harfler her havuzda yem olup ele vermesin); cevaptaki harfin fazlası seyrek
	for (const [c, f] of Object.entries(FREQ)) wt[c] = has.has(c) ? f * 0.12 : Math.pow(f, 0.8);
	for (const p of EES) {
		const [a, b] = [...p];
		if (has.has(a) && !has.has(b)) wt[b] += 3.5;
		if (has.has(b) && !has.has(a)) wt[a] += 3.5;
	}
	const out = [];
	let extra = 0;
	const draw = (ok) => {
		const keys = Object.keys(wt).filter((c) => wt[c] > 0 && ok(c) && !(extra && has.has(c)));
		const sum = keys.reduce((s, c) => s + wt[c], 0);
		let r = R() * sum;
		for (const c of keys) if ((r -= wt[c]) <= 0) return c;
		return keys[keys.length - 1];
	};
	for (let k = 0; k < d; k++) {
		const c = draw(k === 0 ? isV : k === 1 ? (x) => !isV(x) : () => true);
		if (!c) break;
		out.push(c);
		if (has.has(c)) extra++;
		wt[c] = 0; // aynı yem iki kez çıkmaz
	}
	return out;
}

/** Havuz: cevabın harfleri ve yemler, karışık (kelime havuzda sırasıyla okunmasın). */
export function poolFor(word, R) {
	const all = [...word, ...decoys(word, R)];
	let p = shuffle(all, R);
	for (let k = 0; k < 12 && p.join('').includes(word); k++) p = shuffle(all, R);
	return p;
}
const seedOf = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) >>> 0, 7);

/** Puan: doğruysa (harf − alınan) × 100, değilse 0. */
function score(v, value) {
	if (!value || typeof value.g !== 'string') return { ok: false, pts: 0, al: 0, none: true };
	const al = Array.isArray(value.al) ? new Set(value.al.filter((i) => Number.isInteger(i) && i >= 0 && i < v.n)).size : 0;
	const ok = norm(value.g) === v.word && al < v.n;
	return { ok, pts: ok ? (v.n - al) * 100 : 0, al };
}

const BACK_SVG = '<svg viewBox="0 0 26 22" aria-hidden="true"><path d="M8.6 2.5H22a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8.6L2 11z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 7.4l6.6 6.6M18.6 7.4L12 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const harfal = {
	time: 30,
	label: 'Harf Al',
	kind: 'closest',
	cover: true, // tam ekran harf panosu (harita gizli)
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => `${score(v, value).pts} puan`,
	sub: (v, value) => {
		const s = score(v, value);
		if (!s.ok) return 'bilemedi';
		return s.al ? `${s.al} harf aldı` : 'harf almadan!';
	},
	prepare(q, R) {
		const word = norm(q.w);
		// havuz maçın tohumuyla (R); R yoksa kelimeden belirlenimci
		const rand = typeof R === 'function' ? R : rng(seedOf(word + (q.id || '')));
		const v = { q, word, n: [...word].length, pool: poolFor(word, rand) };
		return stamp(v, q, (q2, k, P) => ({
			look: LOOK.orient + v.n * LOOK.gaze,
			// tanımı çöz (zorlukla), gerekirse harf al ve deseni yeniden düşün
			think: P.think[0] + P.think[1] * k + v.n * 0.25,
			act: v.n * ACT.tap * 0.8 + ACT.tap + ACT.confirm,
		}));
	},
	mount(el, v, api) {
		css('harfal', CSS);
		const app = appOf();
		const word = [...(v.word || '')];
		const n = v.n;
		const pool = Array.isArray(v.pool) && v.pool.length >= n ? v.pool : poolFor(v.word || '', Math.random);
		// taş: c harf, at yuva (-1: havuzda). Yuva: t taş (-1: boş), lock '' | 'al' | 'free' (kilitli taş havuza dönmez)
		const tiles = pool.map((c) => ({ c, at: -1 }));
		const slot = Array.from({ length: n }, () => ({ t: -1, lock: '' }));
		const al = [];
		let done = false;
		const cols = tiles.length <= 7 ? tiles.length : Math.ceil(tiles.length / 2);
		el.innerHTML = `<div class="dn-ha" style="--n:${n};--m:${cols}">
			<div class="ha-pano">
				<div class="ha-hd"><span class="dn-ha-pts"><small>KASA</small><b>${n * 100}</b><em>${n} HARF</em></span><button class="dn-ha-al">HARF AL<small>−100 puan</small></button></div>
				<div class="dn-ha-w">${Array.from({ length: n }, (_, i) => `<button class="ha-b" style="--k:${i}" aria-label="${i + 1}. harf" disabled><span></span></button>`).join('')}</div>
				<div class="ha-chips">${Array.from({ length: n }, (_, i) => `<i style="--k:${i}">100</i>`).join('')}</div>
			</div>
			<div class="dn-ha-g">Harflere dokun, kutuları doldur</div>
			<div class="ha-havuz">${tiles.map((t, k) => `<button class="fl-key ha-t" data-t="${k}" data-k="${esc(t.c)}">${esc(t.c)}</button>`).join('')}</div>
			<div class="ha-act"><button class="ha-bk" aria-label="Son harfi geri al" disabled>${BACK_SVG}</button><button class="fl-send" disabled>GÖNDER</button></div>
		</div>`;
		rule(el, 'Az harf al');
		const root = el.querySelector('.dn-ha');
		const boxes = [...root.querySelectorAll('.dn-ha-w .ha-b')];
		const spans = boxes.map((b) => b.firstElementChild);
		const wEl = root.querySelector('.dn-ha-w');
		const ptsEl = root.querySelector('.dn-ha-pts b');
		const alBtn = root.querySelector('.dn-ha-al');
		const send = root.querySelector('.fl-send');
		const bk = root.querySelector('.ha-bk');
		const gEl = root.querySelector('.dn-ha-g');
		const chips = [...root.querySelectorAll('.ha-chips i')];
		const tEls = [...root.querySelectorAll('.ha-havuz .ha-t')];
		const card = el.closest('.fl-q');
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		const pts = () => (n - al.length) * 100;
		const draw = () => {
			const cur = slot.findIndex((s) => s.t < 0);
			boxes.forEach((b, i) => {
				const s = slot[i];
				spans[i].textContent = s.t >= 0 ? tiles[s.t].c : '';
				b.classList.toggle('on', s.t >= 0 && !s.lock);
				b.classList.toggle('al', s.lock === 'al');
				b.classList.toggle('free', s.lock === 'free');
				b.classList.toggle('cur', i === cur && !done);
				b.disabled = done || s.t < 0 || !!s.lock; // yalnız senin koyduğun taş geri alınır
			});
			tEls.forEach((e, k) => {
				const t = tiles[k];
				const out = t.at >= 0;
				// havuzdaki taş harfini taşır (fiziksel klavye ve denetim aracı harfe göre bulur); boş yuva yazısız
				if (e.textContent !== (out ? '' : t.c)) e.textContent = out ? '' : t.c;
				e.classList.toggle('used', out);
				e.classList.toggle('seal', out && !!slot[t.at]?.lock);
				e.disabled = done || out;
				if (out) delete e.dataset.k;
				else e.dataset.k = t.c;
			});
			const full = cur < 0;
			send.disabled = done || !full;
			bk.disabled = done || !slot.some((s) => s.t >= 0 && !s.lock);
			alBtn.disabled = done || slot.filter((s) => !s.lock).length <= 1;
			root.classList.toggle('ready', full && !done);
		};
		const retrig = (e, cls) => {
			e.classList.remove(cls);
			void e.offsetWidth;
			e.classList.add(cls);
		};
		// ---------------------------------------------------------------- uçan taş (kartın üstünde ayrı katman)
		let layer = null;
		let flying = 0;
		const fly = (from, to, c, kind = '') => {
			const host = card || root;
			const a = from.getBoundingClientRect();
			const b = to.getBoundingClientRect();
			if (reduced() || !a.width || !b.width || !host.isConnected) return Promise.resolve();
			if (!layer || !layer.isConnected) {
				layer = document.createElement('div');
				layer.className = 'ha-fx';
				host.appendChild(layer);
			}
			from._an?.cancel(); // bu öğeye inmekte olan taş varsa hemen iner (üst üste iki uçuş görünmesin)
			to._an?.cancel();
			const L = layer.getBoundingClientRect();
			const f = document.createElement('i');
			f.className = 'ha-fly' + (kind ? ' ' + kind : '');
			f.textContent = c;
			const fs = parseFloat(getComputedStyle(to).fontSize) || 20;
			Object.assign(f.style, { left: b.left - L.left + 'px', top: b.top - L.top + 'px', width: b.width + 'px', height: b.height + 'px', fontSize: fs + 'px' });
			layer.appendChild(f);
			flying++;
			const dx = a.left + a.width / 2 - (b.left + b.width / 2);
			const dy = a.top + a.height / 2 - (b.top + b.height / 2);
			const sx = a.width / b.width;
			const sy = a.height / b.height;
			const lift = Math.min(44, Math.abs(dy) * 0.3 + Math.abs(dx) * 0.08 + 10);
			const m = (sx + 1) * 0.5 * 1.14;
			const my = (sy + 1) * 0.5 * 1.14;
			const an = f.animate(
				[
					{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` },
					{ transform: `translate(${dx * 0.42}px,${dy * 0.42 - lift}px) scale(${m},${my}) rotate(${dx > 0 ? -9 : 9}deg)`, offset: 0.52 },
					{ transform: 'none' },
				],
				{ duration: 300 + Math.min(120, Math.hypot(dx, dy) * 0.25), easing: 'cubic-bezier(.33,.12,.3,1)' },
			);
			to._an = an;
			const end = () => {
				if (to._an === an) to._an = null;
				f.remove();
				if (--flying <= 0 && layer) {
					layer.remove();
					layer = null;
				}
			};
			return an.finished.then(end, end);
		};
		/** Taş k, from öğesinden j. yuvaya uçar; yuva taş konana kadar boş görünür. */
		const toBox = (j, from, kind) => {
			const b = boxes[j];
			const tok = (b._tok = (b._tok || 0) + 1);
			b.classList.add('wait');
			b.classList.remove('land', 'lock');
			fly(from, b, tiles[slot[j].t]?.c || '', kind).then(() => {
				if (b._tok !== tok) return;
				b.classList.remove('wait');
				retrig(b, kind ? 'lock' : 'land');
			});
		};
		/** Taş k yuvadan (from) havuzdaki yerine döner. */
		const toPool = (k, from) => {
			const e = tEls[k];
			const tok = (e._tok = (e._tok || 0) + 1);
			e.classList.add('wait');
			e.classList.remove('back');
			fly(from, e, tiles[k].c).then(() => {
				if (e._tok !== tok) return;
				e.classList.remove('wait');
				if (tiles[k].at < 0) retrig(e, 'back');
			});
		};
		// ---------------------------------------------------------------- eylemler
		const place = (k) => {
			if (done) return;
			const t = tiles[k];
			if (!t || t.at >= 0) return;
			const j = slot.findIndex((s) => s.t < 0);
			if (j < 0) {
				retrig(wEl, 'full');
				buzz(12);
				return;
			}
			slot[j].t = k;
			t.at = j;
			tEls[k].classList.remove('wait', 'back');
			tEls[k]._tok = (tEls[k]._tok || 0) + 1;
			draw();
			toBox(j, tEls[k]);
			sfx(app, 'tap', { rate: 0.92 + (j / Math.max(1, n - 1)) * 0.5 }); // kutular doldukça perde yükselir
			buzz(4);
		};
		/** j. yuvadaki (kilitsiz) taşı havuzdaki yerine gönder. */
		const release = (j) => {
			const s = slot[j];
			if (s.t < 0 || s.lock) return;
			const k = s.t;
			s.t = -1;
			tiles[k].at = -1;
			boxes[j]._tok = (boxes[j]._tok || 0) + 1;
			boxes[j].classList.remove('wait', 'land');
			draw();
			toPool(k, boxes[j]);
		};
		const unplace = (j) => {
			if (done || slot[j].t < 0 || slot[j].lock) return;
			release(j);
			sfx(app, 'tap', { rate: 0.8 });
			buzz(4);
		};
		const back = () => {
			if (done) return;
			for (let j = n - 1; j >= 0; j--)
				if (slot[j].t >= 0 && !slot[j].lock) return unplace(j);
		};
		/** i. yuvaya c harfini kilitle ('al' alındı, 'free' bedava): taşı havuzdan (yoksa senin koyduğun başka yuvadan) alır. */
		const lockIn = (i, c, kind) => {
			const s = slot[i];
			if (!s || s.lock) return;
			chips[i]?.classList.add(kind === 'al' ? 'gone' : 'free'); // alınan harfin jetonu düşer, bedava harfinki yeşillenir
			if (s.t >= 0 && tiles[s.t].c === c) {
				// doğru taş zaten yerinde: kilitlenir
				s.lock = kind;
				draw();
				retrig(boxes[i], 'lock');
				return;
			}
			if (s.t >= 0) release(i); // yanlış taş havuza döner
			let k = tiles.findIndex((t) => t.at < 0 && t.c === c);
			let from = tEls[k];
			if (k < 0) {
				const j = slot.findIndex((x, jj) => jj !== i && !x.lock && x.t >= 0 && tiles[x.t].c === c);
				if (j < 0) return;
				k = slot[j].t;
				slot[j].t = -1;
				boxes[j]._tok = (boxes[j]._tok || 0) + 1;
				boxes[j].classList.remove('wait', 'land');
				from = boxes[j];
			}
			slot[i] = { t: k, lock: kind };
			tiles[k].at = i;
			tEls[k].classList.remove('wait', 'back');
			draw();
			toBox(i, from, kind);
		};
		const take = () => {
			if (done) return;
			const closed = slot.map((s, i) => (s.lock ? -1 : i)).filter((i) => i >= 0);
			if (closed.length <= 1) return;
			// çevrimdışı: rastgele kilitsiz yuva (çevrimiçinde act 'harf' sunucuya sorulur)
			const i = closed[Math.floor(Math.random() * closed.length)];
			al.push(i);
			lockIn(i, word[i], 'al');
			ptsEl.textContent = String(pts());
			retrig(ptsEl, 'drop');
			const fx = app?.ui?.fx;
			if (fx) {
				const r = boxes[i].getBoundingClientRect();
				fx.text(r.left + r.width / 2, r.top - 6, '−100', { cls: 'bad', life: 800 });
			}
			sfx(app, 'tap', { rate: 0.7 });
			buzz(10);
		};
		const submit = () => {
			if (done || slot.some((s) => s.t < 0)) return;
			done = true;
			root.classList.add('sent');
			gEl.textContent = `${pts()} puan için gönderildi`;
			sfx(app, 'tap');
			buzz(10);
			draw();
			api.answer({ g: slot.map((s) => tiles[s.t].c).join(''), al: al.slice() });
		};
		root.querySelector('.ha-havuz').addEventListener('click', (e) => {
			const b = e.target.closest('.ha-t');
			if (b && !b.disabled) place(Number(b.dataset.t));
		});
		wEl.addEventListener('click', (e) => {
			const b = e.target.closest('.ha-b');
			if (b && !b.disabled) unplace(boxes.indexOf(b));
		});
		alBtn.addEventListener('click', take);
		bk.addEventListener('click', back);
		send.addEventListener('click', submit);
		// masaüstü: harf tuşu havuzdaki ilk uygun taşı seçer, yoksa havuz kısa titrer
		const onKey = (c) => {
			if (done) return;
			const k = tiles.findIndex((t) => t.at < 0 && t.c === c);
			if (k >= 0) place(k);
			else retrig(root.querySelector('.ha-havuz'), 'no');
		};
		const off = physicalKeys(root, { onKey, onBack: back });
		const onEnter = (e) => {
			if (!root.isConnected) return document.removeEventListener('keydown', onEnter);
			if (e.key === 'Enter') submit();
		};
		document.addEventListener('keydown', onEnter);
		draw();
		const cleanup = () => {
			off();
			document.removeEventListener('keydown', onEnter);
			layer?.remove();
			layer = null;
		};
		return {
			lock() {
				done = true;
				draw();
			},
			value: () => (slot.every((s) => s.t >= 0) ? { g: slot.map((s) => tiles[s.t].c).join(''), al: al.slice() } : null),
			joker(e) {
				if (!e?.open || done) return;
				for (const i of e.open) if (word[i]) lockIn(i, word[i], 'free');
				app?.ui?.toast?.(`${e.open.length} harf bedava açıldı`, { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				cleanup();
				root.classList.remove('ready', 'sent');
				root.classList.add('done');
				const meR = results.find((r) => r.p?.human);
				const mine = meR ? score(v, meR.value) : null;
				const guess = meR?.value?.g ? [...norm(meR.value.g)] : [];
				// değerdeki alınan harfler (bot yolu ve sunucu: arayüz almamış olabilir)
				const bought = new Set(Array.isArray(meR?.value?.al) ? meR.value.al : al);
				chips.forEach((c, i) => bought.has(i) && c.classList.add('gone'));
				boxes.forEach((b) => {
					b.classList.remove('on', 'al', 'free', 'cur', 'wait', 'land', 'lock', 'ans');
					b.disabled = true;
				});
				if (mine?.ok) {
					spans.forEach((s, i) => (s.textContent = word[i]));
					wEl.classList.add('rv', 'ok'); // yuvalar sırayla zıplar, yeşillenir
					root.querySelector('.ha-chips')?.classList.add('win'); // kalan jetonlar kasaya zıplar
					ptsEl.textContent = String(mine.pts);
					const fx = app?.ui?.fx;
					if (fx) {
						const r = wEl.getBoundingClientRect();
						later(() => fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 18, dist: 110, colors: ['#7dff9a', '#ffd25a', '#fff'], kind: 'star', size: 12, life: 800 }), n * 70);
					}
				} else {
					// yanlış: önce senin kelimen titrer, sonra her yuva dönüp doğru harfi gösterir (dönüşün tam ortasında)
					spans.forEach((s, i) => (s.textContent = guess[i] || ''));
					wEl.classList.add('rv', 'no');
					spans.forEach((s, i) =>
						later(() => {
							s.textContent = word[i];
							boxes[i].classList.add('ans');
						}, 420 + i * 70 + 225),
					);
					ptsEl.textContent = '0';
				}
				gEl.innerHTML = mine?.ok
					? `Cevap <b>${esc(v.word)}</b> · ${mine.al ? `${mine.al} harf aldın` : 'hiç harf almadın!'}`
					: guess.length
						? `Senin cevabın <s>${esc(guess.join(''))}</s> · doğrusu <b>${esc(v.word)}</b>`
						: `Doğrusu <b>${esc(v.word)}</b>`;
				if (meR && app) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (mine.ok) stampLater(app, `+${mine.pts} PUAN`, win ? 'gold' : '', win ? (mine.al ? '' : 'Harf almadan bildin!') : order[0].err === mine.al ? `${order[0].name} daha hızlıydı` : `${order[0].name} ${(v.n - order[0].err) * 100} puan aldı`);
					else stampLater(app, mine.none ? 'SÜRE DOLDU' : 'BİLEMEDİN', 'bad', `Cevap: ${v.word}`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'KAZANDI';
				}, 0);
			},
			destroy() {
				cleanup();
				for (const t of timers) clearTimeout(t);
			},
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const k = v.n >= 6 ? 2 : 1;
		return { open: shuffle([...Array(v.n).keys()], R).slice(0, k).sort((a, b) => a - b) };
	},
	/** Çevrimiçi görünüm: kelime yok; harf sayısı ve havuz (harfler karışık) var. Her HARF AL act 'harf' ile sunucuya sorulur. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.word;
		delete o.q.w;
		return o;
	},
	judge(v, value) {
		const s = score(v, value);
		return { correct: s.ok, err: s.ok ? s.al : 99, pts: s.pts };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.08, 0.95);
		// zayıf bot daha çok harf alır; zorluk arttıkça herkes alır
		const need = Math.round(clamp((1 - skill) * v.n * 0.45 + (v.q.diff - 1) * 0.7 + R() * 1.6 - 0.4, 0, v.n - 2));
		const al = shuffle([...Array(v.n).keys()], R).slice(0, need);
		const ok = R() < p;
		let g = v.word;
		if (!ok) {
			const w = [...v.word];
			const i = Math.floor(R() * w.length);
			w[i] = w[i] === 'A' ? 'E' : 'A';
			g = w.join('');
		}
		return { value: { g, al }, time: botTime(v, R, skill, ok ? 0.1 : 0.4, ok ? 0.9 : 1) };
	},
	ornek(v) {
		return { good: { g: v.word, al: [] }, bad: { g: v.word.slice(1) + 'X', al: [0] } };
	},
};
