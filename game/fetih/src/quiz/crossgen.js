// Mini çengel bulmaca yerleştirici.
// layout(words, R) → { rows, cols, words: [{w, clue, r, c, dir:'a'|'d', n}], cells: [{r,c,ch}], ok }
// Kural: her yeni kelime en az bir harfte öncekilerle kesişir; yan yana değen ama kesişmeyen harf olmaz.
// 'a' = yatay (soldan sağa), 'd' = dikey (yukarıdan aşağı).

const key = (r, c) => r + ',' + c;

function fits(grid, w, r, c, dir) {
	const dr = dir === 'd' ? 1 : 0;
	const dc = dir === 'a' ? 1 : 0;
	// kelimenin öncesi ve sonrası boş olmalı
	if (grid.has(key(r - dr, c - dc)) || grid.has(key(r + dr * w.length, c + dc * w.length))) return -1;
	let cross = 0;
	for (let i = 0; i < w.length; i++) {
		const rr = r + dr * i;
		const cc = c + dc * i;
		const cell = grid.get(key(rr, cc));
		if (cell) {
			if (cell.ch !== w[i] || cell.dirs.has(dir)) return -1;
			cross++;
		} else {
			// kesişmeyen hücrenin yan komşuları boş olmalı
			if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return -1;
		}
	}
	return cross;
}

function put(grid, w, r, c, dir) {
	const dr = dir === 'd' ? 1 : 0;
	const dc = dir === 'a' ? 1 : 0;
	for (let i = 0; i < w.length; i++) {
		const k = key(r + dr * i, c + dc * i);
		const cell = grid.get(k);
		if (cell) cell.dirs.add(dir);
		else grid.set(k, { ch: w[i], dirs: new Set([dir]) });
	}
}

function bounds(placed) {
	let r0 = 1e9;
	let c0 = 1e9;
	let r1 = -1e9;
	let c1 = -1e9;
	for (const p of placed) {
		const er = p.r + (p.dir === 'd' ? p.w.length - 1 : 0);
		const ec = p.c + (p.dir === 'a' ? p.w.length - 1 : 0);
		r0 = Math.min(r0, p.r);
		c0 = Math.min(c0, p.c);
		r1 = Math.max(r1, er);
		c1 = Math.max(c1, ec);
	}
	return { r0, c0, r1, c1, rows: r1 - r0 + 1, cols: c1 - c0 + 1 };
}

function attempt(items, R) {
	const grid = new Map();
	const placed = [];
	const first = items[0];
	put(grid, first.w, 0, 0, 'a');
	placed.push({ ...first, r: 0, c: 0, dir: 'a' });
	let crossings = 0;
	for (let k = 1; k < items.length; k++) {
		const it = items[k];
		let best = null;
		for (const p of placed) {
			const pd = p.dir;
			const dir = pd === 'a' ? 'd' : 'a';
			for (let i = 0; i < p.w.length; i++) {
				for (let j = 0; j < it.w.length; j++) {
					if (p.w[i] !== it.w[j]) continue;
					// p'nin i. harfi it'in j. harfi olacak
					const pr = p.r + (pd === 'd' ? i : 0);
					const pc = p.c + (pd === 'a' ? i : 0);
					const r = dir === 'd' ? pr - j : pr;
					const c = dir === 'a' ? pc - j : pc;
					const x = fits(grid, it.w, r, c, dir);
					if (x < 1) continue;
					const test = bounds([...placed, { w: it.w, r, c, dir }]);
					const score = x * 3 - test.rows * test.cols * 0.08 - Math.abs(test.rows - test.cols) * 0.4 + R() * 0.6;
					if (!best || score > best.score) best = { r, c, dir, score, x };
				}
			}
		}
		if (!best) return null;
		put(grid, it.w, best.r, best.c, best.dir);
		placed.push({ ...it, r: best.r, c: best.c, dir: best.dir });
		crossings += best.x;
	}
	const b = bounds(placed);
	return { placed, b, crossings, grid };
}

export function layout(words, R = Math.random) {
	const base = words.map((x) => ({ w: x.w, clue: x.clue }));
	let best = null;
	for (let t = 0; t < 60; t++) {
		// ilk kelime uzun olsun; geri kalanı karışık
		const rest = base.slice().sort(() => R() - 0.5);
		rest.sort((a, b) => b.w.length - a.w.length + (R() - 0.5) * 2.5);
		const res = attempt(rest, R);
		if (!res) continue;
		const area = res.b.rows * res.b.cols;
		const score = -area - Math.abs(res.b.rows - res.b.cols) * 1.5 + res.crossings * 2;
		if (!best || score > best.score) best = { ...res, score };
	}
	if (!best) {
		// yedek: hepsini alt alta, kesişmesiz yatay yerleştir (içerik hatası; oyun yine de çalışır)
		const placed = base.map((x, i) => ({ ...x, r: i * 2, c: 0, dir: 'a' }));
		const grid = new Map();
		for (const p of placed) put(grid, p.w, p.r, p.c, 'a');
		best = { placed, b: bounds(placed), grid, crossings: 0 };
		best.ok = false;
	} else best.ok = true;
	const { r0, c0, rows, cols } = best.b;
	const out = best.placed.map((p) => ({ w: p.w, clue: p.clue, r: p.r - r0, c: p.c - c0, dir: p.dir }));
	// numaralandırma: okuma sırası (satır, sütun); aynı başlangıç hücresi aynı numarayı alır
	const starts = [...new Set(out.map((p) => p.r * 100 + p.c))].sort((a, b) => a - b);
	for (const p of out) p.n = starts.indexOf(p.r * 100 + p.c) + 1;
	out.sort((a, b) => a.n - b.n || (a.dir === 'a' ? -1 : 1));
	const cells = [];
	const seen = new Set();
	for (const p of out)
		for (let i = 0; i < p.w.length; i++) {
			const r = p.r + (p.dir === 'd' ? i : 0);
			const c = p.c + (p.dir === 'a' ? i : 0);
			if (seen.has(key(r, c))) continue;
			seen.add(key(r, c));
			cells.push({ r, c, ch: p.w[i] });
		}
	return { rows, cols, words: out, cells, ok: best.ok };
}
