# Göz Kararı kurulumu: python3 -I kur.py <görsel_klasörü>
#   1. P1–P6.md'den 310 soruyu okur (denetle.py ile aynı düzen)
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

RX = re.compile(r'^### (GK-\d{3}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M | re.S)
items = []
for f in sorted(glob.glob(os.path.join(HERE, 'P[1-6].md'))):
    for m in RX.finditer(open(f).read()):
        gid, konu, us, z, g, cmd, q, s, b = m.groups()
        opts = [x.strip() for x in s.split('·')]
        right = [o.replace('✅', '').strip() for o in opts if '✅' in o][0]
        rest = [o.replace('✅', '').strip() for o in opts if '✅' not in o]
        items.append(dict(id=gid, konu=konu.strip(), us=us.strip(), z=int(z), g=g.strip(), q=q.strip(), a=[right] + rest, b=b.strip(), dogru=right))
assert len(items) == 310, len(items)

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

rows, switched = [], []
for it in items:
    src = os.path.join(SRC, it['id'] + '.webp')
    shutil.copyfile(src, os.path.join(OUT, it['id'] + '.webp'))
    mode = MODE[it['g']]
    if mode == 'sil':
        mp = os.path.join(mdir, it['id'] + '.m.png')
        if os.path.exists(mp):
            Image.open(mp).convert('L').resize((320, 240), Image.LANCZOS).save(os.path.join(OUT, it['id'] + '.m.png'), optimize=True)
        else:
            mode = 'blur'; switched.append(it['id'] + ' ' + it['dogru'])
    im = Image.open(src).convert('RGB')
    w, h = im.size
    row = dict(id='gk-' + it['id'][3:], img=it['id'], cat=CAT[it['konu']], konu=KONU[it['konu']], diff=it['z'], mode=mode, q=it['q'], a=it['a'], b=it['b'])
    if mode in ('zoom', 'detail'): row['f'] = focus(im)
    if it['konu'] == 'Tablolar':
        bx = paintbox(im)
        if bx: row['box'] = bx
    if it['id'] in UYARLAMA: row['uy'] = 1
    rows.append(row)

head = """// ÜRETİLDİ: tools/gozkarari/kur.py (elle düzenleme; P1–P6.md'yi düzenleyip yeniden üret)
// Göz Kararı: 310 görselli soru. img: dist/gk/<img>.webp (siluette <img>.m.png maske), mode: blur | zoom | sil | detail,
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
