// Integrator test server: same as vite.config.ts but without HMR / file watching, so parallel agents editing
// sources never reload the page under a running scenario. `npx vite --config dev/integrator.vite.config.ts`
import { defineConfig, mergeConfig } from 'vite';
import base from '../vite.config.ts';

export default mergeConfig(base, defineConfig({ server: { hmr: false, watch: null, port: 5173, strictPort: true } }));
