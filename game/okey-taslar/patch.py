"""Taş takımlarını (Çini, Ebru, Yağlı boya) Patisever Okey HTML dosyasına ekler.
Kullanım: python3 patch.py <oyun.html> <çıktı.html>
"""
import sys, os
src=sys.argv[1]
s=open(src,encoding='utf8').read()
mod=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'ptiles.js'),encoding='utf8').read()
def rep(a,b):
    global s
    assert s.count(a)==1, (s.count(a), a[:80])
    s=s.replace(a,b,1)
rep("s.dataset.t=String(t);","s.dataset.t=String(t);window.PTiles&&PTiles.decorate(s);")
rep("function dr(s) {","function dr(s){return window.PTiles&&PTiles.themed()?PTiles.tex(s,dr0,Ve,he):dr0(s)}function dr0(s) {")
rep('function mc(s){if(s.kind==="back")return null;','function mc(s){if(s.kind==="back"||window.PTiles&&PTiles.themed())return null;')
rep("""_syncFace(t) {
      const face=mm(t.el),key=face.kind+'|'+face.color+'|'+face.value+'|'+face.rep;
      if(key!==t.key) {t.key=key; t.face.material.map=dr(face); t.face.material.needsUpdate=true;}""","""_syncFace(t) {
      const face=mm(t.el),th=window.PTiles?PTiles.reg(this):'',key=face.kind+'|'+face.color+'|'+face.value+'|'+face.rep+'|'+th;
      if(key!==t.key) {t.key=key; t.face.material.map=dr(face); t.face.material.needsUpdate=true;}
      if(t.bk!==th) {t.bk=th; t.back.material.map=dr({kind:'back'}); t.back.material.needsUpdate=true;}""")
rep('n.dataset.tiles="ivory"','n.dataset.tiles=["ivory","cini","ebru","yagli"].includes(s.get("tiles"))?s.get("tiles"):"ivory"')
rep('o("G\\xF6r\\xFCn\\xFCm","amber",`','o("G\\xF6r\\xFCn\\xFCm","amber",`<div class="set-row">${i("tiles","Taşlar")}${e("tiles",[["ivory","Fildişi"],["cini","Çini"],["ebru","Ebru"],["yagli","Yağlı boya"]])}</div>')
rep("'Görünüm': 'Animasyon ve yazı boyutu'","'Görünüm': 'Taşlar, animasyon ve yazı boyutu'")
rep("</head>","<script>\n"+mod+"</script>\n</head>")
open(sys.argv[2],'w',encoding='utf8').write(s)
print('ok', len(s)//1024, 'KB')
