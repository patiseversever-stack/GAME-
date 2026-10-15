// Tohumlu, deterministik rastgelelik. Math.random bilerek kullanılmaz:
// aynı tohum → aynı dağıtım (sunucu ve istemci aynı sonucu üretir).

/** mulberry32: 32 bitlik tohumdan [0, 1) aralığında sayı üreten küçük üreteç. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, yerinde karıştırır ve aynı diziyi döndürür. */
export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}
