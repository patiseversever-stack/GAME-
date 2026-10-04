// Patisever ıstakası (GLB): uygulama boyunca bir kez çözülür; ana menü ve masa aynı modeli (klonlayarak) kullanır.
// Derlenmiş dosyada orijinal GLB (yeniden sıkıştırılmamış 2048px dokular) base64 gömülüdür (window.__RACK_GLB).
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let rackPromise = null;
export function loadRackModel() {
  if (rackPromise) return rackPromise;
  rackPromise = (async () => {
    try {
      let buf;
      if (typeof window !== 'undefined' && window.__RACK_GLB) {
        const bin = atob(window.__RACK_GLB);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        buf = u.buffer;
      } else buf = await (await fetch('./assets/models/rack.glb')).arrayBuffer();
      return await new Promise((res, rej) => new GLTFLoader().parse(buf, '', (g) => res(g.scene), rej));
    } catch (e) {
      console.warn('Istaka modeli yüklenemedi, yedek ıstaka çiziliyor', e);
      return null;
    }
  })();
  return rackPromise;
}

// Dokuları bu çizicinin en yüksek anizotropisine ve trilineer süzgece ayarla (eğik bakışta bile net)
export function sharpenModel(model, renderer) {
  const an = renderer.capabilities.getMaxAnisotropy();
  model.traverse((o) => {
    if (!o.isMesh) return;
    for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
      const t = o.material[k];
      if (t) {
        t.anisotropy = an;
        t.generateMipmaps = true;
      }
    }
  });
}
