// Maç içi duraklatma: sağ üstte duraklat düğmesi, duraklatma ekranı (devam, ses, maçtan çık) ve çıkış onayı.
// Duraklatınca oyun saati (core/clock.js), çizim döngüsü ve ses durur; App.pause / resume / exitMatch yönetir.
// Sekme arka plana geçerse maç kendiliğinden duraklar (App._onVis). Masaüstünde Esc duraklatır ve devam ettirir.

import { esc, ico } from './art.js';
import { OUT, LAND } from './cssutil.js';

const PHASE = { baslangic: 'Maç başlıyor', baskent: 'Başkentler', yayilma: 'Yayılma', fetih: 'Fetih', bitis: 'Maç sonu' };

export const CSS_PAUSE = /* css */ `
/* ---------------------------------------------------------------- duraklat düğmesi ve ekranı */
.fl-pbtn{position:absolute;right:8px;top:calc(var(--sat) + 100px);width:42px;height:42px;display:flex;align-items:center;justify-content:center;padding:0;
  border-radius:14px;border:2.5px solid rgba(255,255,255,.55);background:var(--panel);box-shadow:0 4px 0 var(--navy-d),0 6px 10px rgba(0,0,0,.28);
  pointer-events:auto;transition:transform .08s,opacity .25s}
.fl-pbtn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--navy-d),0 3px 6px rgba(0,0,0,.25)}
.fl-pbtn .fl-i{width:22px;height:22px}
.fl-pbtn.off{opacity:0;pointer-events:none}
.fl-pause{background:rgba(5,9,22,.72);z-index:5}
/* duraklamada arayüzün CSS animasyonları da durur (soru çubuğu, sayaç, sahne bayrağı) */
.fl-ui.paused>:not(.fl-pause),.fl-ui.paused>:not(.fl-pause) *{animation-play-state:paused!important}
.fl-pause .box{width:min(100%,360px);display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:20px 16px 18px;border-radius:26px;
  background:var(--panel);border:3px solid rgba(255,210,90,.55);box-shadow:0 8px 0 var(--navy-d),0 14px 30px rgba(0,0,0,.4);transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.fl-pause.off .box{transform:scale(.9)}
.fl-pause h3{margin:0;text-align:center;font-family:'Lilita One';font-weight:400;font-size:clamp(30px,calc(9 * var(--vw)),40px);line-height:1;color:var(--gold);${OUT('#3a2000', 3)}}
.fl-pause .st{align-self:center;padding:3px 14px 4px;border-radius:999px;font-size:14.5px;background:var(--ink);border:2px solid rgba(255,255,255,.22);color:#cfe0ff}
.fl-pause .fl-btn{width:100%}
.fl-pause .fl-btn.big{font-size:clamp(22px,calc(7 * var(--vw)),28px);padding:12px 16px 15px}
.fl-pause .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-pause .row .fl-btn{font-size:17px;padding:9px 8px 11px}
.fl-pause p{margin:0;text-align:center;font-size:15.5px;line-height:1.35;color:#e4ecff}
.fl-pause [data-v]{display:flex;flex-direction:column;gap:12px}
.fl-pause [data-v][hidden]{display:none}
${LAND} {
  .fl-pbtn{top:calc(var(--sat) + 8px)}
  .fl-pause .box{padding:14px 14px 12px;gap:9px}
}
`;

/** Düğme ve ekran kurulumu (UI kurucusu çağırır). */
export function buildPause(ui) {
	const $ = ui.$;
	$.pbtn.innerHTML = ico('pause', { w: 3.2 });
	$.pbtn.setAttribute('aria-label', 'Duraklat');
	$.pbtn.addEventListener('click', () => {
		ui.sfx('tap');
		ui.app.pause?.();
	});
	$.pause.addEventListener('click', (e) => {
		const b = e.target.closest('[data-p]');
		if (!b) return;
		ui.sfx('tap');
		const a = b.dataset.p;
		if (a === 'devam') ui.app.resume?.();
		else if (a === 'ses') {
			ui.app.sfx?.toggle?.();
			soundLabel(ui);
		} else if (a === 'cik') view(ui, 'onay');
		else if (a === 'vazgec') view(ui, 'ana');
		else if (a === 'evet') ui.app.exitMatch?.();
	});
	addEventListener('keydown', (e) => {
		if (e.key !== 'Escape' || e.repeat) return;
		if (!$.pause.classList.contains('off')) {
			if ($.pause.querySelector('[data-v="onay"]').hidden) ui.app.resume?.();
			else view(ui, 'ana');
		} else if (!$.pbtn.classList.contains('off')) ui.app.pause?.();
	});
}

/** Duraklatma ekranını aç / kapat. */
export function showPause(ui, on) {
	const el = ui.$.pause;
	if (!on) {
		el.classList.add('off');
		return;
	}
	const m = ui.app.match;
	const phase = m?.phase === 'fetih' && m.rounds ? `Fetih · Tur ${Math.min(m.round, m.rounds)} / ${m.rounds}` : PHASE[m?.phase] || '';
	el.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="Duraklatıldı">
		<div data-v="ana">
			<h3>DURAKLATILDI</h3>
			${phase ? `<span class="st">${esc(phase)}</span>` : ''}
			<button class="fl-btn big green" data-p="devam">${ico('play', { w: 2.8 })}DEVAM ET</button>
			<div class="row">
				<button class="fl-btn navy" data-p="ses"></button>
				<button class="fl-btn red" data-p="cik">${ico('exit', { w: 2.6 })}Maçtan Çık</button>
			</div>
		</div>
		<div data-v="onay" hidden>
			<h3>ÇIKILSIN MI?</h3>
			<p>Maç yarıda kalır. Bu maçtan puan, altın ve XP kazanılmaz.</p>
			<div class="row">
				<button class="fl-btn navy" data-p="vazgec">${ico('back', { w: 2.6 })}Vazgeç</button>
				<button class="fl-btn red" data-p="evet">${ico('exit', { w: 2.6 })}Çık</button>
			</div>
		</div>
	</div>`;
	soundLabel(ui);
	el.classList.remove('off');
	el.querySelector('[data-p="devam"]').focus({ preventScroll: true });
}

function view(ui, v) {
	for (const d of ui.$.pause.querySelectorAll('[data-v]')) d.hidden = d.dataset.v !== v;
	ui.$.pause.querySelector(v === 'onay' ? '[data-p="vazgec"]' : '[data-p="devam"]')?.focus({ preventScroll: true });
}

function soundLabel(ui) {
	const b = ui.$.pause.querySelector('[data-p="ses"]');
	if (!b) return;
	const muted = !!ui.app.sfx?.muted;
	b.innerHTML = `${ico(muted ? 'mute' : 'sound', { w: 2.6 })}Ses ${muted ? 'Kapalı' : 'Açık'}`;
}
