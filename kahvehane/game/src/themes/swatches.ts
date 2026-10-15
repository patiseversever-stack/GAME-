// Market küçük resimleri: her masanın minyatürü (SVG → CSS background dizgesi). Gerçek boyamanın motiflerini taşır:
// ortada yığın amblemi, çevresinde masanın dokusu. Oran ne olursa olsun ortalanıp kırpılır (slice) — kare veya dikey kutuya uyar.
import {mulberry} from './paint';

const f = (v: number): string => (Math.round(v * 100) / 100).toString();
const url = (body: string, defs = ''): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`,
  )}") center / cover no-repeat`;
const polar = (r: number, a: number, cx = 50, cy = 50): [number, number] => [cx + r * Math.sin(a), cy - r * Math.cos(a)];

// ───────── Mavi Arena ─────────
function arena(): string {
  let rays = '';
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2, a1 = a0 + Math.PI * 2 * (7 / 360);
    const [x0, y0] = polar(90, a0), [x1, y1] = polar(90, a1);
    rays += `<path d='M50 50L${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}Z'/>`;
  }
  return url(
    `<rect width='100' height='100' fill='url(#bg)'/><g fill='#fff' opacity='.09'>${rays}</g>` +
      `<circle cx='50' cy='50' r='22' fill='url(#gl)'/><circle cx='50' cy='50' r='15' fill='#0a1046' opacity='.45'/>` +
      `<circle cx='50' cy='50' r='14' fill='none' stroke='#a0b4ff' stroke-width='1.6' opacity='.8'/>`,
    `<radialGradient id='bg' cx='.5' cy='.5' r='.75'><stop offset='0' stop-color='#3149e8'/><stop offset='.35' stop-color='#1a2aa0'/><stop offset='.7' stop-color='#101a6e'/><stop offset='1' stop-color='#060a30'/></radialGradient>` +
      `<radialGradient id='gl'><stop offset='0' stop-color='#6e8cff' stop-opacity='.7'/><stop offset='1' stop-color='#6e8cff' stop-opacity='0'/></radialGradient>`,
  );
}

// ───────── Yıldızlı Gece ─────────
function gece(): string {
  const rnd = mulberry(91);
  const cols = ['#0f2470', '#1a3a96', '#2a56b8', '#4a7ed0', '#86ace0', '#c8d8ec', '#2f7f92', '#e6d47a'];
  let sw = '';
  for (let i = 0; i < 340; i++) {
    const r = 4 + Math.pow(rnd(), 0.85) * 66;
    const a0 = rnd() * Math.PI * 2, span = (6 + rnd() * 8) / r;
    const pts: string[] = [];
    for (let k = 0; k <= 3; k++) {
      const [x, y] = polar(r + k * 0.5, a0 + (span * k) / 3);
      pts.push(`${f(x)} ${f(y)}`);
    }
    // göz (merkez) koyu; kollar orta halkada açık
    const arm = r > 16 && r < 40 ? 0.5 + 0.5 * Math.sin(r * 0.35 - a0 * 2) : 0.15;
    const c = cols[Math.min(cols.length - 1, Math.floor((arm * 0.75 + rnd() * 0.45) * 5.2))];
    sw += `<path d='M${pts.join('L')}' stroke='${c}' stroke-width='${f(2.6 + rnd() * 2)}'/>`;
  }
  const star = (x: number, y: number, r: number): string =>
    `<circle cx='${x}' cy='${y}' r='${f(r * 2.2)}' fill='url(#sh)'/><circle cx='${x}' cy='${y}' r='${f(r * 1.5)}' fill='none' stroke='#f2c94e' stroke-width='${f(r * 0.45)}' opacity='.85'/><circle cx='${x}' cy='${y}' r='${r}' fill='#fff6c8'/>`;
  return url(
    `<rect width='100' height='100' fill='#10236a'/><g fill='none' stroke-linecap='round'>${sw}</g>` +
      `<circle cx='50' cy='50' r='20' fill='url(#eye)'/>` +
      `<path d='M14 104C10 84 17 70 18 52C21 66 26 84 24 104Z' fill='#13281e'/><path d='M16 104C14 88 18 74 19 60C21 74 23 88 21 104Z' fill='#2c5a3a' opacity='.8'/>` +
      star(26, 22, 2.4) + star(80, 72, 1.8) + star(32, 82, 1.6) +
      `<circle cx='73' cy='21' r='15' fill='url(#mh)'/><circle cx='73' cy='21' r='10.5' fill='none' stroke='#f0b84a' stroke-width='2.4' opacity='.85'/>` +
      `<circle cx='73' cy='21' r='6.6' fill='#ffd75e'/><circle cx='76' cy='18.6' r='5.4' fill='#c88a30'/>` +
      `<circle cx='50' cy='50' r='14.5' fill='none' stroke='#f6d27a' stroke-width='1.4' opacity='.85'/>`,
    `<radialGradient id='eye'><stop offset='0' stop-color='#050c34' stop-opacity='.75'/><stop offset='.7' stop-color='#050c34' stop-opacity='.4'/><stop offset='1' stop-color='#050c34' stop-opacity='0'/></radialGradient>` +
      `<radialGradient id='sh'><stop offset='0' stop-color='#fff4b0' stop-opacity='.9'/><stop offset='1' stop-color='#ffd85a' stop-opacity='0'/></radialGradient>` +
      `<radialGradient id='mh'><stop offset='.3' stop-color='#ffe08a' stop-opacity='.95'/><stop offset='1' stop-color='#f2b844' stop-opacity='0'/></radialGradient>`,
  );
}

// ───────── Çini Salon ─────────
function cini(): string {
  // tek karo deseni (20×20): bademsi kafes, köşe rozetleri, ortada lale
  const tile =
    `<pattern id='t' width='22' height='22' patternUnits='userSpaceOnUse' x='-0' y='6'>` +
    `<rect width='22' height='22' fill='#0c1f5a'/>` +
    `<path d='M11 0C-3.5 6.6-3.5 15.4 11 22C25.5 15.4 25.5 6.6 11 0Z' fill='#163a8e' stroke='#f1e7cc' stroke-width='1.3'/>` +
    `<path d='M11 0C-3.5 6.6-3.5 15.4 11 22C25.5 15.4 25.5 6.6 11 0Z' fill='none' stroke='#22a9a4' stroke-width='.5'/>` +
    `<path d='M11 6.5C9 8.5 9 11 11 12.6C13 11 13 8.5 11 6.5Z' fill='#d8432f'/>` +
    `<circle cx='11' cy='14' r='1.8' fill='#22a9a4'/>` +
    [[0, 0], [22, 0], [0, 22], [22, 22]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3.6' fill='#22a9a4' stroke='#f1e7cc' stroke-width='.6'/><circle cx='${x}' cy='${y}' r='1.5' fill='#d8432f'/>`).join('') +
    `</pattern>`;
  let wreath = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const [x, y] = polar(26.5, a);
    const deg = (a * 180) / Math.PI;
    wreath += `<path d='M0 1.4C-2 .4-2.2-2.6 0-4.4C2.2-2.6 2-.4 0 1.4Z' fill='#d8432f' stroke='#f1e7cc' stroke-width='.45' transform='translate(${f(x)} ${f(y)}) rotate(${f(deg)})'/>`;
    const [bx, by] = polar(26.5, a + Math.PI / 12);
    wreath += `<circle cx='${f(bx)}' cy='${f(by)}' r='1.3' fill='#5fd0c4'/>`;
  }
  let sc = 'M';
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const [x, y] = polar(32, a);
    if (i === 0) sc += `${f(x)} ${f(y)}`;
    else {
      const [qx, qy] = polar(34.6, a - Math.PI / n);
      sc += `Q${f(qx)} ${f(qy)} ${f(x)} ${f(y)}`;
    }
  }
  return url(
    `<rect width='100' height='100' fill='url(#t)'/><rect width='100' height='100' fill='#06103a' opacity='.32'/>` +
      `<path d='${sc}Z' fill='#06103a' transform='translate(50 50) scale(1.08) translate(-50 -50)' opacity='.9'/>` +
      `<path d='${sc}Z' fill='#163a8e' stroke='#f1e7cc' stroke-width='1.2'/>` + wreath +
      `<circle cx='50' cy='50' r='21' fill='#0a1a4e' stroke='#f1e7cc' stroke-width='1.2'/><circle cx='50' cy='50' r='19.2' fill='none' stroke='#5fd0c4' stroke-width='1' stroke-dasharray='.8 1.6'/>` +
      `<circle cx='50' cy='50' r='12.5' fill='none' stroke='#5fd0c4' stroke-width='1.3' opacity='.85'/>`,
    tile,
  );
}

// ───────── Kızıl Salon ─────────
function kizil(): string {
  const tuft =
    `<pattern id='p' width='26' height='36' patternUnits='userSpaceOnUse' x='-0' y='14'>` +
    `<rect width='26' height='36' fill='#3a030e'/>` +
    `<path d='M13 0L26 18L13 36L0 18Z' fill='url(#c)'/>` +
    `<path d='M0 0L13 18M26 0L13 18M0 36L13 18M26 36L13 18' stroke='#1c0006' stroke-width='.4' opacity='.6'/>` +
    [[13, 0], [0, 18], [26, 18], [13, 36]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3' fill='#1c0006' opacity='.55'/><circle cx='${x}' cy='${y}' r='1.5' fill='url(#b)'/>`).join('') +
    `</pattern>`;
  return url(
    `<rect width='100' height='100' fill='url(#p)'/><circle cx='50' cy='50' r='60' fill='url(#lt)'/>` +
      `<circle cx='50' cy='51' r='27' fill='#1c0006' opacity='.5'/><circle cx='50' cy='50' r='27' fill='url(#pad)'/>` +
      `<circle cx='50' cy='50' r='27' fill='none' stroke='url(#gd)' stroke-width='2.6'/><circle cx='50' cy='50' r='27' fill='none' stroke='#5a3006' stroke-width='2.6' stroke-dasharray='.6 1.6' opacity='.7'/>`,
    tuft +
      `<radialGradient id='c' cx='.5' cy='.4' r='.6'><stop offset='0' stop-color='#b8263e'/><stop offset='.55' stop-color='#94182e'/><stop offset='.85' stop-color='#6a0a1c'/><stop offset='1' stop-color='#3a020c'/></radialGradient>` +
      `<radialGradient id='b' cx='.35' cy='.3' r='.8'><stop offset='0' stop-color='#fff6cf'/><stop offset='.4' stop-color='#f0c255'/><stop offset='1' stop-color='#6a3a08'/></radialGradient>` +
      `<radialGradient id='pad'><stop offset='0' stop-color='#a01a30'/><stop offset='.8' stop-color='#8a1226'/><stop offset='1' stop-color='#a8243a'/></radialGradient>` +
      `<radialGradient id='lt'><stop offset='0' stop-color='#ffbe6a' stop-opacity='.22'/><stop offset='.6' stop-color='#ffbe6a' stop-opacity='0'/><stop offset='1' stop-color='#100003' stop-opacity='.5'/></radialGradient>` +
      `<linearGradient id='gd' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffe59a'/><stop offset='.5' stop-color='#d39a36'/><stop offset='1' stop-color='#7a4c12'/></linearGradient>`,
  );
}

// ───────── Zümrüt Kadife ─────────
function zumrut(): string {
  const dam =
    `<path d='M0-10C2-7.5 5.2-6 4.6-3C4.4-.5 2 .8 3 3.2C3.8 5.2 1.8 7 0 7.8C-1.8 7-3.8 5.2-3 3.2C-2 .8-4.4-.5-4.6-3C-5.2-6-2-7.5 0-10Z'/>` +
    `<path d='M5-.2C8.2-1 9.6 2.2 7.8 3.6C6.6 4.6 5.2 3.6 6 2.6C7 3 8 2 7.2 1C6.4.2 5.6.6 5-.2Z'/><path d='M-5-.2C-8.2-1-9.6 2.2-7.8 3.6C-6.6 4.6-5.2 3.6-6 2.6C-7 3-8 2-7.2 1C-6.4.2-5.6.6-5-.2Z'/>` +
    `<path d='M0 8.2C2 8 4.4 9 5.6 10C3.6 9.8 1.6 9.4 0 8.2ZM0 8.2C-2 8-4.4 9-5.6 10C-3.6 9.8-1.6 9.4 0 8.2Z'/>`;
  const pat =
    `<pattern id='d' width='30' height='40' patternUnits='userSpaceOnUse' x='0' y='-10'>` +
    `<rect width='30' height='40' fill='#0d5a38'/>` +
    [[15, 10], [0, 30], [30, 30]].map(([x, y]) =>
      `<g transform='translate(${x + 0.35} ${y + 0.45})' fill='#011a0e' opacity='.7'>${dam}</g><g transform='translate(${x - 0.25} ${y - 0.3})' fill='#a8f4cc' opacity='.26'>${dam}</g><g transform='translate(${x} ${y})' fill='#064328' opacity='.85'>${dam}</g>`).join('') +
    `</pattern>`;
  let studs = '';
  for (let i = 0; i < 28; i++) {
    const [x, y] = polar(29.4, (i / 28) * Math.PI * 2);
    studs += `<circle cx='${f(x)}' cy='${f(y)}' r='${i % 7 === 0 ? 0.9 : 0.55}' fill='#e8c56c'/>`;
  }
  return url(
    `<rect width='100' height='100' fill='url(#d)'/><circle cx='50' cy='50' r='27.5' fill='#0e5a3a'/><circle cx='50' cy='50' r='70' fill='url(#lt)'/>` +
      `<circle cx='50' cy='50' r='27.5' fill='none' stroke='url(#br)' stroke-width='1.4'/><circle cx='50' cy='50' r='31.3' fill='none' stroke='url(#br)' stroke-width='.8'/>` + studs,
    pat +
      `<radialGradient id='lt'><stop offset='0' stop-color='#ffd48a' stop-opacity='.3'/><stop offset='.45' stop-color='#ffd48a' stop-opacity='.06'/><stop offset='1' stop-color='#000a05' stop-opacity='.55'/></radialGradient>` +
      `<linearGradient id='br' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f8e2a0'/><stop offset='.5' stop-color='#cf9f48'/><stop offset='1' stop-color='#7c5418'/></linearGradient>`,
  );
}

export const SWATCH: Record<string, string> = {arena: arena(), gece: gece(), cini: cini(), kizil: kizil(), zumrut: zumrut()};
