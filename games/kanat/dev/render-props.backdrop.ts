// Backdrop for the render-props dev page: render-world's real atmosphere (height fog, analytic sky, grade) +
// a soft procedural ground plane, so props are judged under the same light as the game.
import * as THREE from 'three';
import type { WorldId } from '../src/sim/types.ts';
import { installAtmosphere, setAtmosphere, atmosphereFog, updateAtmosphereFrame } from '../src/render/shaders/atmosphere.ts';
import { Sky } from '../src/render/sky/Sky.ts';
import { LOOKS } from '../src/render/looks.ts';

export interface Backdrop {
  sun: THREE.DirectionalLight;
  sunDir: THREE.Vector3;
  sky: Sky;
  ground: THREE.Mesh;
  update(camera: THREE.Camera, t: number, w: number, h: number): void;
}

export function makeBackdrop(renderer: THREE.WebGLRenderer, scene: THREE.Scene, worldId: WorldId, groundY = 0): Backdrop {
  installAtmosphere();
  const st = setAtmosphere({ id: worldId, floorY: groundY });
  const look = LOOKS[worldId];
  const sky = new Sky(256);
  sky.bake(renderer, look.clouds.coverage, new THREE.Color(look.clouds.tint), true);
  scene.add(sky.dome);
  scene.environment = sky.envMap;
  scene.environmentIntensity = 1.0;
  scene.fog = atmosphereFog;
  const sunDir = st.sunDirection.clone();
  const sun = new THREE.DirectionalLight(st.sunColor.clone(), st.sunIntensity);
  sun.position.copy(sunDir).multiplyScalar(1000);
  scene.add(sun);
  scene.add(sun.target);
  const groundMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.groundAlbedo), roughness: 0.95 });
  groundMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGW;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x), mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x), f.y); }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.8 + 0.2*gn(vGW.xz*0.06) + 0.1*gn(vGW.xz*0.7) - 0.05;');
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), groundMat);
  ground.position.y = groundY;
  scene.add(ground);
  return {
    sun, sunDir, sky, ground,
    update(camera: THREE.Camera, t: number, w: number, h: number): void {
      sky.update(camera);
      updateAtmosphereFrame(t, w, h);
      sun.target.position.copy(camera.position);
      sun.position.copy(camera.position).addScaledVector(sunDir, 1000);
    },
  };
}
