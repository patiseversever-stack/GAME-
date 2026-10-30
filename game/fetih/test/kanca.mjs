// Düz node için JSON kancası: maç modülleri (yeni soru tipleri) harita verisini `import DATA from '…json'` ile alır;
// tarayıcı paketinde esbuild bunu çözer, düz node ise içe aktarma niteliği ister. Bu kanca .json dosyalarını
// `export default` modülüne çevirir. Kullanım:
//   - komut satırında: node --import ./test/kanca.mjs betik.mjs
//   - sınamada: `await import('./kanca.mjs')` sonra maç modüllerini dinamik içe aktar (statik içe aktarmalar kancadan
//     önce yüklenir).
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
	load(url, context, next) {
		if (url.startsWith('file:') && url.endsWith('.json')) {
			const text = readFileSync(fileURLToPath(url), 'utf8');
			return { format: 'module', source: `export default ${text};`, shortCircuit: true };
		}
		return next(url, context);
	},
});
