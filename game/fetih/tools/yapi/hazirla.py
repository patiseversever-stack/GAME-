# Kazı Kazan ve Gölge Oyunu: 100 yapı görselini oyuna hazırlar (beyaz zemini saydam yap, kırp, küçült, WebP).
# Kullanım: python3 -I tools/yapi/hazirla.py <girdi klasörü> <çıktı klasörü>
# Girdi: NN_ad.webp ya da NN_ad.png (1024x1024, dış zemin beyaz). Çıktı: NN.webp (RGBA, en uzun kenar 600).
# Zemin: kenardan taşan "beyaza yakın" bölge (sel doldurma); kapalı kalan saf beyaz boşluklar (aralık, kemer içi) da saydam.
# Kenar: 0,8 px yumuşatma ve beyaz hale temizliği (yarı saydam pikselin rengi beyazdan arındırılır).
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
MAX = 600
tot = 0
for f in sorted(os.listdir(src)):
    p = os.path.join(src, f)
    if not os.path.getsize(p):
        print('BOŞ', f); continue
    no = f.split('_')[0]
    im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    mn = im.min(2); mx = im.max(2)
    bgish = (mn >= 238) & (mx - mn <= 14)
    lab, n = nd.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # kapalı boşluklar: daha sıkı eşik (saf beyaz, en az 60 px)
    pure = (mn >= 249) & (mx - mn <= 5) & ~bg
    lab2, n2 = nd.label(pure)
    if n2:
        sz = nd.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
        big = np.nonzero(sz >= 60)[0] + 1
        bg |= np.isin(lab2, big)
    soft = nd.gaussian_filter(bg.astype(np.float32), 0.8)
    a = np.clip(1 - soft * 1.15, 0, 1)
    a[bg] = 0
    a[a < 0.04] = 0
    # beyaz hale temizliği
    aa = np.maximum(a, 1e-3)[..., None]
    col = np.clip((im - (1 - aa) * 255) / aa, 0, 255)
    col = np.where(a[..., None] > 0.995, im, col)
    ys, xs = np.nonzero(a > 0.05)
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(1024, ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(1024, xs.max() + pad + 1)
    rgba = np.dstack([col, a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    o = Image.fromarray(rgba, 'RGBA')
    k = MAX / max(o.size)
    if k < 1: o = o.resize((round(o.size[0] * k), round(o.size[1] * k)), Image.LANCZOS)
    dst = os.path.join(out, f'{no}.webp')
    o.save(dst, 'WEBP', quality=72, alpha_quality=60, method=6)
    tot += os.path.getsize(dst)
    print(no, o.size, os.path.getsize(dst))
print('toplam', tot)
