// Yükleme ekranını oyunun HTML'ine entegre eder (tekrar çalıştırılabilir / idempotent).
//  1) <style id="gp-loader-css">   : loader CSS'i (</head> öncesi)
//  2) <!--gp-loader:begin-->…<!--gp-loader:end--> : eski #loading yerine kabuk + erken çalışan loader script'i
//  3) Game kurucusundaki anlık gizleme  → GPLoader.built()
//  4) Açılış IIFE'si                    → gerçek yükleme olaylarını GPLoader'a bildirir (görsel çözüldü / sayfa kuruluyor / ilk kare)
// Orijinal oyun mantığına dokunulmaz; yalnızca bu dört nokta değişir.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamePath = path.join(root, 'game', 'Gece_Postasi_Yatay_Hafif.html');
const b = p => fs.readFileSync(path.join(root, 'loader', 'build', p), 'utf8');

let html = fs.readFileSync(gamePath, 'utf8');
const before = Buffer.byteLength(html);
const css = b('loader.min.css'), js = b('loader.game.min.js'), shell = fs.readFileSync(path.join(root, 'loader', 'src', 'shell.html'), 'utf8').trim();

// ---- 1) CSS ----------------------------------------------------------------------------------
const cssBlock = `<style id="gp-loader-css">${css}</style>`;
if (html.includes('<style id="gp-loader-css">')) html = html.replace(/<style id="gp-loader-css">[\s\S]*?<\/style>/, () => cssBlock);
else html = html.replace('</style></head>', () => `</style>${cssBlock}</head>`);

// ---- 2) Kabuk + script -------------------------------------------------------------------------
const shellBlock = `<!--gp-loader:begin-->${shell}<script id="gp-loader-js">${js}</script><!--gp-loader:end-->`;
if (html.includes('<!--gp-loader:begin-->')) html = html.replace(/<!--gp-loader:begin-->[\s\S]*?<!--gp-loader:end-->/, () => shellBlock);
else {
  const old = /<div id="loading"><strong>GP<\/strong><span>BASKI HAZIRLANIYOR<\/span><p id="load-message">Bir sayfa\. Bir dünya\.<\/p><\/div>/;
  if (!old.test(html)) throw new Error('Eski #loading kabuğu bulunamadı');
  html = html.replace(old, () => shellBlock);
}

// ---- 3) Kurucudaki anlık gizleme ---------------------------------------------------------------
const hideOld = "$('#loading').hidden=true;", hideNew = "/*gp-loader*/window.GPLoader&&window.GPLoader.built();";
if (html.includes(hideOld)) html = html.replace(hideOld, hideNew);
else if (!html.includes(hideNew)) throw new Error('Game kurucusundaki #loading gizleme bulunamadı');

// ---- 4) Açılış IIFE'si -----------------------------------------------------------------------------
const iife = `/*gp-loader*/(async()=>{const L=window.GPLoader;try{L&&L.stage('images');let images={};await Promise.all(Object.entries(ASSETS).map(([key,src])=>new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{images[key]=im;L&&L.asset(key,im);resolve();};im.onerror=()=>reject(Error('Görsel açılamadı: '+key));im.src=src;})));if(L){L.stage('build');await L.yield();}window.game=new Game(images);L&&L.ready({project:(x,y)=>window.Posta.screenPoint(x,y),frames:()=>window.game.scene.frames});}catch(e){console.error(e);window.ReactNativeWebView?.postMessage('POSTA_ERROR');if(L)L.fail(e);else{const m=$('#load-message');if(m)m.textContent='Görüntü başlatılamadı: '+e.message+'. WebGL destekli güncel bir tarayıcıda aç.';}}})();`;
const iifeStart = html.indexOf('(async()=>{');
const marker = html.indexOf('/*gp-loader*/(async()=>{');
if (marker >= 0) {
  const end = html.indexOf('}}})();', marker) + '}}})();'.length;
  html = html.slice(0, marker) + iife + html.slice(end);
} else {
  const origStart = html.lastIndexOf("(async()=>{try{let images={};");
  if (origStart < 0) throw new Error('Orijinal açılış IIFE bulunamadı');
  const end = html.indexOf("}})();", origStart) + "}})();".length;
  html = html.slice(0, origStart) + iife + html.slice(end);
}

fs.writeFileSync(gamePath, html);
const after = Buffer.byteLength(html), gz = s => zlib.gzipSync(s, { level: 9 }).length;
console.log(`oyun: ${before} → ${after} bayt  (eklenen ${after - before} bayt)`);
