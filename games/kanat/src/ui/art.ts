// Painted fallback art for worlds (SVG): used on world cards, loading, postcard silhouettes, share-card fallback
// and the dev gallery backdrop. Palettes from BRIEF §3.2 — calm, documentary, no neon. Pure string output.
import type { WorldId } from '../sim/types.ts';
import { WORLD_ART } from './theme.ts';

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hex(c: string): [number, number, number] {
  const v = parseInt(c.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function mix(a: string, b: string, k: number): string {
  const A = hex(a);
  const B = hex(b);
  const r = (i: number): string => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, '0');
  return `#${r(0)}${r(1)}${r(2)}`;
}

function ridgePath(w: number, h: number, base: number, amp: number, seed: number, rough: number): { d: string; pts: [number, number][] } {
  const r = rng(seed);
  const waves = [0, 1, 2, 3].map((i) => ({ f: (0.6 + r() * 1.4) * (i + 1) * (Math.PI * 2) / w, p: r() * 6.28, a: amp / (i + 1.2) }));
  const pts: [number, number][] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    let y = base;
    for (const wv of waves) y -= wv.a * Math.sin(wv.f * x + wv.p);
    y += (r() - 0.5) * rough;
    pts.push([x, y]);
  }
  let d = `M0 ${h} L0 ${pts[0][1].toFixed(1)}`;
  for (const [x, y] of pts) d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  d += ` L${w} ${h} Z`;
  return { d, pts };
}

function contour(pts: [number, number][], dy: number): string {
  let d = '';
  pts.forEach(([x, y], i) => {
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y + dy).toFixed(1)} `;
  });
  return d;
}

export interface ArtOpts { w?: number; h?: number; seed?: number; motif?: boolean; contours?: boolean; id?: string }

/** Full painted landscape SVG markup for a world (cover-fit with preserveAspectRatio slice). */
export function worldArtSvg(world: WorldId, opts: ArtOpts = {}): string {
  const w = opts.w ?? 400;
  const h = opts.h ?? 500;
  const P = WORLD_ART[world];
  const uid = `${opts.id ?? 'a'}${world}${w}x${h}`;
  const seed = (opts.seed ?? 7) + world.length * 131;
  const r = rng(seed);
  const horizon = h * (world === 'likya' ? 0.56 : world === 'pamukkale' ? 0.6 : 0.58);
  const sunX = w * (world === 'kapadokya' ? 0.72 : world === 'likya' ? 0.22 : world === 'karadeniz' ? 0.65 : world === 'erciyes' ? 0.18 : 0.5);
  const sunY = world === 'pamukkale' ? horizon - h * 0.05 : world === 'kapadokya' ? horizon - h * 0.07 : h * 0.2;
  const parts: string[] = [];
  parts.push(`<defs>
<linearGradient id="s${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset="0.62" stop-color="${P.skyMid}"/><stop offset="1" stop-color="${P.horizon}"/></linearGradient>
<radialGradient id="g${uid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${P.sun}" stop-opacity="0.9"/><stop offset="0.25" stop-color="${P.sun}" stop-opacity="0.35"/><stop offset="1" stop-color="${P.sun}" stop-opacity="0"/></radialGradient>
<linearGradient id="m${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.mist}" stop-opacity="0"/><stop offset="0.5" stop-color="${P.mist}" stop-opacity="0.55"/><stop offset="1" stop-color="${P.mist}" stop-opacity="0"/></linearGradient>
<linearGradient id="f${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05080C" stop-opacity="0.55"/></linearGradient>
<linearGradient id="w${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2BB3B1"/><stop offset="1" stop-color="#0B4F6C"/></linearGradient>
</defs>`);
  parts.push(`<rect width="${w}" height="${h}" fill="url(#s${uid})"/>`);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${h * 0.32}" fill="url(#g${uid})"/>`);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${h * 0.022}" fill="${P.sun}"/>`);

  // Far → near ridges with aerial perspective (far layers fade toward the horizon colour).
  const layers = world === 'erciyes' ? 2 : 3;
  const ridgePts: [number, number][][] = [];
  for (let i = 0; i < layers; i++) {
    const k = i / Math.max(1, layers - 1);
    const base = horizon + h * (0.02 + k * 0.12);
    const amp = h * (0.05 + (1 - k) * 0.03);
    const col = mix(mix(P.far, P.near, k), P.horizon, (1 - k) * 0.45);
    const rp = ridgePath(w, h, base, amp, seed + i * 17, i === layers - 1 ? h * 0.006 : 0);
    ridgePts.push(rp.pts);
    if (world === 'erciyes' && i === 0) {
      // Volcanic cone with snow cap and blue shadow side.
      const px = w * 0.58;
      const py = horizon - h * 0.3;
      parts.push(`<path d="M${px - w * 0.62} ${horizon + h * 0.08} L${px - w * 0.05} ${py + h * 0.01} Q${px} ${py - h * 0.012} ${px + w * 0.05} ${py + h * 0.012} L${px + w * 0.7} ${horizon + h * 0.1} Z" fill="${mix(P.far, P.horizon, 0.15)}"/>`);
      parts.push(`<path d="M${px - w * 0.2} ${py + h * 0.12} L${px - w * 0.05} ${py + h * 0.01} Q${px} ${py - h * 0.012} ${px + w * 0.05} ${py + h * 0.012} L${px + w * 0.24} ${py + h * 0.14} L${px + w * 0.12} ${py + h * 0.1} L${px + w * 0.05} ${py + h * 0.13} L${px - w * 0.04} ${py + h * 0.09} L${px - w * 0.12} ${py + h * 0.13} Z" fill="#FFF6EC"/>`);
      parts.push(`<path d="M${px + w * 0.02} ${py + h * 0.005} L${px + w * 0.7} ${horizon + h * 0.1} L${px + w * 0.2} ${horizon + h * 0.1} Z" fill="#A9C2E0" opacity="0.55"/>`);
    }
    parts.push(`<path d="${rp.d}" fill="${col}"/>`);
    if (i === 0) parts.push(`<rect x="0" y="${horizon - h * 0.06}" width="${w}" height="${h * 0.16}" fill="url(#m${uid})"/>`);
  }

  if (opts.motif !== false) {
    if (world === 'kapadokya') {
      // Fairy chimneys on the mid ridge + balloons drifting in the dawn sky.
      const mid = ridgePts[1];
      for (let i = 0; i < 9; i++) {
        const idx = 4 + Math.floor(r() * (mid.length - 8));
        const [x, y] = mid[idx];
        const ch = h * (0.04 + r() * 0.05);
        const cw = w * (0.012 + r() * 0.01);
        parts.push(`<path d="M${x - cw} ${y + 2} L${x - cw * 0.45} ${y - ch} L${x + cw * 0.45} ${y - ch} L${x + cw} ${y + 2} Z" fill="${mix(P.far, P.near, 0.45)}"/><ellipse cx="${x}" cy="${y - ch}" rx="${cw * 0.95}" ry="${cw * 0.5}" fill="${mix(P.near, '#000000', 0.15)}"/>`);
      }
      const cols = ['#C8553D', '#E0A458', '#2A6F97', '#F4E1C1', '#9C4F6B', '#D98E5A'];
      for (let i = 0; i < 11; i++) {
        const bx = w * (0.06 + r() * 0.88);
        const by = h * (0.1 + r() * 0.38);
        const s = (0.5 + r() * 0.9) * (by / h + 0.35) * w * 0.032;
        const c = cols[i % cols.length];
        parts.push(`<g opacity="${(0.55 + r() * 0.45).toFixed(2)}"><ellipse cx="${bx}" cy="${by}" rx="${s}" ry="${s * 1.18}" fill="${c}"/><path d="M${bx - s * 0.62} ${by + s * 0.9} L${bx - s * 0.18} ${by + s * 1.75} M${bx + s * 0.62} ${by + s * 0.9} L${bx + s * 0.18} ${by + s * 1.75}" stroke="${mix(c, '#000000', 0.5)}" stroke-width="${Math.max(0.4, s * 0.06)}"/><rect x="${bx - s * 0.2}" y="${by + s * 1.72}" width="${s * 0.4}" height="${s * 0.3}" fill="#4A3426"/><ellipse cx="${bx - s * 0.3}" cy="${by - s * 0.2}" rx="${s * 0.35}" ry="${s * 0.75}" fill="#FFFFFF" opacity="0.12"/></g>`);
      }
    } else if (world === 'likya') {
      const seaTop = horizon + h * 0.05;
      parts.push(`<rect x="0" y="${seaTop}" width="${w}" height="${h - seaTop}" fill="url(#w${uid})"/>`);
      parts.push(`<rect x="0" y="${seaTop}" width="${w}" height="1.2" fill="#E8F4FB" opacity="0.7"/>`);
      for (let i = 0; i < 14; i++) {
        const y = seaTop + (h - seaTop) * (0.08 + r() * 0.8);
        const x = sunX + (r() - 0.5) * w * 0.25;
        parts.push(`<rect x="${x}" y="${y}" width="${w * (0.03 + r() * 0.08)}" height="1" fill="#FFF6E0" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`);
      }
      parts.push(`<path d="M0 ${h * 0.34} C${w * 0.12} ${h * 0.36} ${w * 0.2} ${h * 0.5} ${w * 0.26} ${h * 0.62} L${w * 0.34} ${h} L0 ${h} Z" fill="${mix(P.near, '#000000', 0.25)}"/>`);
      parts.push(`<path d="M0 ${h * 0.34} C${w * 0.1} ${h * 0.35} ${w * 0.16} ${h * 0.42} ${w * 0.2} ${h * 0.5}" stroke="#CFC6B4" stroke-width="1.4" fill="none" opacity="0.6"/>`);
      const gx = w * 0.64;
      const gy = seaTop + (h - seaTop) * 0.42;
      parts.push(`<path d="M${gx - w * 0.07} ${gy} L${gx + w * 0.07} ${gy} L${gx + w * 0.055} ${gy + h * 0.012} L${gx - w * 0.06} ${gy + h * 0.012} Z" fill="#F5F1E8"/><path d="M${gx - w * 0.02} ${gy} L${gx - w * 0.02} ${gy - h * 0.07} M${gx + w * 0.025} ${gy} L${gx + w * 0.025} ${gy - h * 0.055}" stroke="#3A2F28" stroke-width="1"/><path d="M${gx - w * 0.018} ${gy - h * 0.065} L${gx + w * 0.02} ${gy - h * 0.012} L${gx - w * 0.018} ${gy - h * 0.012} Z" fill="#F5F1E8" opacity="0.85"/><path d="M${gx - w * 0.12} ${gy + h * 0.016} L${gx + w * 0.09} ${gy + h * 0.016}" stroke="#E8F4FB" stroke-width="1" opacity="0.5"/>`);
    } else if (world === 'karadeniz') {
      for (let i = 0; i < 9; i++) {
        const cx = w * (r() * 1.1 - 0.05);
        const cy = horizon + h * (0.05 + r() * 0.05);
        parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${w * (0.18 + r() * 0.2)}" ry="${h * (0.025 + r() * 0.03)}" fill="#EEF2F0" opacity="${(0.6 + r() * 0.3).toFixed(2)}"/>`);
      }
      const near = ridgePts[layers - 1];
      for (let i = 0; i < 46; i++) {
        const idx = Math.floor(r() * near.length);
        const [x, y] = near[idx];
        const th = h * (0.035 + r() * 0.05);
        const tw = th * 0.32;
        parts.push(`<path d="M${x} ${y - th} L${x + tw} ${y + 3} L${x - tw} ${y + 3} Z" fill="${mix(P.near, '#000000', 0.2 + r() * 0.2)}"/>`);
      }
      parts.push(`<path d="M${w * 0.8} ${horizon + h * 0.08} L${w * 0.81} ${h * 0.95}" stroke="#F4F7F6" stroke-width="${w * 0.012}" opacity="0.55"/>`);
    } else if (world === 'pamukkale') {
      const base = horizon + h * 0.12;
      for (let i = 0; i < 7; i++) {
        const y = base + i * h * 0.045;
        const x0 = w * (0.05 + r() * 0.1) - i * w * 0.02;
        const x1 = w * (0.95 - r() * 0.1) + i * w * 0.02;
        parts.push(`<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y - h * 0.02} ${x1} ${y} L${x1} ${y + h * 0.03} Q${(x0 + x1) / 2} ${y + h * 0.012} ${x0} ${y + h * 0.03} Z" fill="${mix('#F7EDE2', '#F3C9A8', i / 7)}"/>`);
        parts.push(`<path d="M${x0 + w * 0.04} ${y + h * 0.006} Q${(x0 + x1) / 2} ${y - h * 0.012} ${x1 - w * 0.04} ${y + h * 0.006}" stroke="${i % 2 ? '#49C6C9' : '#FFC27A'}" stroke-width="${h * 0.008}" fill="none" opacity="0.75"/>`);
        parts.push(`<path d="M${x0} ${y + h * 0.03} Q${(x0 + x1) / 2} ${y + h * 0.012} ${x1} ${y + h * 0.03}" stroke="#9AA7C7" stroke-width="1" fill="none" opacity="0.6"/>`);
      }
    }
  }

  if (opts.contours !== false) {
    // "Map" detail: faint contour lines following the nearest ridge.
    const near = ridgePts[ridgePts.length - 1];
    let d = '';
    for (let i = 1; i <= 4; i++) d += contour(near, i * h * 0.035);
    parts.push(`<path d="${d}" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="1" fill="none"/>`);
  }
  parts.push(`<rect y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="url(#f${uid})"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${parts.join('')}</svg>`;
}

/** Data URL of the painted art (for <img>, canvas drawImage or CSS backgrounds). */
export function worldArtDataUrl(world: WorldId, opts: ArtOpts = {}): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(worldArtSvg(world, opts))}`;
}
