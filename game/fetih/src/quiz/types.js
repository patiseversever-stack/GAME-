// Soru tipleri. Her tip aynı sözleşmeyi uygular:
//
//   time            : süre (sn)
//   label           : kartın üstündeki tip adı
//   prepare(q, R)   : oyuna hazır görünüm (şıklar karıştırılır vb.)
//   mount(el, v, api): kartın gövdesini çizer; oyuncu cevaplayınca api.answer(value).
//                     Dönen nesne: { reveal(results), destroy() }
//   judge(v, value) : { correct, err } (err: tahmin/haritada uzaklık; küçük olan kazanır)
//   bot(v, skill, R): { value, time } botun cevabı ve düşünme süresi
//   kind            : 'exact' (bildi/bilemedi) ya da 'closest' (en yakın kazanır)
//
// Botların doğruluk modeli: P(doğru) = skill + 0.25 − 0.15·zorluk (0.08..0.95 arası).

const pCorrect = (skill, diff) => Math.min(0.95, Math.max(0.08, skill + 0.25 - 0.15 * diff));
const gauss = (R) => {
	const u = Math.max(1e-6, R());
	const v = R();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const thinkTime = (R, base, span) => base + R() * span;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// harita izdüşümü (tools/geo.mjs ile aynı)
export const GEO = { K: 6, lon0: 35.2, lat0: 39.0 };
const COS0 = Math.cos((GEO.lat0 * Math.PI) / 180);
export const lonLatToWorld = (lon, lat) => ({ x: (lon - GEO.lon0) * COS0 * GEO.K, z: -(lat - GEO.lat0) * GEO.K });
export const KM_PER_UNIT = 111.2 / GEO.K;

export const TYPES = {
	choice: {
		time: 15,
		label: 'Test',
		kind: 'exact',
		prepare(q, R) {
			const order = [0, 1, 2, 3].sort(() => R() - 0.5);
			return { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0) };
		},
		mount(el, v, api) {
			el.innerHTML = `<div class="fl-opts">${v.opts
				.map((o, i) => `<button class="fl-opt" data-i="${i}"><i>${'ABCD'[i]}</i><span>${esc(o)}</span></button>`)
				.join('')}</div>`;
			const btns = [...el.querySelectorAll('.fl-opt')];
			let done = false;
			for (const b of btns)
				b.addEventListener('click', () => {
					if (done) return;
					done = true;
					b.classList.add('pick');
					api.answer(Number(b.dataset.i));
				});
			return {
				lock() {
					done = true;
				},
				reveal(results) {
					btns[v.right].classList.add('right');
					for (const r of results) {
						if (r.value == null || r.value === v.right) continue;
						btns[r.value]?.classList.add('wrong');
					}
					for (const r of results) if (r.value != null) btns[r.value]?.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				},
				destroy() {},
			};
		},
		judge(v, value) {
			return { correct: value === v.right, err: value === v.right ? 0 : 1 };
		},
		bot(v, skill, R) {
			const ok = R() < pCorrect(skill, v.q.diff);
			let value = v.right;
			if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
			return { value, time: thinkTime(R, 2.5, 7) };
		},
	},

	tf: {
		time: 8,
		label: 'Doğru mu?',
		kind: 'exact',
		prepare(q) {
			return { q, right: q.ans ? 0 : 1 };
		},
		mount(el, v, api) {
			el.innerHTML = `<div class="fl-tf"><button class="fl-opt fl-yes" data-i="0"><span>DOĞRU</span></button><button class="fl-opt fl-no" data-i="1"><span>YANLIŞ</span></button></div>`;
			const btns = [...el.querySelectorAll('.fl-opt')];
			let done = false;
			for (const b of btns)
				b.addEventListener('click', () => {
					if (done) return;
					done = true;
					b.classList.add('pick');
					api.answer(Number(b.dataset.i));
				});
			return {
				lock() {
					done = true;
				},
				reveal(results) {
					btns[v.right].classList.add('right');
					btns[1 - v.right].classList.add('dim');
					for (const r of results) if (r.value != null) btns[r.value]?.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				},
				destroy() {},
			};
		},
		judge(v, value) {
			return { correct: value === v.right, err: value === v.right ? 0 : 1 };
		},
		bot(v, skill, R) {
			const ok = R() < Math.min(0.97, pCorrect(skill, v.q.diff) + 0.1);
			return { value: ok ? v.right : 1 - v.right, time: thinkTime(R, 1.5, 4) };
		},
	},

	num: {
		time: 20,
		label: 'Tahmin',
		kind: 'closest',
		prepare(q) {
			return { q };
		},
		mount(el, v, api) {
			const q = v.q;
			const mid = Math.round((q.min + q.max) / 2);
			el.innerHTML = `<div class="fl-num">
				<div class="fl-num-val"><b data-r="val">${mid}</b><small>${esc(q.unit || '')}</small></div>
				<input class="fl-range" type="range" min="${q.min}" max="${q.max}" step="1" value="${mid}" aria-label="tahmin">
				<div class="fl-num-row">
					<button class="fl-step" data-d="-10">−10</button><button class="fl-step" data-d="-1">−1</button>
					<button class="fl-step" data-d="1">+1</button><button class="fl-step" data-d="10">+10</button>
				</div>
				<button class="fl-send">GÖNDER</button>
			</div>`;
			const range = el.querySelector('.fl-range');
			const val = el.querySelector('[data-r=val]');
			const big = Math.max(1, Math.round((q.max - q.min) / 200));
			const set = (x) => {
				x = Math.max(q.min, Math.min(q.max, Math.round(x)));
				range.value = String(x);
				val.textContent = x.toLocaleString('tr-TR');
			};
			set(mid);
			range.addEventListener('input', () => set(Number(range.value)));
			for (const b of el.querySelectorAll('.fl-step')) b.addEventListener('click', () => set(Number(range.value) + Number(b.dataset.d) * (Math.abs(b.dataset.d) > 1 ? big : 1)));
			let done = false;
			el.querySelector('.fl-send').addEventListener('click', () => {
				if (done) return;
				done = true;
				el.querySelector('.fl-num').classList.add('sent');
				api.answer(Number(range.value));
			});
			return {
				lock() {
					done = true;
				},
				value: () => Number(range.value),
				reveal(results) {
					const rows = results
						.slice()
						.sort((a, b) => a.err - b.err)
						.map((r) => `<div class="fl-guess"><b style="background:${r.color}"></b><span>${esc(r.name)}</span><em>${r.value == null ? '—' : Number(r.value).toLocaleString('tr-TR')}</em></div>`)
						.join('');
					el.innerHTML = `<div class="fl-num-ans"><small>Doğru cevap</small><b>${q.ans.toLocaleString('tr-TR')} ${esc(q.unit || '')}</b></div><div class="fl-guesses">${rows}</div>`;
				},
				destroy() {},
			};
		},
		judge(v, value) {
			if (value == null) return { correct: false, err: Infinity };
			const err = Math.abs(value - v.q.ans);
			return { correct: err === 0, err };
		},
		bot(v, skill, R) {
			const q = v.q;
			const sigma = (1.15 - skill) * 0.32 * (0.7 + 0.3 * q.diff);
			// bilenler tam bilir: biraz şans tam isabet
			const exact = R() < pCorrect(skill, q.diff) * 0.35;
			const span = q.max - q.min;
			let value = exact ? q.ans : q.ans + gauss(R) * sigma * Math.min(span, Math.abs(q.ans) + span * 0.2) * 0.5;
			value = Math.round(Math.max(q.min, Math.min(q.max, value)));
			return { value, time: thinkTime(R, 4, 11) };
		},
	},

	pin: {
		time: 15,
		label: 'Haritada bul',
		kind: 'closest',
		needsMap: true,
		prepare(q) {
			return { q, target: lonLatToWorld(q.lon, q.lat) };
		},
		mount(el, v, api) {
			el.innerHTML = `<div class="fl-pin-hint"><span>Haritaya dokun, iğneyi yerleştir</span><button class="fl-send" disabled>ONAYLA</button></div>`;
			const send = el.querySelector('.fl-send');
			let pt = null;
			let done = false;
			api.onMapTap((p) => {
				if (done) return;
				pt = p;
				api.showPin(p);
				send.disabled = false;
			});
			send.addEventListener('click', () => {
				if (done || !pt) return;
				done = true;
				api.answer(pt);
			});
			return {
				lock() {
					done = true;
				},
				reveal(results) {
					const rows = results
						.slice()
						.sort((a, b) => a.err - b.err)
						.map((r) => `<div class="fl-guess"><b style="background:${r.color}"></b><span>${esc(r.name)}</span><em>${r.value == null ? '—' : Math.round(r.err) + ' km'}</em></div>`)
						.join('');
					el.innerHTML = `<div class="fl-guesses">${rows}</div>`;
				},
				destroy() {},
			};
		},
		judge(v, value) {
			if (!value) return { correct: false, err: Infinity };
			const km = Math.hypot(value.x - v.target.x, value.z - v.target.z) * KM_PER_UNIT;
			return { correct: km < 40, err: km };
		},
		bot(v, skill, R) {
			const km = Math.abs(gauss(R)) * ((1 - skill) * 260 + 25) * (0.7 + 0.25 * v.q.diff);
			const a = R() * Math.PI * 2;
			const d = km / KM_PER_UNIT;
			return { value: { x: v.target.x + Math.cos(a) * d, z: v.target.z + Math.sin(a) * d }, time: thinkTime(R, 3, 8) };
		},
	},

	hang: {
		time: 30,
		label: 'Adam asmaca',
		kind: 'exact',
		prepare(q) {
			return { q, word: q.w.toLocaleUpperCase('tr-TR') };
		},
		mount(el, v, api) {
			const KEYS = 'ERTYUIOPĞÜ|ASDFGHJKLŞİ|ZCVBNMÖÇ'.split('|');
			const word = [...v.word];
			const shown = word.map((c) => (c === ' ' ? ' ' : null));
			let wrong = 0;
			const MAX = 6;
			el.innerHTML = `<div class="fl-hang">
				<div class="fl-towers" data-r="tw">${Array.from({ length: MAX }, () => '<i></i>').join('')}</div>
				<div class="fl-word" data-r="word"></div>
				<div class="fl-keys">${KEYS.map((row) => `<div>${[...row].map((k) => `<button class="fl-key" data-k="${k}">${k}</button>`).join('')}</div>`).join('')}</div>
			</div>`;
			const wEl = el.querySelector('[data-r=word]');
			const tw = [...el.querySelectorAll('.fl-towers i')];
			const draw = () => {
				wEl.innerHTML = shown.map((c, i) => (word[i] === ' ' ? '<s></s>' : `<b>${c || ''}</b>`)).join('');
				tw.forEach((t, i) => t.classList.toggle('down', i < wrong));
			};
			draw();
			let done = false;
			for (const b of el.querySelectorAll('.fl-key'))
				b.addEventListener('click', () => {
					if (done || b.disabled) return;
					b.disabled = true;
					const k = b.dataset.k;
					let hit = false;
					word.forEach((c, i) => {
						if (c === k) {
							shown[i] = c;
							hit = true;
						}
					});
					b.classList.add(hit ? 'hit' : 'miss');
					if (!hit) wrong++;
					draw();
					if (shown.every((c, i) => c != null || word[i] === ' ')) {
						done = true;
						api.answer({ ok: true, wrong });
					} else if (wrong >= MAX) {
						done = true;
						api.answer({ ok: false, wrong });
					}
				});
			return {
				lock() {
					done = true;
				},
				reveal() {
					word.forEach((c, i) => (shown[i] = c));
					draw();
					wEl.classList.add('revealed');
				},
				destroy() {},
			};
		},
		judge(v, value) {
			if (!value) return { correct: false, err: 99 };
			return { correct: !!value.ok, err: value.ok ? value.wrong : 99 };
		},
		bot(v, skill, R) {
			const ok = R() < pCorrect(skill, v.q.diff) + 0.05;
			const wrong = Math.floor(R() * (ok ? 4 : 1)) + (ok ? 0 : 6);
			return { value: { ok, wrong: ok ? wrong : 6 }, time: thinkTime(R, 7, 14) };
		},
	},
};
