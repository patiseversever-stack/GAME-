// Dikey kilit: oyun her zaman dikey bir alanda çizilir ve oynanır.
// - Geniş ekranda (masaüstü, yatay tablet) oyun ortada telefon oranında bir sütundur; yanlar boş zemin.
// - Telefon yan çevrilince "telefonunu dik tut" perdesi çıkar ve sürmekte olan maç duraklar.
// - Destekleyen tarayıcılarda (Android tam ekran ya da ana ekrana eklenmiş uygulama) ekran yönü dikeye kilitlenir.
// Kök öğenin eni burada ayarlanır; App bunu kendi resize dinleyicisinde okur (bu dinleyici önce kurulur).
// Arayüz stilleri vw/vh yerine --vw/--vh kullanır (sütunun yüzdesi), böylece kartlar sütuna sığar.

const RATIO = 9 / 16; // sütunun en geniş oranı (en / boy); daha dar ekranlar tam genişlik kullanır
const PHONE_LAND = '(orientation:landscape) and (max-height:560px) and (pointer:coarse)';

const CSS = `
.fl-turn{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;text-align:center;
  background:radial-gradient(circle at 50% 40%,#2b4a7e,#0f1a33);color:#fff;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;touch-action:none}
.fl-turn.on{display:flex}
.fl-turn svg{width:64px;height:64px;animation:flTurn 2.4s ease-in-out infinite}
.fl-turn b{font-family:'Lilita One',system-ui,sans-serif;font-weight:400;font-size:30px;line-height:1.05;color:#ffd25a;text-shadow:0 3px 0 #5a2a00}
.fl-turn span{font-size:15px;color:#cfe0ff}
@keyframes flTurn{0%,30%{transform:rotate(-90deg)}60%,100%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){.fl-turn svg{animation:none}}
`;

const PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>`;

/** root: oyunun kök öğesi (position:fixed). Dönüş: { bind(app) } — perde açılınca maç duraklasın. */
export function lockPortrait(root) {
	const st = document.createElement('style');
	st.textContent = CSS;
	document.head.appendChild(st);
	const turn = document.createElement('div');
	turn.className = 'fl-turn';
	turn.setAttribute('role', 'alert');
	turn.innerHTML = `${PHONE}<b>Telefonunu dik tut</b><span>Fetih Ligi dikey oynanır</span>`;
	root.parentNode.appendChild(turn);
	const mq = matchMedia(PHONE_LAND);
	let app = null;

	const fit = () => {
		const W = innerWidth;
		const H = innerHeight;
		const w = Math.min(W, Math.round(H * RATIO));
		root.style.width = w + 'px';
		root.style.left = Math.round((W - w) / 2) + 'px';
		root.style.right = 'auto';
		root.style.setProperty('--vw', w / 100 + 'px'); // arayüzün vw yerine kullandığı birim: sütunun yüzdesi
		root.style.setProperty('--vh', H / 100 + 'px');
		root.style.boxShadow = w < W ? '0 0 48px rgba(0,0,0,.55)' : '';
		const side = mq.matches;
		turn.classList.toggle('on', side);
		if (side) app?.pause?.();
	};
	fit();
	addEventListener('resize', fit);
	mq.addEventListener?.('change', fit);
	try {
		screen.orientation?.lock?.('portrait').catch(() => {}); // çoğu tarayıcı yalnızca tam ekranda izin verir
	} catch (e) {
		/* desteklenmiyor */
	}
	return {
		bind(a) {
			app = a;
			fit();
		},
	};
}
