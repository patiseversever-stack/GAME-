// Gerçekçi (katı modelli) ürün görselleri: anahtar → model ve sunum duruşu
import * as THREE from 'three';
import { toolMaterials } from '../tools3d';
import { realMats } from './kit';
import { buildExtHolderReal, buildBoringBarReal, buildThreadHolderReal, buildGrooveHolderReal } from './holders';
import { buildCenterDrillReal, buildColletReal, buildPullStudReal, buildBT40Real } from './rotary';
import { buildMillReal, buildGrooveInsertReal } from './mills';

export interface RealPosed { obj: THREE.Object3D; kind: 'insert' | 'rotary' | 'holder' | 'compact'; ao?: { dist?: number; strength?: number } }
export const REAL_KEYS = ['holder-ext-C', 'holder-ext-D', 'holder-ext-V', 'holder-ext-V-s', 'holder-ext-W', 'holder-ext-T', 'boring-bar-C', 'boring-bar-D', 'holder-thread', 'holder-groove', 'center-drill', 'collet', 'pull-stud', 'chuck-bt', 'facemill', 'facemill-45', 'facemill-shank', 'facemill-round', 'groove-insert'];

export async function buildReal(key: string, pose?: [number, number, number]): Promise<RealPosed> {
  const m = toolMaterials();
  const rm = realMats();
  const wrap = new THREE.Group();
  const holderPose = (g: THREE.Object3D, p: [number, number, number] = [0.5, Math.PI + 0.62, 0.0]) => { const r = new THREE.Group(); r.add(g); r.rotation.set(...(pose ?? p)); wrap.add(r); };
  // Döner takım: eksen (+Y) ekran yatayına, uç solda
  const rotary = (o: THREE.Object3D, tilt = 0.2): RealPosed => {
    const inner = new THREE.Group();
    inner.add(o);
    inner.rotation.z = Math.PI / 2;
    const r = new THREE.Group();
    r.add(inner);
    r.rotation.set(...(pose ?? [0.16, -0.55, tilt]));
    wrap.add(r);
    return { obj: wrap, kind: 'rotary' };
  };
  switch (key) {
    case 'holder-ext-C': holderPose(await buildExtHolderReal(m, rm, { shape: 'C', positive: false, clamp: 'P', kr: 95, H: 25, f: 32, L: 150, code: 'PCLNR 2525M12' })); break;
    case 'holder-ext-D': holderPose(await buildExtHolderReal(m, rm, { shape: 'D', positive: false, clamp: 'P', kr: 93, H: 25, f: 32, L: 150, code: 'PDJNR 2525M15' })); break;
    case 'holder-ext-V': holderPose(await buildExtHolderReal(m, rm, { shape: 'V', positive: false, clamp: 'M', kr: 93, H: 25, f: 32, L: 150, code: 'MVJNR 2525M16' })); break;
    case 'holder-ext-V-s': holderPose(await buildExtHolderReal(m, rm, { shape: 'V', positive: true, clamp: 'S', kr: 93, H: 20, f: 25, L: 125, code: 'SVJCR 2020K16' })); break;
    case 'holder-ext-W': holderPose(await buildExtHolderReal(m, rm, { shape: 'W', positive: false, clamp: 'P', kr: 95, H: 25, f: 32, L: 150, code: 'PWLNR 2525M08' })); break;
    case 'holder-ext-T': holderPose(await buildExtHolderReal(m, rm, { shape: 'T', positive: false, clamp: 'P', kr: 90, H: 25, f: 32, L: 150, code: 'PTGNR 2525M16' })); break;
    case 'boring-bar-C': holderPose(await buildBoringBarReal(m, rm, { shape: 'C', kr: 95, D: 20, f: 13, L: 170, code: 'S20R-SCLCR09' }), [0.62, Math.PI + 0.5, 0]); break;
    case 'boring-bar-D': holderPose(await buildBoringBarReal(m, rm, { shape: 'D', kr: 93, D: 20, f: 13, L: 170, code: 'S20R-SDUCR11' }), [0.62, Math.PI + 0.5, 0]); break;
    case 'holder-thread': holderPose(await buildThreadHolderReal(m, rm, { H: 25, f: 32, L: 150, code: 'SER 2525M16' })); break;
    case 'holder-groove': holderPose(await buildGrooveHolderReal(m, rm, { H: 20, w: 3, L: 125, code: 'MGEHR 2020-3' }), [0.32, Math.PI + 0.62, 0]); break;
    case 'center-drill': return rotary(buildCenterDrillReal(rm), 0.12);
    case 'collet': { const g = await buildColletReal(rm); const r = new THREE.Group(); r.add(g); r.rotation.set(...(pose ?? [0.35, 0.55, -1.15])); wrap.add(r); return { obj: wrap, kind: 'compact', ao: { dist: 4 } }; }
    case 'pull-stud': { const o = rotary(await buildPullStudReal(rm), 0.15); (wrap.children[0] as THREE.Object3D).rotation.set(...(pose ?? [0.18, 0.5, 0.12])); return o; }
    case 'chuck-bt': { const o = rotary(await buildBT40Real(rm), 0.1); (wrap.children[0] as THREE.Object3D).rotation.set(...(pose ?? [0.22, 0.62, 0.1])); return o; }
    case 'facemill': case 'facemill-45': {
      const g = await buildMillReal(m, rm, key === 'facemill' ? { type: 'shell', D: 50, z: 4, insert: 'APMT1604', H: 40, bore: 22 } : { type: 'shell', D: 63, z: 5, insert: 'SEKT1204', H: 40, bore: 22 });
      const r = new THREE.Group(); r.add(g); r.rotation.set(...(pose ?? [-0.5, 0.35, 0.16])); wrap.add(r);
      return { obj: wrap, kind: 'compact', ao: { dist: 9 } };
    }
    case 'facemill-shank': { const o = rotary(await buildMillReal(m, rm, { type: 'shank', D: 20, z: 2, insert: 'APMT1135', H: 28, shankD: 20, shankL: 150 }), 0.18); (wrap.children[0] as THREE.Object3D).rotation.set(...(pose ?? [0.1, -0.95, 0.12])); return o; }
    case 'facemill-round': { const o = rotary(await buildMillReal(m, rm, { type: 'shank', D: 25, z: 2, insert: 'RPMT10', H: 30, shankD: 25, shankL: 150 }), 0.18); (wrap.children[0] as THREE.Object3D).rotation.set(...(pose ?? [0.1, -0.95, 0.12])); return o; }
    case 'groove-insert': { const g = await buildGrooveInsertReal(m); const r = new THREE.Group(); r.add(g); r.rotation.set(...(pose ?? [0.62, -0.5, 0.05])); wrap.add(r); return { obj: wrap, kind: 'insert', ao: { dist: 2 } }; }
    default: throw new Error('Bilinmeyen gerçek model: ' + key);
  }
  return { obj: wrap, kind: 'holder' };
}
