// Arayüz: başlık, üst ilerleme çubuğu (yıldız eşikleri), uçan yazılar, ipucu, bitiş kartı.
// Tarz: kalın, oyuncak gibi; yazılar koyu kontur ve gölgeyle her zeminde okunur.
// Animasyonlar yalnızca transform ve opacity (telefonda yeniden yerleşim yok).

const OUT = (c, w = 3) =>
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
		.join(',')},0 ${w + 3}px 0 ${c}`;

const CSS = /* css */ `
.dm-ui{position:absolute;inset:0;pointer-events:none;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;color:#fff;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
:where(.dm-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dm-ui button{pointer-events:auto}
.dm-big{font-family:'Lilita One',system-ui,sans-serif;font-weight:400;letter-spacing:.02em}

.dm-top{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(88vw,420px);display:none}
.dm-title-chip{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.dm-lv{font-family:'Lilita One';font-size:19px;${OUT('#1d3f8a', 2)}}
.dm-score{font-family:'Lilita One';font-size:19px;${OUT('#7a3a08', 2)};color:#ffe066}
.dm-bar{position:relative;height:22px;border-radius:12px;background:#1d3f8a;border:3px solid #fff;box-shadow:0 4px 0 rgba(20,40,100,.55)}
.dm-fill{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:9px;transform-origin:left center;transform:scaleX(0);
  background:linear-gradient(180deg,#9cff6e 0%,#45d14a 55%,#2fb043 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.45)}
.dm-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Lilita One';font-size:15px;${OUT('#173a7a', 2)}}
.dm-star{position:absolute;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;transition:transform .25s cubic-bezier(.3,1.8,.5,1)}
.dm-star svg{width:100%;height:100%;filter:drop-shadow(0 2px 0 rgba(20,40,100,.6))}
.dm-star .s{fill:#5a6fa8;stroke:#fff;stroke-width:2.2}
.dm-star.on .s{fill:#ffd23a;stroke:#fff}
.dm-star.on{transform:scale(1.25)}

.dm-pops{position:absolute;inset:0;overflow:hidden}
.dm-pop{position:absolute;left:0;top:0;font-family:'Lilita One';font-size:34px;white-space:nowrap;will-change:transform,opacity;
  animation:dmPop 1.1s cubic-bezier(.2,1.4,.4,1) forwards}
.dm-pop.gold{color:#ffe14a;${OUT('#b5440a', 3)}}
.dm-pop.good{color:#a8ff6a;${OUT('#1f6a1a', 3)}}
.dm-pop.ok{color:#fff;${OUT('#2a4a9a', 3)};font-size:28px}
.dm-pop.bad{color:#ff6a6a;${OUT('#6a0a1a', 3)}}
@keyframes dmPop{0%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-50%) scale(.3)}
 18%{opacity:1;transform:translate(var(--x),var(--y)) translate(-50%,-80%) scale(1.18)}
 30%{transform:translate(var(--x),var(--y)) translate(-50%,-85%) scale(1)}
 100%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-190%) scale(.96)}}

.dm-hint{position:absolute;left:50%;bottom:calc(36px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:12px 22px;border-radius:18px;
  background:rgba(23,45,110,.92);border:3px solid #fff;box-shadow:0 5px 0 rgba(15,30,80,.5);font-size:18px;text-align:center;white-space:nowrap;
  transition:opacity .3s,transform .3s;animation:dmBob 1.6s ease-in-out infinite}
.dm-hint em{font-style:normal;color:#ffe14a}
.dm-hint.off{opacity:0;transform:translateX(-50%) translateY(12px);animation:none}
@keyframes dmBob{50%{transform:translateX(-50%) translateY(-5px)}}

.dm-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;transition:opacity .4s}
.dm-scr.off{opacity:0;pointer-events:none}
.dm-title{justify-content:space-between;padding:calc(12vh + env(safe-area-inset-top)) 16px calc(9vh + env(safe-area-inset-bottom));
  background:linear-gradient(180deg,rgba(40,90,200,.35),rgba(0,0,0,0) 35%,rgba(0,0,0,0) 65%,rgba(20,40,110,.45))}
.dm-logo{text-align:center;line-height:.86;transform:rotate(-3deg)}
.dm-logo .a{display:block;font-family:'Lilita One';font-size:min(21vw,104px);color:#fff;${OUT('#1d3f8a', 5)}}
.dm-logo .b{display:inline-block;margin-top:10px;font-family:'Lilita One';font-size:min(12vw,58px);color:#ffe14a;padding:2px 22px 6px;border-radius:16px;
  background:linear-gradient(180deg,#ff5a6e,#e0304e);border:4px solid #fff;box-shadow:0 6px 0 #8a1830;${OUT('#8a1830', 3)}}
.dm-tiles{display:flex;gap:6px;justify-content:center;margin-bottom:14px}
.dm-tiles i{width:16px;height:44px;border-radius:5px;border:3px solid #fff;box-shadow:0 4px 0 rgba(20,40,100,.5);display:block;transform-origin:50% 100%;animation:dmTip 3.2s ease-in-out infinite}
@keyframes dmTip{0%,55%{transform:rotate(0)}70%{transform:rotate(70deg)}86%,100%{transform:rotate(0)}}
.dm-play{font-family:'Lilita One';font-size:34px;padding:14px 64px 18px;border-radius:22px;color:#fff;
  background:linear-gradient(180deg,#ffe25a 0%,#ffc21a 50%,#ff9d0a 100%);border:4px solid #fff;
  box-shadow:0 8px 0 #b55a06,0 14px 24px rgba(0,0,0,.25),inset 0 -6px 0 rgba(200,90,0,.35);${OUT('#b55a06', 3)};transition:transform .1s}
.dm-play:active{transform:translateY(5px);box-shadow:0 3px 0 #b55a06,inset 0 -6px 0 rgba(200,90,0,.35)}
.dm-sub{margin-top:16px;font-size:17px;${OUT('#1d3f8a', 2)}}

.dm-end{background:rgba(20,40,110,.35)}
.dm-card{width:min(86vw,360px);padding:22px 20px 22px;border-radius:26px;text-align:center;
  background:linear-gradient(180deg,#4a8cff,#2a5fd8);border:4px solid #fff;box-shadow:0 10px 0 #183e96,0 20px 40px rgba(0,0,0,.3);transform:scale(.9);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.dm-scr:not(.off) .dm-card{transform:scale(1)}
.dm-card h2{margin:0 0 8px;font-family:'Lilita One';font-weight:400;font-size:34px;${OUT('#183e96', 3)}}
.dm-stars{display:flex;justify-content:center;gap:6px;margin:4px 0 10px}
.dm-stars svg{width:64px;height:64px;filter:drop-shadow(0 4px 0 rgba(15,30,90,.6));transform:scale(0);animation:dmStar .5s cubic-bezier(.3,1.8,.5,1) forwards}
.dm-stars svg:nth-child(2){width:78px;height:78px;margin-top:-10px;animation-delay:.25s}
.dm-stars svg:nth-child(3){animation-delay:.5s}
@keyframes dmStar{to{transform:scale(1)}}
.dm-stars .s{fill:#3c58a8;stroke:#fff;stroke-width:1.6}
.dm-stars .on .s{fill:#ffd23a}
.dm-big-pct{font-family:'Lilita One';font-size:52px;color:#ffe14a;${OUT('#183e96', 3)}}
.dm-row{display:flex;gap:10px;justify-content:center;margin-top:14px}
.dm-btn{font-family:'Lilita One';font-size:22px;padding:10px 22px 13px;border-radius:16px;border:3px solid #fff;color:#fff}
.dm-btn.g{background:linear-gradient(180deg,#8cff5a,#36c23a);box-shadow:0 6px 0 #1f7a1f;${OUT('#1f7a1f', 2)}}
.dm-btn.b{background:linear-gradient(180deg,#6ab0ff,#3a7aea);box-shadow:0 6px 0 #1d4a9a;${OUT('#1d4a9a', 2)}}
.dm-stat{font-size:16px;opacity:.95;${OUT('#183e96', 1.5)}}
@media (prefers-reduced-motion:reduce){.dm-tiles i,.dm-hint{animation:none}}
`;

const STAR = '<svg viewBox="0 0 24 24"><path class="s" d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z" stroke-linejoin="round"/></svg>';

export class UI {
	constructor(root, h) {
		this.h = h;
		const st = document.createElement('style');
		st.textContent = CSS;
		root.appendChild(st);
		const el = document.createElement('div');
		el.className = 'dm-ui';
		el.lang = 'tr';
		const tileCols = ['#ff4d6d', '#ffb020', '#ffe14a', '#45d14a', '#3a8aff', '#a64dff'];
		el.innerHTML = `
			<div class="dm-top" data-r="top">
				<div class="dm-title-chip"><span class="dm-lv" data-r="lv"></span><span class="dm-score" data-r="score">0</span></div>
				<div class="dm-bar"><div class="dm-fill" data-r="fill"></div>
					<div class="dm-star" data-r="s1" style="left:70%">${STAR}</div>
					<div class="dm-star" data-r="s2" style="left:90%">${STAR}</div>
					<div class="dm-star" data-r="s3" style="left:99%">${STAR}</div>
					<div class="dm-pct" data-r="pct">%0</div>
				</div>
			</div>
			<div class="dm-pops" data-r="pops"></div>
			<div class="dm-hint off" data-r="hint"></div>
			<div class="dm-scr dm-title" data-r="title">
				<div class="dm-logo"><div class="dm-tiles">${tileCols.map((c, i) => `<i style="background:${c};animation-delay:${i * 0.12}s"></i>`).join('')}</div>
					<span class="a">DOMİNO</span><span class="b">ŞEHRİ</span></div>
				<div style="display:flex;flex-direction:column;align-items:center">
					<button class="dm-play" data-a="play">OYNA</button>
					<div class="dm-sub">Bir dokunuş. Binlerce taş.</div>
				</div>
			</div>
			<div class="dm-scr dm-end off" data-r="end">
				<div class="dm-card">
					<h2 data-r="endT"></h2>
					<div class="dm-stars" data-r="stars"></div>
					<div class="dm-big-pct" data-r="endPct"></div>
					<div class="dm-stat" data-r="endS"></div>
					<div class="dm-row" data-r="endB"></div>
				</div>
			</div>`;
		root.appendChild(el);
		this.el = el;
		this.$ = {};
		for (const n of el.querySelectorAll('[data-r]')) this.$[n.dataset.r] = n;
		el.addEventListener('click', (e) => {
			const b = e.target.closest('[data-a]');
			if (!b) return;
			e.stopPropagation();
			const a = b.dataset.a;
			if (a === 'play' || a === 'retry' || a === 'next') {
				this.$.title.classList.add('off');
				this.$.end.classList.add('off');
			}
			h.action(a);
		});
		el.addEventListener('pointerdown', (e) => {
			if (e.target.closest('button')) e.stopPropagation();
		});
		this._pct = -1;
		this._stars = 0;
		this._score = -1;
	}

	level(L) {
		this.$.top.style.display = 'block';
		this.$.lv.textContent = `${L.kicker} · ${L.name}`;
		this._pct = -1;
		this._stars = 0;
		for (const k of ['s1', 's2', 's3']) this.$[k].classList.remove('on');
		this.tick({ d: { toppled: 0 }, total: 1, score: 0 });
	}

	tick(g) {
		const pct = Math.floor((g.d.toppled / g.total) * 100);
		if (pct !== this._pct) {
			this._pct = pct;
			this.$.fill.style.transform = `scaleX(${pct / 100})`;
			this.$.pct.textContent = `%${pct}`;
			const stars = pct >= 99.5 ? 3 : pct >= 90 ? 2 : pct >= 70 ? 1 : 0;
			if (stars !== this._stars) {
				this._stars = stars;
				this.$.s1.classList.toggle('on', stars >= 1);
				this.$.s2.classList.toggle('on', stars >= 2);
				this.$.s3.classList.toggle('on', stars >= 3);
			}
		}
		const sc = g.score + g.d.toppled * 10;
		if (sc !== this._score) {
			this._score = sc;
			this.$.score.textContent = sc.toLocaleString('tr-TR');
		}
	}

	pop(text, x, y, tone = 'good') {
		const p = document.createElement('div');
		p.className = `dm-pop ${tone}`;
		p.textContent = text;
		p.style.setProperty('--x', `${x}px`);
		p.style.setProperty('--y', `${y}px`);
		this.$.pops.appendChild(p);
		setTimeout(() => p.remove(), 1150);
	}

	hint(html) {
		if (!html) return this.$.hint.classList.add('off');
		this.$.hint.innerHTML = html;
		this.$.hint.classList.remove('off');
	}

	title(on) {
		this.$.title.classList.toggle('off', !on);
		if (on) this.$.top.style.display = 'none';
	}

	end(r) {
		this.hint(null);
		this.$.endT.textContent = r.stars >= 3 ? 'KUSURSUZ!' : r.stars > 0 ? 'ŞEHİR DEVRİLDİ!' : 'ZİNCİR KOPTU';
		this.$.stars.innerHTML = [0, 1, 2].map((i) => STAR.replace('<svg', `<svg class="${i < r.stars ? 'on' : ''}"`)).join('');
		this.$.endPct.textContent = `%${Math.floor(r.pct * 100)}`;
		this.$.endS.textContent = `${r.toppled.toLocaleString('tr-TR')} taş · ${r.perfects} mükemmel · ${r.score.toLocaleString('tr-TR')} puan`;
		this.$.endB.innerHTML = `<button class="dm-btn b" data-a="retry">TEKRAR</button><button class="dm-btn g" data-a="next">DEVAM</button>`;
		this.$.end.classList.remove('off');
	}
}
