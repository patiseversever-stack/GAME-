# Temas sayfası: önce/sonra, her yapı bir satır (yakın) — node yapi.cjs ile çekilmiş jpg'lerden
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
ks = sorted({os.path.basename(p)[len(a)+1:-4] for p in glob.glob(f'{a}_*.jpg')})
cw, ch = 300, 330
cols = 2  # her yapı: önce | sonra; sayfada 3 yapı yan yana
per = 3
rows = (len(ks) + per - 1) // per
o = Image.new('RGB', (per * (cw * 2 + 14), rows * (ch + 24)), 'white')
d = ImageDraw.Draw(o)
for n, k in enumerate(ks):
    r, c = divmod(n, per)
    x0 = c * (cw * 2 + 14); y0 = r * (ch + 24)
    d.text((x0 + 4, y0 + 3), k, fill='black', font=f)
    for j, pre in enumerate((a, b)):
        pth = f'{pre}_{k}.jpg'
        if not os.path.exists(pth): continue
        im = Image.open(pth).crop((56, 250, 356, 580)).resize((cw, ch))
        o.paste(im, (x0 + j * cw, y0 + 22))
o.save(out, quality=78)
print(out, o.size, len(ks))
