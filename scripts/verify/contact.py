# Kare dosyalarından etiketli kontak sayfası (montaj) üretir: python3 contact.py çıktı.png sütun kare1.png kare2.png ...
import sys, re
from PIL import Image, ImageDraw, ImageFont
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
scale = min(1.0, 640 / w) if len(ims) > 1 else 1.0
tw, th = int(w * scale), int(h * scale)
rows = (len(ims) + cols - 1) // cols
pad = 6
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad + 16) + pad), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x = pad + (i % cols) * (tw + pad); y = pad + (i // cols) * (th + pad + 16)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 16))
    m = re.search(r't(\d+)', f); label = (m.group(1).lstrip('0') or '0') + ' ms' if m else f.split('/')[-1]
    d.text((x + 2, y + 2), label, fill=(240, 230, 200))
sheet.save(out); print(out, sheet.size)
