// Oyun içi giriş noktası: #gp-loader kabuğunu bulur, yükleyiciyi başlatır ve window.GPLoader olarak sunar.
import { createLoader } from './index.js';
const root = document.getElementById('gp-loader');
if (root) { try { window.GPLoader = createLoader(root); } catch (e) { console.error('[gp-loader]', e); } }
