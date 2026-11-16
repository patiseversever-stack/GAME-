# Göz Kararı kurulumu: python3 -I kur.py <görsel_klasörü>
#   1. P1–P12.md'den soruları okur (denetle.py ile aynı düzen; P1–P6: GK-001–310, P7–P8: GK-311–510, P9–P12: GK-511–1310).
#      Görseli klasörde
#      olmayan YENİ madde (GK-311+) atlanır: ikinci liste parça parça gelebilir; ilk 310'un hepsi şart
#   2. gorsel_test.py'yi çalıştırır (hata varsa durur); siluet maskesi çıkmayanlar bulanık kipe geçer
#   3. görselleri dist/gk/ altına kopyalar, siluet maskelerini 320×240 gri PNG olarak yazar (GK-xxx.m.png)
#   4. yakın çekim / ayrıntı kipleri için odak noktası bulur (en yoğun ayrıntılı bölge, kenarlardan uzak)
#   5. src/data/gozkarari.js'i üretir (elle düzenlenmez)
import sys, os, re, json, glob, shutil, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

SRC = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'dist', 'gk')

RX = re.compile(r'^### (GK-\d{3,4}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M | re.S)
items = []
# P1–P8 (GK-001–510) ve 1000 görsel listesi P9–P12 (GK-511–1310); sayısal sıra (P10, P2'den önce gelmesin)
for f in sorted(glob.glob(os.path.join(HERE, 'P[0-9]*.md')), key=lambda p: int(re.findall(r'P(\d+)\.md$', p)[0])):
    for m in RX.finditer(open(f).read()):
        gid, konu, us, z, g, cmd, q, s, b = m.groups()
        opts = [x.strip() for x in s.split('·')]
        right = [o.replace('✅', '').strip() for o in opts if '✅' in o][0]
        rest = [o.replace('✅', '').strip() for o in opts if '✅' not in o]
        items.append(dict(id=gid, konu=konu.strip(), us=us.strip(), z=int(z), g=g.strip(), q=q.strip(), a=[right] + rest, b=b.strip(), dogru=right))
assert len([i for i in items if int(i['id'][3:]) <= 310]) == 310, len(items)
eksik = [i['id'] for i in items if int(i['id'][3:]) > 310 and not os.path.exists(os.path.join(SRC, i['id'] + '.webp'))]
if eksik: print('görseli gelmemiş yeni madde (atlandı):', len(eksik))
items = [i for i in items if i['id'] not in set(eksik)]

tmp = tempfile.mkdtemp()
js = os.path.join(tmp, 'items.json')
json.dump(items, open(js, 'w'), ensure_ascii=False)
mdir = os.path.join(tmp, 'mask')
r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gorsel_test.py'), SRC, js, mdir], capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode: sys.exit('görsel testi geçmedi')

os.makedirs(OUT, exist_ok=True)
for old in glob.glob(os.path.join(OUT, 'GK-*')): os.remove(old)

CAT = {
    'Hayvanlar': 'bilim', 'Dinozor ve deniz canlıları': 'bilim', 'İcatlar': 'bilim', 'Uzay': 'bilim', 'Bilim aletleri': 'bilim',
    'Genel tarih sahneleri': 'tarih', 'Doğa olayları': 'cografya', 'Spor': 'spor', 'El sanatları': 'sanat', 'Tablolar': 'sanat',
    'Eşyalar ve aletler': 'eglence', 'Eski ev eşyaları': 'eglence', 'Ulaşım araçları': 'eglence', 'Meslekler': 'eglence',
    # ikinci liste (GK-311–510); sıra KONULAR dizinini belirler: eskilerin dizini kaymaz
    'Hayvanlar II': 'bilim', 'Bitkiler ve meyveler': 'bilim', 'Türk mutfağı': 'eglence', 'Müzik aletleri': 'sanat',
    'Tarihî nesneler': 'tarih', 'Mimari öğeler': 'sanat', 'Bilim ve teknoloji II': 'bilim', 'Spor II': 'spor',
    'Yer bilimi ve gökyüzü': 'cografya', 'Tablolar II': 'sanat',
    # 1000 görsel listesi (GK-511–1310, GORSEL-1000.md); yine yalnız sona eklenir
    'Kuşlar': 'bilim', 'Böcekler ve örümcekler': 'bilim', 'Okyanus ve tatlı su canlıları': 'bilim', 'Köpek, kedi ve at ırkları': 'bilim',
    'Tarih öncesi canlılar II': 'bilim', 'Ağaçlar ve çiçekler': 'bilim', 'Taşlar, mineraller ve kristaller': 'bilim', 'İnsan vücudu': 'bilim',
    'Mikro dünya': 'bilim', 'Fizik ve kimya olayları': 'bilim',
    'Uzay II': 'bilim', 'Enerji ve mühendislik': 'bilim', "Türkiye'nin doğası": 'cografya', 'Dünyanın doğa harikaları': 'cografya',
    'Kartpostal manzaraları': 'cografya', 'Geleneksel evler ve barınaklar': 'cografya', 'Geleneksel giysiler': 'cografya',
    'Dünya festivalleri ve gelenekleri': 'cografya', 'Dünya mutfağı': 'eglence', 'Tatlılar, ekmekler ve içecekler': 'eglence',
    'Osmanlı gündelik hayatı': 'tarih', 'Antik uygarlıklar': 'tarih', 'Tarihî savaş araçları ve zırhlar': 'tarih',
    'Tarihî gemiler ve denizcilik': 'tarih', 'Türk tarihinden semboller ve eşyalar': 'tarih', 'Keşif ve bilim tarihinden sahneler': 'tarih',
    'Baharatlar, kuruyemişler ve tahıllar': 'eglence', 'Oyunlar ve oyuncaklar': 'eglence', 'Tarım ve köy hayatı': 'eglence',
    'Teknolojinin eskileri': 'eglence',
    'Tablolar III': 'sanat', 'Tablolar IV': 'sanat', 'Ünlü heykeller': 'sanat', 'Mitoloji ve efsane yaratıkları': 'sanat',
    'Edebiyat ve masal sahneleri': 'sanat', 'Dans, tiyatro ve sahne sanatları': 'sanat', 'Dünya el sanatları': 'sanat',
    'Müzik aletleri II': 'sanat', 'Olimpiyat branşları ve ekipmanları': 'spor', 'Dünya sporları ve oyun alanları': 'spor',
    # ünlü kişi portreleri (GK-1311–1410; kullanıcı kararı 16 Kasım: yalnız en geç 1955'te ölmüş kişiler, telifsiz kaynak)
    'Bilim insanları': 'bilim', 'Tarihî kişiler': 'tarih', 'Yazarlar ve şairler': 'sanat', 'Ressamlar ve besteciler': 'sanat',
    # ünlü kişi portreleri II (GK-1411–1560; kullanıcı: "150 tane daha … toplam 1250 olsun")
    'Devlet adamları': 'tarih', 'Komutanlar ve kâşifler': 'tarih', 'Bilim insanları II': 'bilim', 'Mucitler ve öncüler': 'eglence',
    'Yazarlar ve şairler II': 'sanat', 'Sanatçılar ve besteciler II': 'sanat',
}
KONU = {k: i for i, k in enumerate(CAT)}
MODE = {'bulanık': 'blur', 'yakın çekim': 'zoom', 'siluet': 'sil', 'ayrıntı': 'detail'}
# içerik uyarlaması yapılmış tablolar (üretim raporu): aslına birebir değil; soru tablonun adını/ressamını sorar, kompozisyon aynı
UYARLAMA = {'GK-267', 'GK-268', 'GK-275', 'GK-279', 'GK-287', 'GK-292'}

def focus(im):
    """Ayrıntının en yoğun olduğu nokta (0..1), kenarlardan en az %22 içeride."""
    g = np.asarray(im.convert('L').resize((160, 120)), dtype=np.float32)
    e = np.hypot(nd.sobel(g, 0), nd.sobel(g, 1))
    e = nd.uniform_filter(e, 31)
    h, w = e.shape
    m = np.zeros_like(e); m[int(h * .22):int(h * .78), int(w * .22):int(w * .78)] = 1
    # merkeze hafif çekim: konu çoğunlukla ortada
    yy, xx = np.mgrid[0:h, 0:w]
    e = e * m * (1.15 - 0.35 * np.hypot((xx - w / 2) / w, (yy - h / 2) / h))
    y, x = np.unravel_index(np.argmax(e), e.shape)
    return round(x / w, 3), round(y / h, 3)

def paintbox(im):
    """Tablonun 4:3 karedeki asıl alanı (koyu dolgu şeritleri hariç), 0..1."""
    a = np.asarray(im.convert('RGB').resize((200, 150)), dtype=np.float32)
    pad = np.median(np.concatenate([a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3), a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3)]), axis=0)
    diff = np.linalg.norm(a - pad, axis=2) > 18
    cols = np.where(diff.mean(0) > 0.25)[0]
    rws = np.where(diff.mean(1) > 0.25)[0]
    if not len(cols) or not len(rws): return None
    b = [cols[0] / 200, rws[0] / 150, (cols[-1] + 1) / 200, (rws[-1] + 1) / 150]
    if (b[2] - b[0]) > 0.97 and (b[3] - b[1]) > 0.97: return None
    return [round(x, 3) for x in b]

# Maskesi çıkan ama gözle bakınca nesneyi tanıtmayan siluetler (dağınık leke, kopuk parça, kaybolan bacak): bulanık kipe
# (16 Kasım 2026 denetimi: Sac taş ve ateşle karışıyor, Ud kopuk, Kulplu beygirin bacakları yok, Trilobit delikli oval)
SIL_RED = {'GK-365', 'GK-376', 'GK-459', 'GK-490'}
# Otomatik odak konuyu ıskalayınca elle odak (0..1): ilk kadraj halıya, duvara, sehpaya, boş beyaza düşüyordu (16 Kasım 2026)
ODAK_EL = {'GK-333': (0.70, 0.55), 'GK-372': (0.50, 0.45), 'GK-384': (0.27, 0.40), 'GK-401': (0.50, 0.45),
           'GK-409': (0.48, 0.45), 'GK-410': (0.33, 0.58), 'GK-457': (0.48, 0.58), 'GK-496': (0.30, 0.68)}
rows, switched = [], []
for it in items:
    src = os.path.join(SRC, it['id'] + '.webp')
    shutil.copyfile(src, os.path.join(OUT, it['id'] + '.webp'))
    mode = MODE[it['g']]
    if mode == 'sil':
        mp = os.path.join(mdir, it['id'] + '.m.png')
        if os.path.exists(mp) and it['id'] not in SIL_RED:
            Image.open(mp).convert('L').resize((320, 240), Image.LANCZOS).save(os.path.join(OUT, it['id'] + '.m.png'), optimize=True)
        else:
            mode = 'blur'; switched.append(it['id'] + ' ' + it['dogru'])
    im = Image.open(src).convert('RGB')
    # odak ve tablo kutusu 448×336 ölçeğinde (eşikler o ölçekte ayarlandı; görseller artık gelen çözünürlükte)
    if im.size != (448, 336): im = im.resize((448, 336), Image.LANCZOS)
    w, h = im.size
    row = dict(id='gk-' + it['id'][3:], img=it['id'], cat=CAT[it['konu']], konu=KONU[it['konu']], diff=it['z'], mode=mode, q=it['q'], a=it['a'], b=it['b'])
    if mode in ('zoom', 'detail'): row['f'] = ODAK_EL.get(it['id']) or focus(im)
    if it['konu'].startswith('Tablolar'):
        bx = paintbox(im)
        if bx: row['box'] = bx
    if it['id'] in UYARLAMA: row['uy'] = 1
    rows.append(row)

head = """// ÜRETİLDİ: tools/gozkarari/kur.py (elle düzenleme; P1–P12.md'yi düzenleyip yeniden üret)
// Göz Kararı: görselli sorular. img: dist/gk/<img>.webp (siluette <img>.m.png maske), mode: blur | zoom | sil | detail,
// a[0] doğru şık, b: cevaptan sonra gösterilen tek satır bilgi, f: yakın çekim/ayrıntı odağı (0..1), uy: içeriği
// uyarlanmış tablo (aslına birebir değil), konu: KONULAR dizini.
"""
konular = json.dumps(list(CAT), ensure_ascii=False)
body = ',\n'.join('\t' + json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows)
open(os.path.join(ROOT, 'src', 'data', 'gozkarari.js'), 'w').write(f"{head}export const KONULAR = {konular};\n\nexport default [\n{body},\n];\n")
print(f"{len(rows)} soru yazıldı · dist/gk: {len(glob.glob(os.path.join(OUT, '*.webp')))} görsel, {len(glob.glob(os.path.join(OUT, '*.m.png')))} maske")
print('siluetten bulanığa:', ', '.join(switched) or 'yok')
from collections import Counter
print(Counter(r['mode'] for r in rows), Counter(r['cat'] for r in rows))
