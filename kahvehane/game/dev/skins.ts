// 4 kart tarzını yan yana gösterir: büyük örnekler + telefondaki gerçek boyutta el ve yığın.
import type {Skin, Suit} from '../src/skins/contract';

const mods = import.meta.glob('./skins/s*.ts', {eager: true}) as Record<string, {skin: Skin}>;
const only = new URLSearchParams(location.search).get('only'); // ?only=s2 → yalnız o tarz
const skins = Object.keys(mods).sort().filter(k => !only || k.includes('/' + only)).map(k => mods[k].skin).filter(Boolean);
const BIG = 150, DPR = 2;
const SAMPLE: [Suit, number][] = [['S', 1], ['H', 7], ['D', 10], ['C', 11], ['H', 12], ['S', 13]];

function card(skin: Skin, w: number, s: Suit | null, r = 0): HTMLCanvasElement {
  const h = Math.round(w / 0.7);
  const c = document.createElement('canvas');
  c.width = w * DPR;
  c.height = h * DPR;
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const g = c.getContext('2d')!;
  g.scale(DPR, DPR);
  if (s) skin.drawFace(g, w, h, s, r);
  else skin.drawBack(g, w, h);
  return c;
}

async function main(): Promise<void> {
  const rows = document.getElementById('rows')!;
  for (const [i, skin] of skins.entries()) {
    try {
      await skin.prepare();
    } catch (e) {
      console.error(skin.id, e);
    }
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div class="lab"><b>${i + 1}</b><span>${skin.name}</span><small>${skin.desc}</small></div><div class="big"></div><div class="phone"><i>telefonda gerçek boyut</i></div>`;
    const big = row.querySelector('.big')!;
    try {
      for (const [s, r] of SAMPLE) big.append(card(skin, BIG, s, r));
    } catch (e) {
      console.error(skin.id, e);
    }
    big.append(card(skin, BIG, null));
    // telefonda: 88 px el yelpazesi + 72 px yığın
    const ph = row.querySelector('.phone') as HTMLElement;
    const hand: [Suit, number][] = [['H', 7], ['D', 10], ['C', 11], ['S', 13]];
    hand.forEach(([s, r], k) => {
      const c = card(skin, 88, s, r);
      Object.assign(c.style, {left: 4 + k * 40 + 'px', top: 70 + Math.abs(k - 1.5) * 4 + 'px', transform: `rotate(${(k - 1.5) * 5}deg)`});
      ph.append(c);
    });
    const p1 = card(skin, 72, 'S', 1), p2 = card(skin, 72, 'H', 12);
    Object.assign(p1.style, {left: '178px', top: '14px', transform: 'rotate(-10deg)'});
    Object.assign(p2.style, {left: '182px', top: '18px', transform: 'rotate(8deg)'});
    ph.append(p1, p2);
    rows.append(row);
  }
  document.body.dataset.ready = '1';
}
main().catch(e => {
  document.body.dataset.ready = 'err';
  console.error(e);
});
