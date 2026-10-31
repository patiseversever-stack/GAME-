# Afiş + HUD, bütün kipler, üç ekran genişliği yan yana (her biri aynı ölçekte: 412 genişliğe oranlı)
from PIL import Image, ImageDraw, ImageFont
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',24)
rows=[('af','duel','SORU AFİŞİ · 1E1 DÜELLO'),('af','ikili','SORU AFİŞİ · 1E1 YAYILMA'),('af','esli','SORU AFİŞİ · EŞLİ'),('af','uclu','SORU AFİŞİ · 3LÜ'),('af','dortlu','SORU AFİŞİ · 4LÜ'),
      ('hd','ikili','HARİTA ŞERİDİ · 1E1'),('hd','esli','HARİTA ŞERİDİ · EŞLİ'),('hd','uclu','HARİTA ŞERİDİ · 3LÜ'),('hd','dortlu','HARİTA ŞERİDİ · 4LÜ')]
Ws=[360,412,520]
colw=824
def load(k,n,W):
    im=Image.open(f'{k}_{n}_{W}.png').convert('RGB')
    s=colw/im.width
    return im.resize((colw,int(im.height*s)))
H=0; out=[]
for k,n,t in rows:
    ims=[load(k,n,W) for W in Ws]
    h=max(i.height for i in ims)
    out.append((t,ims,h)); H+=h+44
o=Image.new('RGB',(colw*3+40,H+40),'white'); d=ImageDraw.Draw(o)
for j,W in enumerate(Ws): d.text((j*(colw+20)+10,6),f'{W} px ekran',fill='#c00',font=f)
y=40
for t,ims,h in out:
    d.text((10,y+8),t,fill='black',font=f)
    for j,im in enumerate(ims): o.paste(im,(j*(colw+20),y+40))
    y+=h+44
o.save('tum_kipler.jpg',quality=80)
print(o.size)
