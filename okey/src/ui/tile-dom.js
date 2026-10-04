// Taş DOM'u — bir taş kimliğinden (0..105) kalıcı bir öğe üretir ve yüzünü günceller.
import { COLORS, COLOR_TR, isFake, isOkey, colorOf, valueOf, tileLabel } from '../game/tiles.js';
import { decorateTile } from '../render3d/tile-themes/index.js';

const TEMPLATE = `<i class="tile__shadow"></i><div class="tile__flip"><div class="tile__face"></div><div class="tile__back"></div></div>`;

export function createTileEl(t, ctx, { inline = false } = {}) {
  const el = document.createElement('div');
  el.className = inline ? 'tile tile--inline' : 'tile';
  el.dataset.id = String(t);
  el.innerHTML = TEMPLATE;
  el._face = el.querySelector('.tile__face');
  el._flip = el.querySelector('.tile__flip');
  el._shadow = el.querySelector('.tile__shadow');
  setTileFace(el, t, ctx, null);
  return el;
}

// represent: masadaki okey için temsil edilen yüz {c, v} (gerçek okey bir perde)
// Okey taşı kendi sayısını taşır (gerçek masadaki gibi) + yıldız rozeti ve OKEY etiketi;
// sahte okey amblem + SAHTE yazısı + temsil ettiği değer.
export function setTileFace(el, t, ctx, represent = null) {
  el.removeAttribute('data-okey');
  el.removeAttribute('data-fake');
  el.removeAttribute('data-rep');
  el.dataset.value = String(isFake(t) ? ctx.ov : valueOf(t));
  let html;
  if (isFake(t)) {
    el.dataset.fake = '1';
    el.dataset.color = COLORS[ctx.oc];
    html = `<i class="tile__emblem"></i><span class="tile__tag">SAHTE</span><span class="tile__value">${ctx.ov}</span>`;
  } else if (isOkey(t, ctx)) {
    el.dataset.okey = '1';
    if (represent) el.dataset.rep = '1';
    el.dataset.color = COLORS[represent ? represent.c : colorOf(t)];
    html = `<b class="tile__num">${represent ? represent.v : valueOf(t)}</b><i class="tile__mark"></i><i class="tile__badge"></i><span class="tile__tag">OKEY</span>`;
  } else {
    el.dataset.color = COLORS[colorOf(t)];
    html = `<b class="tile__num">${valueOf(t)}</b><i class="tile__mark"></i>`;
  }
  el._face.innerHTML = html;
  el.setAttribute('aria-label', isFake(t) ? `${tileLabel(t, ctx)}, joker değildir` : represent ? `${COLOR_TR[COLORS[represent.c]]} ${represent.v} yerine okey` : tileLabel(t, ctx));
  el.dataset.t = String(t);
  decorateTile(el);
}

// Yüz yukarı (true) / aşağı (false) — 3B çevirme açısı
export function setFlip(el, deg) {
  el._flip.style.transform = deg ? `rotateY(${deg}deg)` : '';
}
