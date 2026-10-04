"""Taş takımlarını (Çini, Ebru, Yağlı boya) ve orta alan düzeltmelerini Patisever Okey HTML dosyasına ekler.
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
      if(t.bk!==th) {t.bk=th; const bm=t.back.material; bm.map=dr({kind:'back'}); bm.toneMapped=!th; bm.envMapIntensity=th?.06:.25; bm.roughness=th?.9:.62; bm.needsUpdate=true;}""")
rep('for(let n of this.meshes.values())this._syncFace(n),n.group.visible=n.el.style.display!=="none";','for(let n of this.meshes.values())this._syncFace(n),n.group.visible=n.el.style.display!=="none";if(this.decos)for(const[n,q]of this.decos)n.isConnected&&this._syncFace(q);')
rep('n.dataset.tiles="ivory"','n.dataset.tiles=["ivory","cini","ebru","yagli"].includes(s.get("tiles"))?s.get("tiles"):"ivory"')
rep('o("G\\xF6r\\xFCn\\xFCm","amber",`','o("G\\xF6r\\xFCn\\xFCm","amber",`<div class="set-row">${i("tiles","Taşlar")}${e("tiles",[["ivory","Fildişi"],["cini","Çini"],["ebru","Ebru"],["yagli","Yağlı boya"]])}</div>')
rep("'Görünüm': 'Animasyon ve yazı boyutu'","'Görünüm': 'Taşlar, animasyon ve yazı boyutu'")
rep('this.backMat=new ve({map:dr({kind:"back"})','this.backMat=new ve({map:window.PTiles?PTiles.menuTex({kind:"back"},dr0,Ve,he):dr({kind:"back"})')
rep('new ve({map:dr(t),bumpMap:mc(t),','new ve({map:window.PTiles?PTiles.menuTex(t,dr0,Ve,he):dr(t),bumpMap:window.PTiles?null:mc(t),')
rep('this.bodyMat=new ve({color:16051417','this.bodyMat=new ve({color:window.PTiles?PTiles.menuBody(16051417):16051417')
rep('<span class="plate__cap plate__cap--stock"><span class="cap-l">Deste</span><span class="cap-n num">0</span></span>','<span class="plate__cap plate__cap--stock"><span class="cap-l">Deste</span></span><span class="cap-n num plate__count">0</span>')
rep('l.style.left=c.cx-e.x+"px",l.classList.toggle("is-compact",!!e.compact),this.capCount=l.querySelector(".cap-n"),h.style.left=a+"px",u.style.left=o+"px";',
    'l.classList.toggle("is-compact",!!e.compact);{const cn=r.querySelector(".cap-n");this.capCount=cn;cn&&(cn.style.left=c.cx-e.x+c.w/2-2+"px",cn.style.top=c.cy-c.h/2-e.y-1+"px");const W=[l,h,u].map(z=>Math.max(z.offsetWidth||0,(z.textContent||"").trim().length*6.6+2)),C=[c.cx-e.x,a,o],G=6;C[0]+W[0]/2>C[1]-W[1]/2-G&&(C[0]=C[1]-W[1]/2-G-W[0]/2);C[2]-W[2]/2<C[1]+W[1]/2+G&&(C[2]=C[1]+W[1]/2+G+W[2]/2);[l,h,u].forEach((z,k)=>z.style.setProperty("left",C[k]+"px","important"))}')
rep('a(2);let o=i.createLinearGradient(0,0,0,n.height);o.addColorStop(0,"rgba(10, 26, 20, 0.9)"),o.addColorStop(1,"rgba(14, 34, 27, 0.9)"),i.fillStyle=o,i.fill(),i.save(),a(2),i.clip();let c=i.createLinearGradient(0,0,0,14*e);if(c.addColorStop(0,"rgba(0,0,0,0.35)"),c.addColorStop(1,"rgba(0,0,0,0)"),i.fillStyle=c,i.fillRect(0,0,n.width,14*e),s.div){let y=Math.round(s.div*e),m=i.createLinearGradient(0,n.height*.15,0,n.height*.85);m.addColorStop(0,"rgba(255,255,255,0)"),m.addColorStop(.5,"rgba(255,255,255,0.12)"),m.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=m,i.fillRect(y-e*.5,n.height*.15,e,n.height*.7)}i.restore(),i.lineWidth=1*e,a(2.5),i.strokeStyle="rgba(255,255,255,0.09)",i.stroke();','a(2);{let o=i.createLinearGradient(0,0,0,n.height);o.addColorStop(0,"rgba(3,16,11,0.64)"),o.addColorStop(.55,"rgba(5,22,16,0.52)"),o.addColorStop(1,"rgba(8,30,22,0.48)"),i.fillStyle=o,i.fill(),i.save(),a(2),i.clip();let c=i.createLinearGradient(0,0,0,18*e);c.addColorStop(0,"rgba(0,0,0,0.5)"),c.addColorStop(1,"rgba(0,0,0,0)"),i.fillStyle=c,i.fillRect(0,0,n.width,18*e);for(const[x0,x1]of[[0,10*e],[n.width,n.width-10*e]]){let q=i.createLinearGradient(x0,0,x1,0);q.addColorStop(0,"rgba(0,0,0,0.3)"),q.addColorStop(1,"rgba(0,0,0,0)"),i.fillStyle=q,i.fillRect(Math.min(x0,x1),0,10*e,n.height)}let gl=i.createRadialGradient(n.width/2,n.height*.45,0,n.width/2,n.height*.45,n.width*.6);gl.addColorStop(0,"rgba(255,236,190,0.07)"),gl.addColorStop(1,"rgba(255,236,190,0)"),i.fillStyle=gl,i.fillRect(0,0,n.width,n.height);let lb=i.createLinearGradient(0,n.height-22*e,0,n.height);lb.addColorStop(0,"rgba(0,0,0,0)"),lb.addColorStop(1,"rgba(0,0,0,0.3)"),i.fillStyle=lb,i.fillRect(0,n.height-22*e,n.width,22*e);if(s.div){let y=Math.round(s.div*e),m=i.createLinearGradient(0,n.height*.12,0,n.height*.88);m.addColorStop(0,"rgba(216,180,106,0)"),m.addColorStop(.5,"rgba(216,180,106,0.5)"),m.addColorStop(1,"rgba(216,180,106,0)"),i.fillStyle=m,i.fillRect(y-e*.5,n.height*.12,e,n.height*.76),i.fillStyle="rgba(0,0,0,0.35)",i.fillRect(y+e*.5,n.height*.12,e,n.height*.76)}i.lineWidth=1*e,i.strokeStyle="rgba(255,240,205,0.11)",i.beginPath(),i.moveTo(r,n.height-3*e),i.lineTo(n.width-r,n.height-3*e),i.stroke(),i.restore(),i.lineWidth=1.2*e,a(1.6),i.strokeStyle="rgba(0,0,0,0.5)",i.stroke(),i.lineWidth=.9*e,a(5*e),i.strokeStyle="rgba(216,180,106,0.55)",i.stroke()}')
rep('c=a?r0(o):s0(o);','c=a?r0(o):s0(o);c.stock&&c.okeyMini&&!c.table101&&(c.stock={...c.stock,cx:c.stock.cx-(a?6:9)},c.okeyMini={...c.okeyMini,cx:c.okeyMini.cx+(a?4:6)},c.plate&&(c.plate={...c.plate,w:c.plate.w+(a?4:6)}));')
rep('let y=c.cx-c.w/2-12,m=i.cx+i.w/2+12,','let y=c.cx-c.w/2-15,m=i.cx+i.w/2+15,')
rep("</head>","<script>\n"+mod+"</script>\n</head>")
open(sys.argv[2],'w',encoding='utf8').write(s)
print('ok', len(s)//1024, 'KB')
