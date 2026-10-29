// Soru tipleri için ortak yardımcılar: rastgelelik, kaçış, CSS enjeksiyonu,
// Türkçe ekran klavyesi ve çoktan seçmeli gövde (choice, emoji, odd, proverb, riddle, img paylaşır).

export { sleep } from '../core/clock.js';
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const trUp = (s) => String(s).toLocaleUpperCase('tr-TR');

/** Botların doğruluk modeli: P(doğru) = beceri + 0.25 − 0.15·zorluk (0.08..0.95). */
export const pCorrect = (skill, diff) => Math.min(0.95, Math.max(0.08, skill + 0.25 - 0.15 * diff));
export const gauss = (R) => {
	const u = Math.max(1e-6, R());
	const v = R();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
export const thinkTime = (R, base, span) => base + R() * span;

/** Yatay kısa ekran (arayüzdeki LAND ile aynı): kart sağda durur, gövdeye az yer kalır. */
export const LAND = '@media (orientation:landscape) and (max-height:560px)';
export const isLand = () => typeof matchMedia !== 'undefined' && matchMedia('(orientation:landscape) and (max-height:560px)').matches;

/** Fisher-Yates; R() kullanır. */
export function shuffle(arr, R) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(R() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** Kısa titreşim (destekleyen telefonlarda). */
export function buzz(ms = 8) {
	try {
		navigator.vibrate?.(ms);
	} catch {
		/* yoksay */
	}
}

/** Sayı biçimi: yıl gibi küçük sayılar ham, büyükler binlik ayraçlı. */
export const fmtNum = (v) => (Math.abs(v) >= 10000 || !Number.isInteger(v) ? Number(v).toLocaleString('tr-TR') : String(v));

// ---------------------------------------------------------------- CSS (bir kez enjekte)
const injected = new Set();
const COMMON = /* css */ `
.fl-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px}
.fl-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 6px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px;animation:flq-pop .3s cubic-bezier(.3,1.5,.5,1)}
.fl-chip b{width:14px;height:14px;border-radius:5px;border:2px solid #fff}
.fl-chip em{font-style:normal;font-family:'Lilita One';opacity:.9}
.fl-chip.ok em{color:#7dff9a}
.shake{animation:flq-shake .38s}
.fl-typed b.cur{border-bottom-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.fl-typed.revealed b{color:#7dff9a}
@keyframes flq-pop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes flq-shake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.fl-ui button{touch-action:manipulation}
`;
function inject(id, text) {
	if (injected.has(id) || typeof document === 'undefined') return;
	injected.add(id);
	const s = document.createElement('style');
	s.dataset.flq = id;
	s.textContent = text;
	document.head.appendChild(s);
}
/** Tip CSS'ini bir kez ekler (ortak stiller de dahil). */
export function css(id, text) {
	inject('common', COMMON);
	inject(id, text);
}

// ---------------------------------------------------------------- klavye
/** Adam asmaca ile aynı Türkçe tuş satırları (29 harf). */
export const KEYS = 'ERTYUIOPĞÜ|ASDFGHJKLŞİ|ZCVBNMÖÇ'.split('|');

/** Ekran klavyesi. onKey(harf), onBack(). */
export function keyboard(host, { onKey, onBack }) {
	host.innerHTML = KEYS.map(
		(row, i) =>
			`<div>${[...row].map((k) => `<button class="fl-key" data-k="${k}">${k}</button>`).join('')}${
				i === 2 ? '<button class="fl-key fl-back" data-k="⌫" aria-label="sil">⌫</button>' : ''
			}</div>`,
	).join('');
	host.classList.add('fl-keys');
	host.addEventListener('click', (e) => {
		const b = e.target.closest('.fl-key');
		if (!b || b.disabled) return;
		if (b.dataset.k === '⌫') onBack();
		else onKey(b.dataset.k);
	});
	return { el: host };
}

/** Fiziksel klavye (masaüstü): kart kapanıp düğüm bağlantısı kopunca kendini kaldırır. */
export function physicalKeys(el, { onKey, onBack, onArrow }) {
	const h = (e) => {
		if (!el.isConnected) return document.removeEventListener('keydown', h);
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (e.key === 'Backspace') {
			onBack();
			e.preventDefault();
			return;
		}
		if (e.key.startsWith('Arrow')) {
			onArrow?.(e.key);
			e.preventDefault();
			return;
		}
		if (e.key.length === 1) {
			const k = trUp(e.key);
			if (KEYS.join('').includes(k)) onKey(k);
		}
	};
	document.addEventListener('keydown', h);
	return () => document.removeEventListener('keydown', h);
}

// ---------------------------------------------------------------- çoktan seçmeli gövde
/**
 * v = { opts, right }. Seçeneğe dokununca api.answer(wrap(indeks)).
 * reveal(results, pickOf): pickOf(value) → seçilen indeks.
 */
export function mountChoice(el, v, api, { wrap = (i) => i, onPick } = {}) {
	el.innerHTML = `<div class="fl-opts">${v.opts
		.map((o, i) => `<button class="fl-opt" data-i="${i}"><i>${'ABCD'[i]}</i><span>${esc(o)}</span></button>`)
		.join('')}</div>`;
	const btns = [...el.querySelectorAll('.fl-opt')];
	let done = false;
	let mine = null;
	for (const b of btns)
		b.addEventListener('click', () => {
			if (done) return;
			done = true;
			mine = Number(b.dataset.i);
			b.classList.add('pick');
			buzz();
			onPick?.(mine);
			api.answer(wrap(mine));
		});
	return {
		btns,
		lock() {
			done = true;
		},
		reveal(results, pickOf = (x) => x) {
			btns[v.right].classList.add('right');
			for (const r of results) {
				const i = r.value == null ? null : pickOf(r.value);
				if (i == null || i < 0 || i === v.right) continue;
				btns[i]?.classList.add('wrong');
			}
			for (const r of results) {
				const i = r.value == null ? null : pickOf(r.value);
				if (i != null && i >= 0) btns[i]?.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
			}
		},
		get mine() {
			return mine;
		},
	};
}

/** Cevap sonrası: oyuncu çipleri ("Ali ✓ 2.4 sn"). fn(r) → etiket. */
export function chips(results, fn) {
	return `<div class="fl-chips">${results
		.map((r) => `<span class="fl-chip${r.correct ? ' ok' : ''}"><b style="background:${r.color}"></b>${esc(r.name)}<em>${esc(fn(r))}</em></span>`)
		.join('')}</div>`;
}

/** Harf kutuları + klavye: yazılı cevap (img w). onFull(tahmin) dolunca çağrılır. */
export function typedWord(el, word, { onFull }) {
	const letters = [...word];
	const buf = [];
	el.innerHTML = `<div class="fl-word fl-typed" data-r="slots"></div><div data-r="kb"></div>`;
	const slots = el.querySelector('[data-r=slots]');
	const draw = () => {
		let k = 0;
		slots.innerHTML = letters.map((c) => (c === ' ' ? '<s></s>' : `<b class="${k === buf.length ? 'cur' : ''}">${buf[k++] || ''}</b>`)).join('');
	};
	const need = letters.filter((c) => c !== ' ').length;
	let locked = false;
	keyboard(el.querySelector('[data-r=kb]'), {
		onKey(k) {
			if (locked || buf.length >= need) return;
			buf.push(k);
			buzz(4);
			draw();
			if (buf.length === need) onFull(buf.join(''));
		},
		onBack() {
			if (locked) return;
			buf.pop();
			draw();
		},
	});
	draw();
	return {
		lock() {
			locked = true;
		},
		shake() {
			slots.classList.remove('shake');
			void slots.offsetWidth;
			slots.classList.add('shake');
			buzz(30);
		},
		clear() {
			buf.length = 0;
			draw();
		},
		fill(w) {
			buf.length = 0;
			buf.push(...[...w].filter((c) => c !== ' '));
			draw();
			slots.classList.add('revealed');
		},
		get text() {
			return buf.join('');
		},
	};
}
