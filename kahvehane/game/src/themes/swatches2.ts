// Market küçük resimleri (Ajan B masaları): SVG minyatür → CSS background dizgesi (ortalanıp kırpılır).
// Gerçek boyamanın motiflerini taşır; ucuzdur (tek SVG, bir kez rasterlenir).
import {mulberry} from './paint';

const f = (v: number): string => (Math.round(v * 100) / 100).toString();
const url = (body: string, defs = ''): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`,
  )}") center / cover no-repeat`;

// ───────── Ebru Salonu: yığın çevresinde dönen renkli ebru kolları ─────────
function ebru(): string {
  const rnd = mulberry(5);
  const cols = ['#9a1428', '#dea840', '#f0e4c8', '#22788a', '#3c60be', '#5c0e28'];
  let arms = '';
  for (let i = 0; i < 46; i++) {
    const r0 = 14 + rnd() * 48;
    const a0 = rnd() * Math.PI * 2;
    const span = 0.8 + rnd() * 1.6;
    const pts: string[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const r = r0 + t * 9;
      const a = a0 + span * t;
      pts.push(`${f(50 + Math.cos(a) * r)} ${f(50 + Math.sin(a) * r * 1.1)}`);
    }
    arms += `<path d='M${pts.join('L')}' stroke='${cols[i % cols.length]}' stroke-width='${f(1.4 + rnd() * 3.2)}' fill='none' stroke-linecap='round' opacity='.9'/>`;
  }
  return url(
    `<rect width='100' height='100' fill='url(#bg)'/>${arms}<circle cx='50' cy='50' r='20' fill='url(#cv)'/>` +
      `<circle cx='50' cy='50' r='14' fill='none' stroke='#ecc46c' stroke-width='1.4' opacity='.85'/>`,
    `<radialGradient id='bg'><stop offset='0' stop-color='#1a2870'/><stop offset='1' stop-color='#070c30'/></radialGradient>` +
      `<radialGradient id='cv'><stop offset='0' stop-color='#080a22' stop-opacity='.85'/><stop offset='1' stop-color='#080a22' stop-opacity='0'/></radialGradient>`,
  );
}

// ───────── Kapadokya Şafağı: şafak göğü, balonlar, peri bacaları ─────────
function balloonSvg(x: number, y: number, r: number, a: string, b: string): string {
  return `<g transform='translate(${f(x)} ${f(y)}) scale(${f(r)})'><path d='M0-1C.62-1 .95-.6.92-.15C.88.3.5.55.24.78L.16.95H-.16L-.24.78C-.5.55-.88.3-.92-.15C-.95-.6-.62-1 0-1Z' fill='${a}'/>` +
    `<path d='M0-1C.25-1 .38-.6.36-.15C.34.3.2.55.1.78L.06.95H-.06L-.1.78C-.2.55-.34.3-.36-.15C-.38-.6-.25-1 0-1Z' fill='${b}'/>` +
    `<rect x='-.18' y='1.1' width='.36' height='.3' fill='#8a5228'/></g>`;
}
function kapadokya(): string {
  const rnd = mulberry(9);
  let ch = '';
  let x = -4;
  while (x < 104) {
    const hh = 14 + rnd() * 14, w = hh * 0.22;
    ch += `<path d='M${f(x - w)} 100L${f(x - w * 0.25)} ${f(100 - hh)}L${f(x + w * 0.25)} ${f(100 - hh)}L${f(x + w)} 100Z' fill='#7a3a52'/><ellipse cx='${f(x)}' cy='${f(100 - hh)}' rx='${f(w * 0.55)}' ry='${f(w * 0.3)}' fill='#3a1830'/>`;
    x += w * (1.6 + rnd() * 1.6);
  }
  return url(
    `<rect width='100' height='100' fill='url(#sk)'/><circle cx='64' cy='76' r='12' fill='#ffe6a0' opacity='.9'/>` +
      balloonSvg(28, 26, 9, '#e8173f', '#ffd23a') + balloonSvg(72, 18, 6, '#2fa7e0', '#ffffff') + balloonSvg(84, 46, 4.5, '#7a3fc8', '#ffb43a') + balloonSvg(14, 54, 4, '#18b06a', '#fff1c8') +
      `<path d='M0 86Q25 78 50 84T100 82V100H0Z' fill='#b0606a'/>${ch}`,
    `<linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3d2a7a'/><stop offset='.4' stop-color='#8a3f9a'/><stop offset='.65' stop-color='#e0577f'/><stop offset='.85' stop-color='#ff9a5a'/><stop offset='1' stop-color='#ffd77a'/></linearGradient>`,
  );
}

// ───────── Boğaz Gecesi: hilal, Galata, ışıklı köprü, yansımalar ─────────
function bogaz(): string {
  const rnd = mulberry(3);
  let st = '';
  for (let i = 0; i < 30; i++) st += `<circle cx='${f(rnd() * 100)}' cy='${f(rnd() * 30)}' r='${f(0.25 + rnd() * 0.5)}' fill='#fff' opacity='${f(0.4 + rnd() * 0.6)}'/>`;
  let lights = '';
  const cols = ['#ff5ab4', '#5ad2ff', '#ffd25a', '#a07aff'];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, xx = 52 + t * 56, yy = 22 + 16 * 4 * (t - 0.5) * (t - 0.5) * 0.9;
    lights += `<circle cx='${f(xx)}' cy='${f(yy)}' r='.9' fill='${cols[i % 4]}'/>`;
  }
  let ref = '';
  for (let i = 0; i < 18; i++) ref += `<rect x='${f(72 + (rnd() - 0.5) * 10)}' y='${f(42 + i * 3.2)}' width='${f(4 + rnd() * 8)}' height='.9' fill='#ffe6a0' opacity='${f(0.3 + rnd() * 0.5)}'/>`;
  return url(
    `<rect width='100' height='100' fill='url(#sky)'/>${st}<circle cx='78' cy='12' r='6' fill='#fff3c8'/><circle cx='81' cy='10' r='5.2' fill='#0b1240'/>` +
      `<rect y='38' width='100' height='62' fill='url(#wt)'/>${ref}` +
      `<path d='M14 38V20L17 14L20 20V38Z' fill='#04061a'/><path d='M0 38V33H8V30H13V38ZM22 38V32H30V34H40V38Z' fill='#04061a'/>` +
      `<path d='M52 34Q80 52 108 34' stroke='#1a1a52' stroke-width='.8' fill='none'/><rect x='50' y='34' width='60' height='1.2' fill='#1a1a52'/>${lights}` +
      `<circle cx='50' cy='50' r='18' fill='url(#cv)'/><circle cx='50' cy='50' r='13' fill='none' stroke='#9fb4ff' stroke-width='1.2' opacity='.7'/>`,
    `<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#04071e'/><stop offset='.38' stop-color='#3a3a9a'/></linearGradient>` +
      `<linearGradient id='wt' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1a1a6a'/><stop offset='1' stop-color='#02041a'/></linearGradient>` +
      `<radialGradient id='cv'><stop offset='0' stop-color='#02041a' stop-opacity='.6'/><stop offset='1' stop-color='#02041a' stop-opacity='0'/></radialGradient>`,
  );
}

export const SWATCH_B: Record<string, string> = {
  ebru: ebru(),
  kapadokya: kapadokya(),
  bogaz: bogaz(),
};
