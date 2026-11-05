// ADA'nın ilk adası. Parçalar: gökyüzü ve ışık, arazi, deniz, parkur, bitki örtüsü, canlılık.
import * as THREE from 'three/webgpu';
import { makeInstancer } from './island/util.js';
import { createSky } from './island/sky.js';
import { createTerrain } from './island/terrain.js';
import { createWater } from './island/water.js';
import { createTrack } from './island/track.js';
import { createFoliage } from './island/foliage.js';
import { createDecor } from './island/decor.js';
import { createLife } from './island/life.js';
import { createKitPlacer } from './island/props.js';
import { rockNormal, waterNormal } from './textures.js';

export function buildWorld({ scene, renderer, course, path, quality, kit = null }) {
  const instanced = makeInstancer(scene, quality.shadows);
  const detailNormal = rockNormal(quality.texSize);
  detailNormal.repeat.set(1, 1);
  const mats = {
    vc: new THREE.MeshLambertNodeMaterial({ vertexColors: true }),
    vc2: new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    stone: new THREE.MeshLambertNodeMaterial({ vertexColors: true, normalMap: detailNormal, normalScale: new THREE.Vector2(0.9, 0.9) }),
  };

  const sky = createSky({ scene, renderer, quality });
  const terrain = createTerrain({ scene, course, path, quality, detailNormal });
  const water = createWater({ scene, terrain, quality, waterNormal: waterNormal(512) });
  const kp = kit ? createKitPlacer(scene, kit, quality.shadows) : null;
  const track = createTrack({ scene, course, path, quality, instanced, mats, detailNormal, kp });
  const foliage = createFoliage({ scene, course, path, terrain, quality, instanced });
  console.log('bitki sayıları', JSON.stringify(foliage.counts));
  const decor = createDecor({ scene, course, path, terrain, quality, instanced, mats, deckWidth: track.deckWidth, kp });
  kp?.flush();
  const life = createLife({ scene, course, path, terrain, quality, instanced, mats, deckWidth: track.deckWidth });
  const extras = [decor.update, life.update];

  return {
    sunDir: sky.sunDir,
    followSun: sky.follow,
    zipRopeY: track.zipRopeY,
    heightAt: terrain.heightAt,
    terrain,
    track,
    mats,
    instanced,
    addUpdater: (fn) => extras.push(fn),
    update(t, cam) {
      sky.update(t, cam);
      water.update(t);
      for (const f of extras) f(t, cam);
    },
  };
}
