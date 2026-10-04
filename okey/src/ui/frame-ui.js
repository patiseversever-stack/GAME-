// Çerçeveli avatar işaretlemesi. Çerçeve görseli boyanana kadar yerinde ince pirinç halka durur; hazır olunca yumuşakça belirir.
import { frameURL, frameURLSync } from '../render3d/tile-themes/frames.js';
import { avatarSVG } from './avatars.js';

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    hydrateFrames(document);
  });
}

// avatar: ROSTER kimliği ya da hazır SVG; frame: çerçeve kimliği
export function framedAvatar(avatar, frame, cls = '') {
  const u = frameURLSync(frame);
  const svg = String(avatar).startsWith('<svg') ? avatar : avatarSVG(avatar);
  if (!u) schedule();
  return `<span class="fav ${cls}${u ? ' is-ready' : ''}" data-frame="${frame}"><span class="fav__av">${svg}</span><img class="fav__fr" alt="" draggable="false" data-frid="${frame}"${u ? ` src="${u}"` : ''}></span>`;
}

export function hydrateFrames(root = document) {
  root.querySelectorAll('img.fav__fr:not([src])').forEach((img) => {
    if (img._pending) return;
    img._pending = true;
    frameURL(img.dataset.frid).then((u) => {
      if (!u) return;
      img.onload = () => img.parentElement?.classList.add('is-ready');
      img.src = u;
    });
  });
}

// Çerçeve önizlemesi (avatarsız): koleksiyon ve çarşı kartları
export function framePreview(frame, avatar) {
  return framedAvatar(avatar || 'mert', frame, 'fav--card');
}
