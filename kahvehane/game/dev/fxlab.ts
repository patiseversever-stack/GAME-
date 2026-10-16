// Efekt önizleme laboratuvarı (Agent B): ?mode=still|live&t=<ms>&ids=klasik,altin
// still: ızgara küçük resmi (200×180, mountFx still); live: ürün penceresi boyutunda (360×270) canlı oynatıp t anında dondurur.
import '@fontsource/lilita-one/400.css';
import '../src/ui/theme.css';
import '../src/ui/ui.css';
import '../src/ui/fx.css';
import '../src/ui/shop.css';
import {mountFx} from '../src/ui/fxpreview';
import {FX} from '../src/ui/fxlib';

const qs = new URLSearchParams(location.search);
const ids = (qs.get('ids') || Object.keys(FX).join(',')).split(',');
const mode = qs.get('mode') || 'still';
const T = Number(qs.get('t')) || 500;
async function main(): Promise<void> {
  await document.fonts.load('400 40px "Lilita One"', 'PİŞTİ!');
  const host = document.getElementById(mode === 'still' ? 'grid' : 'sheet')!;
  for (const id of ids) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.innerHTML = `<b>${id}</b>`;
    const box = document.createElement('span');
    box.className = 'box' + (mode === 'live' ? ' pd' : '');
    box.style.cssText = mode === 'still' ? 'display:block;width:200px;height:180px;--u:16px' : 'display:block;width:360px;height:270px;--u:15px';
    cell.append(box);
    host.append(cell);
    const loop = mountFx(box, id, mode === 'still');
    if (mode === 'live') loop.play();
  }
  if (mode === 'live') {
    await new Promise(r => setTimeout(r, 50));
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = T;
    }
  }
  await new Promise(r => setTimeout(r, 400));
  document.body.dataset.ready = '1';
}
main();
