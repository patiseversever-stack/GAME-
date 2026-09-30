// Önizleme / Remotion giriş noktası: kurucuyu ve sabitleri window.GPLoaderKit altında sunar.
import { createLoader, T } from './index.js';
import { predictOverviewQuad } from './geometry.js';
window.GPLoaderKit = { createLoader, T, predictOverviewQuad };
