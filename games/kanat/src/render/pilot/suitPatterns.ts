// Wingsuit pattern library: patternId + 3 colours in the shader (texture memory ≈ 0, §6.G).
// Pattern space P = (x lateral −1..1, y forward: head ≈ +0.85, feet ≈ −1). Returns weights for colours A, B, C.

export const SUIT_PATTERN_NAMES = [
  'serit', 'chevron', 'gradyan', 'kilim', 'cini', 'ebru', 'takimyildiz', 'periBacasi', 'turkuaz', 'geceYarisi',
  'balonSeridi', 'karKristali', 'topografya', 'ikiRenk', 'yarisSeridi', 'petek', 'dalga', 'tuy', 'dama', 'gunes',
  'simsek', 'benek', 'kanatUcu', 'kaplan', 'lale', 'pusula', 'kirlangic', 'traverten', 'mehtap', 'yakamoz', 'duz',
] as const;

/** Cosmetic pattern ids (src/content/meta/cosmetics.ts SUIT_PATTERNS) → shader pattern index. null = plain suit. */
export const COSMETIC_PATTERN_INDEX: Record<string, number> = {
  kilim: 3, cini: 4, ebru: 5, periBacasi: 7, turkuaz: 8, geceYarisi: 9, balonSeridi: 10, karKristali: 11, lale: 24,
  traverten: 27, ladin: 1, dalga: 16, kontur: 12, pusula: 25, guvercin: 17, yakamoz: 29, mehtap: 28, kizilUfuk: 2,
  sirt: 20, safak: 19, duz: 30,
};
export const PLAIN_PATTERN = 30;

/** UI labels (TR / EN) — UI owns i18n; these are suggestions. */
export const SUIT_PATTERN_LABELS: Record<string, [string, string]> = {
  serit: ['Şerit', 'Stripes'], chevron: ['Şevron', 'Chevron'], gradyan: ['Gradyan', 'Gradient'], kilim: ['Kilim', 'Kilim'],
  cini: ['Çini', 'Tile'], ebru: ['Ebru', 'Marbling'], takimyildiz: ['Takımyıldız', 'Constellation'], periBacasi: ['Peri Bacası', 'Fairy Chimney'],
  turkuaz: ['Turkuaz', 'Turquoise'], geceYarisi: ['Gece Yarısı', 'Midnight'], balonSeridi: ['Balon Şeridi', 'Balloon Stripe'],
  karKristali: ['Kar Kristali', 'Snow Crystal'], topografya: ['Topografya', 'Topography'], ikiRenk: ['İki Renk', 'Two-Tone'],
  yarisSeridi: ['Yarış Şeridi', 'Racing Stripe'], petek: ['Petek', 'Honeycomb'], dalga: ['Dalga', 'Wave'], tuy: ['Tüy', 'Feather'],
  dama: ['Dama', 'Harlequin'], gunes: ['Güneş', 'Sunburst'], simsek: ['Şimşek', 'Lightning'], benek: ['Benek', 'Dots'],
  kanatUcu: ['Kanat Ucu', 'Wingtip'], kaplan: ['Kaplan', 'Tiger'], lale: ['Lale', 'Tulip'], pusula: ['Pusula', 'Compass'],
  kirlangic: ['Kırlangıç', 'Swallow'], traverten: ['Traverten', 'Travertine'], mehtap: ['Mehtap', 'Moonpath'],
  yakamoz: ['Yakamoz', 'Sea Sparkle'], duz: ['Düz', 'Plain'],
};

/** 12 suit palettes (A main, B secondary, C accent). Saturated but never neon (§1 avoid list). */
export const SUIT_PALETTES: [string, string, string][] = [
  ['#1B2A4A', '#EDEBE6', '#F28C28'], // Gece
  ['#C2302A', '#2B2B2E', '#F1E6D0'], // Kızıl
  ['#1FA3A6', '#F3EFE6', '#0E3B4A'], // Turkuaz
  ['#E0A526', '#2A2522', '#F5E9C8'], // Altın
  ['#7D5BA6', '#F0E6F5', '#2C2140'], // Lavanta
  ['#2F5E3A', '#C9D68A', '#1E2A20'], // Orman
  ['#F2F4F7', '#3E6FA8', '#A9C2E0'], // Kar
  ['#E86A4A', '#FFC27A', '#2B2D5B'], // Gün Batımı
  ['#1F4E9C', '#F4F1EA', '#2BA3C7'], // Çini Mavisi
  ['#B5523B', '#E8D3B5', '#3C2A22'], // Kiremit
  ['#8DB580', '#23302A', '#E9F0E0'], // Yayla
  ['#1C1C1E', '#8A8A8E', '#EDEDED'], // Monokrom
];

export const SUIT_PALETTE_NAMES = ['gece', 'kizil', 'turkuaz', 'altin', 'lavanta', 'orman', 'kar', 'gunBatimi', 'ciniMavisi', 'kiremit', 'yayla', 'monokrom'] as const;

export const GLSL_SUIT_PATTERNS = /* glsl */ `
float kAa(float e, float x) { float w = max(fwidth(x), 1e-4); return smoothstep(e - w, e + w, x); }
float kBand(float x, float w) { float f = abs(fract(x) - 0.5); return 1.0 - kAa(w * 0.5, f); }
float kH21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float kVN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(kH21(i), kH21(i + vec2(1, 0)), f.x), mix(kH21(i + vec2(0, 1)), kH21(i + vec2(1, 1)), f.x), f.y); }
vec3 kW(float a, float b) { return vec3(clamp(1.0 - a - b, 0.0, 1.0), a, b); } // weights (A, B, C) from B-amount and C-amount

vec3 kSuitPattern(int id, vec2 P) {
  float ax = abs(P.x);
  if (id == 0) { // serit: diagonal stripes, mirrored
    float s = kBand((ax * 0.7 + P.y * 0.7) * 3.0, 0.45);
    float c = kBand((ax * 0.7 + P.y * 0.7) * 3.0 + 0.5, 0.12);
    return kW(s, c);
  } else if (id == 1) { // chevron pointing to the head
    float v = P.y - ax * 0.9;
    float s = kBand(v * 2.4, 0.4);
    float c = kBand(v * 2.4 + 0.5, 0.1);
    return kW(s, c);
  } else if (id == 2) { // gradyan nose→tail with accent seam
    float t = smoothstep(0.9, -1.0, P.y);
    return kW(t, kBand(P.y * 0.5 + 0.25, 0.04));
  } else if (id == 3) { // kilim: stepped diamonds along the spine and wings
    vec2 q = vec2(ax, P.y) * vec2(3.0, 3.0);
    vec2 c = floor(q) + 0.5;
    vec2 f = abs(q - c);
    float d = max(f.x, f.y) * 0.0 + (f.x + f.y);
    float step1 = floor(d * 4.0) / 4.0;
    float b = 1.0 - kAa(0.5, step1);
    float hook = kAa(0.62, d) * (1.0 - kAa(0.72, d));
    float row = mod(c.x + c.y, 2.0);
    return kW(b * (row < 0.5 ? 1.0 : 0.0) + hook, b * (row > 0.5 ? 1.0 : 0.0));
  } else if (id == 4) { // cini: 8-fold rosettes on a tile grid
    vec2 q = vec2(ax, P.y) * 2.6;
    vec2 g = fract(q) - 0.5;
    float r = length(g);
    float a = atan(g.y, g.x);
    float petal = 0.28 + 0.1 * cos(a * 8.0);
    float flower = 1.0 - kAa(petal, r);
    float centre = 1.0 - kAa(0.07, r);
    float frame = kBand(q.x, 0.05) + kBand(q.y, 0.05);
    return kW(clamp(flower - centre + frame * 0.6, 0.0, 1.0), centre);
  } else if (id == 5) { // ebru: marbled flow (domain-warped bands)
    vec2 q = vec2(P.x * 1.6, P.y * 1.6);
    float w = kVN(q * 2.0) * 1.5 + kVN(q * 4.3 + 7.0) * 0.6;
    float v = sin((q.x + w) * 6.0 + sin(q.y * 3.0 + w * 2.0) * 1.5);
    return kW(kAa(0.15, v), kBand(v * 0.5 + 0.1, 0.08));
  } else if (id == 6) { // takimyildiz: stars + thin connecting lines on A
    vec2 q = vec2(P.x, P.y) * 6.0;
    vec2 i = floor(q);
    vec2 jit = vec2(kH21(i), kH21(i + 3.1)) * 0.6 + 0.2;
    float d = length(fract(q) - jit);
    float star = 1.0 - kAa(0.07 + 0.05 * kH21(i + 7.0), d);
    float line = kBand((P.x * 0.8 + P.y * 0.6) * 1.5, 0.012) * step(0.6, kVN(q * 0.4));
    return kW(star, line * 0.8);
  } else if (id == 7) { // periBacasi: chimney skyline across the wings
    float x = P.x * 4.0;
    float i = floor(x);
    float h = 0.15 + 0.35 * kH21(vec2(i, 1.0));
    float f = abs(fract(x) - 0.5);
    float cone = 1.0 - kAa(h * 1.4 - f * 1.2 * (h + 0.2), -(P.y + 0.15));
    float cap = (1.0 - kAa(0.22, f)) * kBand((P.y + 0.15 + h * 1.4 - 0.25) * 6.0, 0.6) * 0.0;
    return kW(cone, cap + kBand(P.y * 0.5 - 0.05, 0.03));
  } else if (id == 8) { // turkuaz: solid A with B edge piping and C spine
    float edge = kAa(0.82, ax) + kAa(0.75, -P.y);
    float spine = 1.0 - kAa(0.035, ax);
    return kW(clamp(edge, 0.0, 1.0), spine * step(-0.6, P.y));
  } else if (id == 9) { // geceYarisi: midnight gradient + star dust
    float t = smoothstep(-0.8, 0.9, P.y + ax * 0.4);
    float dust = step(0.985, kH21(floor(P * 90.0))) * (1.0 - t * 0.5);
    return kW(t * 0.7, dust);
  } else if (id == 10) { // balonSeridi: balloon-gore stripes fanning from the shoulders
    float a = atan(P.x, P.y + 1.2);
    float s = kBand(a * 7.0, 0.5);
    return kW(s, kBand(a * 7.0 + 0.5, 0.08));
  } else if (id == 11) { // karKristali: six-fold crystals
    vec2 q = vec2(ax, P.y) * 3.2;
    vec2 g = fract(q) - 0.5;
    float a = atan(g.y, g.x);
    float r = length(g);
    float arm = abs(sin(a * 3.0));
    float flake = (1.0 - kAa(0.02 + 0.015 * (1.0 - r * 3.0), arm * r)) * (1.0 - kAa(0.36, r));
    float tips = (1.0 - kAa(0.04, abs(r - 0.22))) * step(arm, 0.25);
    return kW(flake, tips);
  } else if (id == 12) { // topografya: contour lines of a smooth field
    float h = kVN(P * 1.8) * 1.2 + kVN(P * 3.7 + 2.0) * 0.5 + P.y * 0.6;
    float l = kBand(h * 7.0, 0.1);
    float major = kBand(h * 1.4, 0.04);
    return kW(l, major);
  } else if (id == 13) { // ikiRenk: left/right split with C seam
    float s = kAa(0.0, P.x);
    return kW(s, 1.0 - kAa(0.02, ax));
  } else if (id == 14) { // yarisSeridi: double centre stripe + wingtips
    float stripe = (1.0 - kAa(0.09, ax)) * kAa(0.03, ax);
    float tips = kAa(0.72, ax);
    return kW(stripe, tips);
  } else if (id == 15) { // petek: honeycomb
    vec2 q = vec2(P.x, P.y) * 5.0;
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;
    vec2 a = mod(q, r) - h;
    vec2 b = mod(q - h, r) - h;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    float d = max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y));
    float edge = kAa(0.4, d);
    return kW(edge, (1.0 - kAa(0.12, d)) * step(0.7, kH21(floor(q))));
  } else if (id == 16) { // dalga: waves across
    float v = P.y * 4.0 + sin(P.x * 7.0) * 0.35;
    return kW(kBand(v, 0.45), kBand(v + 0.5, 0.08));
  } else if (id == 17) { // tuy: overlapping feather scales toward the tail
    vec2 q = vec2(P.x * 6.0, P.y * 5.0);
    float row = floor(q.y);
    q.x += mod(row, 2.0) * 0.5;
    vec2 g = vec2(fract(q.x) - 0.5, fract(q.y));
    float scale = length(vec2(g.x, (g.y - 1.0) * 0.8));
    float rim = kBand(scale * 2.0, 0.12);
    return kW(1.0 - kAa(0.48, scale), rim * 0.7);
  } else if (id == 18) { // dama: harlequin diamonds
    vec2 q = vec2(P.x * 3.0 + P.y * 3.0, P.y * 3.0 - P.x * 3.0);
    float c = mod(floor(q.x) + floor(q.y), 2.0);
    float line = kBand(q.x, 0.05) + kBand(q.y, 0.05);
    return kW(c, clamp(line, 0.0, 1.0));
  } else if (id == 19) { // gunes: sunburst from the chest
    vec2 g = vec2(P.x, P.y - 0.35);
    float a = atan(g.y, g.x);
    float r = length(g);
    float rays = kBand(a * 16.0 / 6.2831, 0.5) * kAa(0.18, r);
    float disc = 1.0 - kAa(0.16, r);
    return kW(rays, disc);
  } else if (id == 20) { // simsek: zig-zag bolts along the span
    float z = abs(fract(P.x * 3.0) - 0.5) * 0.5;
    float v = P.y + z;
    return kW(kBand(v * 2.5, 0.35), kBand(v * 2.5 + 0.5, 0.08));
  } else if (id == 21) { // benek: dots growing toward the wingtips
    vec2 q = P * 7.0;
    vec2 g = fract(q) - 0.5;
    float rr = 0.12 + 0.28 * smoothstep(0.1, 1.0, ax);
    float dot1 = 1.0 - kAa(rr, length(g));
    return kW(dot1, 0.0);
  } else if (id == 22) { // kanatUcu: tips + tail fade to B, C leading-edge line
    float t = smoothstep(0.45, 0.95, ax) + smoothstep(-0.55, -0.95, P.y);
    return kW(clamp(t, 0.0, 1.0), kBand(P.y * 0.5 + 0.21, 0.03) * step(0.2, ax));
  } else if (id == 23) { // kaplan: organic stripes
    float n = kVN(vec2(P.x * 2.5, P.y * 6.0)) * 0.8;
    float v = P.y * 5.0 + n * 2.0 + ax * 1.5;
    float s = kBand(v, 0.28 + 0.1 * kVN(P * 3.0));
    return kW(s, 0.0);
  } else if (id == 24) { // lale: tulip motifs on the wings
    vec2 q = vec2(ax, P.y) * 2.8;
    vec2 g = fract(q) - vec2(0.5, 0.35);
    float cup = length(vec2(g.x * 1.4, max(g.y, 0.0) * 0.8)) - 0.18 + 0.06 * cos(atan(g.y, g.x) * 3.0);
    float bloom = (1.0 - kAa(0.0, cup)) * step(-0.05, g.y);
    float stem = (1.0 - kAa(0.02, abs(g.x))) * step(g.y, 0.0) * step(-0.3, g.y);
    return kW(bloom, stem);
  } else if (id == 25) { // pusula: compass rose on the back + rings
    vec2 g = vec2(P.x, P.y - 0.1);
    float a = atan(g.y, g.x);
    float r = length(g);
    float star = 1.0 - kAa(0.42 * pow(abs(cos(a * 2.0)), 6.0) + 0.06, r);
    float ring = kBand(r * 5.0, 0.06) * kAa(0.2, r);
    return kW(star, ring);
  } else if (id == 27) { // traverten: terrace scallops, soft gradient top → bottom
    vec2 q = vec2(P.x * 3.0, P.y * 4.5);
    float row = floor(q.y);
    float sc = abs(fract(q.x + row * 0.5) - 0.5);
    float lip = fract(q.y) - (0.25 + sc * sc * 1.6);
    float edge = 1.0 - kAa(0.06, abs(lip));
    float t = smoothstep(0.8, -1.0, P.y);
    return kW(clamp(t * 0.8, 0.0, 1.0), edge * 0.8);
  } else if (id == 28) { // mehtap: one moonpath of broken light across a dark tone
    float d = P.y * 0.8 - P.x * 0.45 + 0.1;
    float band = exp(-d * d * 22.0);
    float glints = step(0.55, kVN(vec2(P.x * 30.0, d * 60.0)));
    return kW(0.0, band * (0.35 + 0.65 * glints));
  } else if (id == 29) { // yakamoz: scattered phosphor sparkles on the dark sea tone
    vec2 q = P * 22.0;
    vec2 i = floor(q);
    float sp = step(0.86, kH21(i)) * (1.0 - kAa(0.16, length(fract(q) - 0.5)));
    float drift = smoothstep(0.3, 0.8, kVN(P * 2.0));
    return kW(drift * 0.25, sp);
  } else if (id == 30) { // duz: plain suit — A body, B side panels, C piping
    float panel = kAa(0.55, ax) + (1.0 - kAa(-0.55, P.y)) * 0.0;
    float pipe = kBand(ax * 1.0 - 0.55 + 0.5, 0.012);
    return kW(panel, pipe);
  } else { // kirlangic: swallow silhouettes
    vec2 q = vec2(P.x * 2.5, P.y * 3.0);
    vec2 i = floor(q);
    vec2 g = fract(q) - 0.5;
    g.x = abs(g.x);
    float wing = (1.0 - kAa(0.05, abs(g.y - g.x * 0.6 + 0.05))) * step(g.x, 0.42);
    float body = 1.0 - kAa(0.07, length(vec2(g.x * 2.0, g.y + 0.02)));
    float on = step(0.45, kH21(i));
    return kW((wing + body) * on, 0.0);
  }
}
`;
