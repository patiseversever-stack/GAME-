// Masa yüzeyi işaretlemesi — oyun sahnesi ve ana menü arka planı ortak kullanır.
export function surfaceHTML() {
  return `<div class="surface">
    <div class="surface__cam" style="position:absolute;inset:0">
      <div class="surface__plane"><div class="surface__felt"></div><div class="surface__weave"></div><div class="surface__noise"></div><div class="surface__mark"></div></div>
    </div>
    <div class="surface__light"></div><div class="surface__focus"></div><div class="surface__rim"></div><div class="surface__vignette"></div>
  </div>`;
}
