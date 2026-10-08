// Device fingerprint + static tier guess (§5.3 steps 1–2).

import type { QualityTier } from '../core/settings.ts';

export interface DeviceInfo {
  /** UNMASKED_RENDERER_WEBGL (or RENDERER when masked). */
  gpu: string;
  vendor: string;
  screenW: number;
  screenH: number;
  dpr: number;
  ua: string;
  cores: number;
  maxTextureSize: number;
  /** Device memory in GB if exposed (Chrome Android). */
  memoryGB: number;
}

export interface GuessResult {
  tier: QualityTier;
  /** Highest tier the benchmark may promote to. */
  maxTier: QualityTier;
  family: 'adreno' | 'mali' | 'immortalis' | 'xclipse' | 'powervr' | 'apple' | 'desktop' | 'software' | 'unknown';
  rule: string;
  ios: boolean;
}

export function isIOS(ua: string, maxTouchPoints = 0): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

/** UA major version: `Chrome/141` → "c141", `Version/18.2 Safari` → "s18". */
export function uaMajor(ua: string): string {
  const m =
    /(?:Chrome|CriOS)\/(\d+)/.exec(ua) ?? /Firefox\/(\d+)/.exec(ua) ?? /Version\/(\d+)/.exec(ua) ?? /AppleWebKit\/(\d+)/.exec(ua);
  if (!m) return 'x0';
  const tag = /Chrome|CriOS/.test(m[0]) ? 'c' : /Firefox/.test(m[0]) ? 'f' : /Version/.test(m[0]) ? 's' : 'w';
  return tag + m[1];
}

/** FNV-1a 32-bit → 8 hex chars. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Fingerprint = GPU string + screen + UA major (§5.3). Orientation-independent. */
export function fingerprint(d: DeviceInfo): string {
  const a = Math.max(d.screenW, d.screenH);
  const b = Math.min(d.screenW, d.screenH);
  const raw = `${d.gpu}|${b}x${a}@${d.dpr.toFixed(2)}|${uaMajor(d.ua)}`;
  return fnv1a(raw);
}

interface Rule {
  re: RegExp;
  family: GuessResult['family'];
  pick(m: RegExpExecArray, d: DeviceInfo): [QualityTier, QualityTier, string];
}

const RULES: Rule[] = [
  { re: /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i, family: 'software', pick: () => ['low', 'low', 'software'] },
  {
    re: /Adreno[^\d]*(\d{3})/i,
    family: 'adreno',
    pick(m) {
      const n = Number(m[1]);
      if (n < 500) return ['low', 'medium', `adreno ${n} <5xx`];
      if (n < 600) return ['low', 'medium', `adreno 5xx`];
      if (n <= 616) return ['low', 'medium', `adreno 610–616`];
      if (n <= 619) return ['medium', 'high', `adreno 618–619`];
      if (n < 640) return ['medium', 'high', `adreno 620–639 (between rules → medium)`];
      if (n <= 699) return ['high', 'ultra', `adreno 640–6xx`];
      return ['ultra', 'ultra', `adreno 7xx–8xx`];
    },
  },
  {
    re: /Immortalis/i,
    family: 'immortalis',
    pick: () => ['ultra', 'ultra', 'immortalis'],
  },
  {
    re: /Mali-?G(\d{2,3})/i,
    family: 'mali',
    pick(m) {
      const n = Number(m[1]);
      if (n === 52 || n === 57 || n === 31 || n === 51 || n === 50) return ['low', 'medium', `mali-g${n}`];
      if (n === 68) return ['medium', 'high', 'mali-g68'];
      if (n >= 710) return ['high', 'ultra', `mali-g${n} (710+)`];
      if (n >= 610) return ['medium', 'high', `mali-g${n} (6xx)`];
      if (n >= 71 && n <= 78) return ['medium', 'high', `mali-g7x old`];
      return ['medium', 'high', `mali-g${n} other`];
    },
  },
  { re: /Mali-T/i, family: 'mali', pick: () => ['low', 'low', 'mali-t'] },
  { re: /Xclipse/i, family: 'xclipse', pick: () => ['high', 'ultra', 'xclipse'] },
  { re: /PowerVR|IMG BXM|IMG /i, family: 'powervr', pick: () => ['low', 'medium', 'powervr'] },
  {
    re: /Apple (?:M\d|A\d{2})/i,
    family: 'apple',
    pick: () => ['high', 'ultra', 'apple silicon (named)'],
  },
  {
    re: /Apple GPU|Apple/i,
    family: 'apple',
    pick: (_m, d) => {
      // Masked "Apple GPU": A13+ is the target floor (iPhone 11). Old/small screens start lower.
      const shortSide = Math.min(d.screenW, d.screenH);
      if (d.maxTextureSize > 0 && d.maxTextureSize < 8192) return ['medium', 'high', 'apple gpu (small max texture)'];
      if (shortSide < 375 && d.dpr <= 2) return ['medium', 'high', 'apple gpu (small screen)'];
      return ['high', 'ultra', 'apple gpu (A13+ default)'];
    },
  },
  { re: /NVIDIA|GeForce|RTX|Quadro|Radeon(?! Vega 3)|AMD/i, family: 'desktop', pick: () => ['high', 'ultra', 'desktop discrete'] },
  { re: /Intel/i, family: 'desktop', pick: () => ['medium', 'high', 'desktop intel'] },
];

/** Static guess from the renderer string (+ iOS heuristics). Unknown GPU → medium. */
export function guessTier(d: DeviceInfo): GuessResult {
  const ios = isIOS(d.ua);
  for (const r of RULES) {
    const m = r.re.exec(d.gpu);
    if (m) {
      const [tier, maxTier, rule] = r.pick(m, d);
      return { tier, maxTier, family: r.family, rule, ios };
    }
  }
  if (ios) return { tier: 'high', maxTier: 'ultra', family: 'apple', rule: 'ios (renderer string missing)', ios };
  return { tier: 'medium', maxTier: 'high', family: 'unknown', rule: 'unknown gpu', ios };
}

/** Collect DeviceInfo from a live GL context (browser only). */
export function readDeviceInfo(gl: WebGLRenderingContext | WebGL2RenderingContext | null): DeviceInfo {
  let gpu = '';
  let vendor = '';
  let maxTextureSize = 0;
  if (gl) {
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      vendor = String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    } catch {
      // keep defaults
    }
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const scr = typeof screen !== 'undefined' ? screen : undefined;
  const ua = nav?.userAgent ?? '';
  const mtp = nav?.maxTouchPoints ?? 0;
  return {
    gpu,
    vendor,
    screenW: scr?.width ?? 0,
    screenH: scr?.height ?? 0,
    dpr: typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,
    ua: isIOS(ua, mtp) && !/iPhone|iPad|iPod/.test(ua) ? ua + ' iPad' : ua,
    cores: nav?.hardwareConcurrency ?? 0,
    maxTextureSize,
    memoryGB: Number((nav as unknown as { deviceMemory?: number } | undefined)?.deviceMemory ?? 0) || 0,
  };
}

/** Native screen megapixels (css × dpr). */
export function nativeMegapixels(d: DeviceInfo): number {
  return (d.screenW * d.screenH * d.dpr * d.dpr) / 1e6;
}
