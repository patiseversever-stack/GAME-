// Arayüz (ilk sürüm): başlık, üst bilgi, boya seçici, ipucu, bitiş paneli.
// Bütün yazılar koyu mürekkep panel üstünde: hangi boya altta olursa olsun okunur.

const CSS = /* css */ `
.eb-ui{position:absolute;inset:0;pointer-events:none;font-family:'Manrope',system-ui,sans-serif;color:#fff6e6;
  -webkit-font-smoothing:antialiased;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
:where(.eb-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent}
.eb-ui button{pointer-events:auto;cursor:pointer}
.eb-panel{background:rgba(17,12,22,.9);border:1px solid rgba(232,190,120,.35);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.eb-top{position:absolute;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:8px 18px 9px;text-align:center;min-width:150px}
.eb-top small{display:block;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#e8be78;font-weight:800}
.eb-top b{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:22px;line-height:1.1}
.eb-leaf{position:absolute;top:calc(14px + env(safe-area-inset-top));right:14px;padding:8px 12px;font-weight:800;font-size:15px;display:flex;gap:6px;align-items:center}
.eb-leaf i{width:12px;height:12px;background:linear-gradient(135deg,#ffe3a0,#c98d2e);transform:rotate(45deg);border-radius:2px;display:inline-block}
.eb-pal{position:absolute;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:9px 12px}
.eb-pal button{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,246,230,.25);box-shadow:inset 0 -6px 10px rgba(0,0,0,.25),inset 0 4px 8px rgba(255,255,255,.18);transition:transform .15s}
.eb-pal button.on{border-color:#ffe2a6;transform:scale(1.14);box-shadow:0 0 0 3px rgba(255,226,166,.25),inset 0 -6px 10px rgba(0,0,0,.25)}
.eb-hint{position:absolute;bottom:calc(84px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:10px 16px;font-size:15px;line-height:1.35;text-align:center;width:min(86vw,360px);transition:opacity .4s}
.eb-hint em{font-style:normal;color:#ffd58a;font-weight:800}
.eb-toast{position:absolute;top:calc(74px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:7px 14px;font-size:14px;font-weight:700;opacity:0;transition:opacity .3s;white-space:nowrap}
.eb-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;pointer-events:auto;transition:opacity .45s}
.eb-scr.off{opacity:0;pointer-events:none}
.eb-title{background:radial-gradient(ellipse at 50% 42%,rgba(14,10,20,.35),rgba(14,10,20,.86) 75%)}
.eb-logo{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:min(30vw,132px);line-height:.9;color:#ffe0a0;
  text-shadow:0 2px 0 #8a5a22,0 8px 30px rgba(0,0,0,.6)}
.eb-sub{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:21px;color:#fff1da;text-shadow:0 2px 12px rgba(0,0,0,.8)}
.eb-btn{padding:14px 40px;border-radius:999px;background:linear-gradient(180deg,#ffe2a0,#e0a447);color:#2a1606;font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:15px;box-shadow:0 8px 24px rgba(224,164,71,.35)}
.eb-btn2{padding:11px 22px;border-radius:999px;border:1px solid rgba(232,190,120,.5);background:rgba(17,12,22,.85);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
.eb-end{background:rgba(10,7,14,.55)}
.eb-card{padding:22px 26px 20px;width:min(84vw,340px)}
.eb-card h3{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:32px;color:#ffe0a0}
.eb-card p{margin:8px 0 14px;font-size:15px;line-height:1.4;color:#f3e6d2}
.eb-stars{font-size:34px;letter-spacing:6px;color:#ffd27a;text-shadow:0 0 14px rgba(255,200,100,.5)}
.eb-stars .off{color:rgba(255,246,230,.18);text-shadow:none}
.eb-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
`;

export class UI {
	constructor(root, h) {
		this.h = h;
		const st = document.createElement('style');
		st.textContent = CSS;
		root.appendChild(st);
		const el = document.createElement('div');
		el.className = 'eb-ui';
		el.lang = 'tr';
		el.innerHTML = `
			<div class="eb-panel eb-top" data-r="top" style="display:none"><small data-r="kicker"></small><b data-r="name"></b></div>
			<div class="eb-panel eb-leaf" data-r="leafbox" style="display:none"><i></i><span data-r="leaf">0/0</span></div>
			<div class="eb-panel eb-pal" data-r="pal" style="display:none"></div>
			<div class="eb-panel eb-hint" data-r="hint" style="opacity:0"></div>
			<div class="eb-panel eb-toast" data-r="toast"></div>
			<div class="eb-scr eb-title" data-r="title">
				<div class="eb-logo">Ebru</div>
				<div class="eb-sub">Suyun üstünde bir kandil</div>
				<div style="height:18px"></div>
				<button class="eb-btn" data-a="play">Oyna</button>
			</div>
			<div class="eb-scr eb-end off" data-r="end">
				<div class="eb-panel eb-card">
					<h3 data-r="endT"></h3>
					<div class="eb-stars" data-r="stars"></div>
					<p data-r="endP"></p>
					<div class="eb-row" data-r="endB"></div>
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
			if (a.startsWith('color:')) {
				for (const c of this.$.pal.children) c.classList.toggle('on', c === b);
			}
			h.action(a);
		});
		// arayüz düğmelerine dokunmak suya damla bırakmasın
		el.addEventListener('pointerdown', (e) => {
			if (e.target.closest('button')) e.stopPropagation();
		});
		this._hintT = 0;
		this._toastT = 0;
	}

	level(L, game) {
		this.$.top.style.display = '';
		this.$.leafbox.style.display = '';
		this.$.pal.style.display = '';
		this.$.kicker.textContent = L.kicker;
		this.$.name.textContent = L.name;
		this.leaf(0, L.leaves.length);
		const pal = game.app.waterMat.uniforms.uPal.value;
		this.$.pal.innerHTML = L.colors
			.map((c, i) => {
				const v = pal[c];
				const css = `rgb(${(v.r * 255) | 0},${(v.g * 255) | 0},${(v.b * 255) | 0})`;
				return `<button class="${i === 0 ? 'on' : ''}" data-a="color:${c}" style="background:${css}" aria-label="boya ${i + 1}"></button>`;
			})
			.join('');
		if (game.levelIndex === 0) this.hint('Parmağını <em>sürükle</em>: su akar, kandil akıntıya kapılır.<br><em>Dokun</em>: damla açılır, çevresini iter.', 7);
		else this.hint(null);
	}

	leaf(n, total) {
		this.$.leaf.textContent = `${n}/${total}`;
	}

	tick() {
		const now = performance.now();
		if (this._hintT && now > this._hintT) {
			this.$.hint.style.opacity = 0;
			this._hintT = 0;
		}
		if (this._toastT && now > this._toastT) {
			this.$.toast.style.opacity = 0;
			this._toastT = 0;
		}
	}

	hint(html, sec = 5) {
		if (!html) {
			this.$.hint.style.opacity = 0;
			this._hintT = 0;
			return;
		}
		this.$.hint.innerHTML = html;
		this.$.hint.style.opacity = 1;
		this._hintT = performance.now() + sec * 1000;
	}

	toast(text) {
		this.$.toast.textContent = text;
		this.$.toast.style.opacity = 1;
		this._toastT = performance.now() + 2200;
	}

	end(r, L) {
		this.hint(null);
		this.$.endT.textContent = r.won ? 'Kandil limanda' : 'Kandil söndü';
		this.$.stars.innerHTML = [0, 1, 2].map((i) => `<span class="${i < r.stars ? '' : 'off'}">★</span>`).join('');
		this.$.stars.style.display = r.won ? '' : 'none';
		this.$.endP.textContent = r.won
			? `${r.time.toFixed(1)} saniye · ${r.got}/${r.total} altın varak · ${r.drops} damla`
			: 'Kara mürekkep alevi boğdu. Akıntıyı mürekkebin etrafından çevir.';
		this.$.endB.innerHTML = r.won
			? `<button class="eb-btn2" data-a="retry">Tekrar</button><button class="eb-btn" data-a="next">Sonraki</button>`
			: `<button class="eb-btn" data-a="retry">Yeniden dene</button>`;
		this.$.end.classList.remove('off');
	}
}
