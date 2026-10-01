import re, subprocess
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=ROOT+'/'
P=D+'src/'
head=open(P+'00_head.html',encoding='utf8').read()
head=re.sub(r'<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n','',head)
head=re.sub(r'<link rel="modulepreload"[^\n]*\n','',head)
js=''.join(open(P+f,encoding='utf8').read() for f in ['10_boot.js','20_audio.js','30_world.js','40_gen.js','50_render.js','60_env.js','70_island.js','80_actors.js','90_game.js','95_main.js'])
js=js.replace('<script type="module">','',1)
js=js.replace('</script>\n</body>\n</html>','')
a=js.index('/* ---------- motoru yükle'); b=js.index('/* ---------- küçük matematik')
js=js[:a]+'''import * as THREE_LIB from 'three';
function hasWebGL2() { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; } }
$('#btnRetryLoad').addEventListener('click', () => location.reload());
const THREE = hasWebGL2() ? THREE_LIB : null;
if (!THREE) { $('#loader').classList.add('err'); $('#loader .lerr div').innerHTML = 'Bu cihaz WebGL 2 desteklemiyor.<br>Güncel bir tarayıcıyla tekrar dene.'; throw new Error('WebGL2 yok'); }

'''+js[b:]
os.makedirs(D+'.build',exist_ok=True); open(D+'.build/game_src.js','w',encoding='utf8').write(js)
subprocess.run(['npx','--yes','esbuild@0.25.0','game_src.js','--bundle','--format=esm','--minify','--target=es2020','--legal-comments=none','--outfile=game_bundle.js'],cwd=D+'.build',check=True)
out=open(D+'.build/game_bundle.js',encoding='utf8').read().replace('</script','<\\/script')
html=head+'<script type="module">\n'+out+'\n</script>\n</body>\n</html>\n'
for f in [D+'index.html',D+'Gundonumu.html']: open(f,'w',encoding='utf8').write(html)
print(len(html))
