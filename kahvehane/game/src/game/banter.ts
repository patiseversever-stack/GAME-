// Atışma çifti seçimi: bağlamda A→B yönünde yazılmış bir atışma olan koltuk çiftlerinden rastgele biri. Böylece "el başı",
// "son el", "önde", "pas" gibi tetiklerde masadaki uygun ikili bulunur (olasılık ve sıklık yine dialogue.ts → pickBanter).
import {BANTER, type BanterCtx} from '../ai/dialogue';

const KEYS = new Set(BANTER.map(e => `${e.ctx}|${e.a}|${e.b}`));

/** Bu bağlamda a → b yönünde en az bir atışma var mı. */
export function hasBanter(ctx: BanterCtx, a: string, b: string): boolean {
  return KEYS.has(`${ctx}|${a}|${b}`);
}

/** as × bs koltuk çiftlerinden (a ≠ b) atışması olan biri; yoksa null. */
export function banterPair(ctx: BanterCtx, as: readonly number[], bs: readonly number[], charOf: (seat: number) => string | undefined, rnd: () => number = Math.random): [number, number] | null {
  const out: [number, number][] = [];
  for (const a of as)
    for (const b of bs) {
      if (a === b) continue;
      const ca = charOf(a), cb = charOf(b);
      if (ca && cb && hasBanter(ctx, ca, cb)) out.push([a, b]);
    }
  return out.length ? out[Math.floor(rnd() * out.length) % out.length] : null;
}
