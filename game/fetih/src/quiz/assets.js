// Görsel varlık manifesti: id → { name, url?, draw?, decor?, bg?, focus? }
//
//   url    : gerçek (yapay zekâyla üretilmiş) görselin adresi. Varsa o kullanılır; yüklenemezse draw'a düşer.
//   draw   : yedek (prosedürel) çizim. 400×300 sanal uzayda, şeffaf zeminde çizer: draw(g, o).
//            o.sil true ise yalnızca gövde şekli çizilmeli (ayrıntı yok): siluet kipi bunu siyaha boyar.
//   decor  : yalnızca renkli kipte çizilen süs (güneş, bulut, zemin...). Siluette çizilmez.
//   bg     : [üst, alt] arka plan renkleri.
//   focus  : [x, y] yakınlaştırma kipinin odak noktası (sanal uzay).
//   name   : Türkçe görünen ad.
//
// Gerçek görsel eklemek için yalnızca `url` verin (4:3 oran önerilir; siluet kipi için şeffaf PNG).
// `draw` silinmek zorunda değil, yedek olarak kalır.

export const ASSETS = {};

const INK = '#1b2440';
const W0 = 400;
const H0 = 300;

// ---------------------------------------------------------------- çizim yardımcıları
function poly(g, pts, fill, stroke, lw = 3) {
	g.beginPath();
	pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
	g.closePath();
	paint(g, fill, stroke, lw);
}
function paint(g, fill, stroke, lw = 3) {
	if (fill) {
		g.fillStyle = fill;
		g.fill();
	}
	if (stroke) {
		g.strokeStyle = stroke;
		g.lineWidth = lw;
		g.lineJoin = 'round';
		g.lineCap = 'round';
		g.stroke();
	}
}
function rect(g, x, y, w, h, fill, stroke, lw) {
	g.beginPath();
	g.rect(x, y, w, h);
	paint(g, fill, stroke, lw);
}
function rrect(g, x, y, w, h, r, fill, stroke, lw) {
	g.beginPath();
	g.moveTo(x + r, y);
	g.arcTo(x + w, y, x + w, y + h, r);
	g.arcTo(x + w, y + h, x, y + h, r);
	g.arcTo(x, y + h, x, y, r);
	g.arcTo(x, y, x + w, y, r);
	g.closePath();
	paint(g, fill, stroke, lw);
}
function circ(g, x, y, r, fill, stroke, lw) {
	g.beginPath();
	g.arc(x, y, r, 0, Math.PI * 2);
	paint(g, fill, stroke, lw);
}
function ell(g, x, y, rx, ry, fill, stroke, lw, rot = 0) {
	g.beginPath();
	g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
	paint(g, fill, stroke, lw);
}
function line(g, x1, y1, x2, y2, stroke, lw = 3) {
	g.beginPath();
	g.moveTo(x1, y1);
	g.lineTo(x2, y2);
	g.strokeStyle = stroke;
	g.lineWidth = lw;
	g.lineCap = 'round';
	g.stroke();
}
function star(g, cx, cy, R, r, n, rot, fill, stroke, lw) {
	const pts = [];
	for (let i = 0; i < n * 2; i++) {
		const a = rot + (i * Math.PI) / n;
		const rr = i % 2 ? r : R;
		pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
	}
	poly(g, pts, fill, stroke, lw);
}
function cloud(g, x, y, s, fill = '#fff') {
	g.fillStyle = fill;
	g.beginPath();
	g.arc(x, y, 16 * s, 0, 7);
	g.arc(x + 18 * s, y - 8 * s, 20 * s, 0, 7);
	g.arc(x + 40 * s, y, 16 * s, 0, 7);
	g.rect(x, y - 2 * s, 40 * s, 16 * s);
	g.fill();
}
function sun(g, x, y, r, fill = '#ffe27a') {
	const gr = g.createRadialGradient(x, y, r * 0.3, x, y, r * 2.2);
	gr.addColorStop(0, 'rgba(255,240,170,.9)');
	gr.addColorStop(1, 'rgba(255,240,170,0)');
	g.fillStyle = gr;
	g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
	circ(g, x, y, r, fill);
}
function ground(g, y, fill = '#7bc86a', top = '#5aa84a') {
	rect(g, -20, y, W0 + 40, H0 - y + 20, fill);
	rect(g, -20, y, W0 + 40, 6, top);
}
function sea(g, y) {
	const gr = g.createLinearGradient(0, y, 0, H0);
	gr.addColorStop(0, '#3a8fd0');
	gr.addColorStop(1, '#1f5fa0');
	g.fillStyle = gr;
	g.fillRect(-20, y, W0 + 40, H0 - y + 20);
	g.strokeStyle = 'rgba(255,255,255,.45)';
	g.lineWidth = 3;
	g.lineCap = 'round';
	for (let r = 0; r < 3; r++)
		for (let i = 0; i < 6; i++) {
			const x = ((i * 83 + r * 41) % 440) - 20;
			const yy = y + 14 + r * 15;
			g.beginPath();
			g.moveTo(x, yy);
			g.quadraticCurveTo(x + 10, yy - 6, x + 20, yy);
			g.quadraticCurveTo(x + 30, yy + 6, x + 40, yy);
			g.stroke();
		}
}

const def = (id, name, o) => (ASSETS[id] = { name, ...o });
const SKY = ['#82cbff', '#eaf7ff'];

// ---------------------------------------------------------------- bayraklar (3:2)
function flag(id, name, drawFlag, { w = 320, bg = ['#5a79c8', '#a9c0f0'], focus } = {}) {
	const h = 210;
	def(id, name, {
		bg,
		focus,
		draw(g) {
			g.save();
			g.translate(200 - w / 2, 45);
			// gölge ve gövde
			g.fillStyle = 'rgba(0,0,0,.22)';
			g.fillRect(6, 9, w, h);
			g.save();
			g.beginPath();
			g.rect(0, 0, w, h);
			g.clip();
			drawFlag(g, w, h);
			// hafif dalga parlaması
			const gr = g.createLinearGradient(0, 0, w, 0);
			gr.addColorStop(0, 'rgba(255,255,255,.22)');
			gr.addColorStop(0.35, 'rgba(255,255,255,0)');
			gr.addColorStop(0.7, 'rgba(0,0,0,.1)');
			gr.addColorStop(1, 'rgba(255,255,255,.12)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
			g.restore();
			g.strokeStyle = 'rgba(20,30,60,.55)';
			g.lineWidth = 3;
			g.strokeRect(0, 0, w, h);
			g.restore();
		},
	});
}

flag(
	'bayrak_tr',
	'Türkiye bayrağı',
	(g, w, h) => {
		rect(g, 0, 0, w, h, '#e30a17');
		circ(g, 0.36 * w * 0.98, h / 2, 0.25 * h, '#fff');
		circ(g, 0.36 * w * 0.98 + 0.06 * h, h / 2, 0.2 * h, '#e30a17');
		star(g, 0.36 * w * 0.98 + 0.34 * h, h / 2, 0.125 * h, 0.05 * h, 5, 0, '#fff');
	},
	{ focus: [190, 150] },
);
flag('bayrak_jp', 'Japonya bayrağı', (g, w, h) => {
	rect(g, 0, 0, w, h, '#fff');
	circ(g, w / 2, h / 2, 0.3 * h, '#bc002d');
});
flag('bayrak_de', 'Almanya bayrağı', (g, w, h) => {
	rect(g, 0, 0, w, h / 3 + 1, '#000');
	rect(g, 0, h / 3, w, h / 3 + 1, '#dd0000');
	rect(g, 0, (2 * h) / 3, w, h / 3 + 1, '#ffce00');
});
flag('bayrak_fr', 'Fransa bayrağı', (g, w, h) => {
	rect(g, 0, 0, w / 3 + 1, h, '#0055a4');
	rect(g, w / 3, 0, w / 3 + 1, h, '#fff');
	rect(g, (2 * w) / 3, 0, w / 3 + 1, h, '#ef4135');
});
flag('bayrak_it', 'İtalya bayrağı', (g, w, h) => {
	rect(g, 0, 0, w / 3 + 1, h, '#009246');
	rect(g, w / 3, 0, w / 3 + 1, h, '#fff');
	rect(g, (2 * w) / 3, 0, w / 3 + 1, h, '#ce2b37');
});
flag(
	'bayrak_ch',
	'İsviçre bayrağı',
	(g, w, h) => {
		rect(g, 0, 0, w, h, '#da291c');
		rect(g, w / 2 - 0.09 * w, h / 2 - 0.3 * h, 0.18 * w, 0.6 * h, '#fff');
		rect(g, w / 2 - 0.3 * h, h / 2 - 0.09 * w, 0.6 * h, 0.18 * w, '#fff');
	},
	{ w: 210 },
);
flag('bayrak_se', 'İsveç bayrağı', (g, w, h) => {
	rect(g, 0, 0, w, h, '#006aa7');
	rect(g, (5 / 16) * w, 0, (2 / 16) * w, h, '#fecc02');
	rect(g, 0, 0.4 * h, w, 0.2 * h, '#fecc02');
});
flag('bayrak_gr', 'Yunanistan bayrağı', (g, w, h) => {
	const s = h / 9;
	rect(g, 0, 0, w, h, '#0d5eaf');
	for (let i = 1; i < 9; i += 2) rect(g, 0, i * s, w, s, '#fff');
	rect(g, 0, 0, 5 * s, 5 * s, '#0d5eaf');
	rect(g, 2 * s, 0, s, 5 * s, '#fff');
	rect(g, 0, 2 * s, 5 * s, s, '#fff');
});
flag('bayrak_br', 'Brezilya bayrağı', (g, w, h) => {
	rect(g, 0, 0, w, h, '#009c3b');
	poly(g, [[w / 2, 0.1 * h], [0.9 * w, h / 2], [w / 2, 0.9 * h], [0.1 * w, h / 2]], '#ffdf00');
	circ(g, w / 2, h / 2, 0.22 * h, '#002776');
	g.save();
	g.beginPath();
	g.arc(w / 2, h / 2, 0.22 * h, 0, 7);
	g.clip();
	g.beginPath();
	g.ellipse(w / 2, h / 2 + 0.34 * h, 0.5 * h, 0.2 * h, 0, 0, 7);
	g.strokeStyle = '#fff';
	g.lineWidth = 0.05 * h;
	g.stroke();
	g.restore();
});
flag('bayrak_gb', 'Birleşik Krallık bayrağı', (g, w, h) => {
	const u = h / 30;
	rect(g, 0, 0, w, h, '#012169');
	g.lineCap = 'butt';
	line(g, 0, 0, w, h, '#fff', 6 * u);
	line(g, w, 0, 0, h, '#fff', 6 * u);
	line(g, 0, 0, w, h, '#c8102e', 2 * u);
	line(g, w, 0, 0, h, '#c8102e', 2 * u);
	rect(g, w / 2 - 5 * u, 0, 10 * u, h, '#fff');
	rect(g, 0, h / 2 - 5 * u, w, 10 * u, '#fff');
	rect(g, w / 2 - 3 * u, 0, 6 * u, h, '#c8102e');
	rect(g, 0, h / 2 - 3 * u, w, 6 * u, '#c8102e');
});
flag('bayrak_ca', 'Kanada bayrağı', (g, w, h) => {
	rect(g, 0, 0, w, h, '#fff');
	rect(g, 0, 0, w / 4, h, '#d52b1e');
	rect(g, (3 * w) / 4, 0, w / 4, h, '#d52b1e');
	g.save();
	g.translate(w / 2, h / 2 + 4);
	g.scale(h / 120, h / 120);
	poly(g, [[0, -48], [9, -30], [22, -34], [18, -14], [38, -20], [32, -4], [46, 2], [22, 18], [26, 30], [4, 26], [4, 48], [-4, 48], [-4, 26], [-26, 30], [-22, 18], [-46, 2], [-32, -4], [-38, -20], [-18, -14], [-22, -34], [-9, -30]], '#d52b1e');
	g.restore();
});

// ---------------------------------------------------------------- yapılar
def('galata_kulesi', 'Galata Kulesi', {
	bg: SKY,
	focus: [200, 70],
	decor(g) {
		sun(g, 320, 60, 22);
		cloud(g, 40, 80, 1);
		cloud(g, 270, 130, 0.7);
		ground(g, 255, '#c9a16a', '#a98250');
	},
	draw(g, o) {
		const stone = '#dcc197';
		// gövde
		poly(g, [[162, 255], [172, 105], [228, 105], [238, 255]], stone, INK);
		// balkon
		poly(g, [[150, 100], [250, 100], [244, 114], [156, 114]], '#b88a5a', INK);
		// üst gövde
		poly(g, [[170, 100], [176, 58], [224, 58], [230, 100]], stone, INK);
		// külah
		poly(g, [[170, 58], [200, 10], [230, 58]], '#7d8c99', INK);
		line(g, 200, 10, 200, 0, INK, 3);
		if (o.sil) return;
		for (const [x, y] of [[200, 82], [200, 150], [185, 190], [215, 190], [200, 225]]) {
			ell(g, x, y, 6, 11, '#3a2f2a');
		}
		for (let x = 158; x < 246; x += 11) line(g, x, 100, x, 114, INK, 2);
		line(g, 176, 58, 224, 58, INK, 3);
		for (const x of [190, 210]) ell(g, x, 44, 4, 7, '#3a2f2a');
	},
});

def('kiz_kulesi', 'Kız Kulesi', {
	bg: SKY,
	focus: [200, 110],
	decor(g) {
		sun(g, 60, 55, 20);
		cloud(g, 250, 60, 0.9);
		sea(g, 205);
	},
	draw(g, o) {
		// ada
		poly(g, [[130, 230], [150, 205], [250, 205], [275, 232], [250, 250], [150, 250]], '#a89478', INK);
		// gövde
		rect(g, 170, 150, 60, 60, '#e6d2ae', INK);
		poly(g, [[160, 150], [240, 150], [236, 140], [164, 140]], '#c9ad84', INK);
		// kulenin üst bölümü
		rect(g, 178, 108, 44, 34, '#f1e3c4', INK);
		// kubbe
		g.beginPath();
		g.moveTo(176, 108);
		g.quadraticCurveTo(200, 62, 224, 108);
		g.closePath();
		paint(g, '#8a9ba8', INK);
		rect(g, 197, 56, 6, 14, INK);
		line(g, 200, 50, 200, 40, INK, 3);
		if (o.sil) return;
		for (const x of [188, 212]) rect(g, x - 5, 114, 10, 20, '#3a2f2a');
		for (const x of [182, 200, 218]) rect(g, x - 5, 172, 10, 22, '#3a2f2a');
	},
});

def('ayasofya', 'Ayasofya', {
	bg: ['#f2a56a', '#fde3b8'],
	focus: [200, 100],
	decor(g) {
		sun(g, 330, 70, 24, '#fff2b0');
		ground(g, 258, '#9db36a', '#7e9650');
	},
	draw(g, o) {
		const wall = '#d98b6a';
		const lead = '#7f93a3';
		// minareler
		for (const x of [78, 322]) {
			rect(g, x - 8, 70, 16, 190, '#efe2cf', INK);
			poly(g, [[x - 11, 70], [x, 30], [x + 11, 70]], lead, INK);
			rect(g, x - 12, 110, 24, 6, '#b79b78', INK, 2);
		}
		for (const x of [112, 288]) {
			rect(g, x - 6, 110, 12, 150, '#efe2cf', INK);
			poly(g, [[x - 8, 110], [x, 78], [x + 8, 110]], lead, INK);
		}
		// gövde ve payandalar
		rect(g, 118, 160, 164, 98, wall, INK);
		rect(g, 100, 200, 28, 58, '#c97a5a', INK);
		rect(g, 272, 200, 28, 58, '#c97a5a', INK);
		// yarım kubbeler
		g.beginPath();
		g.arc(150, 162, 40, Math.PI, 0);
		g.closePath();
		paint(g, lead, INK);
		g.beginPath();
		g.arc(250, 162, 40, Math.PI, 0);
		g.closePath();
		paint(g, lead, INK);
		// ana kubbe
		rect(g, 156, 112, 88, 52, wall, INK);
		g.beginPath();
		g.arc(200, 114, 52, Math.PI, 0);
		g.closePath();
		paint(g, lead, INK);
		line(g, 200, 62, 200, 46, INK, 3);
		circ(g, 200, 43, 4, INK);
		if (o.sil) return;
		for (let x = 164; x < 240; x += 14) rect(g, x, 122, 7, 14, '#3a2f2a');
		for (const x of [140, 170, 200, 230, 260]) {
			g.beginPath();
			g.moveTo(x - 8, 258);
			g.lineTo(x - 8, 220);
			g.arc(x, 220, 8, Math.PI, 0);
			g.lineTo(x + 8, 258);
			g.closePath();
			paint(g, '#3a2f2a');
		}
	},
});

def('eyfel_kulesi', 'Eyfel Kulesi', {
	bg: ['#ffb38a', '#ffe9d2'],
	focus: [200, 60],
	decor(g) {
		sun(g, 70, 70, 22, '#fff2b0');
		cloud(g, 270, 70, 1);
		ground(g, 258, '#8ccf7a', '#69b25a');
	},
	draw(g, o) {
		const iron = '#5c4a3d';
		// dış çizgi
		poly(g, [[200, 12], [208, 70], [214, 70], [222, 130], [236, 130], [262, 200], [292, 258], [248, 258], [232, 224], [200, 205], [168, 224], [152, 258], [108, 258], [138, 200], [164, 130], [178, 130], [186, 70], [192, 70]], iron, INK, 3);
		if (o.sil) return;
		// kemer
		g.beginPath();
		g.moveTo(152, 258);
		g.quadraticCurveTo(200, 170, 248, 258);
		g.closePath();
		g.fillStyle = '#ffd9b6';
		g.fill();
		// platformlar
		rect(g, 164, 128, 72, 8, '#8a7060', INK, 2);
		rect(g, 184, 68, 32, 6, '#8a7060', INK, 2);
		// çapraz kirişler
		g.strokeStyle = '#2b2118';
		g.lineWidth = 2;
		for (let y = 136; y < 200; y += 16) {
			const half = 36 + (y - 136) * 0.6;
			g.beginPath();
			g.moveTo(200 - half, y);
			g.lineTo(200 + half, y + 16);
			g.moveTo(200 + half, y);
			g.lineTo(200 - half, y + 16);
			g.stroke();
		}
		g.beginPath();
		g.moveTo(190, 76);
		g.lineTo(210, 122);
		g.moveTo(210, 76);
		g.lineTo(190, 122);
		g.stroke();
	},
});

def('piramit', 'Giza Piramitleri', {
	bg: ['#ffc477', '#ffeccc'],
	focus: [200, 100],
	decor(g) {
		sun(g, 330, 60, 26, '#fff0a0');
		ground(g, 240, '#e9c27a', '#d6a95c');
		g.fillStyle = 'rgba(190,140,70,.4)';
		g.beginPath();
		g.ellipse(120, 270, 120, 18, 0, 0, 7);
		g.fill();
	},
	draw(g, o) {
		// büyük piramit
		poly(g, [[200, 60], [60, 245], [340, 245]], '#e8b867', INK);
		poly(g, [[200, 60], [340, 245], [235, 245]], '#c99244', null);
		// küçük piramit
		poly(g, [[330, 150], [260, 245], [400, 245]], '#dcaa5a', INK);
		poly(g, [[330, 150], [400, 245], [345, 245]], '#bd8a3d', null);
		poly(g, [[85, 190], [30, 245], [140, 245]], '#dcaa5a', INK);
		if (o.sil) return;
		g.strokeStyle = 'rgba(120,80,30,.35)';
		g.lineWidth = 2;
		for (let y = 90; y < 245; y += 22) {
			const t = (y - 60) / 185;
			line(g, 200 - 140 * t, y, 200 + 140 * t, y, 'rgba(120,80,30,.3)', 2);
		}
	},
});

def('pisa_kulesi', 'Pisa Kulesi', {
	bg: ['#9bd4ff', '#effaff'],
	focus: [215, 60],
	decor(g) {
		cloud(g, 40, 70, 1);
		cloud(g, 280, 40, 0.8);
		ground(g, 250, '#86cf72', '#62b050');
	},
	draw(g, o) {
		g.save();
		g.translate(200, 250);
		g.rotate(0.1);
		g.translate(-200, -250);
		const mar = '#f4efe4';
		rect(g, 170, 76, 60, 176, mar, INK);
		rect(g, 178, 46, 44, 32, mar, INK);
		rect(g, 172, 40, 56, 8, '#d9d0bf', INK, 2);
		poly(g, [[178, 46], [182, 28], [218, 28], [222, 46]], '#b9cdd8', INK, 2.5);
		if (!o.sil) {
			for (let i = 0; i < 6; i++) {
				const y = 82 + i * 28;
				line(g, 170, y + 26, 230, y + 26, INK, 2);
				for (let x = 177; x < 230; x += 12) {
					g.beginPath();
					g.moveTo(x - 4, y + 24);
					g.lineTo(x - 4, y + 12);
					g.arc(x, y + 12, 4, Math.PI, 0);
					g.lineTo(x + 4, y + 24);
					g.closePath();
					g.fillStyle = '#6b5f50';
					g.fill();
				}
			}
			for (const x of [188, 202, 214]) ell(g, x, 62, 4, 8, '#6b5f50');
		}
		g.restore();
	},
});

def('peri_bacasi', 'Peri Bacaları', {
	bg: ['#ffb27a', '#ffe7c4'],
	focus: [210, 130],
	decor(g) {
		sun(g, 60, 70, 20, '#fff0a0');
		// sıcak hava balonları
		for (const [x, y, c] of [[290, 60, '#ff5a4a'], [340, 105, '#3a9ad8']]) {
			ell(g, x, y, 18, 22, c, INK, 2.5);
			rect(g, x - 5, y + 24, 10, 8, '#8a5a3a', INK, 2);
		}
		ground(g, 252, '#cf9b65', '#b5834f');
	},
	draw(g, o) {
		const body = '#e0aa78';
		const cap = '#8c5a3a';
		const chimney = (x, base, w, h, c = 1) => {
			g.beginPath();
			g.moveTo(x - w / 2, base);
			g.quadraticCurveTo(x - w * 0.22, base - h * 0.55, x - w * 0.16, base - h);
			g.lineTo(x + w * 0.16, base - h);
			g.quadraticCurveTo(x + w * 0.22, base - h * 0.55, x + w / 2, base);
			g.closePath();
			paint(g, body, INK);
			// şapka taşı
			g.beginPath();
			g.moveTo(x - w * 0.27, base - h + 8);
			g.quadraticCurveTo(x, base - h - w * 0.4, x + w * 0.27, base - h + 8);
			g.closePath();
			paint(g, cap, INK, 2.5);
			if (!o.sil && c) {
				rrect(g, x - 5, base - h * 0.5, 10, 15, 4, '#4a2f1f');
			}
		};
		chimney(105, 252, 90, 120);
		chimney(205, 252, 120, 175);
		chimney(305, 252, 80, 105);
		chimney(55, 252, 50, 70, 0);
		chimney(355, 252, 50, 80, 0);
	},
});

def('bogaz_koprusu', 'Boğaz Köprüsü', {
	bg: ['#ff9a7a', '#ffe0b5'],
	focus: [110, 70],
	decor(g) {
		sun(g, 200, 100, 28, '#fff4b0');
		sea(g, 200);
	},
	draw(g, o) {
		const steel = '#c8352a';
		// tabliye
		rect(g, -10, 168, 420, 12, '#40495f', INK, 2.5);
		// kuleler
		for (const x of [110, 290]) {
			rect(g, x - 9, 48, 7, 130, steel, INK, 2.5);
			rect(g, x + 2, 48, 7, 130, steel, INK, 2.5);
			rect(g, x - 9, 80, 18, 6, steel, INK, 2);
			rect(g, x - 9, 128, 18, 6, steel, INK, 2);
		}
		g.strokeStyle = '#2b3350';
		g.lineWidth = 4;
		g.lineCap = 'round';
		g.beginPath();
		g.moveTo(-10, 172);
		g.quadraticCurveTo(50, 120, 110, 52);
		g.quadraticCurveTo(200, 190, 290, 52);
		g.quadraticCurveTo(350, 120, 410, 172);
		g.stroke();
		if (o.sil) return;
		// ana kablodan tabliyeye askılar (ana kablo: 110,52 → 200,~121 → 290,52 ikinci derece eğri)
		for (let x = 122; x < 290; x += 12) {
			const t = (x - 110) / 180;
			const cy = 52 + 138 * t * (1 - t) * 2 * 0.5;
			line(g, x, cy + 2, x, 168, '#2b3350', 1.6);
		}
		for (const [x0, x1, y0] of [[-6, 104, 168], [296, 406, 168]]) {
			for (let x = x0; x < x1; x += 14) {
				const t = (x - x0) / (x1 - x0);
				const k = x0 < 0 ? t : 1 - t;
				const cy = 172 - 118 * k * (0.35 + 0.65 * k);
				line(g, x, cy + 1, x, y0, '#2b3350', 1.4);
			}
		}
	},
});

def('saat_kulesi', 'Saat Kulesi', {
	bg: SKY,
	focus: [200, 100],
	decor(g) {
		cloud(g, 40, 90, 1);
		cloud(g, 290, 60, 0.8);
		ground(g, 255, '#c9a16a', '#a98250');
	},
	draw(g, o) {
		rect(g, 156, 100, 88, 156, '#e6d2ae', INK);
		rect(g, 148, 92, 104, 14, '#b88a5a', INK);
		poly(g, [[152, 92], [200, 20], [248, 92]], '#9b4a3a', INK);
		rect(g, 142, 250, 116, 10, '#b88a5a', INK);
		line(g, 200, 20, 200, 4, INK, 3);
		circ(g, 200, 140, 31, '#fff', INK, 4);
		if (o.sil) return;
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			line(g, 200 + Math.cos(a) * 24, 140 + Math.sin(a) * 24, 200 + Math.cos(a) * 28, 140 + Math.sin(a) * 28, INK, i % 3 ? 2 : 3.5);
		}
		line(g, 200, 140, 200, 120, INK, 4);
		line(g, 200, 140, 214, 146, INK, 3.5);
		circ(g, 200, 140, 3, INK);
		for (const y of [190, 225]) {
			g.beginPath();
			g.moveTo(186, y + 18);
			g.lineTo(186, y);
			g.arc(200, y, 14, Math.PI, 0);
			g.lineTo(214, y + 18);
			g.closePath();
			paint(g, '#3a2f2a');
		}
	},
});

// ---------------------------------------------------------------- gündelik nesneler
def('ay', 'Ay', {
	bg: ['#1c2a5a', '#3f4f9a'],
	draw(g, o) {
		g.save();
		g.beginPath();
		g.rect(0, 0, W0, H0);
		g.moveTo(312, 128);
		g.arc(238, 128, 74, 0, Math.PI * 2);
		g.clip('evenodd');
		circ(g, 200, 150, 96, '#ffe27a', INK, 4);
		g.restore();
		if (!o.sil) {
			star(g, 300, 70, 12, 5, 4, 0.4, '#fff6c0');
			star(g, 90, 80, 9, 4, 4, 0.2, '#fff6c0');
			star(g, 320, 220, 8, 3.5, 4, 0.3, '#fff6c0');
		}
	},
});
def('cicek', 'Çiçek', {
	bg: ['#bfe8ff', '#effbea'],
	draw(g, o) {
		line(g, 200, 160, 200, 290, '#3f9a45', 10);
		ell(g, 168, 238, 30, 12, '#58bb5a', INK, 3, -0.5);
		ell(g, 234, 214, 28, 11, '#58bb5a', INK, 3, 0.5);
		for (let i = 0; i < 10; i++) {
			const a = (i * Math.PI * 2) / 10;
			ell(g, 200 + Math.cos(a) * 46, 120 + Math.sin(a) * 46, 30, 15, '#fff', INK, 3, a);
		}
		circ(g, 200, 120, 28, '#ffcf3a', INK, 3);
		if (!o.sil) circ(g, 192, 112, 8, '#ffe98a');
	},
});
def('kar_tanesi', 'Kar tanesi', {
	bg: ['#3f86d0', '#9fd0f6'],
	draw(g) {
		g.strokeStyle = '#fff';
		g.lineCap = 'round';
		for (let i = 0; i < 6; i++) {
			g.save();
			g.translate(200, 150);
			g.rotate((i * Math.PI) / 3);
			g.lineWidth = 9;
			g.beginPath();
			g.moveTo(0, 0);
			g.lineTo(0, -108);
			g.stroke();
			g.lineWidth = 7;
			for (const [y, l] of [[-40, 28], [-72, 22]]) {
				g.beginPath();
				g.moveTo(0, y);
				g.lineTo(-l, y - l * 0.8);
				g.moveTo(0, y);
				g.lineTo(l, y - l * 0.8);
				g.stroke();
			}
			g.restore();
		}
		circ(g, 200, 150, 13, '#fff');
	},
});
def('top', 'Top', {
	bg: ['#8ad37a', '#c9efb8'],
	draw(g, o) {
		circ(g, 200, 150, 100, '#fff', INK, 5);
		if (o.sil) return;
		poly(g, pent(200, 150, 32, -Math.PI / 2), INK);
		for (let i = 0; i < 5; i++) {
			const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
			line(g, 200 + Math.cos(a) * 32, 150 + Math.sin(a) * 32, 200 + Math.cos(a) * 62, 150 + Math.sin(a) * 62, INK, 4);
			poly(g, pent(200 + Math.cos(a) * 84, 150 + Math.sin(a) * 84, 20, a + Math.PI), INK);
		}
	},
});
function pent(cx, cy, r, rot) {
	return Array.from({ length: 5 }, (_, i) => [cx + Math.cos(rot + (i * Math.PI * 2) / 5) * r, cy + Math.sin(rot + (i * Math.PI * 2) / 5) * r]);
}
def('goz', 'Göz', {
	bg: ['#ffe0b0', '#fff4e0'],
	draw(g, o) {
		g.beginPath();
		g.moveTo(60, 150);
		g.quadraticCurveTo(200, 30, 340, 150);
		g.quadraticCurveTo(200, 270, 60, 150);
		g.closePath();
		paint(g, '#fff', INK, 6);
		circ(g, 200, 150, 52, '#2a9ac8', INK, 4);
		circ(g, 200, 150, 24, '#10182e');
		if (!o.sil) {
			circ(g, 184, 134, 10, '#fff');
			for (let i = -3; i <= 3; i++) line(g, 200 + i * 38, 90 - Math.abs(i) * 6, 200 + i * 46, 62 - Math.abs(i) * 8, INK, 5);
		}
	},
});
def('damla', 'Damla', {
	bg: ['#dff4ff', '#a8dcff'],
	draw(g, o) {
		g.beginPath();
		g.moveTo(200, 30);
		g.bezierCurveTo(230, 90, 300, 130, 300, 200);
		g.arc(200, 200, 100, 0, Math.PI, false);
		g.bezierCurveTo(100, 130, 170, 90, 200, 30);
		g.closePath();
		paint(g, '#2f8fe0', INK, 5);
		if (!o.sil) {
			g.beginPath();
			g.arc(200, 205, 74, Math.PI * 0.62, Math.PI * 0.95);
			g.strokeStyle = 'rgba(255,255,255,.75)';
			g.lineWidth = 12;
			g.lineCap = 'round';
			g.stroke();
		}
	},
});
def('yildiz', 'Yıldız', {
	bg: ['#22307a', '#5a6bd0'],
	draw(g, o) {
		star(g, 200, 160, 120, 52, 5, -Math.PI / 2, '#ffd83a', INK, 5);
		if (!o.sil) star(g, 200, 160, 66, 28, 5, -Math.PI / 2, '#ffec8a');
	},
});
def('balik', 'Balık', {
	bg: ['#47b5e8', '#bfe9fb'],
	draw(g, o) {
		poly(g, [[285, 150], [370, 90], [350, 150], [370, 210]], '#ff7a2a', INK, 4);
		ell(g, 190, 150, 110, 66, '#ff9a3a', INK, 5);
		poly(g, [[160, 95], [200, 60], [240, 100]], '#ff7a2a', INK, 4);
		poly(g, [[180, 205], [210, 238], [230, 200]], '#ff7a2a', INK, 4);
		if (o.sil) return;
		g.save();
		g.beginPath();
		g.ellipse(190, 150, 110, 66, 0, 0, 7);
		g.clip();
		for (const x of [200, 240, 275]) rect(g, x, 80, 14, 140, '#fff');
		g.restore();
		circ(g, 112, 138, 11, '#fff', INK, 3);
		circ(g, 110, 138, 5, INK);
	},
});
def('kus', 'Kuş', {
	bg: ['#a5dcff', '#effaff'],
	draw(g, o) {
		line(g, 170, 220, 165, 262, '#e8903a', 7);
		line(g, 210, 220, 215, 262, '#e8903a', 7);
		poly(g, [[270, 150], [360, 120], [345, 175]], '#2f7ad0', INK, 4);
		ell(g, 200, 160, 82, 66, '#4aa0f0', INK, 5);
		circ(g, 130, 108, 40, '#4aa0f0', INK, 5);
		poly(g, [[93, 100], [58, 114], [94, 124]], '#ffb02a', INK, 4);
		ell(g, 210, 160, 44, 28, '#2f7ad0', INK, 4, -0.3);
		if (o.sil) return;
		ell(g, 190, 190, 52, 28, '#dff1ff');
		circ(g, 124, 100, 8, '#fff', INK, 2);
		circ(g, 122, 100, 4, INK);
	},
});
def('agac', 'Ağaç', {
	bg: ['#a8dcff', '#effaff'],
	decor(g) {
		ground(g, 258, '#7bc86a', '#5aa84a');
	},
	draw(g, o) {
		poly(g, [[184, 262], [190, 160], [210, 160], [216, 262]], '#8a5a3a', INK, 4);
		for (const [x, y, r] of [[200, 90, 62], [145, 140, 52], [255, 140, 52], [200, 150, 54]]) circ(g, x, y, r, '#3fae52', INK, 4);
		if (o.sil) return;
		for (const [x, y, r] of [[182, 76, 22], [230, 120, 14], [140, 132, 12]]) circ(g, x, y, r, '#62cc72');
	},
});
def('kalp', 'Kalp', {
	bg: ['#ffd0dd', '#fff0f4'],
	draw(g, o) {
		g.beginPath();
		g.moveTo(200, 262);
		g.bezierCurveTo(60, 170, 70, 50, 150, 50);
		g.bezierCurveTo(180, 50, 198, 70, 200, 92);
		g.bezierCurveTo(202, 70, 220, 50, 250, 50);
		g.bezierCurveTo(330, 50, 340, 170, 200, 262);
		g.closePath();
		paint(g, '#e8344a', INK, 5);
		if (!o.sil) {
			g.beginPath();
			g.arc(152, 100, 32, Math.PI * 0.95, Math.PI * 1.45);
			g.strokeStyle = 'rgba(255,255,255,.6)';
			g.lineWidth = 12;
			g.lineCap = 'round';
			g.stroke();
		}
	},
});
def('ev', 'Ev', {
	bg: SKY,
	decor(g) {
		cloud(g, 40, 60, 1);
		ground(g, 258, '#7bc86a', '#5aa84a');
	},
	draw(g, o) {
		rect(g, 270, 60, 26, 70, '#a8584a', INK, 4);
		rect(g, 105, 140, 190, 120, '#f2dfb2', INK, 5);
		poly(g, [[85, 146], [200, 50], [315, 146]], '#d8483a', INK, 5);
		if (o.sil) return;
		rect(g, 175, 190, 50, 70, '#8a5a3a', INK, 4);
		circ(g, 215, 228, 4, '#ffd25a');
		for (const x of [125, 245]) {
			rect(g, x, 170, 36, 36, '#bfe6ff', INK, 4);
			line(g, x + 18, 170, x + 18, 206, INK, 3);
			line(g, x, 188, x + 36, 188, INK, 3);
		}
	},
});
def('anahtar', 'Anahtar', {
	bg: ['#ffe9a8', '#fff7dc'],
	draw(g) {
		g.save();
		g.translate(200, 150);
		g.rotate(-0.5);
		g.beginPath();
		g.arc(-100, 0, 54, 0, Math.PI * 2);
		g.moveTo(-76, 0);
		g.arc(-100, 0, 24, 0, Math.PI * 2, true);
		g.fillStyle = '#f0b82a';
		g.fill('evenodd');
		g.strokeStyle = INK;
		g.lineWidth = 5;
		g.stroke();
		rrect(g, -50, -13, 190, 26, 8, '#f0b82a', INK, 5);
		rect(g, 90, 12, 20, 40, '#f0b82a', INK, 5);
		rect(g, 118, 12, 18, 30, '#f0b82a', INK, 5);
		g.restore();
	},
});
def('saat', 'Saat', {
	bg: ['#d8e6ff', '#f2f6ff'],
	draw(g, o) {
		circ(g, 200, 150, 112, '#fff', INK, 8);
		circ(g, 200, 150, 112, null, '#ffb02a', 3);
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			line(g, 200 + Math.cos(a) * 88, 150 + Math.sin(a) * 88, 200 + Math.cos(a) * 102, 150 + Math.sin(a) * 102, INK, i % 3 ? 4 : 8);
		}
		line(g, 200, 150, 200, 84, INK, 9);
		line(g, 200, 150, 248, 176, INK, 7);
		if (!o.sil) line(g, 200, 150, 150, 190, '#e8344a', 3);
		circ(g, 200, 150, 8, INK);
	},
});
def('gunes', 'Güneş', {
	bg: ['#7ec4ff', '#d4eeff'],
	draw(g) {
		for (let i = 0; i < 12; i++) {
			g.save();
			g.translate(200, 150);
			g.rotate((i * Math.PI) / 6);
			poly(g, [[-10, -92], [0, -138], [10, -92]], '#ffb02a', INK, 3);
			g.restore();
		}
		circ(g, 200, 150, 82, '#ffd83a', INK, 5);
		circ(g, 174, 128, 20, 'rgba(255,255,255,.4)');
	},
});
def('bulut', 'Bulut', {
	bg: ['#4a90d8', '#a8d4f8'],
	draw(g) {
		const blobs = [[120, 190, 50], [186, 140, 62], [260, 160, 52], [290, 200, 38]];
		// önce kontur (biraz büyük), sonra dolgu: birleşik bulut çerçevesi
		for (const [x, y, r] of blobs) circ(g, x, y, r + 5, INK);
		rect(g, 120, 190, 170, 50, INK);
		for (const [x, y, r] of blobs) circ(g, x, y, r, '#fff');
		rect(g, 120, 186, 170, 49, '#fff');
	},
});
def('kedi', 'Kedi', {
	bg: ['#ffd9a8', '#fff2dc'],
	draw(g, o) {
		// kuyruk
		g.beginPath();
		g.moveTo(262, 238);
		g.bezierCurveTo(350, 250, 360, 150, 320, 120);
		g.strokeStyle = INK;
		g.lineWidth = 30;
		g.lineCap = 'round';
		g.stroke();
		g.strokeStyle = '#8a8a96';
		g.lineWidth = 22;
		g.stroke();
		// gövde
		g.beginPath();
		g.moveTo(130, 260);
		g.bezierCurveTo(100, 180, 150, 140, 200, 140);
		g.bezierCurveTo(260, 140, 290, 190, 270, 260);
		g.closePath();
		paint(g, '#8a8a96', INK, 5);
		// kafa
		poly(g, [[140, 70], [146, 22], [182, 56]], '#8a8a96', INK, 5);
		poly(g, [[218, 56], [254, 22], [260, 70]], '#8a8a96', INK, 5);
		ell(g, 200, 100, 62, 54, '#8a8a96', INK, 5);
		if (o.sil) return;
		poly(g, [[148, 64], [150, 40], [168, 58]], '#ffb0c0');
		poly(g, [[232, 58], [250, 40], [252, 64]], '#ffb0c0');
		for (const x of [176, 224]) {
			ell(g, x, 98, 9, 12, '#bff070', INK, 3);
			ell(g, x, 98, 3, 10, INK);
		}
		poly(g, [[194, 116], [206, 116], [200, 124]], '#ff8aa0');
		for (const s of [-1, 1]) {
			line(g, 200 + s * 18, 124, 200 + s * 62, 114, INK, 2);
			line(g, 200 + s * 18, 128, 200 + s * 62, 132, INK, 2);
		}
		ell(g, 200, 215, 38, 44, '#b7b7c4');
	},
});
def('elma', 'Elma', {
	bg: ['#d6f2c0', '#f2fbe6'],
	draw(g, o) {
		g.beginPath();
		g.moveTo(200, 90);
		g.bezierCurveTo(260, 40, 340, 90, 320, 180);
		g.bezierCurveTo(300, 260, 240, 270, 200, 250);
		g.bezierCurveTo(160, 270, 100, 260, 80, 180);
		g.bezierCurveTo(60, 90, 140, 40, 200, 90);
		g.closePath();
		paint(g, '#e8402f', INK, 5);
		line(g, 200, 90, 208, 40, '#6b4a2a', 8);
		ell(g, 240, 52, 34, 15, '#4cb04a', INK, 4, -0.4);
		if (!o.sil) {
			g.beginPath();
			g.arc(140, 150, 40, Math.PI * 1.05, Math.PI * 1.5);
			g.strokeStyle = 'rgba(255,255,255,.55)';
			g.lineWidth = 12;
			g.lineCap = 'round';
			g.stroke();
		}
	},
});
def('kitap', 'Kitap', {
	bg: ['#ffe4c0', '#fff6e6'],
	draw(g, o) {
		poly(g, [[200, 90], [70, 70], [70, 232], [200, 252]], '#fffaf0', INK, 5);
		poly(g, [[200, 90], [330, 70], [330, 232], [200, 252]], '#fffaf0', INK, 5);
		poly(g, [[60, 232], [200, 262], [340, 232], [340, 244], [200, 276], [60, 244]], '#2f6fd0', INK, 4);
		if (o.sil) return;
		for (let i = 0; i < 5; i++) {
			line(g, 90, 106 + i * 24, 184, 120 + i * 24, '#9aa7c0', 4);
			line(g, 216, 120 + i * 24, 310, 106 + i * 24, '#9aa7c0', 4);
		}
		line(g, 200, 90, 200, 252, INK, 4);
	},
});
def('araba', 'Araba', {
	bg: SKY,
	decor(g) {
		cloud(g, 50, 70, 1);
		ground(g, 232, '#6b7388', '#4d556a');
		for (let x = 0; x < 400; x += 70) rect(g, x, 262, 38, 6, '#fff');
	},
	draw(g, o) {
		poly(g, [[60, 200], [60, 160], [140, 150], [168, 100], [270, 100], [310, 150], [350, 160], [350, 200]], '#e8402f', INK, 5);
		for (const x of [135, 285]) circ(g, x, 205, 38, '#2b3350', INK, 5);
		if (o.sil) return;
		poly(g, [[152, 150], [176, 112], [218, 112], [218, 150]], '#bfe6ff', INK, 3);
		poly(g, [[228, 150], [228, 112], [262, 112], [294, 150]], '#bfe6ff', INK, 3);
		for (const x of [135, 285]) {
			circ(g, x, 205, 18, '#cfd6e6');
			circ(g, x, 205, 6, INK);
		}
		rect(g, 330, 168, 22, 12, '#ffe27a', INK, 2);
	},
});

// ---------------------------------------------------------------- kullanım
const imgCache = new Map();
/** URL'li görseli yükler; hazır olunca callback. Yüklenemezse yedek çizim kalır. */
export function loadImage(url) {
	if (!url) return null;
	let e = imgCache.get(url);
	if (!e) {
		const img = new Image();
		e = { img, ok: false, fail: false, cbs: [] };
		img.onload = () => {
			e.ok = true;
			e.cbs.splice(0).forEach((f) => f());
		};
		img.onerror = () => {
			e.fail = true;
			e.cbs.splice(0).forEach((f) => f());
		};
		img.src = url;
		imgCache.set(url, e);
	}
	return e;
}

/** Bütün kimlikler hazırsa (ya da vazgeçildiyse) true. onReady yüklenince çağrılır. */
export function whenReady(ids, onReady) {
	const pend = ids.map((id) => ASSETS[id]?.url && loadImage(ASSETS[id].url)).filter((e) => e && !e.ok && !e.fail);
	if (!pend.length) return true;
	let n = pend.length;
	for (const e of pend)
		e.cbs.push(() => {
			if (--n === 0) onReady();
		});
	return false;
}

export const assetName = (id) => ASSETS[id]?.name || id;
export const assetFocus = (id) => ASSETS[id]?.focus || [200, 150];

/**
 * Bir varlığı g bağlamına W×H boyutunda çizer.
 *   o.bg   : arka planı çiz (varsayılan true)
 *   o.sil  : yalnızca gövde şekli (siluet kipi için; çağıran siyaha boyar)
 *   o.view : { fx, fy, s } sanal uzayda odak ve yakınlaştırma
 */
export function drawAsset(g, id, W, H, o = {}) {
	const a = ASSETS[id];
	if (!a) return;
	const { bg = true, sil = false, view = null } = o;
	g.save();
	if (bg) {
		const gr = g.createLinearGradient(0, 0, 0, H);
		const [c0, c1] = a.bg || SKY;
		gr.addColorStop(0, c0);
		gr.addColorStop(1, c1);
		g.fillStyle = gr;
		g.fillRect(0, 0, W, H);
	}
	const s0 = Math.min(W / W0, H / H0) * (view?.s ?? 1);
	g.translate(W / 2, H / 2);
	g.scale(s0, s0);
	g.translate(-(view?.fx ?? 200), -(view?.fy ?? 150));
	const e = a.url && loadImage(a.url);
	if (e?.ok) {
		// gerçek görsel: 400×300 kutuya sığdır
		const k = Math.min(W0 / e.img.naturalWidth, H0 / e.img.naturalHeight);
		const w = e.img.naturalWidth * k;
		const h = e.img.naturalHeight * k;
		g.drawImage(e.img, (W0 - w) / 2, (H0 - h) / 2, w, h);
	} else if (a.draw) {
		if (!sil && a.decor) a.decor(g, { sil });
		a.draw(g, { sil });
	}
	g.restore();
}

/** Siluet: gövdeyi tamamen siyaha boyar (geçici tuvalde source-in). */
export function drawSilhouette(g, id, W, H, tmp) {
	const a = ASSETS[id];
	const [c0, c1] = ['#dfe9ff', '#fff7e0'];
	const gr = g.createLinearGradient(0, 0, 0, H);
	gr.addColorStop(0, c0);
	gr.addColorStop(1, c1);
	g.fillStyle = gr;
	g.fillRect(0, 0, W, H);
	// parıltı
	const rg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
	rg.addColorStop(0, 'rgba(255,255,255,.9)');
	rg.addColorStop(1, 'rgba(255,255,255,0)');
	g.fillStyle = rg;
	g.fillRect(0, 0, W, H);
	if (!a) return;
	tmp.width = W;
	tmp.height = H;
	const t = tmp.getContext('2d');
	t.clearRect(0, 0, W, H);
	drawAsset(t, id, W, H, { bg: false, sil: true });
	t.globalCompositeOperation = 'source-in';
	t.fillStyle = '#0d1630';
	t.fillRect(0, 0, W, H);
	t.globalCompositeOperation = 'source-over';
	g.drawImage(tmp, 0, 0);
}

/** Dışarıdan (ör. gerçek görsel listesi) varlık eklemek ya da url bağlamak için. */
export function registerAssets(map) {
	for (const [id, v] of Object.entries(map)) ASSETS[id] = { ...(ASSETS[id] || {}), ...v };
}
