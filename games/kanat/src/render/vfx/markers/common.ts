// Shared blend settings for marker materials (premultiplied alpha; additive = alpha 0).
import { CustomBlending, OneFactor, OneMinusSrcAlphaFactor } from 'three';

export const PREMUL = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor } as const;
export const TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
