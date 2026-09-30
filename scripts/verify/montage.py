# Remotion kare dizisinden etiketli kontak sayfası: python3 montage.py <klasör> <çıktı.png> <sütun> <kare1,kare2,...> [fps]
import sys, os, re
from PIL import Image, ImageDraw
d, out, cols, frames = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(x) for x in sys.argv[4].split(',')]
fps = float(sys.argv[5]) if len(sys.argv) > 5 else 30
files = sorted(f for f in os.listdir(d) if re.search(r'\d+\.(jpe?g|png)$', f))
num = lambda f: int(re.search(r'(\d+)\.(jpe?g|png)$', f).group(1))
byn = {num(f): f for f in files}
ims = [(n, Image.open(os.path.join(d, byn[n])).convert('RGB')) for n in frames if n in byn]
w, h = ims[0][1].size
tw = min(w, 640); th = int(h * tw / w)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 6) + 6, rows * (th + 22) + 6), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for k, (n, im) in enumerate(ims):
    x = 6 + (k % cols) * (tw + 6); y = 6 + (k // cols) * (th + 22)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 16))
    dr.text((x + 2, y + 2), f'kare {n}  ({n / fps:.2f} sn)', fill=(240, 225, 190))
sheet.save(out); print(out, sheet.size)
