// KİMİM BEN? (deneme): bir il kendini ele vermeden anlatır. Beş ipucu zordan kolaya her 3 sn'de bir açılır; oyuncu
// istediği an haritada ile dokunur. Erken bilen kazanır (tür 'exact': doğrular hıza göre sıralanır, hız da kaçıncı
// ipucunda bildiğin demek). Yanlış dokunuş 2 sn kilit: kart kızarır, harita dokunuşu yutar.
//
// Her soru bir ANLATICI TARZIYLA gelir (v.style): il kendini anlatır, yolcunun günlüğü, gazete manşeti, tarihçinin
// notu, ustanın tarifi, bilmece, radyo, maç spikeri, kartpostal, emlak ilanı, mesajlaşma, dedektif dosyası, tur
// rehberi, navigasyon, masal. Mantık aynı, kartın başlığı, yazısı ve ipucu satırlarının görünümü tarza göre değişir.
//
// Veri: il (plaka), style (STYLES anahtarı), clues: [5 ipucu, zordan kolaya]. q.q yazılmazsa tarzın sorusu kullanılır.
// Değer: { taps: [plaka, …], at } (at: doğru dokunuştaki açık ipucu sayısı − 1). Çevrimiçinde sunucu `at`'ı dokunuş
// zamanından yeniden hesaplar; istemcinin yazdığına güvenmez.
// Görünüm: v.hedef = gizli ilin dizini (arayüz v.target'ı iğne hedefi sanır), v.clues (açık ipuçları).
// Çevrimiçi: publicView yalnız ilk ipucunu taşır; sonrakiler sunucudan zamanla gelir (olay 'ipucu' { k, text } →
// ctl.ipucu(k, text)). Gizli il yalnız sunucuda.
// Joker: yarı yarıya → gizli ilin bölgesi karanlıkta aydınlanır; seyirci → üç il parlar, biri doğru.

import { css, esc, pCorrect, clamp, buzz } from './util.js';
import { PROFILE } from './timing.js';
import { appOf, stamp, guard, onClose, onOpen, cardTop, tag, pop, sfx, rule, stampLater, tapX, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout, clearTimeout } from '../core/clock.js';
import DATA from '../data/turkiye.json';

Object.assign(PROFILE, { kimim: { min: 20, max: 28, think: [2, 0.75] } }); // ipuçları akar; bildiğin an ile dokun

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const REGION = { marmara: 'Marmara', karadeniz: 'Karadeniz', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu Anadolu' };
export const GAP = 3; // iki ipucu arası (sn)
export const LOCK = 2; // yanlış dokunuş kilidi (sn)
const N = 5;

/**
 * Anlatıcı tarzları: head (kart başlığı), q (soru yazısı), pre(k) (satır öneki), lock ('bar' | 'redact' | 'typing').
 * Görünüm CSS'te `.st-<tarz>` altında.
 */
export const STYLES = {
	ben: { head: '<b>🗣️ İL KONUŞUYOR</b><em>birinci ağızdan</em>', q: 'Bir il kendini anlatıyor. Kim bu?' },
	gunluk: { head: '<b>Yolcunun Günlüğü</b><em>defterden bir sayfa</em>', q: 'Bir yolcunun günlüğü: hangi ildeyiz?', pre: (k) => String(k + 1) },
	manset: { head: '<b>FETİH POSTASI</b><em>SON DAKİKA · 81 İL BASKISI</em>', q: 'Bugünün manşetleri hangi ilden?' },
	tarihci: { head: '<b>Tarihçinin Notları</b><em>arşivden, kenar notlarıyla</em>', q: 'Tarihçi hangi ili anlatıyor?', pre: (k) => '¹²³⁴⁵'[k] },
	tarif: { head: '<b>👩‍🍳 Ustanın Tarifi</b><em>bir şehrin mutfağından</em>', q: 'Bu tarif hangi ilin mutfağından?', pre: (k) => String(k + 1) },
	bilmece: { head: '<b>✦ Bilmece ✦</b><em>bil bakalım, ben kimim?</em>', q: 'Bilmecedeki il hangisi?' },
	radyo: { head: '<b>FM 81.0</b><em>hava ve yol durumu · canlı</em>', q: 'Radyo hangi ilden yayında?' },
	spiker: { head: '<b><i class="km-live">CANLI</i>MAÇ ANLATIMI</b><em>maç bu ilde oynanıyor</em>', q: 'Spiker hangi ilden anlatıyor?', pre: (k) => ["8'", "27'", "45+1'", "71'", "90'"][k] },
	kartpostal: { head: '<b>Sevgili annecim,</b><em>buradan sevgiler!</em>', q: 'Kartpostal hangi ilden geldi?' },
	emlak: { head: '<b>🏠 İLAN · SATILIK DEĞİL</b><em>sadece hava atıyoruz</em>', q: 'İlandaki il hangisi?', pre: () => '✓' },
	mesaj: { head: '<b>Kuzenler</b><em>Selin yazıyor…</em>', q: 'Selin tatilde. Hangi ilde?', pre: (k) => ['14:02', '14:09', '14:15', '14:21', '14:30'][k], lock: 'typing' },
	dedektif: { head: '<b>GİZLİ DOSYA № 81</b><em>şüpheli: bir il</em>', q: 'Şüpheli il hangisi?', pre: (k) => `KANIT ${k + 1}`, lock: 'redact' },
	rehber: { head: '<b>🚩 Tur Rehberi</b><em>sayın misafirlerimiz…</em>', q: 'Rehber hangi ili gezdiriyor?' },
	navigasyon: { head: '<b>➤ Navigasyon</b><em>rota oluşturuldu</em>', q: 'Navigasyon sizi hangi ile götürüyor?', pre: (k) => ['120 km', '40 km', '6 km', '800 m', 'VARDINIZ'][k] },
	masal: { head: '<b>Masal</b><em>bir varmış, bir yokmuş…</em>', q: 'Masal hangi ilde geçiyor?' },
};

/** Dokunuşlardan sonuç: { found, at, wrong } (sunucu da aynı hesabı yapar; `at` sunucuda zamandan gelir). */
function result(v, value) {
	const taps = (Array.isArray(value?.taps) ? value.taps : []).map((id) => BY_ID.get(id)).filter((i) => i != null);
	const hit = taps.indexOf(v.hedef);
	const at = clamp(Math.round(Number(value?.at) || 0), 0, N - 1);
	return { found: hit >= 0, at, wrong: hit >= 0 ? hit : taps.length };
}

const CSS = /* css */ `
.dn-km{position:relative;border-radius:14px;padding:8px 10px 7px;overflow:hidden;color:var(--ink);background:var(--paper);box-shadow:0 4px 0 rgba(0,0,0,.35),inset 0 0 0 2px rgba(255,255,255,.18);transition:transform .2s}
.dn-km .km-hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:5px;margin-bottom:5px;border-bottom:1.5px solid var(--rule,rgba(0,0,0,.18))}
.dn-km .km-hd b{font-family:'Lilita One';font-weight:400;font-size:15px;letter-spacing:.03em;white-space:nowrap}
.dn-km .km-hd em{font-style:normal;font-family:'Manrope';font-weight:800;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-km .km-ls{display:flex;flex-direction:column;gap:4px}
.dn-km .km-l{display:flex;align-items:flex-start;gap:7px;font-family:'Fredoka';font-weight:500;font-size:14px;line-height:1.24}
.dn-km .km-l.on{animation:kmIn .45s cubic-bezier(.25,1.4,.5,1) both}
.dn-km .km-l mark{color:inherit;background:none;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.dn-km .km-l.on.fresh mark{background:linear-gradient(90deg,var(--hl,rgba(255,210,90,.45)) 0 100%) no-repeat 0 88%/100% 38%;animation:kmHl 1.6s ease-out .2s both}
.dn-km .km-p{flex:none;min-width:14px;font-style:normal;font-family:'Manrope';font-weight:800;font-size:10px;letter-spacing:.06em;line-height:17px;opacity:.75}
.dn-km .km-l.lock{height:9px;margin:2px 0;border-radius:5px;background:var(--lk,rgba(0,0,0,.14));position:relative;overflow:hidden}
.dn-km .km-l.lock.next::after{content:'';position:absolute;inset:0;transform-origin:0 50%;background:var(--fuse,rgba(0,0,0,.25));animation:kmFuse var(--gap,3s) linear both}
.dn-km .km-ft{display:flex;align-items:center;gap:8px;margin-top:6px;font-family:'Manrope';font-weight:800;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
.dn-km .km-n b{font-family:'Lilita One';font-weight:400;font-size:13px}
.dn-km .km-st{display:flex;gap:2px}
.dn-km .km-st i{width:11px;height:11px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:#ffb800;transition:opacity .3s,transform .3s}
.dn-km .km-st i.off{opacity:.18;transform:scale(.75)}
.dn-km .km-tip{margin-left:auto;opacity:.65}
.dn-km .km-lock{position:absolute;inset:0;display:none;align-items:center;justify-content:center;gap:10px;background:rgba(170,20,10,.86);color:#fff;font-family:'Lilita One';font-size:22px;letter-spacing:.04em;backdrop-filter:blur(2px)}
.dn-km .km-lock span{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#fff;color:#c4170c;font-size:24px}
.dn-km.locked{animation:kmShake .4s}
.dn-km.locked .km-lock{display:flex;animation:flq-pop .25s}
.dn-km .km-ans{display:none;margin-top:6px;padding:5px 10px;border-radius:10px;text-align:center;font-family:'Lilita One';font-size:19px;letter-spacing:.03em;color:#3a2200;background:linear-gradient(180deg,#ffe48a,#ffc23a);box-shadow:0 3px 0 rgba(90,50,0,.5)}
.dn-km .km-ans small{display:block;font-family:'Manrope';font-weight:800;font-size:9.5px;letter-spacing:.14em;opacity:.7}
.dn-km.done .km-ans{display:block;animation:flq-pop .4s cubic-bezier(.3,1.6,.5,1)}
.dn-km.done .km-tip,.dn-km.done .km-l.lock.next::after{display:none}
@keyframes kmIn{from{opacity:0;transform:translateY(6px) scale(.97);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
@keyframes kmHl{from{background-size:0 38%}to{background-size:100% 38%}}
@keyframes kmFuse{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes kmShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

/* il konuşuyor: konuşma balonu */
.st-ben{--paper:#fffaf0;--ink:#1d2a55;--hl:rgba(255,196,60,.55);border-radius:18px 18px 18px 6px}
.st-ben .km-hd b{color:#e2553a}
.st-ben .km-l{font-weight:600}
.st-ben .km-l span::before{content:'“';color:#e2553a;font-family:'Lilita One';margin-right:2px}
/* yolcunun günlüğü: çizgili defter, kırmızı kenar çizgisi */
.st-gunluk{--paper:#f6ecd2;--ink:#33230f;--rule:rgba(160,40,40,.35);--hl:rgba(80,140,255,.22);background:linear-gradient(90deg,transparent 28px,rgba(200,60,60,.45) 28px 29.5px,transparent 29.5px),repeating-linear-gradient(180deg,#f6ecd2 0 20px,#d9cba6 20px 21px)}
.st-gunluk .km-hd b,.st-gunluk .km-l{font-family:'Cormorant Garamond';font-style:italic;font-weight:700}
.st-gunluk .km-hd b{font-size:19px;padding-left:24px}
.st-gunluk .km-l{font-size:16.5px;line-height:1.15;padding-left:24px}
.st-gunluk .km-p{position:absolute;left:6px;min-width:0;font-family:'Cormorant Garamond';font-style:italic;font-size:15px;color:#b33;line-height:19px}
.st-gunluk .km-l{position:relative}
/* gazete manşeti */
.st-manset{--paper:#f2ede2;--ink:#151515;--rule:#151515;--hl:rgba(255,220,0,.6)}
.st-manset .km-hd{flex-direction:column;align-items:center;gap:0;border-bottom:3px double #151515}
.st-manset .km-hd b{font-family:'Cormorant Garamond';font-style:italic;font-weight:700;font-size:25px;letter-spacing:.02em;line-height:1}
.st-manset .km-hd em{font-size:8.5px;opacity:.8}
.st-manset .km-l{font-family:'Lilita One';font-weight:400;font-size:13.5px;line-height:1.12;text-transform:uppercase;letter-spacing:.01em;padding-bottom:3px;border-bottom:1px solid rgba(0,0,0,.2)}
.st-manset .km-l:first-child.on{font-size:16px}
.st-manset .km-l.lock{--lk:repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 18px,transparent 18px 22px)}
/* tarihçinin notu: parşömen */
.st-tarihci{--paper:linear-gradient(160deg,#efdcae,#d8bd84);--ink:#3d2410;--rule:rgba(90,50,10,.4);--hl:rgba(170,90,20,.25);background:radial-gradient(circle at 15% 10%,rgba(255,255,255,.35),transparent 50%),linear-gradient(160deg,#efdcae,#d6b97c)}
.st-tarihci .km-hd b,.st-tarihci .km-l{font-family:'Cormorant Garamond';font-style:italic;font-weight:700}
.st-tarihci .km-hd b{font-size:19px}
.st-tarihci .km-l{font-size:16px;line-height:1.15}
.st-tarihci .km-p{font-size:14px;color:#8a2a10;line-height:16px;min-width:8px}
/* ustanın tarifi: kareli örtü */
.st-tarif{--paper:#fffdf8;--ink:#47250c;--hl:rgba(230,70,50,.25);padding-top:14px}
.st-tarif::before{content:'';position:absolute;left:0;right:0;top:0;height:7px;background:repeating-conic-gradient(#d8342a 0 25%,#fff 0 50%) 0 0/10px 10px}
.st-tarif .km-hd b{color:#c22d22}
.st-tarif .km-p{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#d8342a;color:#fff;font-size:10px;line-height:1;opacity:1}
.st-tarif .km-l.lock{--lk:repeating-linear-gradient(90deg,rgba(216,52,42,.2) 0 8px,transparent 8px 12px)}
/* bilmece: mor gece, altın dizeler */
.st-bilmece{--paper:radial-gradient(circle at 50% 0,#4a2a86,#1e0f3d);--ink:#ffe2a0;--rule:rgba(255,210,120,.35);--lk:rgba(255,220,140,.14);--fuse:rgba(255,220,140,.4);--hl:rgba(255,200,80,.25);background:radial-gradient(circle at 50% 0,#4a2a86,#1e0f3d)}
.st-bilmece .km-hd{justify-content:center;flex-direction:column;align-items:center;gap:0}
.st-bilmece .km-hd b{color:#ffd25a;letter-spacing:.12em}
.st-bilmece .km-l{justify-content:center;text-align:center;font-family:'Cormorant Garamond';font-style:italic;font-weight:700;font-size:16.5px;line-height:1.12}
/* radyo: LCD ekran */
.st-radyo{--paper:#121614;--ink:#b6ff7a;--rule:rgba(182,255,122,.3);--lk:rgba(182,255,122,.1);--fuse:rgba(182,255,122,.45);--hl:rgba(182,255,122,.18);background:linear-gradient(180deg,#1b211d,#0d110f);box-shadow:0 4px 0 rgba(0,0,0,.45),inset 0 0 0 2px #2c3a31,inset 0 0 24px rgba(120,255,80,.06)}
.st-radyo .km-hd b{font-family:ui-monospace,'DejaVu Sans Mono',monospace;font-weight:700;font-size:16px;text-shadow:0 0 8px rgba(182,255,122,.6)}
.st-radyo .km-hd b::after{content:'';display:inline-block;width:26px;height:11px;margin-left:8px;vertical-align:-1px;background:linear-gradient(90deg,#b6ff7a 0 3px,transparent 3px 5px,#b6ff7a 5px 8px,transparent 8px 10px,#b6ff7a 10px 13px,transparent 13px 15px,#b6ff7a 15px 18px,transparent 18px 20px,#b6ff7a 20px 23px,transparent 23px);animation:kmEq .5s steps(3) infinite alternate;transform-origin:50% 100%}
.st-radyo .km-l{font-family:ui-monospace,'DejaVu Sans Mono',monospace;font-weight:600;font-size:12.5px;line-height:1.3;text-shadow:0 0 6px rgba(182,255,122,.35)}
.st-radyo .km-l span::before{content:'▸ '}
@keyframes kmEq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
/* maç spikeri: çim çizgileri */
.st-spiker{--paper:#1f7a3a;--ink:#fff;--rule:rgba(255,255,255,.45);--lk:rgba(255,255,255,.18);--fuse:rgba(255,255,255,.5);--hl:rgba(255,230,0,.35);background:repeating-linear-gradient(90deg,#1f7a3a 0 34px,#25873f 34px 68px)}
.st-spiker .km-live{display:inline-block;margin-right:6px;padding:1px 5px;border-radius:4px;font-style:normal;font-size:10px;background:#e8322a;vertical-align:2px;animation:kmType 1s steps(2) infinite}
.st-spiker .km-l{font-weight:600;text-shadow:0 1px 0 rgba(0,0,0,.35)}
.st-spiker .km-p{padding:1px 5px;border-radius:5px;background:rgba(0,0,0,.4);color:#ffe14a;opacity:1;line-height:14px;margin-top:1px}
/* kartpostal: pul ve damga */
.st-kartpostal{--paper:#fbf5e6;--ink:#1d3f8f;--hl:rgba(29,63,143,.15);padding-right:58px}
.st-kartpostal::before{content:'81';position:absolute;right:10px;top:9px;width:38px;height:46px;display:grid;place-items:center;font-family:'Lilita One';font-size:17px;color:#fff;background:linear-gradient(160deg,#e85d3c,#b82d1a);outline:2px dashed #fbf5e6;outline-offset:-4px;box-shadow:0 0 0 2px #b82d1a}
.st-kartpostal::after{content:'';position:absolute;right:26px;top:36px;width:44px;height:44px;border-radius:50%;border:2px solid rgba(29,63,143,.4);box-shadow:inset 0 0 0 4px transparent,inset 0 0 0 5px rgba(29,63,143,.3);transform:rotate(-14deg)}
.st-kartpostal .km-hd{border:0}
.st-kartpostal .km-hd b,.st-kartpostal .km-l{font-family:'Cormorant Garamond';font-style:italic;font-weight:700}
.st-kartpostal .km-hd b{font-size:20px}
.st-kartpostal .km-hd em{display:none}
.st-kartpostal .km-l{font-size:16.5px;line-height:1.12}
/* emlak ilanı */
.st-emlak{--paper:#ffffff;--ink:#222;--rule:#ff7a00;--hl:rgba(255,122,0,.25)}
.st-emlak .km-hd b{color:#fff;background:#ff7a00;padding:1px 8px 2px;border-radius:6px;font-size:13.5px}
.st-emlak .km-l{font-family:'Manrope';font-weight:700;font-size:13px;line-height:1.3}
.st-emlak .km-p{color:#1a9a4a;font-size:13px;line-height:17px}
/* mesajlaşma */
.st-mesaj{--paper:#0e1a20;--ink:#e9edef;--rule:rgba(255,255,255,.12);--hl:rgba(37,211,102,.25);background:#0e1a20 radial-gradient(circle at 20% 30%,rgba(255,255,255,.03) 0 2px,transparent 3px) 0 0/22px 22px}
.st-mesaj .km-hd b::before{content:'';display:inline-block;width:18px;height:18px;margin-right:6px;vertical-align:-3px;border-radius:50%;background:linear-gradient(135deg,#25d366,#128c7e)}
.st-mesaj .km-hd em{color:#25d366;opacity:1;text-transform:none;letter-spacing:0;font-size:11px}
.st-mesaj .km-ls{align-items:flex-start;gap:5px}
.st-mesaj .km-l.on{flex-direction:row-reverse;max-width:92%;padding:4px 8px 4px 9px;border-radius:2px 11px 11px 11px;background:#202c33;font-size:13.5px}
.st-mesaj .km-l.on .km-p{align-self:flex-end;font-size:9px;opacity:.55;line-height:12px;min-width:0}
.st-mesaj .km-l.lock{display:none}
.st-mesaj .km-l.lock.next{display:flex;width:46px;height:22px;margin:0;border-radius:2px 11px 11px 11px;background:#202c33 radial-gradient(circle,#8a979e 0 2.5px,transparent 3px) 9px 50%/12px 12px repeat-x;animation:kmType 1s steps(3) infinite}
.st-mesaj .km-l.lock.next::after{display:none}
@keyframes kmType{50%{opacity:.5}}
/* dedektif dosyası: manila klasör, karartılmış satırlar */
.st-dedektif{--paper:#d9bc8c;--ink:#2a1d0f;--rule:rgba(60,30,0,.4);--lk:#1a1208;--fuse:#6b0f0f;--hl:rgba(200,0,0,.18);background:linear-gradient(170deg,#e2c89a,#cfae77)}
.st-dedektif::after{content:'GİZLİ';position:absolute;right:8px;bottom:22px;padding:0 8px;border:3px solid rgba(170,20,20,.55);border-radius:6px;font-family:'Lilita One';font-size:20px;color:rgba(170,20,20,.55);transform:rotate(-12deg);pointer-events:none}
.st-dedektif .km-hd b,.st-dedektif .km-l{font-family:ui-monospace,'DejaVu Sans Mono',monospace;font-weight:700}
.st-dedektif .km-l{font-size:12.5px;line-height:1.3}
.st-dedektif .km-p{font-size:8.5px;line-height:16px;color:#8a1010;min-width:44px}
.st-dedektif .km-l.lock{height:13px;margin:1px 0;border-radius:1px}
/* tur rehberi */
.st-rehber{--paper:linear-gradient(180deg,#fff6d6,#ffe9a6);--ink:#173a4a;--rule:rgba(23,58,74,.25);--hl:rgba(0,150,170,.2);background:linear-gradient(180deg,#fff6d6,#ffe9a6)}
.st-rehber .km-hd b{color:#0f7d8c}
.st-rehber .km-l{font-weight:600}
.st-rehber .km-l span::before{content:'🎤 ';font-size:11px}
/* navigasyon */
.st-navigasyon{--paper:#0b1726;--ink:#e8f2ff;--rule:rgba(57,160,255,.35);--lk:rgba(57,160,255,.12);--fuse:rgba(57,160,255,.5);--hl:rgba(57,160,255,.25);background:linear-gradient(180deg,#10223a,#0a1422)}
.st-navigasyon .km-hd b{color:#39a0ff}
.st-navigasyon .km-l{font-family:'Manrope';font-weight:700;font-size:13px;line-height:1.3}
.st-navigasyon .km-p{min-width:52px;padding:1px 5px;border-radius:6px;text-align:center;background:#39a0ff;color:#fff;opacity:1;font-size:9.5px;line-height:15px}
.st-navigasyon .km-l:last-child .km-p{background:#25c46b}
/* masal: kitap sayfası */
.st-masal{--paper:#fbf3e0;--ink:#3b1f3a;--rule:rgba(120,60,110,.3);--hl:rgba(200,120,190,.22);box-shadow:0 4px 0 rgba(0,0,0,.35),inset 0 0 0 3px #fbf3e0,inset 0 0 0 4.5px #a8739e}
.st-masal .km-hd b,.st-masal .km-l{font-family:'Cormorant Garamond';font-style:italic;font-weight:700}
.st-masal .km-hd b{font-size:19px;color:#7a2f72}
.st-masal .km-l{font-size:16px;line-height:1.14}
.st-masal .km-l:first-child.on span::first-letter{font-size:26px;line-height:.8;color:#7a2f72}
`;

/** İpucu satırı (açık ya da kilitli). */
function lineHTML(st, v, k, open) {
	if (!open) return `<div class="km-l lock" data-k="${k}"></div>`;
	const pre = st.pre?.(k);
	return `<div class="km-l on" data-k="${k}">${pre != null ? `<i class="km-p">${esc(pre)}</i>` : ''}<span><mark>${esc(v.clues[k] || '…')}</mark></span></div>`;
}

export const kimim = {
	time: 24,
	label: 'Kimim Ben?',
	kind: 'exact',
	needsMap: true,
	jokers: ['yari', 'kahin'],
	fmt(v, value) {
		const r = result(v, value);
		return r.found ? `${r.at + 1}. ipucunda` : '—';
	},
	sub(v, value) {
		const r = result(v, value);
		return r.found ? (r.wrong ? `${r.wrong} yanlıştan sonra` : 'ilk dokunuşta') : 'bilemedi';
	},
	prepare(q) {
		const style = STYLES[q.style] ? q.style : 'ben';
		const v = { q: { ...q, q: q.q || STYLES[style].q }, hedef: BY_ID.get(q.il), style, clues: (q.clues || []).slice(0, N), gap: GAP };
		return stamp(v, v.q, (q2, k, P, text) => {
			// yavaş-rahat oyuncu dördüncü ipucunu bekler, hepsini okur, bir yanlışa (kilit) düşebilir
			// (ipucu açılırken okunur: bekleme ile okuma örtüşür, bu yüzden yalnız son açılanın okuması eklenir)
			text((q2.clues || [])[3] || '');
			return {
				wait: 0.5 + GAP * 3,
				look: LOOK.orient + LOOK.map,
				act: ACT.mapTap * 1.5 + LOCK * 0.25,
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('kimim', CSS);
		const app = appOf();
		const st = STYLES[v.style] || STYLES.ben;
		let shown = 1;
		el.innerHTML = `<div class="dn-km st-${v.style}" style="--gap:${v.gap || GAP}s">
			<div class="km-hd">${st.head}</div>
			<div class="km-ls">${v.clues.map((_, k) => lineHTML(st, v, k, k < shown)).join('')}</div>
			<div class="km-ft"><span class="km-n">İPUCU <b>1</b>/${N}</span><span class="km-st">${'<i></i>'.repeat(N)}</span><span class="km-tip">bildiğin an ile dokun</span></div>
			<div class="km-ans"></div>
			<div class="km-lock"><b>YANLIŞ İL!</b><span>${LOCK}</span></div>
		</div>`;
		rule(el, 'Erken bilen kazanır');
		const root = el.querySelector('.dn-km');
		const ls = root.querySelector('.km-ls');
		const nEl = root.querySelector('.km-n b');
		const stars = [...root.querySelectorAll('.km-st i')];
		const lockEl = root.querySelector('.km-lock span');
		const taps = [];
		let done = false;
		let locked = false;
		let started = false;
		const timers = [];
		const mark = () => {
			ls.querySelectorAll('.km-l.next').forEach((e) => e.classList.remove('next'));
			if (started && !done) ls.querySelector(`.km-l.lock[data-k="${shown}"]`)?.classList.add('next');
			nEl.textContent = String(shown);
			stars.forEach((s, k) => s.classList.toggle('off', k >= N - shown + 1));
		};
		const open = (k, fresh = true) => {
			const cur = ls.querySelector(`.km-l[data-k="${k}"]`);
			if (!cur || cur.classList.contains('on')) return;
			if (!v.clues[k]) return; // çevrimiçi: metin sunucudan henüz gelmedi
			cur.outerHTML = lineHTML(st, v, k, true);
			if (fresh) ls.querySelector(`.km-l[data-k="${k}"]`)?.classList.add('fresh');
			if (!done) shown = Math.max(shown, k + 1);
			mark();
			if (fresh && !done) sfx(app, 'tick');
		};
		const finish = () => {
			if (done) return;
			done = true;
			for (const t of timers) clearTimeout(t);
			root.classList.add('done');
			api.answer({ taps: taps.slice(), at: shown - 1 });
		};
		const stopOpen = onOpen(el, () => {
			started = true;
			mark();
			for (let k = 1; k < N; k++) timers.push(setTimeout(() => !done && open(k), (v.gap || GAP) * 1000 * k));
		});
		const ctlBase = {
			lock() {
				done = true;
				for (const t of timers) clearTimeout(t);
				root.classList.add('done');
			},
			value: () => ({ taps: taps.slice(), at: shown - 1 }),
			/** Çevrimiçi: sunucudan gelen ipucu. */
			ipucu(k, text) {
				v.clues[k] = String(text || '');
				open(k);
			},
		};
		if (!app) return { ...ctlBase, reveal() {}, destroy: stopOpen };
		const b = app.board;
		const g = guard(app);
		g.allActive();
		const lit = [];
		g.dark(lit); // karanlık harita: sahip renkleri gizli; yalnız denenen iller ışıkta
		queueMicrotask(() => {
			if (!el.isConnected) return;
			app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.02, pad: 1.03, top: cardTop(el), dur: 0.7 });
		});
		const unlock = (n) => {
			lockEl.textContent = String(n);
			if (n <= 0) {
				locked = false;
				root.classList.remove('locked');
				return;
			}
			timers.push(setTimeout(() => unlock(n - 1), 1000));
		};
		api.onMapTap((pt) => {
			if (done || locked || !started) return;
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return;
			const p = b.provinces[i];
			taps.push(p.id);
			lit.push(i);
			g.dark(lit);
			if (i === v.hedef) {
				g.paint(i, '#ffd25a', pt.x, pt.z);
				g.fx(i, 0.6, 1);
				tag(app, `<b>${esc(p.name)}</b><em>✓</em>`, p.x, p.z, 'big').el.style.setProperty('--tc', '#7dff9a');
				pop(app, p.x, p.z, `${shown}. İPUCUNDA!`, { colors: ['#ffd25a', '#7dff9a', '#fff'], n: 22 - shown * 2, dist: 90, cls: 'dn dn-gold' });
				sfx(app, 'right');
				buzz(14);
				return finish();
			}
			// yanlış: il kızarır, 2 sn kilit
			g.paint(i, '#c8322a', pt.x, pt.z);
			g.fx(i, 0.15, 0);
			tapX(app, p.x, p.z);
			tag(app, `<b>${esc(p.name)}</b><em>✗</em>`, p.x, p.z).el.style.setProperty('--tc', '#ff5a4a');
			sfx(app, 'wrong');
			buzz(30);
			locked = true;
			root.classList.remove('locked');
			void root.offsetWidth;
			root.classList.add('locked');
			unlock(LOCK);
		});
		const close = onClose(el, () => g.restore());
		return {
			...ctlBase,
			joker(e) {
				if (e?.zone) {
					for (const i of e.zone) g.fx(i, 0.15, 1);
					g.dark([...lit, ...e.zone]);
					app.ui.toast?.(e.text, { tone: 'good', ms: 2200 });
				}
			},
			reveal(results) {
				ctlBase.lock();
				for (let k = 0; k < N; k++) open(k, false);
				const t = b.provinces[v.hedef];
				root.querySelector('.km-ans').innerHTML = `<small>${REGION[t.region] || ''} · ${String(t.id).padStart(2, '0')}</small>${esc(t.name)}`;
				if (!lit.includes(v.hedef)) {
					lit.push(v.hedef);
					g.dark(lit);
					g.paint(v.hedef, '#ffd25a', t.x, t.z);
					g.fx(v.hedef, 0.6, 1);
					tag(app, `<b>${esc(t.name)}</b>`, t.x, t.z, 'big').el.style.setProperty('--tc', '#ffd25a');
				}
				// sinematik son: Türkiye genel bakışından gizli ile alçalarak yaklaşır ve yavaşça etrafında döner
				const top = cardTop(el);
				app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.0, pad: 1.05, top, dur: 0.8, arc: 3 });
				const tb = app.boundsOf([v.hedef]);
				const size = Math.max(tb.x1 - tb.x0, tb.z1 - tb.z0);
				setTimeout(() => {
					if (!el.isConnected) return;
					app.cam.shot(t.x, t.z, { dist: size * 2.1 + 9, pitch: 0.6, yaw: app.cam.yaw + 0.35, dur: 1.8, arc: 5, yawRate: 0.045, distRate: -0.015, decay: 0.2, lens: top / 2 });
					pop(app, t.x, t.z, '', { colors: ['#ffd25a', '#fff'], n: 16, dist: 70 });
				}, 950);
				const meR = results.find((r) => r.p?.human);
				if (meR) {
					const r = result(v, meR.value);
					const order = results.slice().sort((a, b2) => (a.correct !== b2.correct ? (a.correct ? -1 : 1) : a.time - b2.time));
					const win = order[0] === meR && meR.correct;
					if (r.found) stampLater(app, `${r.at + 1}. İPUCUNDA!`, win ? 'gold' : 'bad', win ? `${t.name}, en hızlı sen bildin` : `${order[0].name} daha erken bildi`);
					else stampLater(app, 'BİLEMEDİN', 'bad', `Gizli il: ${t.name}`);
				}
			},
			destroy() {
				stopOpen();
				close();
			},
		};
	},
	joker(id, v, R) {
		const t = PROV[v.hedef];
		if (id === 'yari') {
			const zone = PROV.map((p, i) => (p.region === t.region ? i : -1)).filter((i) => i >= 0);
			return { zone, text: `Gizli il ${REGION[t.region] || ''} Bölgesi'nde` };
		}
		if (id === 'kahin') {
			// seyirci üç il gösterir: biri doğru, ikisi başka bölgelerden
			const others = PROV.map((p, i) => (p.region !== t.region ? i : -1)).filter((i) => i >= 0);
			const a = others[Math.floor(R() * others.length)];
			let c = others[Math.floor(R() * others.length)];
			if (c === a) c = others[(others.indexOf(a) + 7) % others.length];
			return { zone: [v.hedef, a, c].sort((x, y) => x - y), text: 'Seyirci üç ilde ikiye bölündü: biri doğru' };
		}
		return null;
	},
	/** Çevrimiçi görünüm: gizli il sunucuda; ipuçlarından yalnız ilki gider, sonrakiler zamanla gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.hedef;
		delete o.q.il;
		delete o.q.clues;
		o.clues = o.clues.map((c, k) => (k ? '' : c));
		return o;
	},
	judge(v, value) {
		const r = result(v, value);
		if (r.found) return { correct: true, err: r.at + r.wrong * 0.25, ipucu: r.at + 1 };
		return { correct: false, err: 9 + r.wrong * 0.01 };
	},
	/** Sınama yardımcısı: bir doğru ve bir yanlış örnek cevap (test/deneme.test.mjs genel dalı için). */
	sinama(v) {
		const id = PROV[v.hedef].id;
		return { good: { taps: [id], at: 1 }, bad: { taps: [id === 6 ? 34 : 6], at: 4 } };
	},
	bot(v, skill, R) {
		// her bot bir ipucunda "jeton düşer": usta erken, acemi geç; hiç düşmezse son ipucunda tahmin eder
		const p = clamp(pCorrect(skill, v.q.diff) + 0.08, 0.1, 0.95);
		const W = [0.12, 0.28, 0.5, 0.78, 1];
		const u = R();
		let k = W.findIndex((w) => u < p * w);
		const knows = k >= 0;
		if (!knows) k = N - 1;
		const gap = v.gap || GAP;
		const taps = [];
		let time = k * gap + 1.1 + R() * 2.4 * (1.25 - skill * 0.6);
		// bilmeyen bir yanlışa düşer (2 sn kilit), sonra ya tutturur ya da yine yanılır
		if (!knows || R() < 0.15 * (1 - skill)) {
			const wrong = PROV.map((_, i) => i).filter((i) => i !== v.hedef);
			taps.push(PROV[wrong[Math.floor(R() * wrong.length)]].id);
			time += LOCK + 0.8;
		}
		if (knows || R() < 0.12) taps.push(PROV[v.hedef].id);
		time = clamp(time, 1, Math.max(1, (v.sec || 20) - 0.6));
		const at = clamp(Math.floor(time / gap), 0, N - 1);
		return { value: { taps, at }, time };
	},
};

// ---------------------------------------------------------------- örnek sorular
// 15 il, her biri başka bir anlatıcı tarzında. İpuçları zordan kolaya; il adı ya da plaka hiçbir ipucunda geçmez.
// Doğrulama (kaynaklar commit raporunda): Kültür ve Turizm Bakanlığı il sayfaları ve UNESCO Dünya Mirası listesi
// (Çatalhöyük 2012, Bursa-Cumalıkızık 2014, Ani 2016, Göbeklitepe 2018, Efes 2015), TÜİK yüzölçümü, MGM yağış
// istatistikleri, UNESCO Yaratıcı Şehirler Ağı (Gaziantep 2015), AB coğrafi işaret tescili (Antep baklavası 2013).
const KM = (id, diff, il, style, clues) => ({ id, cat: 'cografya', diff, type: 'kimim', q: STYLES[style].q, il, style, clues });

export const KIMIM_SAMPLES = [
	KM('dn-km1', 2, 42, 'ben', [
		'Dokuz bin yıllık komşularım var: Çatalhöyük benim ovamda. Yaşımı sormayın.',
		'Tuz Gölü’nü komşularımla paylaşırım. Tuzu kuru bir ilim yani.',
		'Etliekmeğim kol boyu uzar, sofraya sığmaz; bıçak arası da benden sorulur.',
		'Yüzölçümünde Türkiye’nin en büyüğüyüm ama hiç böbürlenmem.',
		'Mevlânâ bende yatar; her aralıkta semazenlerim döner.',
	]),
	KM('dn-km2', 2, 36, 'gunluk', [
		'Rus döneminden kalma Baltık üslubu taş binaların arasında yürüdüm.',
		'Sınırdaki Ani Ören Yeri’nde “bin bir kilise”nin yıkıntılarına baktım.',
		'Orhan Pamuk’un Kar romanındaki sokakları aradım; kar da yağdı üstelik.',
		'Kahvaltıda gravyer peyniri, akşam yemeğinde kaz eti.',
		'Ankara’dan bindiğim Doğu Ekspresi’nin son durağı burası; bir günden uzun sürdü!',
	]),
	KM('dn-km3', 2, 22, 'manset', [
		'Sınır kentinde iki komşu kapısı: Yunanistan ve Bulgaristan aynı gün ziyarette',
		'500 yılı aşkın darüşşifada müzikle tedavi sergisi açıldı',
		'Tava ciğer kuyruğu köprüye dayandı',
		'Sinan’ın “ustalık eserim” dediği camiye ziyaretçi akını',
		'Kırkpınar’da altın kemer sahibini buldu: er meydanı coştu',
	]),
	KM('dn-km4', 2, 16, 'tarihci', [
		'Cumalıkızık köyü, 2014’te “Osmanlı’nın doğuşu” başlığıyla UNESCO Dünya Mirası oldu.',
		'Yeşil Türbe’nin firuze çinileri Çelebi Mehmed’in sandukasını örter.',
		'Rivayete göre Karagöz ile Hacivat’ın hikâyesi buradaki bir cami inşaatında başlar ve biter.',
		'Osman Gazi ile Orhan Gazi’nin türbeleri buradadır: Osmanlı’nın ilk başkenti.',
		'Uludağ’ın eteğinde, tereyağlı ve yoğurtlu İskender kebabın doğduğu şehir.',
	]),
	KM('dn-km5', 2, 27, 'tarif', [
		'Gastronomide UNESCO Yaratıcı Şehirler Ağı’na 2015’te giren ilk Türk şehrinin mutfağına hoş geldin.',
		'Tabağı, Zeugma’dan çıkan Çingene Kızı mozaiğinin bakışları altında hazırla.',
		'Menüde yuvalama, beyran ve alinazik var: sabır şart.',
		'Yeşil fıstığı ince döv; dünya onu bu şehrin adıyla anar.',
		'Son adım: AB tescilli baklavanı şerbetle ve kaymakla servis et.',
	]),
	KM('dn-km6', 2, 17, 'bilmece', [
		'Türkiye’nin en büyük adası Gökçeada bana bağlanır,',
		'Assos’un sütunları Ege’ye karşı uzanır,',
		'Homeros’un Truva’sı toprağımda saklanır,',
		'İki kıtaya yayılırım, ortamdan bir boğaz akar,',
		'On Sekiz Mart’ta “geçilmez” denen zafer benden çıkar.',
	]),
	KM('dn-km7', 3, 53, 'radyo', [
		'Fırtına Deresi’nin taş kemer köprülerinden canlı bağlantı: dere coşkun akıyor.',
		'Zil Kale’nin burçlarında sis var, görüş mesafesi on metre.',
		'Ayder Yaylası’nda bulutlar yaylanın altından geçiyor.',
		'Türkiye’nin en çok yağış alan ilinde şemsiyesiz çıkmayın!',
		'Yamaçlardaki çay bahçelerinde ilk hasat başladı; demlikler ocağa!',
	]),
	KM('dn-km8', 2, 61, 'spiker', [
		'Kanuni Sultan Süleyman’ın doğduğu şehirde düdük çaldı!',
		'Sümela Manastırı’nın yamaçlarından gelen taraftarlar da tribünde!',
		'Devre arası yaklaşırken Akçaabat köftesinin kokusu stadı sardı!',
		'Uzungöl kadar sakin bir maç… değil, sayın seyirciler!',
		'Bordo-mavililer 2022’deki şampiyonluğu hatırlatıyor, tribünler ayakta!',
	]),
	KM('dn-km9', 1, 50, 'kartpostal', [
		'Bugün Hacı Bektaş-ı Veli Dergâhı’nı gezdik, çok huzurlu bir yer.',
		'Derinkuyu’da kat kat yerin altına indik; burada bütün bir şehir saklanmış!',
		'Avanos’ta çömlek çarkında kendi vazomu yaptım (biraz eğri oldu).',
		'Göreme’de peri bacalarının arasında kalıyoruz, otelimiz bir mağara!',
		'Sabah gün doğarken gökyüzü yüzlerce sıcak hava balonuyla doldu.',
	]),
	KM('dn-km10', 1, 35, 'emlak', [
		'Meydanında 1901’den beri çalışan saat kulesine yürüme mesafesinde.',
		'Efes Antik Kenti il sınırları içinde, hafta sonu gezisine birebir.',
		'Kemeraltı Çarşısı’na komşu: alışveriş ayağınızın altında.',
		'Kahvaltıda boyoz, sokakta “gevrek” (sakın simit demeyin).',
		'Kordon’da gün batımı manzaralı: Ege’nin incisi!',
	]),
	KM('dn-km11', 1, 6, 'mesaj', [
		'Augustus Tapınağı’nın duvarındaki Res Gestae yazıtını gördüm, çok etkilendim',
		'Akşam Mogan Gölü kıyısında yürüdük',
		'Hacı Bayram Veli Camii’nin önünden geçtik, kalabalıktı',
		'Tiftiğiyle ünlü o keçinin adı da bu şehirden geliyormuş!',
		'Anıtkabir’de nöbet değişimini izledik, tüylerim diken diken!',
	]),
	KM('dn-km12', 2, 65, 'dedektif', [
		'Şüpheli en son, bir adadaki 10. yüzyıldan kalma Akdamar Kilisesi’nde görüldü.',
		'Ses kaydında Muradiye Şelalesi’nin uğultusu duyuluyor.',
		'Ayak izleri Türkiye’nin en büyük gölünün sodalı kıyısında bitiyor.',
		'Olay yerinde yarım kalmış bir kahvaltı: otlu peynir ve murtuğa.',
		'Tek tanık: bir gözü mavi, bir gözü yeşil, beyaz bir kedi.',
	]),
	KM('dn-km13', 2, 63, 'rehber', [
		'İlk durağımız Halfeti: dünyada eşi az bulunan kara güllerin evi.',
		'Sağınızda Harran’ın külah çatılı kümbet evleri.',
		'On iki bin yıla yakın yaşıyla bilinen en eski anıtsal tapınak Göbeklitepe bu ilde.',
		'Akşam sıra gecesinde isotlu çiğ köfte yoğuracağız.',
		'Ve Balıklıgöl: Hz. İbrahim’in ateşe atıldığı yer olarak anılır.',
	]),
	KM('dn-km14', 2, 57, 'navigasyon', [
		'Filozof Diyojen’in doğduğu kente yaklaşıyorsunuz.',
		'Sağda Hamsilos Koyu: Türkiye’nin fiyordu diye anılır.',
		'Tarihi cezaevi müzesini geçin; Sabahattin Ali “Aldırma Gönül”ü burada yazdı.',
		'Bir yanınız Samsun, bir yanınız Kastamonu. Karadeniz kıyısını izleyin.',
		'Türkiye’nin en kuzey ucu İnceburun’a vardınız.',
	]),
	KM('dn-km15', 2, 25, 'masal', [
		'Bir varmış bir yokmuş; Tortum Şelalesi’nin köpüklü sularının ötesinde bir şehir varmış.',
		'Oltu’dan çıkan kara taştan tespihler yontarlarmış.',
		'Temmuz 1919’da doğu illeri adına bir kongre toplanmış.',
		'Ocak başında yatay şişte cağ kebabı dönermiş.',
		'Palandöken’in karlı yamaçlarında dadaşlar kayak yaparmış.',
	]),
];
