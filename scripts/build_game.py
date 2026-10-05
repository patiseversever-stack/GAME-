"""Gündönümü: src/ altındaki parçaları tek, bağımsız bir HTML'e derler.

Three.js esbuild ile paketlenip sayfaya gömülür; çıkan dosya internetsiz
de açılır. Kullanım:  python3 scripts/build_game.py
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
BUILD = os.path.join(ROOT, '.build')
PARTS = ['10_boot.js', '20_audio.js', '21_thmusic.js', '30_world.js', '40_gen.js', '50_render.js', '60_env.js',
         '70_island.js', '80_actors.js', '85_action.js', '85b_dragon.js', '85c_life.js', '85d_night.js', '86_sfcore.js', '87_sffigs.js', '87_sfwild.js', '87_sfdestan.js', '88_skymap.js', '89_theater.js', '89b_thtut.js', '89c_karagoz.js', '90_game.js', '91_melt.js', '92a_tutstage.js', '92_tutorial.js', '93_lore.js', '94_wardrobe.js', '95_main.js']

os.makedirs(BUILD, exist_ok=True)
if not os.path.isdir(os.path.join(BUILD, 'node_modules', 'three')):
    with open(os.path.join(BUILD, 'package.json'), 'w') as f:
        f.write('{"private":true}')
    subprocess.run(['npm', 'i', '--no-audit', '--no-fund', 'three@0.170.0', 'esbuild@0.25.0'], cwd=BUILD, check=True)

head = open(os.path.join(SRC, '00_head.html'), encoding='utf8').read()
head = re.sub(r'<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n', '', head)
head = re.sub(r'<link rel="modulepreload"[^\n]*\n', '', head)

js = ''.join(open(os.path.join(SRC, p), encoding='utf8').read() for p in PARTS)
js = js.replace('<script type="module">', '', 1).replace('</script>\n</body>\n</html>', '')
a = js.index('/* ---------- motoru yükle')
b = js.index('/* ---------- küçük matematik')
js = js[:a] + '''import * as THREE_LIB from 'three';
function hasWebGL2() { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; } }
$('#btnRetryLoad').addEventListener('click', () => location.reload());
const THREE = hasWebGL2() ? THREE_LIB : null;
if (!THREE) { $('#loader').classList.add('err'); $('#loader .lerr div').innerHTML = 'Bu cihaz WebGL 2 desteklemiyor.<br>Güncel bir tarayıcıyla tekrar dene.'; throw new Error('WebGL2 yok'); }

''' + js[b:]
# ada üretici iş parçacığı (Web Worker): saf matematik bölümleri ayrı, küçültülmüş bir betik olarak gömülür
boot = open(os.path.join(SRC, '10_boot.js'), encoding='utf8').read()
helpers = boot[boot.index('/* ---------- küçük matematik'):boot.index('/* ---------- kayıt')]
wsrc = helpers + 'const Save = { data: { unlocked: 0 } };\n' + open(os.path.join(SRC, '30_world.js'), encoding='utf8').read() + open(os.path.join(SRC, '40_gen.js'), encoding='utf8').read() + '''
self.onmessage = (e) => {
  const { id, spec } = e.data; let lv = null;
  try { lv = buildLevel(spec); if (lv) { delete lv.rng; delete lv._field; } } catch (err) { self.postMessage({ id, err: String(err && err.message || err) }); return; }
  self.postMessage({ id, lv });
};
'''
wmin = subprocess.run([os.path.join(BUILD, 'node_modules', '.bin', 'esbuild'), '--minify', '--target=es2020', '--legal-comments=none', '--loader=js'], input=wsrc.encode('utf8'), capture_output=True, check=True).stdout.decode('utf8')
assert js.count("'__GEN_WORKER_SRC__'") == 1
js = js.replace("'__GEN_WORKER_SRC__'", json.dumps(wmin))
open(os.path.join(BUILD, 'game_src.js'), 'w', encoding='utf8').write(js)
subprocess.run([os.path.join(BUILD, 'node_modules', '.bin', 'esbuild'), 'game_src.js', '--bundle', '--format=esm', '--minify',
                '--target=es2020', '--legal-comments=none', '--outfile=game_bundle.js'], cwd=BUILD, check=True)
out = open(os.path.join(BUILD, 'game_bundle.js'), encoding='utf8').read().replace('</script', '<\\/script')
html = head + '<script type="module">\n' + out + '\n</script>\n</body>\n</html>\n'
for name in ('index.html', 'Gundonumu.html'):
    open(os.path.join(ROOT, name), 'w', encoding='utf8').write(html)
# deneme sürümü: tüm adalar açık, kayıt ayrı (gerçek ilerleme etkilenmez)
test = re.sub(r'<title>([^<]*)</title>', r'<title>\1 · Deneme</title>', head, count=1) + '<script>window.__GD_TEST_ALL = true;</script>\n' + html[len(head):]
open(os.path.join(ROOT, 'Gundonumu_Deneme.html'), 'w', encoding='utf8').write(test)
print('ok', len(html), 'bayt')
