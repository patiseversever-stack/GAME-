# Önce/sonra kareleri: her karede değişen yer çemberle, altında açıklama balonu. python3 isaret.py <çıktı> <json>
# json: {"title": str, "panels": [{"img", "label", "tone": "bad|good", "circle": [x, y, r] (412x892 kare koordinatı), "text": [satırlar]}]}
import json, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
F = lambda s, b=True: ImageFont.truetype(B if b else R, s)
out, spec = sys.argv[1], json.load(open(sys.argv[2]))
S = 0.78; PW, PH = int(412 * S), int(892 * S); G = 26; BH = 250; TOP = 70
n = len(spec['panels']); W = n * PW + (n + 1) * G; H = TOP + 44 + PH + 40 + BH
im = Image.new('RGB', (W, H), (12, 15, 26)); d = ImageDraw.Draw(im)
d.text((G, 20), spec['title'], fill=(255, 210, 90), font=F(30))
COL = {'bad': ((255, 80, 70), (255, 244, 240), (150, 20, 10)), 'good': ((80, 230, 140), (238, 255, 244), (10, 110, 50)), 'info': ((255, 200, 70), (255, 250, 232), (120, 80, 0))}
for k, P in enumerate(spec['panels']):
    x0 = G + k * (PW + G); y0 = TOP + 44
    ring, fill, ink = COL[P.get('tone', 'good')]
    d.text((x0, TOP), P['label'], fill=ring, font=F(22))
    pic = Image.open(P['img']).convert('RGB').resize((PW, PH), Image.LANCZOS)
    im.paste(pic, (x0, y0))
    cx, cy, r = P['circle']; cx, cy, r = x0 + cx * S, y0 + cy * S, r * S
    for w in (7, 4):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=ring if w == 4 else (0, 0, 0), width=w)
    by = y0 + PH + 30; bx = x0
    lines = []
    for t in P['text']:
        lines += textwrap.wrap(t, 27) or ['']
    bh = 22 + 27 * len(lines)
    d.rounded_rectangle((bx, by, bx + PW, by + bh), 14, fill=fill, outline=ring, width=4)
    # balonun ucu çembere
    # ok: görüntünün içinde yalnız ince çizgi (içeriği örtmez), dışta balona bağlanan kısa üçgen
    ey = y0 + PH
    d.line((cx, cy + r, cx, ey), fill=ring, width=3)
    d.polygon([(cx - 12, by + 2), (cx, ey + 4), (cx + 12, by + 2)], fill=ring)
    yy = by + 12
    for j, t in enumerate(lines):
        d.text((bx + 14, yy), t, fill=ink, font=F(19, j == 0 and P.get('bold_first', True)))
        yy += 27
im.save(out, quality=90)
print(out, im.size)
