// Arayüz stilleri. Tarz: lacivert gece paneli, altın çerçeve, kalın konturlu yazılar.
// Her yazı koyu panel ya da kontur üstünde: haritanın hangi rengi altta olursa olsun okunur.
// Animasyonlar yalnızca transform ve opacity.

const OUT = (c, w = 2) =>
	`text-shadow:${[
		[w, 0],
		[-w, 0],
		[0, w],
		[0, -w],
		[w * 0.7, w * 0.7],
		[-w * 0.7, w * 0.7],
		[w * 0.7, -w * 0.7],
		[-w * 0.7, -w * 0.7],
	]
		.map(([x, y]) => `${x}px ${y}px 0 ${c}`)
		.join(',')},0 ${w + 2}px 0 ${c}`;

export const CSS = /* css */ `
.fl-ui{position:absolute;inset:0;pointer-events:none;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;color:#fff;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;--gold:#ffd25a;--ink:#101a33;--panel:rgba(16,26,51,.94);--line:rgba(255,210,90,.55)}
:where(.fl-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fl-ui button{pointer-events:auto}
.fl-big{font-family:'Lilita One',system-ui,sans-serif;font-weight:400}

/* oyuncu kartları */
.fl-hud{position:absolute;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:6px;width:min(96vw,560px);justify-content:center}
.fl-pl{flex:1;min-width:0;display:flex;align-items:center;gap:7px;padding:5px 9px 5px 5px;border-radius:14px;background:var(--panel);border:2px solid rgba(255,255,255,.14);
  box-shadow:0 4px 0 rgba(0,0,0,.35);transition:transform .25s,border-color .25s}
.fl-pl.turn{transform:translateY(3px) scale(1.04);border-color:var(--gold)}
.fl-pl.dead{opacity:.45}
.fl-av{flex:none;width:32px;height:32px;border-radius:10px;border:2px solid #fff;display:grid;place-items:center;font-family:'Lilita One';font-size:17px;${OUT('rgba(0,0,0,.45)', 1.5)}}
.fl-pl div{min-width:0}
.fl-pl b{display:block;font-size:12.5px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-pl em{display:block;font-style:normal;font-family:'Lilita One';font-size:16px;color:var(--gold);line-height:1.1}
.fl-hp{display:flex;gap:2px;margin-left:auto}
.fl-hp i{width:7px;height:11px;border-radius:2px 2px 1px 1px;background:#ffd25a;box-shadow:0 1px 0 rgba(0,0,0,.4)}
.fl-hp i.off{background:rgba(255,255,255,.18)}

/* tur bayrağı */
.fl-banner{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.6);opacity:0;text-align:center;transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.fl-banner.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fl-banner b{display:block;font-family:'Lilita One';font-size:min(15vw,64px);letter-spacing:.03em;line-height:1;color:#fff;${OUT('#7a2a0a', 4)}}
.fl-banner.gold b{color:var(--gold);${OUT('#6a3a00', 4)}}
.fl-banner.red b{color:#ff6a50;${OUT('#4a0a0a', 4)}}
.fl-banner span{display:inline-block;margin-top:8px;padding:6px 16px;border-radius:999px;background:var(--panel);border:2px solid var(--line);font-size:16px}

/* ipucu çubuğu */
.fl-prompt{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);opacity:0;padding:12px 20px;border-radius:16px;background:var(--panel);
  border:2px solid var(--line);font-size:17px;white-space:nowrap;transition:opacity .25s,transform .25s;box-shadow:0 6px 0 rgba(0,0,0,.35)}
.fl-prompt.on{opacity:1;transform:translateX(-50%)}
.fl-prompt.shake{animation:flShake .35s}
@keyframes flShake{25%{transform:translateX(calc(-50% - 8px))}75%{transform:translateX(calc(-50% + 8px))}}
.fl-prompt em{font-style:normal;color:var(--gold)}

/* soru kartı */
.fl-q{position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translate(-50%,40px);opacity:0;width:min(96vw,520px);pointer-events:auto;
  background:linear-gradient(180deg,rgba(28,44,86,.97),rgba(14,22,46,.97));border:2.5px solid var(--line);border-radius:22px;box-shadow:0 10px 0 rgba(0,0,0,.35),0 20px 40px rgba(0,0,0,.35);
  transition:opacity .25s,transform .35s cubic-bezier(.3,1.4,.5,1),visibility 0s .35s;padding:12px 14px 14px;visibility:hidden;pointer-events:none}
.fl-q.on{opacity:1;transform:translate(-50%,0);visibility:visible;pointer-events:auto;transition:opacity .25s,transform .35s cubic-bezier(.3,1.4,.5,1)}
.fl-q.mini .fl-qbody,.fl-q.mini .fl-qtext{display:none}
.fl-qtop{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.fl-cat{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 5px;border-radius:999px;font-size:13px;color:#fff;${OUT('rgba(0,0,0,.35)', 1)}}
.fl-cat svg{width:20px;height:20px;padding:2px;border-radius:50%;background:rgba(255,255,255,.25);fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fl-type{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.fl-vs{margin-left:auto;display:flex;align-items:center;gap:6px;font-family:'Lilita One';font-size:14px}
.fl-vs i{width:26px;height:26px;border-radius:8px;border:2px solid #fff;display:inline-grid;place-items:center;font-style:normal;font-size:13px}
.fl-timer{flex:none;width:40px;height:40px;position:relative}
.fl-timer svg{width:100%;height:100%;transform:rotate(-90deg)}
.fl-timer circle{fill:none;stroke-width:5}
.fl-timer .bg{stroke:rgba(255,255,255,.15)}
.fl-timer .fg{stroke:var(--gold);stroke-linecap:round;transition:stroke .3s}
.fl-timer.hot .fg{stroke:#ff5a4a}
.fl-timer b{position:absolute;inset:0;display:grid;place-items:center;font-family:'Lilita One';font-size:16px}
.fl-qtext{font-size:clamp(17px,4.6vw,21px);line-height:1.3;margin:2px 2px 12px;text-wrap:balance}
.fl-answered{display:flex;gap:4px;justify-content:flex-end;margin:-4px 0 6px;min-height:18px}
.fl-answered i{width:18px;height:18px;border-radius:6px;border:2px solid #fff;opacity:.25;transition:opacity .2s,transform .2s}
.fl-answered i.on{opacity:1;transform:scale(1.1)}

.fl-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fl-opt{position:relative;display:flex;align-items:center;gap:8px;min-height:52px;padding:8px 10px;border-radius:14px;text-align:left;font-size:16px;line-height:1.2;
  background:linear-gradient(180deg,#3a5ba8,#2a4486);border:2px solid rgba(255,255,255,.22);box-shadow:0 4px 0 #142554;transition:transform .1s,background .2s}
.fl-opt:active{transform:translateY(3px);box-shadow:0 1px 0 #142554}
.fl-opt i{flex:none;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:14px}
.fl-opt.pick{background:linear-gradient(180deg,#6a7fc8,#4a5fa8);border-color:#fff}
.fl-opt.right{background:linear-gradient(180deg,#4fd16a,#2a9a44);border-color:#fff;box-shadow:0 4px 0 #156a2a}
.fl-opt.wrong{background:linear-gradient(180deg,#ff6a5a,#c8352a);box-shadow:0 4px 0 #7a1a12}
.fl-opt.dim{opacity:.5}
.fl-who{position:absolute;top:-6px;right:-4px;width:16px;height:16px;border-radius:5px;border:2px solid #fff}
.fl-who+.fl-who{right:14px}
.fl-tf{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-tf .fl-opt{justify-content:center;font-family:'Lilita One';font-size:22px;min-height:64px}
.fl-yes{background:linear-gradient(180deg,#3fae6a,#2a7a4a)!important}
.fl-no{background:linear-gradient(180deg,#d8574a,#9a3328)!important}
.fl-yes.right,.fl-no.right{outline:3px solid #fff;outline-offset:2px}

.fl-num{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.fl-num-val{text-align:center}
.fl-num-val b{font-family:'Lilita One';font-size:44px;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-num-val small{margin-left:6px;font-size:18px;opacity:.85}
.fl-range{width:100%;accent-color:#ffd25a;height:34px}
.fl-num-row{display:flex;gap:8px;justify-content:center}
.fl-step{padding:8px 14px;border-radius:12px;background:#2a4486;border:2px solid rgba(255,255,255,.2);font-family:'Lilita One';font-size:16px;box-shadow:0 3px 0 #142554}
.fl-send{padding:12px;border-radius:14px;font-family:'Lilita One';font-size:20px;letter-spacing:.05em;color:#3a2000;background:linear-gradient(180deg,#ffe27a,#f2b02a);border:2px solid #fff;box-shadow:0 5px 0 #a86a0a}
.fl-send:disabled{opacity:.45}
.fl-num.sent{opacity:.6;pointer-events:none}
.fl-num-ans{text-align:center;margin-bottom:8px}
.fl-num-ans small{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.fl-num-ans b{font-family:'Lilita One';font-size:34px;color:#7dff9a;${OUT('#0a3a14', 2)}}
.fl-guesses{display:flex;flex-direction:column;gap:6px}
.fl-guess{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.08)}
.fl-guess:first-child{background:rgba(255,210,90,.2);outline:2px solid var(--gold)}
.fl-guess b{width:18px;height:18px;border-radius:6px;border:2px solid #fff}
.fl-guess em{margin-left:auto;font-style:normal;font-family:'Lilita One';font-size:17px}
.fl-pin-hint{display:flex;align-items:center;gap:10px}
.fl-pin-hint span{flex:1;font-size:15px;opacity:.9}
.fl-pin-hint .fl-send{padding:10px 18px;font-size:17px}

.fl-hang{display:flex;flex-direction:column;gap:10px;align-items:center}
.fl-towers{display:flex;gap:4px}
.fl-towers i{width:14px;height:22px;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,#ffe27a,#d89a2a);transition:transform .3s,opacity .3s;transform-origin:50% 100%}
.fl-towers i.down{transform:scaleY(.25) rotate(14deg);opacity:.35}
.fl-word{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.fl-word b{width:clamp(24px,7vw,32px);height:38px;border-radius:8px;background:rgba(255,255,255,.1);border-bottom:3px solid var(--gold);display:grid;place-items:center;font-family:'Lilita One';font-size:22px}
.fl-word s{width:12px}
.fl-word.revealed b{color:#7dff9a}
.fl-keys{display:flex;flex-direction:column;gap:5px;width:100%}
.fl-keys div{display:flex;gap:4px;justify-content:center}
.fl-key{flex:1;max-width:36px;height:38px;border-radius:8px;background:#2a4486;border:1.5px solid rgba(255,255,255,.2);font-family:'Lilita One';font-size:16px;box-shadow:0 3px 0 #142554}
.fl-key.hit{background:#2a9a44}
.fl-key.miss{background:#5a2a2a;opacity:.6}

/* çark */
.fl-wheel{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:opacity .25s;background:radial-gradient(circle,rgba(10,16,34,.35),rgba(10,16,34,.75))}
.fl-wheel.on{opacity:1}
.fl-wheel-box{position:relative;width:min(78vw,340px);aspect-ratio:1;max-width:100%}
.fl-wheel svg{width:100%;height:100%;filter:drop-shadow(0 10px 0 rgba(0,0,0,.35))}
.fl-wheel .spin{transform-origin:50% 50%;transition:transform 2.2s cubic-bezier(.12,.75,.18,1)}
.fl-wheel .ptr{position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:30px solid #fff;filter:drop-shadow(0 3px 0 rgba(0,0,0,.4))}
.fl-wheel-cap{position:absolute;bottom:-56px;left:50%;transform:translateX(-50%);font-family:'Lilita One';font-size:26px;white-space:nowrap;${OUT('rgba(0,0,0,.6)', 2)}}
.fl-catpick{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(88vw,380px)}
.fl-catpick button{display:flex;align-items:center;gap:8px;padding:12px;border-radius:14px;font-size:16px;border:2px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35);${OUT('rgba(0,0,0,.35)', 1)}}
.fl-catpick svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* sıralama ve harita iğneleri */
.fl-rank{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.8);opacity:0;width:min(86vw,360px);padding:14px;border-radius:20px;background:var(--panel);border:2.5px solid var(--line);transition:opacity .25s,transform .3s cubic-bezier(.3,1.5,.5,1)}
.fl-rank.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fl-rank h4{margin:0 0 10px;text-align:center;font-family:'Lilita One';font-weight:400;font-size:22px;color:var(--gold)}
.fl-rank div{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:12px;margin-top:6px;background:rgba(255,255,255,.07)}
.fl-rank div b{font-family:'Lilita One';font-size:18px;width:22px}
.fl-rank div i{width:20px;height:20px;border-radius:6px;border:2px solid #fff}
.fl-rank div em{margin-left:auto;font-style:normal;color:var(--gold);font-family:'Lilita One'}
.fl-pins{position:absolute;inset:0;overflow:hidden}
.fl-pin{position:absolute;left:0;top:0;width:26px;height:36px;margin:-34px 0 0 -13px;will-change:transform}
.fl-pin svg{width:100%;height:100%;filter:drop-shadow(0 3px 2px rgba(0,0,0,.45))}
.fl-pin.goal{width:34px;height:34px;margin:-17px 0 0 -17px}
.fl-label{position:absolute;left:0;top:0;transform:translate(-50%,-50%);padding:2px 7px;border-radius:8px;background:rgba(16,26,51,.82);font-size:11.5px;white-space:nowrap;will-change:transform}

/* menüler */
.fl-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:auto;transition:opacity .35s;padding:0 16px}
.fl-scr.off{opacity:0;pointer-events:none}
.fl-title{justify-content:space-between;padding:calc(10vh + env(safe-area-inset-top)) 16px calc(6vh + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(8,14,32,.6),rgba(8,14,32,0) 40%,rgba(8,14,32,0) 60%,rgba(8,14,32,.7))}
.fl-logo{text-align:center;transform:rotate(-2deg)}
.fl-logo .a{display:block;font-family:'Lilita One';font-size:min(19vw,96px);line-height:.9;color:#fff;${OUT('#1a2a5a', 5)}}
.fl-logo .b{display:inline-block;margin-top:8px;font-family:'Lilita One';font-size:min(10vw,48px);color:#3a2000;padding:2px 26px 6px;border-radius:14px;background:linear-gradient(180deg,#ffe27a,#f2b02a);border:4px solid #fff;box-shadow:0 6px 0 #8a5a0a}
.fl-logo small{display:block;margin-top:14px;font-size:16px;${OUT('#1a2a5a', 2)}}
.fl-play{font-family:'Lilita One';font-size:32px;padding:14px 60px 18px;border-radius:22px;color:#fff;background:linear-gradient(180deg,#ff7a5a,#e0402a);border:4px solid #fff;
  box-shadow:0 8px 0 #7a1a0a,0 14px 24px rgba(0,0,0,.3);${OUT('#7a1a0a', 3)}}
.fl-play:active{transform:translateY(5px);box-shadow:0 3px 0 #7a1a0a}
.fl-card{width:min(92vw,440px);padding:16px;border-radius:24px;background:var(--panel);border:2.5px solid var(--line);box-shadow:0 10px 0 rgba(0,0,0,.35)}
.fl-card h3{margin:0 0 10px;font-family:'Lilita One';font-weight:400;font-size:26px;text-align:center;color:var(--gold)}
.fl-seg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
.fl-seg.c3{grid-template-columns:repeat(3,1fr)}
.fl-seg button{padding:10px 4px;border-radius:12px;background:#2a4486;border:2px solid rgba(255,255,255,.18);font-size:14px;box-shadow:0 3px 0 #142554}
.fl-seg button.on{background:linear-gradient(180deg,#ffe27a,#f2b02a);color:#3a2000;border-color:#fff}
.fl-lbl{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin:0 0 6px 2px}
.fl-go{width:100%;font-family:'Lilita One';font-size:24px;padding:12px;border-radius:16px;color:#fff;background:linear-gradient(180deg,#ff7a5a,#e0402a);border:3px solid #fff;box-shadow:0 6px 0 #7a1a0a;${OUT('#7a1a0a', 2)}}
.fl-end .fl-card{text-align:center}
.fl-podium{display:flex;flex-direction:column;gap:6px;margin:8px 0 14px}
.fl-podium div{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.07);font-size:16px}
.fl-podium div:first-child{background:rgba(255,210,90,.22);outline:2px solid var(--gold)}
.fl-podium b{font-family:'Lilita One';font-size:20px;width:24px}
.fl-podium i{width:24px;height:24px;border-radius:7px;border:2px solid #fff}
.fl-podium em{margin-left:auto;font-style:normal;font-family:'Lilita One';color:var(--gold)}
@media (prefers-reduced-motion:reduce){.fl-wheel .spin{transition-duration:.6s}}
`;
