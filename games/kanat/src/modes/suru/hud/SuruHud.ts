// SÜRÜ.io DOM HUD (§2.11, §3.5, §3.8): sun-arc timer, flock size, top 3 (colour + pattern + marker + "YZ"),
// circular minimap with the sunset ring, breath arc under the finger, short announcements ("KUŞATMA!"),
// FTUE ghost thumb and the results card. Max 6 HUD elements; centre 40 % of the screen stays clear.
// Fonts: Barlow Condensed (numbers) / Inter (text) via src/ui/fonts.ts, with condensed/sans fallbacks.

import type { FlockRenderSource } from '../sim/types.ts';
import { ownerStyle } from '../render/palette.ts';

export type Lang = 'tr' | 'en';

const STR = {
  tr: {
    birds: 'kuş',
    you: 'Sen',
    ai: 'YZ',
    siege: 'KUŞATMA!',
    sieged: 'KUŞATILDIN',
    breathless: 'Nefessiz',
    hawk: 'Doğan!',
    gust: 'Rüzgâr',
    storm: 'Fırtına',
    sunset: 'Gün batıyor',
    lone: 'Yalnız!',
    recovered: 'Kurtuldun',
    eliminated: 'Elendin',
    place: 'Sıra',
    peak: 'Zirve',
    converted: 'Dönüştürülen',
    wild: 'Toplanan yabani',
    sieges: 'Kuşatma',
    survival: 'Ayakta kalma',
    again: 'Tekrar',
    watch: 'İzle',
    share: 'Paylaş',
    exit: 'Çık',
    copied: 'Kopyalandı',
    aiFlocks: 'Yapay zekâ sürüleri',
    winner: 'Gün batımının sürüsü',
    league: 'Lig',
    daily: 'Sürü Günü',
    practice: 'Antrenman',
    untilSunset: 'Gün batımına kadar ayakta',
  },
  en: {
    birds: 'birds',
    you: 'You',
    ai: 'AI',
    siege: 'ENCIRCLED!',
    sieged: 'YOU WERE ENCIRCLED',
    breathless: 'Out of breath',
    hawk: 'Hawk!',
    gust: 'Gust',
    storm: 'Storm',
    sunset: 'Sun is setting',
    lone: 'Alone!',
    recovered: 'Recovered',
    eliminated: 'Eliminated',
    place: 'Place',
    peak: 'Peak',
    converted: 'Converted',
    wild: 'Wild gathered',
    sieges: 'Encirclements',
    survival: 'Survived',
    again: 'Again',
    watch: 'Watch',
    share: 'Share',
    exit: 'Exit',
    copied: 'Copied',
    aiFlocks: 'AI flocks',
    winner: 'Flock of the sunset',
    league: 'League',
    daily: 'Flock Day',
    practice: 'Practice',
    untilSunset: 'Standing at sunset',
  },
} as const;

export type HudKey = keyof (typeof STR)['tr'];

const CSS = /* css */ `
.sr-hud { position: absolute; inset: 0; pointer-events: none; color: #F5F1E8; font-family: 'Inter', 'Kanat Fallback', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; font-variant-numeric: tabular-nums; }
.sr-num { font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif; font-weight: 700; letter-spacing: 0.01em; }
.sr-panel { background: rgba(14,20,28,0.55); border: 1px solid #FFFFFF22; border-radius: 12px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.sr-top { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px); left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; opacity: 0.92; }
.sr-sun { width: 168px; height: 50px; display: block; }
.sr-time { font-size: 15px; margin-top: -6px; opacity: 0.78; }
.sr-size { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; }
.sr-size b { font-size: 40px; line-height: 1; color: #FFC23D; }
.sr-size span { font-size: 13px; opacity: 0.7; font-weight: 600; }
.sr-top3 { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px); right: 10px; padding: 7px 9px 6px; min-width: 128px; max-width: 46vw; opacity: 0.92; }
.sr-row { display: flex; align-items: center; gap: 6px; height: 22px; font-size: 12px; }
.sr-row.me .sr-name { color: #FFC23D; font-weight: 600; }
.sr-rk { width: 12px; font-size: 13px; opacity: 0.7; }
.sr-sw { width: 13px; height: 13px; border-radius: 4px; flex: none; box-sizing: border-box; }
.sr-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-ai { font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; padding: 1px 4px; border-radius: 4px; border: 1px solid #FFFFFF44; opacity: 0.8; }
.sr-cnt { font-size: 15px; min-width: 26px; text-align: right; }
.sr-sep { height: 1px; background: #FFFFFF22; margin: 3px 0; }
.sr-mini { position: absolute; left: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); width: 104px; height: 104px; border-radius: 50%; overflow: hidden; }
.sr-mini canvas { width: 100%; height: 100%; display: block; }
.sr-pause { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px); left: 10px; width: 44px; height: 44px; border-radius: 12px; pointer-events: auto; display: grid; place-items: center; cursor: pointer; }
.sr-pause i { display: block; width: 4px; height: 14px; background: #F5F1E8; border-radius: 2px; margin: 0 2px; }
.sr-pause div { display: flex; }
.sr-ann { position: absolute; left: 0; right: 0; top: 30%; text-align: center; pointer-events: none; }
.sr-ann div { display: inline-block; font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', sans-serif; font-style: italic; font-weight: 600; font-size: 46px; letter-spacing: 0.06em;
  color: #FFC23D; opacity: 0; transform: translateY(8px) scale(0.96); transition: opacity 220ms ease-out, transform 220ms ease-out; padding: 2px 18px; border-bottom: 1px solid #FFFFFF33; }
.sr-ann div.small { font-size: 26px; color: #F5F1E8; letter-spacing: 0.04em; }
.sr-ann div.on { opacity: 1; transform: none; }
.sr-breath { position: absolute; width: 96px; height: 96px; margin: -48px 0 0 -48px; opacity: 0; transition: opacity 180ms ease-out; }
.sr-breath.on { opacity: 1; }
.sr-ghost { position: absolute; width: 58px; height: 58px; margin: -29px 0 0 -29px; opacity: 0; transition: opacity 260ms ease-out; }
.sr-ghost.on { opacity: 0.85; }
.sr-label { position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%); font-size: 11px; letter-spacing: 0.06em; opacity: 0.55; white-space: nowrap; }
.sr-res { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(6,9,13,0.35); pointer-events: auto; opacity: 0; transition: opacity 240ms ease-out; }
.sr-res.on { opacity: 1; }
.sr-card { width: min(340px, 88vw); padding: 18px 18px 16px; }
.sr-card h2 { margin: 0; font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', sans-serif; font-weight: 700; font-size: 64px; line-height: 0.95; color: #FFC23D; }
.sr-card h2 small { font-size: 26px; color: #F5F1E8; opacity: 0.6; font-weight: 600; }
.sr-card .sub { font-size: 13px; opacity: 0.75; margin: 4px 0 12px; }
.sr-kv { display: flex; justify-content: space-between; align-items: baseline; height: 27px; border-top: 1px solid #FFFFFF18; font-size: 13px; }
.sr-kv b { font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', sans-serif; font-weight: 600; font-size: 20px; }
.sr-lp { margin: 10px 0 2px; font-size: 13px; opacity: 0.85; display: flex; justify-content: space-between; }
.sr-lp b { font-family: 'Barlow Condensed', 'Kanat Fallback Condensed', 'Arial Narrow', sans-serif; font-weight: 700; font-size: 22px; color: #4CC38A; }
.sr-lp b.neg { color: #E5484D; }
.sr-btns { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 14px; }
.sr-btn { height: 46px; border-radius: 12px; border: 1px solid #FFFFFF33; background: rgba(245,241,232,0.06); color: #F5F1E8; font: 600 14px 'Inter', 'Kanat Fallback', Arial, sans-serif; cursor: pointer; }
.sr-btn.primary { grid-column: 1 / -1; height: 54px; background: #FFC23D; color: #1A1408; border: none; font-size: 17px; font-weight: 700; }
`;

function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

function markSvg(mark: number, color: string, size = 12): string {
  const h = size / 2;
  const s = `stroke="${color}" stroke-width="1.6" fill="none"`;
  if (mark === 0) return `<svg width="${size}" height="${size}"><circle cx="${h}" cy="${h}" r="${h - 1.5}" ${s}/></svg>`;
  if (mark === 1) return `<svg width="${size}" height="${size}"><path d="M${h} 1.5 L${size - 1.5} ${size - 2} L1.5 ${size - 2} Z" ${s}/></svg>`;
  if (mark === 2) return `<svg width="${size}" height="${size}"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" ${s}/></svg>`;
  return `<svg width="${size}" height="${size}"><path d="M${h} 1 L${size - 1} ${h} L${h} ${size - 1} L1 ${h} Z" ${s}/></svg>`;
}

export interface HudFlockInfo {
  name: string;
  isBot: boolean;
}

export interface ResultsView {
  place: number;
  of: number;
  title: string;
  peak: number;
  converted: number;
  wild: number;
  sieges: number;
  survivalSec: number;
  lpDelta: number;
  leagueName: string;
  eliminatedEarly: boolean;
}

export class SuruHud {
  readonly root: HTMLDivElement;
  lang: Lang;
  private readonly sunPath: SVGPathElement;
  private readonly sunDone: SVGPathElement;
  private readonly sunDot: SVGCircleElement;
  private readonly sunRing: SVGPathElement;
  private readonly timeEl: HTMLDivElement;
  private readonly sizeEl: HTMLElement;
  private readonly top3: HTMLDivElement;
  private readonly mini: HTMLCanvasElement;
  private readonly miniCtx: CanvasRenderingContext2D | null;
  private readonly annWrap: HTMLDivElement;
  private readonly annEl: HTMLDivElement;
  private annUntil = 0;
  private readonly breath: HTMLDivElement;
  private readonly breathArc: SVGCircleElement;
  private readonly ghost: HTMLDivElement;
  private readonly label: HTMLDivElement;
  private readonly res: HTMLDivElement;
  private lastTop3 = '';
  private lastSize = -1;
  private lastTime = '';
  private names: HudFlockInfo[] = [];
  onPause: (() => void) | null = null;
  private readonly style: HTMLStyleElement;

  constructor(container: HTMLElement, lang: Lang) {
    this.lang = lang;
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    const root = document.createElement('div');
    root.className = 'sr-hud';
    this.root = root;
    container.appendChild(root);
    // top: sun arc timer + flock size
    const top = document.createElement('div');
    top.className = 'sr-top';
    const s = svg('svg', { class: 'sr-sun', viewBox: '0 0 168 50' }) as SVGSVGElement;
    s.appendChild(svg('line', { x1: 6, y1: 46, x2: 162, y2: 46, stroke: '#FFFFFF44', 'stroke-width': 1 }));
    this.sunPath = svg('path', { d: 'M14 46 A70 40 0 0 1 154 46', fill: 'none', stroke: '#FFFFFF2a', 'stroke-width': 2 }) as SVGPathElement;
    this.sunDone = svg('path', { d: 'M14 46 A70 40 0 0 1 154 46', fill: 'none', stroke: '#FFC48A', 'stroke-width': 2, 'stroke-linecap': 'round' }) as SVGPathElement;
    this.sunRing = svg('path', { d: 'M14 46 A70 40 0 0 1 154 46', fill: 'none', stroke: '#FFB36B', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.0 }) as SVGPathElement;
    this.sunDot = svg('circle', { cx: 14, cy: 46, r: 5.5, fill: '#FFD7A0' }) as SVGCircleElement;
    s.append(this.sunPath, this.sunDone, this.sunRing, this.sunDot);
    top.appendChild(s);
    this.timeEl = document.createElement('div');
    this.timeEl.className = 'sr-time sr-num';
    top.appendChild(this.timeEl);
    const size = document.createElement('div');
    size.className = 'sr-size';
    this.sizeEl = document.createElement('b');
    this.sizeEl.className = 'sr-num';
    const sl = document.createElement('span');
    sl.textContent = this.t('birds');
    size.append(this.sizeEl, sl);
    top.appendChild(size);
    root.appendChild(top);
    // top 3
    this.top3 = document.createElement('div');
    this.top3.className = 'sr-top3 sr-panel';
    root.appendChild(this.top3);
    // minimap
    const mw = document.createElement('div');
    mw.className = 'sr-mini sr-panel';
    this.mini = document.createElement('canvas');
    this.mini.width = 208;
    this.mini.height = 208;
    mw.appendChild(this.mini);
    root.appendChild(mw);
    this.miniCtx = this.mini.getContext('2d');
    // pause
    const pb = document.createElement('div');
    pb.className = 'sr-pause sr-panel';
    pb.innerHTML = '<div><i></i><i></i></div>';
    pb.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.onPause?.();
    });
    root.appendChild(pb);
    // announcements
    this.annWrap = document.createElement('div');
    this.annWrap.className = 'sr-ann';
    this.annEl = document.createElement('div');
    this.annWrap.appendChild(this.annEl);
    root.appendChild(this.annWrap);
    // breath arc (under the finger)
    this.breath = document.createElement('div');
    this.breath.className = 'sr-breath';
    const bs = svg('svg', { width: 96, height: 96, viewBox: '0 0 96 96' }) as SVGSVGElement;
    bs.appendChild(svg('circle', { cx: 48, cy: 48, r: 40, fill: 'none', stroke: '#FFFFFF22', 'stroke-width': 1 }));
    this.breathArc = svg('circle', {
      cx: 48,
      cy: 48,
      r: 40,
      fill: 'none',
      stroke: '#FFC23D',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-dasharray': `${2 * Math.PI * 40}`,
      transform: 'rotate(-90 48 48)',
    }) as SVGCircleElement;
    bs.appendChild(this.breathArc);
    this.breath.appendChild(bs);
    root.appendChild(this.breath);
    // FTUE ghost thumb
    this.ghost = document.createElement('div');
    this.ghost.className = 'sr-ghost';
    this.ghost.innerHTML =
      '<svg width="58" height="58" viewBox="0 0 58 58"><circle cx="29" cy="29" r="26" fill="rgba(245,241,232,0.10)" stroke="#F5F1E8" stroke-opacity="0.55" stroke-width="1.5"/><circle cx="29" cy="29" r="11" fill="#F5F1E8" fill-opacity="0.75"/></svg>';
    root.appendChild(this.ghost);
    // AI label (§2.6: bots labelled everywhere)
    this.label = document.createElement('div');
    this.label.className = 'sr-label';
    this.label.textContent = this.t('aiFlocks');
    root.appendChild(this.label);
    // results
    this.res = document.createElement('div');
    this.res.className = 'sr-res';
    this.res.style.display = 'none';
    root.appendChild(this.res);
  }

  t(k: HudKey): string {
    return STR[this.lang][k];
  }

  setNames(names: HudFlockInfo[]): void {
    this.names = names;
    this.lastTop3 = '';
  }

  /** big centre announcement (kept short, ≤ 1.4 s) */
  announce(key: HudKey, now: number, small = false, color?: string): void {
    const txt = small ? this.t(key) : this.t(key).toLocaleUpperCase(this.lang === 'tr' ? 'tr-TR' : 'en-US');
    this.annEl.textContent = txt;
    this.annEl.className = small ? 'small' : '';
    this.annEl.style.color = color ?? (small ? '#F5F1E8' : '#FFC23D');
    void this.annEl.offsetWidth;
    this.annEl.classList.add('on');
    this.annUntil = now + (small ? 1.1 : 1.4);
  }

  showBreath(on: boolean, x = 0, y = 0, breath01 = 1, breathless = false): void {
    this.breath.classList.toggle('on', on);
    if (!on) return;
    this.breath.style.left = `${x}px`;
    this.breath.style.top = `${y}px`;
    const c = 2 * Math.PI * 40;
    this.breathArc.setAttribute('stroke-dashoffset', `${c * (1 - Math.max(0, Math.min(1, breath01)))}`);
    this.breathArc.setAttribute('stroke', breathless ? '#F5F1E8' : '#FFC23D');
    this.breathArc.setAttribute('stroke-opacity', breathless ? '0.45' : '1');
  }

  ghostAt(on: boolean, x = 0, y = 0, pressed = false): void {
    this.ghost.classList.toggle('on', on);
    if (!on) return;
    this.ghost.style.left = `${x}px`;
    this.ghost.style.top = `${y}px`;
    this.ghost.style.transform = pressed ? 'scale(0.86)' : 'scale(1)';
  }

  update(src: FlockRenderSource, player: number, now: number, roundSec: number, camYawFwd: { x: number; z: number }): void {
    // announcements timeout
    if (this.annUntil > 0 && now > this.annUntil) {
      this.annEl.classList.remove('on');
      this.annUntil = 0;
    }
    // sun arc: elapsed share of the round, sun sinks along the arc to the horizon at 3:00
    const k = Math.min(1, src.timeSec / roundSec);
    const ang = Math.PI * (1 - k);
    const cx = 84 + Math.cos(ang) * 70;
    const cy = 46 - Math.sin(ang) * 40;
    this.sunDot.setAttribute('cx', cx.toFixed(1));
    this.sunDot.setAttribute('cy', cy.toFixed(1));
    const len = this.sunDone.getTotalLength ? this.sunDone.getTotalLength() : 220;
    this.sunDone.setAttribute('stroke-dasharray', `${len * k} ${len}`);
    const ringK = 135 / roundSec;
    this.sunRing.setAttribute('stroke-dasharray', `0 ${len * ringK} ${len * (1 - ringK)} ${len}`);
    this.sunRing.setAttribute('opacity', src.ringActive ? '0.9' : '0.25');
    this.sunDot.setAttribute('fill', k > 0.95 ? '#C98670' : '#FFD7A0');
    const rem = Math.max(0, Math.ceil(roundSec - src.timeSec));
    const ts = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
    if (ts !== this.lastTime) {
      this.timeEl.textContent = ts;
      this.lastTime = ts;
    }
    const mySize = src.flockAlive[player] ? src.flockCountArr[player] + 1 : 0;
    if (mySize !== this.lastSize) {
      this.sizeEl.textContent = String(mySize);
      this.lastSize = mySize;
    }
    // top 3 (+ the player's row when outside)
    const order: number[] = [];
    for (let f = 1; f <= src.flockCount; f++) if (src.flockAlive[f]) order.push(f);
    order.sort((a, b) => src.flockCountArr[b] - src.flockCountArr[a] || a - b);
    const key = order.slice(0, 3).map((f) => `${f}:${src.flockCountArr[f]}`).join(',') + `|${player}:${mySize}:${order.indexOf(player)}`;
    if (key !== this.lastTop3) {
      this.lastTop3 = key;
      let html = '';
      const row = (f: number, rank: number): string => {
        const st = ownerStyle(f);
        const info = this.names[f - 1];
        const border = st.pattern === 0 ? `background:${st.color}` : `border:2px ${st.pattern === 1 ? 'dashed' : 'dotted'} ${st.color}`;
        const nm = info ? info.name : `#${f}`;
        const ai = info && info.isBot ? `<span class="sr-ai">${this.t('ai')}</span>` : '';
        return `<div class="sr-row${f === player ? ' me' : ''}"><span class="sr-rk sr-num">${rank}</span><span class="sr-sw" style="${border}"></span>${markSvg(st.mark, st.color)}<span class="sr-name">${escapeHtml(nm)}</span>${ai}<span class="sr-cnt sr-num">${src.flockCountArr[f] + 1}</span></div>`;
      };
      for (let k2 = 0; k2 < Math.min(3, order.length); k2++) html += row(order[k2], k2 + 1);
      const pi = order.indexOf(player);
      if (pi >= 3) html += `<div class="sr-sep"></div>${row(player, pi + 1)}`;
      this.top3.innerHTML = html;
    }
    this.drawMinimap(src, player, camYawFwd);
  }

  private drawMinimap(src: FlockRenderSource, player: number, fwd: { x: number; z: number }): void {
    const ctx = this.miniCtx;
    if (!ctx) return;
    const W = this.mini.width;
    const R = W / 2;
    const scale = (R - 6) / 300;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(R, R);
    // map rotates with the camera: screen-up = camera forward
    const rx = -fwd.z;
    const rz = fwd.x;
    const map = (x: number, z: number): [number, number] => [(x * rx + z * rz) * scale, -(x * fwd.x + z * fwd.z) * scale];
    ctx.strokeStyle = '#FFFFFF30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 300 * scale, 0, Math.PI * 2);
    ctx.stroke();
    if (src.ringActive) {
      ctx.fillStyle = 'rgba(27,36,64,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, 300 * scale, 0, Math.PI * 2);
      ctx.arc(0, 0, src.ringRadius * scale, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = '#FFB36B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, src.ringRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    const st = src.storm;
    if (st.active) {
      const [x, y] = map(st.x, st.z);
      ctx.fillStyle = 'rgba(150,165,190,0.28)';
      ctx.beginPath();
      ctx.arc(x, y, st.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    // flocks: centroid blob sized by √n + leader dot
    for (let f = 1; f <= src.flockCount; f++) {
      if (!src.flockAlive[f]) continue;
      const style = ownerStyle(f);
      const [x, y] = map(src.leaderX[f], src.leaderZ[f]);
      const r = Math.max(3, Math.sqrt(src.flockCountArr[f] + 1) * 0.9);
      ctx.fillStyle = style.color;
      ctx.globalAlpha = f === player ? 1 : 0.85;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (f === player) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#F5F1E8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const h of src.hawks) {
      if (h.phase !== 1 && h.phase !== 2) continue;
      const [x, y] = map(h.x, h.z);
      ctx.strokeStyle = '#F5F1E8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 2);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 6, y - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  showResults(v: ResultsView | null, actions?: { again: () => void; watch?: () => void; share?: () => string; exit?: () => void }): void {
    if (!v) {
      this.res.classList.remove('on');
      this.res.style.display = 'none';
      this.res.innerHTML = '';
      return;
    }
    const lp = v.lpDelta >= 0 ? `+${v.lpDelta}` : `${v.lpDelta}`;
    const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    this.res.innerHTML = `<div class="sr-card sr-panel">
      <h2>${v.place}.<small> / ${v.of}</small></h2>
      <div class="sub">${escapeHtml(v.title)}</div>
      <div class="sr-kv"><span>${this.t('peak')}</span><b>${v.peak} ${this.t('birds')}</b></div>
      <div class="sr-kv"><span>${this.t('converted')}</span><b>${v.converted}</b></div>
      <div class="sr-kv"><span>${this.t('wild')}</span><b>${v.wild}</b></div>
      <div class="sr-kv"><span>${this.t('sieges')}</span><b>${v.sieges}</b></div>
      <div class="sr-kv"><span>${this.t('survival')}</span><b>${mmss(v.survivalSec)}</b></div>
      <div class="sr-lp"><span>${escapeHtml(v.leagueName)}</span><b class="${v.lpDelta < 0 ? 'neg' : ''}">${lp} LP</b></div>
      <div class="sr-btns">
        <button class="sr-btn primary" data-a="again">${this.t('again')}</button>
        ${v.eliminatedEarly ? `<button class="sr-btn" data-a="watch">${this.t('watch')}</button>` : '<span></span>'}
        <button class="sr-btn" data-a="share">${this.t('share')}</button>
        <button class="sr-btn" data-a="exit">${this.t('exit')}</button>
      </div></div>`;
    this.res.style.display = 'grid';
    void this.res.offsetWidth;
    this.res.classList.add('on');
    this.res.querySelectorAll('button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const a = (b as HTMLButtonElement).dataset.a;
        if (a === 'again') actions?.again();
        else if (a === 'watch') actions?.watch?.();
        else if (a === 'exit') actions?.exit?.();
        else if (a === 'share' && actions?.share) {
          const txt = actions.share();
          try {
            void navigator.clipboard?.writeText(txt);
          } catch {
            /* clipboard unavailable — the host bridge shares instead */
          }
          b.textContent = this.t('copied');
        }
      });
    });
  }

  setVisible(on: boolean): void {
    this.root.style.display = on ? '' : 'none';
  }

  dispose(): void {
    this.root.remove();
    this.style.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'));
}
