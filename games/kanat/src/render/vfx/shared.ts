// Shared uniforms between props, pilot and VFX (light-less tricks: no real point lights on any tier).
import { Vector3, Vector4 } from 'three';

export const sharedUniforms = {
  /** World position of the strongest nearby burner flame (balloon). */
  uWarmPos: { value: new Vector3(0, -1e6, 0) },
  /** rgb = warm light colour × intensity (linear), a = falloff radius (m). Zero = off. */
  uWarmColor: { value: new Vector4(0, 0, 0, 30) },
  /** Wrapped render time (s) for cosmetic animation. */
  uTime: { value: 0 },
};

/** Write the burner light (called by PropsRenderer every frame). */
export function setWarmLight(x: number, y: number, z: number, r: number, g: number, b: number, radius: number): void {
  sharedUniforms.uWarmPos.value.set(x, y, z);
  sharedUniforms.uWarmColor.value.set(r, g, b, radius);
}

/** GLSL: warm point term without a real light (Lambert wrap with smooth inverse-square-ish falloff). */
export const GLSL_WARM_LIGHT = /* glsl */ `
uniform vec3 uWarmPos;
uniform vec4 uWarmColor;
vec3 kWarmLight(vec3 worldPos, vec3 worldNormal, vec3 albedo) {
  vec3 L = uWarmPos - worldPos;
  float d2 = dot(L, L);
  float r = uWarmColor.w;
  float att = r * r / (r * r + d2 * 4.0);
  att *= 1.0 - smoothstep(r * 0.8, r * 1.6, sqrt(d2));
  float ndl = max(dot(worldNormal, L * inversesqrt(max(d2, 1e-4))) * 0.75 + 0.25, 0.0);
  return albedo * uWarmColor.rgb * att * ndl;
}
`;
