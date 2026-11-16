# Göz Kararı görsel dönüştürücü: python3 -I tools/gozkarari/donustur.py <girdi_klasörü> <çıktı_klasörü>
#   Girdi: kullanıcının ZIP'inden çıkan görseller (PNG/JPG/WEBP; alt klasörde de olabilir). Ad içinde GK-311 gibi bir numara
#          olmalı ("GK-311.png", "gk-311 (1).png" da olur). Aynı numaradan iki dosya varsa en büyüğü alınır, raporlanır.
#   Çıktı: <çıktı>/GK-xxx.webp, 4:3, gelen çözünürlükte (en az 448×336, en çok 1024×768), webp kalite 88.
#   Eskiden hepsi 448×336'ya küçültülüp ~18 KB'a sıkıştırılıyordu: telefonda (3x yoğun ekran) ve yakın çekim kiplerinde
#   (5–6,5x büyütme) piksel piksel görünüyordu (kullanıcı, 16 Kasım 2026). Görseller paketlerden bayt aralığıyla tek tek
#   indiği için (src/quiz/gorsel_paket.js) dosya boyu artık sayfa ağırlığı değil.
#   UYARI: kaynak 448'den küçükse büyütülür ama keskinleşmez; en iyisi ChatGPT'nin indirdiği orijinal (sıkıştırılmamış) dosya.
#   Oran 4:3'ten %2'den çok saparsa ortadan 4:3 kırpılır ve raporlanır (yanlış oran üretilmiş olabilir: göz denetimi).
# Sonra: eski görselleri (dist/gk/GK-*.webp) aynı çıktı klasörüne kopyala ve python3 -I tools/gozkarari/kur.py <çıktı>.
import os, re, sys, io
from PIL import Image

SRC, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(OUT, exist_ok=True)
EN_AZ, EN_COK = 448, 1024
KALITE = 88
UST = 200_000

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

kirpilan, sinir_disi, kucuk = [], [], []
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
    if im.size[0] < EN_AZ: kucuk.append(f'{gid} {im.size[0]}x{im.size[1]}')
    W = max(EN_AZ, min(EN_COK, im.size[0]))
    if im.size != (W, W * 3 // 4): im = im.resize((W, W * 3 // 4), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=KALITE, method=6)
    if b.tell() > UST: sinir_disi.append(f'{gid} {b.tell() // 1024} KB')
    open(os.path.join(OUT, gid + '.webp'), 'wb').write(b.getvalue())

print(f'{len(bul)} görsel dönüştürüldü → {OUT}')
if cift: print('aynı numaradan birden çok dosya (büyüğü alındı):', ', '.join(sorted(set(cift))))
if kirpilan: print('4:3 olmayan, ortadan kırpılan:', ', '.join(kirpilan))
if sinir_disi: print('200 KB üstü (çok ayrıntılı):', ', '.join(sinir_disi))
if kucuk: print(f'{len(kucuk)} görsel {EN_AZ} pikselden küçük geldi (sıkıştırılmış kaynak; büyütüldü, keskin değil): ' + ', '.join(kucuk))
