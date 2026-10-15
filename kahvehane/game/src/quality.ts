// Cihaza göre kalite seviyesi. Karar, WebGL bağlamı oluşturulmadan önce verilir (antialias gibi ayarlar sonradan değişmez).

export type Tier = 'low' | 'mid' | 'high';
export interface Quality {
  tier: Tier;
  maxDpr: number; // render çözünürlüğü üst sınırı
  minDpr: number; // uyarlamalı düşürmenin alt sınırı
  atlasWidth: number; // kart dokusu genişliği
  anisotropy: number;
  antialias: boolean;
  particles: number;
}

const PRESETS: Record<Tier, Omit<Quality, 'tier'>> = {
  low: {maxDpr: 1.35, minDpr: 1, atlasWidth: 1024, anisotropy: 2, antialias: true, particles: 40},
  mid: {maxDpr: 1.8, minDpr: 1.1, atlasWidth: 1536, anisotropy: 4, antialias: true, particles: 90},
  high: {maxDpr: 2.4, minDpr: 1.25, atlasWidth: 2048, anisotropy: 8, antialias: true, particles: 160},
};

function gpuName(): string {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

export function detectTier(): Tier {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced === 'low' || forced === 'mid' || forced === 'high') return forced;
  const g = gpuName().toLowerCase();
  const mem = (navigator as Navigator & {deviceMemory?: number}).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (/apple gpu|apple m\d|adreno \(tm\) 7\d\d|adreno \(tm\) 6[4-9]\d|mali-g7\d|mali-g6[1-9]\d|immortalis|xclipse|nvidia|radeon|intel\(r\) (iris|arc)/.test(g)) {
    return mem >= 4 ? 'high' : 'mid';
  }
  if (/mali-(4|t[6-8])|mali-g(31|51|52|57)|adreno \(tm\) [345]\d\d|adreno \(tm\) 6[01]\d|powervr|ge8\d\d|swiftshader|llvmpipe/.test(g)) return 'low';
  if (mem <= 3 || cores <= 4) return 'low';
  return 'mid';
}

export function qualityFor(tier: Tier): Quality {
  return {tier, ...PRESETS[tier]};
}
