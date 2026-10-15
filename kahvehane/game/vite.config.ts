import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

// "tek" modu: her şey tek bir HTML dosyasına gömülür (önizleme linki / WebView yerel dosya için)
export default defineConfig(({mode}) => ({
  base: './',
  plugins: mode === 'tek' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'tek' ? 'dist-tek' : 'dist',
    target: 'es2020',
    assetsInlineLimit: mode === 'tek' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  server: {host: true, port: 5173},
}));
