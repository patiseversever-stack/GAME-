// Animasyon kaydı: element.getAnimations() her çağrıda stil/yerleşim hesabını ZORLAR (havuz öğelerini her kullanımda
// temizlerken kare başına onlarca zorlanmış hesap = takılma). Element.animate'i bir kez sarıp her animasyonu kaydediyoruz;
// cancelAnims(el) hesap zorlamadan iptal eder.
const live = new WeakMap<Element, Set<Animation>>();
let patched = false;

export function trackAnimations(): void {
  if (patched || typeof Element === 'undefined' || !Element.prototype.animate) return;
  patched = true;
  const native = Element.prototype.animate;
  Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions): Animation {
    const a = native.call(this, kf, o);
    let s = live.get(this);
    if (!s) live.set(this, (s = new Set()));
    const set = s;
    set.add(a);
    const drop = (): void => void set.delete(a);
    a.addEventListener('cancel', drop);
    a.addEventListener('remove', drop);
    // dolgu bırakmayan animasyon bitince etkisi kalmaz: kayıttan düş
    const fill = typeof o === 'object' && o ? o.fill : undefined;
    if (!fill || fill === 'none' || fill === 'backwards') a.addEventListener('finish', drop);
    return a;
  };
}

/** Öğenin kendi animasyonlarını (alt ağaç hariç) stil hesabı zorlamadan iptal et. */
export function cancelAnims(el: Element): void {
  const s = live.get(el);
  if (!s || !s.size) return;
  for (const a of Array.from(s)) a.cancel();
  s.clear();
}
