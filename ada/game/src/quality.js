// Kalite kademeleri: düşük / orta / yüksek. "Otomatik" cihaza göre seçer.
export const PRESETS = {
  dusuk: { name: 'Düşük', pixelRatio: 1, terrainRes: 150, vegetation: 260, shadows: false, shadowSize: 512, post: false, bloom: false, fogFar: 420, texSize: 256, antialias: false },
  orta: { name: 'Orta', pixelRatio: 1.5, terrainRes: 230, vegetation: 520, shadows: true, shadowSize: 1024, post: true, bloom: true, fogFar: 560, texSize: 512, antialias: false },
  yuksek: { name: 'Yüksek', pixelRatio: 2, terrainRes: 320, vegetation: 900, shadows: true, shadowSize: 2048, post: true, bloom: true, fogFar: 720, texSize: 512, antialias: true },
};

export function pickQuality(requested) {
  if (requested && PRESETS[requested]) return { key: requested, ...PRESETS[requested] };
  const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  let key = 'yuksek';
  if (mobile) key = mem <= 3 || cores <= 4 ? 'dusuk' : 'orta';
  else if (mem <= 4 && cores <= 4) key = 'orta';
  return { key, ...PRESETS[key] };
}
