// Düello sahnesi: saldıran ve savunan komutanlar iki yandan kayarak gelir, ortada VS çarpar,
// altta hedef il ve kategori şeridi açılır. Dokununca geçilir. Kuşatmada kale canı da görünür.

import { CATS } from '../quiz/categories.js';
import { esc, ico, shade, avatar, bannerSVG } from './art.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function duelIntro(ui, ctx) {
	const { attacker: a, defender: d, target, T, q } = ctx;
	const app = ui.app;
	const el = ui.$.duel;
	const prov = target != null ? app.board?.provinces?.[target] : null;
	const name = prov ? prov.name : '';
	const siege = ctx.title === 'KUŞATMA' || (prov && d.capital === target);
	const c = CATS[ctx.cat] || CATS[q?.cat] || { name: 'Genel', color: '#4a8cff', icon: 'star' };
	const La = ui.look(a);
	const Ld = ui.look(d);
	const hp = app.castles?.[d.i]?.hp ?? 0;
	const side = (p, L, k, tag) => `<div class="sd ${k}" style="--pc:${p.css}">
		<div class="pt"><span class="flag">${bannerSVG(L.banner, p.css)}</span><span class="fl-av">${avatar(L)}</span></div>
		<div class="nm"><b>${esc(p.name)}</b><small>${tag}</small>${
			k === 'd' && siege ? `<span class="hp">${[0, 1, 2].map((j) => `<i class="${j < hp ? '' : 'off'}"></i>`).join('')}</span>` : ''
		}</div></div>`;
	el.innerHTML = `<div class="shk">
		<div class="dz a" style="--c:${shade(a.css, 0.05)};--c2:${shade(a.css, -0.55)}"></div>
		<div class="dz d" style="--c:${shade(d.css, 0.05)};--c2:${shade(d.css, -0.55)}"></div>
		<div class="slash"></div>
		<div class="lay">
		${side(a, La, 'a', a.human ? 'SALDIRIYORSUN' : 'SALDIRAN')}
		<div class="mid"><div class="vs"><span class="sw">${ico('swords', { w: 2.2, c: 'rgba(255,255,255,.9)', o: 2.5, oc: 'rgba(0,0,0,.35)' })}</span><b>VS</b></div>
		<div class="rib"><span class="k">${siege ? ico('castle', { w: 2.6 }) + 'KUŞATMA' : ico('swords', { w: 2.6, c: '#4a2800' }) + 'DÜELLO'}</span>
			${name ? `<b>${esc(name.toLocaleUpperCase('tr-TR'))}${siege ? ' KALESİ' : ''}</b>` : ''}
			<span class="c" style="--cc:${c.color}"><span class="ci">${ico(c.icon, { w: 2.6 })}</span>${esc(c.name)} · ${esc(T?.label || '')}</span></div></div>
		${side(d, Ld, 'd', siege ? (d.human ? 'KALENİ SAVUN' : 'KALE') : d.human ? 'SAVUNUYORSUN' : 'SAVUNAN')}
		</div>
		<div class="flash"></div>
		<div class="skip">DOKUN, GEÇ</div></div>`;
	// ışık çizgisi iki panelin sınırına otursun
	const W = ui.el.clientWidth || innerWidth;
	const H = ui.el.clientHeight || innerHeight;
	const land = W > H && H < 560;
	el.style.setProperty('--sa', (land ? Math.atan((0.14 * W) / H) : -Math.atan((0.2 * H) / W)).toFixed(4) + 'rad');
	el.className = 'fl-duel on' + (siege ? ' siege' : '');
	const gen = ui._gen;
	ui.sfx('whoosh');
	let skip = null;
	const skipped = new Promise((r) => (skip = r));
	const t0 = performance.now();
	el.onpointerdown = () => {
		if (performance.now() - t0 > 450) skip();
	};
	const clash = setTimeout(() => {
		ui.sfx('vs');
		const r = el.getBoundingClientRect();
		const vs = el.querySelector('.vs')?.getBoundingClientRect() || r;
		const x = vs.left + vs.width / 2;
		const y = vs.top + vs.height / 2;
		ui.fx.ring(x, y, { color: '#fff3b0', size: Math.max(r.width, r.height) * 0.9, life: 650 });
		ui.fx.burst(x, y, { n: 20, dist: 150, colors: ['#ffd25a', '#fff', a.css, d.css], kind: 'star', size: 13, life: 800 });
	}, 470);
	const mine = a.human || d.human;
	await Promise.race([sleep(ui.rm ? 900 : mine ? 1900 : 1350), skipped]);
	clearTimeout(clash);
	if (gen !== ui._gen) return;
	el.onpointerdown = null;
	el.classList.add('out');
	await sleep(280);
	if (gen !== ui._gen) return;
	el.className = 'fl-duel';
	el.innerHTML = '';
}
