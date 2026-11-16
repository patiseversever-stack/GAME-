# Göz Kararı görsel dönüştürücü: python3 -I tools/gozkarari/donustur.py <girdi_klasörü> <çıktı_klasörü>
#   Girdi: kullanıcının ZIP'inden çıkan görseller (PNG/JPG/WEBP; alt klasörde de olabilir). Ad içinde GK-311 gibi bir numara
#          olmalı ("GK-311.png", "gk-311 (1).png" da olur). Aynı numaradan iki dosya varsa en büyüğü alınır, raporlanır.
#   Çıktı: <çıktı>/GK-xxx.webp, 448×336 (4:3), 12–24 KB (kalite ikili aramayla ~18 KB'a ayarlanır).
#   Oran 4:3'ten %2'den çok saparsa ortadan 4:3 kırpılır ve raporlanır (yanlış oran üretilmiş olabilir: göz denetimi).
# Sonra: eski görselleri (dist/gk/GK-*.webp) aynı çıktı klasörüne kopyala ve python3 -I tools/gozkarari/kur.py <çıktı>.
import os, re, sys, io
from PIL import Image

SRC, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(OUT, exist_ok=True)
W, H = 448, 336
HEDEF, ALT, UST = 18000, 12000, 24000

bul = {}
cift = []
for kok, _, dosyalar in os.walk(SRC):
    for f in dosyalar:
        if not re.search(r'\.(png|jpe?g|webp)$', f, re.I):
            continue
        m = re.search(r'gk[-_ ]?(\d{3,4})', f, re.I)
        if not m:
            continue
        gid = 'GK-%03d' % int(m.group(1))
        p = os.path.join(kok, f)
        if gid in bul:
            cift.append(gid)
            if os.path.getsize(p) <= os.path.getsize(bul[gid]):
                continue
        bul[gid] = p

kirpilan, sinir_disi = [], []
for gid in sorted(bul, key=lambda g: int(g[3:])):
    im = Image.open(bul[gid]).convert('RGB')
    w, h = im.size
    oran = w / h
    if abs(oran - 4 / 3) > 0.02 * 4 / 3:
        kirpilan.append(f'{gid} {w}x{h}')
        if oran > 4 / 3:
            nw = round(h * 4 / 3); x = (w - nw) // 2; im = im.crop((x, 0, x + nw, h))
        else:
            nh = round(w * 3 / 4); y = (h - nh) // 2; im = im.crop((0, y, w, y + nh))
    im = im.resize((W, H), Image.LANCZOS)
    lo, hi, en = 30, 95, None
    while lo <= hi:
        q = (lo + hi) // 2
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        n = b.tell()
        if n <= HEDEF:
            en = (q, b.getvalue()); lo = q + 1
        else:
            hi = q - 1
    if en is None:
        b = io.BytesIO(); im.save(b, 'WEBP', quality=30, method=6); en = (30, b.getvalue())
    if not ALT <= len(en[1]) <= UST:
        sinir_disi.append(f'{gid} {len(en[1])} B (kalite {en[0]})')
    open(os.path.join(OUT, gid + '.webp'), 'wb').write(en[1])

print(f'{len(bul)} görsel dönüştürüldü → {OUT}')
if cift: print('aynı numaradan birden çok dosya (büyüğü alındı):', ', '.join(sorted(set(cift))))
if kirpilan: print('4:3 olmayan, ortadan kırpılan:', ', '.join(kirpilan))
if sinir_disi: print('12–24 KB dışında (görsel çok sade ya da çok ayrıntılı olabilir):', ', '.join(sinir_disi))
