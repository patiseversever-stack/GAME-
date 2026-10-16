// Pişti efekti DONMUŞ karelerini pişirir (scripts/bake-fx.mjs bu sayfayı açar, her kutunun saydam ekran görüntüsünü
// src/ui/fxpv/<id>.webp yazar). Market ızgarası/koleksiyon/set karoları bunu gösterir: efekt karesini çalışma anında
// kurmak (mountFx still: onlarca parçacık + getComputedStyle) zayıf telefonda efekt başına 50–200 ms sürüyordu.
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/900.css';
import '../src/ui/theme.css';
import '../src/ui/ui.css';
import '../src/ui/meta.css';
import '../src/ui/fx.css';
import '../src/ui/shop.css';
import {CATALOG} from '../src/game/catalog';
import {mountFx} from '../src/ui/fxpreview';
import {FX_BAKE} from '../src/ui/deckpv';

const only = new URLSearchParams(location.search).get('only');
async function bake(): Promise<string[]> {
  await document.fonts.load('400 40px "Lilita One"', 'PİŞTİ!');
  const host = document.getElementById('host')!;
  const ids = CATALOG.filter(i => i.kind === 'fx' && (!only || i.id === only)).map(i => i.id);
  for (const id of ids) {
    const box = document.createElement('span');
    box.className = 'kh-pv__fx';
    box.dataset.bake = id;
    // ızgara kutusuyla aynı yazı/parçacık ölçüsü (--u) ve oran
    box.style.cssText = `position:relative;display:block;width:${FX_BAKE.w}px;height:${FX_BAKE.h}px;--u:16px`;
    host.append(box);
    mountFx(box, id, true);
    box.style.background = 'none';
  }
  await new Promise(r => setTimeout(r, 300));
  return ids;
}
const w = window as unknown as {__bake: Promise<string[]>};
w.__bake = bake();
