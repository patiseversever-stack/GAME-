/*
 * Sığdırıcı: tek satırlık isim / etiket / rozet yazıları ASLA "…" ile kesilmez.
 * Kutusuna sığmayan yazı yarımşar piksel küçülür (en çok tabanın %55'ine kadar);
 * o da yetmezse — yalnız uzun cümle türü yazılarda — iki satıra iner.
 *
 * Tek bir MutationObserver tüm sayfayı izler: eklenen ya da metni değişen öğeler
 * bir sonraki karede ölçülür. Aynı metin + aynı genişlik için yeniden ölçülmez,
 * pencere boyu değişince ya da yazı tipi inince hepsi baştan ölçülür.
 */

/** İsimler: küçülür, alt satıra inmez. */
const NAMES = [
	'.fl-qwho .nm b',
	'.fl-tmh .tn b',
	'.fl-qp .nm b',
	'.fl-qvs span',
	'.fl-cr .nm b',
	'.rs-r>b',
	'.sr-who small u',
	'.fl-bd .bd-p b',
	'.fl-tbtns .tx b',
	'.fl-cmdchip b',
	'.fl-podium .who b',
	'.rg .nm small',
	'.fl-pl b',
	'.fl-wh-card b',
	'.fl-wh-card small',
	'.fl-duel .nm b',
	'.fl-rank .rw>b',
	'.dn-fz-pl b',
	'.dn-ht-rows span:nth-child(2)',
	'.dn-ia-slots .sl .nm',
	'.dn-km .km-ans .nm b',
	'.dn-km .km-hd em',
	'.dn-ks-last span',
	'.dn-sv .sv-pick em',
	'.gal .ty b',
	'.fl-cat b',
	'.gk-hd .kn b',
	'.gk-cap',
];
/** Cümle türü: küçülür, yine sığmazsa iki satıra iner. */
const LINES = ['.fl-q.cover .fl-opt>span', '.rs-r>em', '.rs-r>em small', '.fl-rule', '.fl-q .fl-pin-hint .ph b', '.fl-lines .ln span', '.dn-ab-b>span', '.sv-mean small', '.fl-hilo .df'];

export const FIT_NAMES = NAMES.join(',');
export const FIT_LINES = LINES.join(',');
const ALL = FIT_NAMES + ',' + FIT_LINES;
const MIN_PX = 8.5;

/** İkili arama: [lo, hi] arasında sığan en büyük boy (yarım piksel adım). Dönüş: lo'da sığdı mı. */
function shrink(el, lo, hi, over) {
	el.style.fontSize = hi + 'px';
	if (!over()) return true;
	el.style.fontSize = lo + 'px';
	if (over()) return false;
	while (hi - lo > 0.5) {
		const mid = (lo + hi) / 2;
		el.style.fontSize = mid + 'px';
		if (over()) hi = mid;
		else lo = mid;
	}
	el.style.fontSize = Math.floor(lo * 2) / 2 + 'px';
	return true;
}

/** Bir öğeyi kutusuna sığdır. Dönüş: sığdı mı. */
export function fitEl(el) {
	const w = el.clientWidth;
	if (!w || !el.isConnected) return false;
	const key = el.textContent + '|' + w;
	if (el.__fit === key) return true;
	el.style.fontSize = '';
	el.classList.remove('fit-2');
	const base = parseFloat(getComputedStyle(el).fontSize) || 14;
	const over = () => el.scrollWidth > el.clientWidth + 0.5;
	if (over()) {
		const line = el.matches(FIT_LINES);
		// isim tabanın %55'ine dek küçülür; cümle %72'de durur, sonra iki satıra iner
		const floor = Math.max(MIN_PX, base * (line ? 0.72 : 0.55));
		if (!shrink(el, floor, base, over) && line) {
			el.classList.add('fit-2');
			shrink(el, Math.max(MIN_PX, base * 0.55), base * 0.86, over);
		}
	}
	el.__fit = el.textContent + '|' + el.clientWidth;
	return true;
}

let queued = new Set();
let all = false;
let raf = 0;
const run = () => {
	raf = 0;
	const list = all ? document.querySelectorAll(ALL) : queued;
	if (all) for (const el of list) el.__fit = null;
	all = false;
	queued = new Set();
	for (const el of list) {
		try {
			fitEl(el);
		} catch {}
	}
};
const kick = () => {
	if (!raf) raf = requestAnimationFrame(run);
};
/** Her şeyi baştan ölç (yazı tipi indi, pencere değişti, ekran açıldı). */
export function refitAll() {
	all = true;
	kick();
}
const take = (n) => {
	if (n.nodeType === 3) n = n.parentElement;
	if (!n || n.nodeType !== 1) return;
	const own = n.closest?.(ALL);
	if (own) {
		queued.add(own);
		// komşular da: isim uzayınca yanındaki değerin payı daralır
		const row = own.parentElement?.parentElement;
		if (row) for (const el of row.querySelectorAll(ALL)) queued.add(el);
	}
	if (n.firstElementChild) for (const el of n.querySelectorAll(ALL)) queued.add(el);
};

let on = false;
/** Sayfa boyu izlemeyi başlat (bir kez). */
export function autoFit(root = document.body) {
	if (on || typeof MutationObserver === 'undefined') return;
	on = true;
	new MutationObserver((recs) => {
		for (const r of recs) {
			if (r.type === 'attributes') {
				// açılan/gizlenen ekran: içindeki yazıların genişliği değişmiş olabilir
				take(r.target);
				continue;
			}
			take(r.target);
			for (const n of r.addedNodes) take(n);
		}
		if (queued.size) kick();
	}).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
	addEventListener('resize', refitAll);
	document.fonts?.addEventListener?.('loadingdone', refitAll);
	document.fonts?.ready?.then(refitAll);
	// giriş animasyonu bitince (ölçek/yerleşim oturunca) bir tur daha
	setTimeout(refitAll, 600);
	refitAll();
}
