// YILDIRIM TURU: kısa sürede olabildiğince çok "doğru mu yanlış mı" bil. Tur süresi ifadelerin uzunluğuna göre
// 10–18 sn (timing.js: ortalama bir oyuncu ~7 ifade okuyup cevaplayabilsin).
// Veri: items: [{t, ans}, ×12..16]  (t kısa ifade, ans true/false). Her oyunda karıştırılır.
// Değer: { score, n }  (score = doğru sayısı, n = cevaplanan ifade sayısı).
//
// SIRALAMA: tür 'closest'. judge → err = −score; yani çok doğru yapan önde. Eşitlikte `time` (daha erken
// bitiren) belirler. İnsan süre dolunca otomatik gönderilir (arayüz value() ile skoru okur, time = süre);
// botlar süre sonunda bitirmiş sayılır. correct = skor en az 5.
// Yanlış cevap 0.6 sn'lik bir kilitlenme getirir (rastgele basarak puan toplanmasın).
// ÇEVRİMİÇİ: ifadelerin doğrusu istemciye gitmez; her basış sunucuya gider (act 'bz'), yargı, sayım ve ceza kilidi
// sunucudadır (game/sunucu.js ADIM.blitz); son değer sunucunun saydığıdır.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { secOf } from './timing.js';
import { setTimeout } from '../core/clock.js';
import { playSfx as snd } from './appref.js';

const CSS = /* css */ `
/* YILDIRIM (Arena v1 siyah/beyaz): üstte skor + ilerleme çentikleri + SERİ; ortada deste (önde ifade kartı, arkada iki
   gölge kart); altta HÜKÜM levhası (tf ile aynı). Cevapta kart, basılan yöne (DOĞRU sola, YANLIŞ sağa) mühürlenip
   fırlar; sıradaki kart desteden öne çıkar. Yanlışta levhada 0,6 sn'lik ceza çubuğu erir. Sonda KARNE. */
.fl-q.bz .fl-qtext,.fl-q:has(.fl-bz2) .fl-qtext{display:none}
.fl-bz2{display:flex;flex-direction:column;gap:12px}
.fl-bz2 .hud{display:flex;align-items:center;gap:12px;min-height:44px}
.fl-bz2 .sc{display:flex;align-items:baseline;gap:6px;flex:none}
.fl-bz2 .sc b{font:400 44px/1 'Lilita One',sans-serif;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35);transition:transform .16s cubic-bezier(.3,1.8,.5,1)}
.fl-bz2 .sc b.pop{transform:scale(1.3);color:#7dff9a}
.fl-bz2 .sc small{font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.22em;color:rgba(255,255,255,.7)}
.fl-bz2 .pp{flex:1;min-width:0;display:flex;gap:3px}
.fl-bz2 .pp i{flex:1;height:8px;transform:skewX(-18deg);background:rgba(255,255,255,.14);transition:background .2s}
.fl-bz2 .pp i.cur{background:#fff;box-shadow:0 0 8px rgba(255,255,255,.6)}
.fl-bz2 .pp i.y{background:#3ad06e}
.fl-bz2 .pp i.n{background:#ff5a46}
.fl-bz2 .cb{flex:none;display:flex;align-items:center;gap:3px;padding:4px 9px 4px 6px;background:#ffd25a;color:#1a1200;transform:skewX(-10deg) scale(.6);opacity:0;
  font:400 17px/1 'Lilita One',sans-serif;box-shadow:0 3px 0 rgba(0,0,0,.3);transition:opacity .18s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.fl-bz2 .cb svg{width:16px;height:16px;fill:#1a1200}
.fl-bz2 .cb.on{opacity:1;transform:skewX(-10deg)}
.fl-bz2 .cb.up{animation:flBzUp .3s cubic-bezier(.3,1.8,.5,1)}
/* deste */
.fl-bz2 .dk{position:relative;margin-bottom:10px}
.fl-bz2 .dk::before,.fl-bz2 .dk::after{content:'';position:absolute;left:12px;right:12px;bottom:-6px;height:20px;background:#12162a;border-left:5px solid rgba(255,255,255,.18);z-index:-1}
.fl-bz2 .dk::after{left:24px;right:24px;bottom:-12px;background:#0c1020;z-index:-2}
.fl-bz2 .cd{position:relative;isolation:isolate;overflow:hidden;min-height:112px;padding:11px 16px 14px;border-left:5px solid var(--cc,#fff);
  background:linear-gradient(180deg,#171c35,#0d1124);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%);display:flex;flex-direction:column}
.fl-bz2 .ey{display:flex;align-items:center;gap:8px;margin-bottom:6px;font:italic 800 12px/1.25 'Barlow Condensed',sans-serif;letter-spacing:.24em;color:var(--cc,#fff);text-transform:uppercase}
.fl-bz2 .ey::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.25),transparent)}
.fl-bz2 .ey em{order:2;font-style:normal;color:rgba(255,255,255,.6);letter-spacing:.12em}
.fl-bz2 .cd p{flex:1;display:flex;align-items:center;margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:22px;line-height:1.2;color:#fff;text-wrap:balance}
.fl-bz2 .cd.lg p{font-size:19.5px}
.fl-bz2 .cd.in{animation:flBzIn .26s cubic-bezier(.2,.9,.3,1)}
.fl-bz2 .fly{position:absolute;inset:0;z-index:3;pointer-events:none;animation:flBzOut .42s cubic-bezier(.5,0,.75,0) forwards}
.fl-bz2 .fly.r{animation-name:flBzOutR}
.fl-bz2 .fly .cd{height:100%}
.fl-bz2 .fly .st{position:absolute;top:50%;left:50%;display:flex;align-items:center;gap:6px;padding:5px 12px;border:3px solid currentColor;
  font:italic 800 26px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;transform:translate(-50%,-50%) rotate(-9deg);background:rgba(7,8,15,.82)}
.fl-bz2 .fly.ok .st{color:#4fe07e}
.fl-bz2 .fly.no .st{color:#ff6a56}
.fl-bz2 .fly .st svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.fl-bz2 .fly.ok .cd{border-left-color:#4fe07e}
.fl-bz2 .fly.no .cd{border-left-color:#ff6a56}
.fl-bz2 .cd.end p{font-size:20px;color:rgba(255,255,255,.85)}
/* levha + ceza */
.fl-bz2 .fl-tf.vd{position:relative;height:80px}
/* dar kartta yazı ve simge kartın enine göre küçülür (406 px ve üstünde 30 px, eskisi gibi): 320 px'te 30 px "YANLIŞ"
   yarı levhaya sığmayıp ortasından bölünüyordu ("YANLI / Ş"), "DOĞRU" dikişteki "YA DA" rozetinin altına giriyordu */
.fl-q .fl-bz2 .fl-tf.vd .fl-opt{font-size:clamp(22px,7.4cqw,30px);gap:clamp(6px,2.4cqw,10px)}
.fl-bz2 .fl-tf.vd .ic{width:clamp(28px,9.4cqw,38px);height:clamp(28px,9.4cqw,38px)}
.fl-bz2 .fl-tfmid b{bottom:3px}
.fl-bz2 .cz{position:absolute;left:0;right:0;bottom:-8px;height:4px;background:#ff5a46;transform-origin:left;transform:scaleX(0);z-index:3}
.fl-bz2.lock .cz{animation:flBzCz .6s linear forwards}
.fl-bz2.lock .fl-tf .fl-opt{filter:grayscale(.8) brightness(.5);pointer-events:none}
/* KARNE */
.fl-bz2 .kr{display:flex;flex-direction:column;gap:8px}
.fl-bz2 .kh{display:flex;align-items:center;gap:12px;padding:10px 14px;border-left:5px solid var(--cc,#fff);background:linear-gradient(180deg,#171c35,#0d1124);
  clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);animation:flBzIn .35s both}
.fl-bz2 .kh>b{font:400 46px/1 'Lilita One',sans-serif;color:#fff}
.fl-bz2 .kh strong{display:block;font:italic 800 18px/1.05 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#fff}
.fl-bz2 .kh small{display:block;margin-top:3px;font:600 12.5px/1.2 'Fredoka',sans-serif;color:rgba(255,255,255,.65)}
.fl-bz2 .kh .ac{margin-left:auto;padding:5px 10px;background:#fff;color:#0d1124;font:400 20px/1 'Lilita One',sans-serif;transform:skewX(-8deg);box-shadow:0 3px 0 rgba(0,0,0,.3)}
.fl-bz2 .kt{display:grid;grid-template-columns:26px 1fr auto;gap:8px;padding:0 10px;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.5)}
.fl-bz2 .kl{display:flex;flex-direction:column;gap:3px}
.fl-bz2 .kr-r{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center;padding:5px 10px;background:rgba(255,255,255,.06);
  animation:flBzRow .3s both;animation-delay:calc(.15s + var(--i) * .06s)}
.fl-bz2 .kr-r.no{background:rgba(255,90,70,.16)}
.fl-bz2 .kr-r i{width:22px;height:22px;display:grid;place-items:center;background:#3ad06e;transform:skewX(-8deg)}
.fl-bz2 .kr-r.no i{background:#ff5a46}
.fl-bz2 .kr-r i svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.fl-bz2 .kr-r p{margin:0;min-width:0;font:600 13.5px/1.2 'Fredoka',sans-serif;color:#fff}
.fl-bz2 .kr-r em{font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;padding:3px 6px;border:1.5px solid rgba(255,255,255,.55);color:#fff;font-style:normal}
.fl-bz2 .kr-r em.f{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.7)}
.fl-bz2 .km{text-align:center;font:600 12px/1 'Fredoka',sans-serif;color:rgba(255,255,255,.5)}
.fl-bz2 .ks{display:flex;flex-direction:column;gap:5px;margin-top:2px}
.fl-bz2 .ks div{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:700 14px/1 'Fredoka',sans-serif;color:#fff}
.fl-bz2 .ks span{display:flex;align-items:center;gap:6px;min-width:64px}
.fl-bz2 .ks span::before{content:'';width:12px;height:12px;background:var(--pc);transform:skewX(-10deg)}
.fl-bz2 .ks u{position:relative;height:10px;background:rgba(255,255,255,.1);transform:skewX(-18deg);overflow:hidden;text-decoration:none}
.fl-bz2 .ks u::after{content:'';position:absolute;inset:0;background:var(--pc);transform-origin:left;transform:scaleX(var(--w));animation:flBzBar .7s .35s cubic-bezier(.2,.9,.3,1) both}
.fl-bz2 .ks b{font:400 16px/1 'Lilita One',sans-serif;min-width:5.6em;text-align:right}
.fl-bz2 .ks div.top b{color:#ffd25a}
/* sinematik katman: açılışta deste dağıtılır + şimşek çakar; cevapta parlama; yanlışta sarsıntı; seri 3+ altın parıltı,
   her 3 seride bir yeniden şimşek; son saniyelerde kart kırmızı nefes alır; karnede skor sayarak gelir. Hepsi transform/opacity. */
.fl-bz2 .dk{animation:flBzDeal .5s cubic-bezier(.2,.9,.3,1.1) both}
.fl-bz2 .dk::before{animation:flBzGhost .4s .12s both}
.fl-bz2 .dk::after{animation:flBzGhost .4s .2s both}
.fl-bz2 .fx{position:absolute;inset:-8px -6px;z-index:4;pointer-events:none;opacity:0}
.fl-bz2 .fx.ok{background:radial-gradient(ellipse at 50% 50%,rgba(79,224,126,.55),rgba(79,224,126,0) 70%);animation:flBzFx .38s ease-out}
.fl-bz2 .fx.no{background:radial-gradient(ellipse at 50% 50%,rgba(255,90,70,.6),rgba(255,90,70,0) 70%);animation:flBzFx .42s ease-out}
.fl-bz2 .dk.shk .cd{animation:flBzShk .34s cubic-bezier(.36,.07,.19,.97)}
.fl-bz2 .zap{position:absolute;left:-4%;top:8%;width:108%;height:84%;z-index:5;pointer-events:none;overflow:visible;opacity:0}
.fl-bz2 .zap polyline{fill:none;stroke:#fff;stroke-width:2.6;stroke-linejoin:miter;stroke-dasharray:260;stroke-dashoffset:260;vector-effect:non-scaling-stroke}
.fl-bz2 .zap polyline+polyline{stroke:#ffd25a;stroke-width:7;opacity:.45}
.fl-bz2 .zap.go{animation:flBzZapO .55s ease-out}
.fl-bz2 .zap.go polyline{animation:flBzZap .45s cubic-bezier(.6,0,.3,1) forwards}
.fl-bz2 .dk.c3 .cd{border-left-color:#ffd25a}
.fl-bz2 .dk.c3 .ey span{color:#ffd25a}
.fl-bz2 .dk.c3 .cd::after{content:'';position:absolute;top:0;bottom:0;left:0;width:45%;z-index:-1;background:linear-gradient(100deg,transparent,rgba(255,210,90,.16) 50%,transparent);
  animation:flBzSheen 1.6s linear infinite}
.fl-q.hot .fl-bz2 .cd::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(255,70,50,.28),transparent 60%);animation:flBzBreath .8s ease-in-out infinite alternate}
.fl-bz2 .kh>b.cnt{display:inline-block;animation:flBzPunch .45s cubic-bezier(.3,1.8,.5,1) both}
.fl-bz2 .kh{position:relative;overflow:hidden}
.fl-bz2 .kh::after{content:'';position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.22) 50%,transparent);transform:translateX(-120%);animation:flBzGlint .8s .9s ease-out forwards}
@keyframes flBzDeal{from{opacity:0;transform:translateY(46px) rotate(-5deg) scale(.9)}to{opacity:1;transform:none}}
@keyframes flBzGhost{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
@keyframes flBzFx{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
@keyframes flBzShk{0%,100%{transform:none}20%{transform:translateX(-9px) rotate(-1deg)}40%{transform:translateX(8px) rotate(.8deg)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
@keyframes flBzZap{to{stroke-dashoffset:-260}}
@keyframes flBzZapO{0%{opacity:0}12%{opacity:1}70%{opacity:1}100%{opacity:0}}
@keyframes flBzSheen{from{transform:translateX(-120%)}to{transform:translateX(260%)}}
@keyframes flBzBreath{from{opacity:.25}to{opacity:1}}
@keyframes flBzPunch{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.25);opacity:1}100%{transform:none}}
@keyframes flBzGlint{to{transform:translateX(320%)}}
@media (prefers-reduced-motion:reduce){.fl-bz2 .zap,.fl-bz2 .dk.c3 .cd::after,.fl-q.hot .fl-bz2 .cd::before{display:none}}
@keyframes flBzIn{from{opacity:.2;transform:translateY(10px) scale(.95)}to{opacity:1;transform:none}}
@keyframes flBzOut{to{transform:translateX(-115%) rotate(-10deg);opacity:0}}
@keyframes flBzOutR{to{transform:translateX(115%) rotate(10deg);opacity:0}}
@keyframes flBzCz{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes flBzUp{50%{transform:skewX(-10deg) scale(1.25)}}
@keyframes flBzRow{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
@keyframes flBzBar{from{transform:scaleX(0)}}
@media (max-height:800px),(max-width:380px){
  .fl-bz2{gap:9px}
  .fl-bz2 .sc b{font-size:36px}
  .fl-bz2 .cd{min-height:96px;padding:9px 13px 12px}
  .fl-bz2 .cd p{font-size:19px}.fl-bz2 .cd.lg p{font-size:17px}
  .fl-bz2 .fl-tf.vd{height:68px}
  .fl-bz2 .kr-r{padding:4px 8px}.fl-bz2 .kr-r p{font-size:12.5px}
}
`;

const SVG_OK = '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>';
const SVG_NO = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ZAP = '<svg class="zap" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="0,22 14,10 24,27 40,5 52,31 66,11 78,26 90,9 100,18"/><polyline points="0,22 14,10 24,27 40,5 52,31 66,11 78,26 90,9 100,18"/></svg>';
const BOLT = '<svg viewBox="0 0 24 24"><path d="M13.5 2 4 13.5h6.5L9 22l10-12h-6.6z"/></svg>';

export const blitz = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
	time: 18, // belge/yedek: bankanın ortancası (timing.test)
	label: 'Yıldırım',
	kind: 'closest',
	rule: 'En çok doğru kazanır', // soru başlığındaki kural (closest tiplerin varsayılanı "En yakın kazanır")
	fmt: (v, value) => `${value?.score || 0} doğru`,
	sub: (v, value) => (value?.n ? `${value.n} ifade` : ''),
	prepare(q, R) {
		return { q, items: shuffle(q.items, R) };
	},
	mount(el, v, api) {
		css('blitz', CSS);
		el.closest('.fl-q')?.classList.add('bz');
		const items = v.items;
		const topic = String(v.q.q || '').split('·').pop().trim() || 'Yıldırım';
		el.innerHTML = `<div class="fl-bz2">
			<div class="hud"><div class="sc"><b>0</b><small>DOĞRU</small></div><div class="pp">${items.map(() => '<i></i>').join('')}</div><div class="cb">${BOLT}<b></b></div></div>
			<div class="dk"><div class="cd"><div class="ey"><span>${esc(topic)}</span><em></em></div><p></p></div><i class="fx"></i>${ZAP}</div>
			<div class="fl-tf vd"><button class="fl-opt fl-yes" data-a="1"><em class="ic">${SVG_OK}</em><span>DOĞRU</span></button><div class="fl-tfmid"><i></i><b>YA DA</b></div><button class="fl-opt fl-no" data-a="0"><em class="ic">${SVG_NO}</em><span>YANLIŞ</span></button><i class="cz"></i></div>
			<div data-r="x"></div>
		</div>`;
		const root = el.querySelector('.fl-bz2');
		const deck = root.querySelector('.dk');
		const card = deck.querySelector('.cd');
		const txt = card.querySelector('p');
		const num = card.querySelector('.ey em');
		const scoreEl = root.querySelector('.sc b');
		const comboEl = root.querySelector('.cb');
		const pips = [...root.querySelectorAll('.pp i')];
		const fx = deck.querySelector('.fx');
		const zap = deck.querySelector('.zap');
		const replay = (e, cls) => {
			e.classList.remove(...cls.split(' '));
			void e.getBoundingClientRect();
			e.classList.add(...cls.split(' '));
		};
		const strike = () => replay(zap, 'go');
		setTimeout(strike, 260); // açılış: deste otururken şimşek çakar
		snd('whoosh', { vol: 0.6 });
		setTimeout(() => snd('bzZap', { n: 0, vol: 0.7 }), 260);
		let k = 0; // sıradaki ifade
		let score = 0;
		let combo = 0;
		let best = 0;
		let done = false;
		let lock = false;
		const log = [];
		const show = () => {
			const s = items[k].t;
			txt.textContent = s;
			card.classList.toggle('lg', s.length > 46);
			num.textContent = `${k + 1}/${items.length}`;
			pips.forEach((p, i) => p.classList.toggle('cur', i === k));
			card.classList.remove('in');
			void card.offsetWidth;
			card.classList.add('in');
		};
		show();
		const finish = () => {
			if (done) return;
			done = true;
			api.answer({ score, n: log.length });
		};
		// cevaplanan kart: kopyası basılan yöne mühürlenip fırlar (DOĞRU sola, YANLIŞ sağa)
		const fly = (say, ok) => {
			const f = document.createElement('div');
			f.className = `fly ${say ? 'l' : 'r'} ${ok ? 'ok' : 'no'}`;
			f.appendChild(card.cloneNode(true));
			f.firstChild.classList.remove('in');
			f.insertAdjacentHTML('beforeend', `<b class="st">${ok ? SVG_OK : SVG_NO}${ok ? 'BİLDİN' : 'BİLEMEDİN'}</b>`);
			deck.appendChild(f);
			setTimeout(() => f.remove(), 450);
		};
		// yargı: yerelde ifadenin doğrusu görünümde; çevrimiçinde gizli (SECRET.blitz), sunucu yargılar (act 'bz' →
		// ev 'bz' { k, ok, ans }; istemci arayüzü api.act / api.wait sağlar). Cevap gelene dek yeni basış alınmaz.
		const online = items.some((it) => it.ans === undefined) && typeof api.act === 'function' && typeof api.wait === 'function';
		let pending = false;
		root.querySelector('.fl-tf').addEventListener('click', async (e) => {
			const b = e.target.closest('.fl-opt');
			if (!b || done || lock || pending) return;
			const say = b.dataset.a === '1';
			const it = items[k];
			let ok;
			let ans;
			if (online) {
				pending = true;
				api.act('bz', { k, a: say });
				const r = await api.wait('bz', 3000);
				pending = false;
				if (done || !r || r.rejected || r.late || r.k !== k) return;
				ok = !!r.ok;
				ans = !!r.ans;
			} else {
				ans = !!it.ans;
				ok = say === ans;
			}
			log.push({ t: it.t, ans, ok });
			pips[k]?.classList.add(ok ? 'y' : 'n');
			fly(say, ok);
			fx.classList.remove('ok', 'no');
			replay(fx, ok ? 'ok' : 'no');
			if (ok) {
				score++;
				combo++;
				best = Math.max(best, combo);
				scoreEl.textContent = score;
				scoreEl.classList.add('pop');
				setTimeout(() => scoreEl.classList.remove('pop'), 160);
				buzz(6);
				snd('bzRight', { n: combo - 1 });
				comboEl.querySelector('b').textContent = `SERİ ×${combo}`;
				comboEl.classList.toggle('on', combo >= 3);
				deck.classList.toggle('c3', combo >= 3);
				if (combo >= 3 && combo % 3 === 0) {
					strike(); // her 3 seride bir şimşek
					snd('bzZap', { n: combo, delay: 0.05 });
				}
				if (combo > 3) {
					comboEl.classList.remove('up');
					void comboEl.offsetWidth;
					comboEl.classList.add('up');
				}
			} else {
				combo = 0;
				comboEl.classList.remove('on');
				deck.classList.remove('c3');
				replay(deck, 'shk');
				buzz(40);
				snd('bzWrong');
				lock = true;
				root.classList.add('lock');
				setTimeout(() => {
					lock = false;
					root.classList.remove('lock');
				}, 600);
			}
			k++;
			if (k >= items.length) {
				pips.forEach((p) => p.classList.remove('cur'));
				card.classList.add('end');
				card.querySelector('.ey span').textContent = 'BİTTİ';
				num.textContent = `${items.length}/${items.length}`;
				txt.textContent = 'Hepsini cevapladın; süre bitince karne açılır.';
				return finish();
			}
			show();
		});
		return {
			lock() {
				done = true;
			},
			value: () => ({ score, n: log.length }),
			reveal(results) {
				done = true;
				root.querySelector('.fl-tf').style.display = 'none';
				deck.style.display = 'none';
				root.querySelector('.hud').style.display = 'none';
				const n = log.length;
				// gösterilecek satırlar: bütün yanlışlar + sırayla doğrular (en çok 6), asıl sırada
				const MAX = 6;
				const wrong = log.filter((l) => !l.ok);
				const pick = new Set(wrong.slice(0, MAX));
				for (const l of log) if (pick.size < MAX) pick.add(l);
				const rows = log.filter((l) => pick.has(l));
				const top = Math.max(0, ...results.map((r) => r.value?.score || 0));
				const most = Math.max(1, items.length);
				const x = root.querySelector('[data-r=x]');
				x.innerHTML = `<div class="kr">
					<div class="kh"><b class="cnt">0</b><div><strong>DOĞRU</strong><small>${n ? `${n} ifadeden${best >= 2 ? ` · en uzun seri ${best}` : ''}` : 'hiç ifade cevaplanmadı'}</small></div>${n ? `<span class="ac">%${Math.round((100 * score) / n)}</span>` : ''}</div>
					${rows.length ? `<div class="kt"><span>SEN</span><span>İFADE</span><span>ASLI</span></div><div class="kl">${rows
						.map(
							(l, i) =>
								`<div class="kr-r ${l.ok ? 'ok' : 'no'}" style="--i:${i}"><i>${l.ok ? SVG_OK : SVG_NO}</i><p>${esc(l.t)}</p><em class="${l.ans ? 't' : 'f'}">${l.ans ? 'DOĞRU' : 'YANLIŞ'}</em></div>`,
						)
						.join('')}</div>${n > rows.length ? `<div class="km">+${n - rows.length} ifade daha (hepsi doğru)</div>` : ''}` : ''}
					<div class="ks">${results
						.map((r) => {
							const s = r.value?.score || 0;
							return `<div class="${s === top && top > 0 ? 'top' : ''}" style="--pc:${r.color}"><span>${esc(r.name)}</span><u style="--w:${(s / most).toFixed(3)}"></u><b>${s} doğru</b></div>`;
						})
						.join('')}</div>
				</div>`;
				const cnt = x.querySelector('.kh>b');
				let c = 0;
				const tick = () => {
					cnt.textContent = c;
					if (c > 0) snd('bzCount', { n: c });
					if (c++ < score) setTimeout(tick, Math.max(40, 380 / Math.max(1, score)));
				};
				setTimeout(tick, 220);
			},
			destroy() {},
		};
	},
	judge(v, value) {
		const score = value ? value.score || 0 : 0;
		return { correct: score >= 5, err: -score, score };
	},
	bot(v, skill, R) {
		// her ifade: okuma (ortalama uzunluğa göre, timing.js ile aynı ölçü) ve dokunma; usta bot daha çabuk. Yanlış: 0.6 sn ceza.
		const sec = secOf(v);
		const avg = v.items.reduce((s, x) => s + String(x.t).length, 0) / Math.max(1, v.items.length);
		const per = (avg / 20 + 0.55) * (1.15 - 0.5 * skill);
		const p = clamp(pCorrect(skill, v.q.diff) + 0.12, 0.2, 0.97);
		let t = 0;
		let score = 0;
		let n = 0;
		while (n < v.items.length) {
			t += per * (0.75 + R() * 0.5);
			if (t > sec) break;
			n++;
			if (R() < p) score++;
			else t += 0.6;
		}
		return { value: { score, n }, time: n >= v.items.length ? Math.min(t, sec) : sec };
	},
};
