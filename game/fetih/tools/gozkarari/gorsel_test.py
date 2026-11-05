# Göz Kararı görsel testi: python3 -I gorsel_test.py <görsel_klasörü> <items.json> [maske_çıkış_klasörü]
#  - 310 dosya var mı, açılıyor mu, 4:3 mü, boyut 12–24 KB arası mı
#  - boş/tek renk görsel (düşük ayrıntı) var mı
#  - birbirine çok benzeyen çift (algısal özet, dHash 64 bit, Hamming ≤ 6) var mı
#  - kenar yazısı/imza izi şüphesi: köşelerde yoğun ince kontrast (yalnız uyarı)
#  - siluet kipindeki görsellerde zemin ayrılabiliyor mu → maske (PNG, alfa) üretir; ayrılamayanları bildirir
import sys, os, json, itertools
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

D, J = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else None
items = json.load(open(J))
err, warn = [], []
H = {}
for it in items:
    p = os.path.join(D, it['id'] + '.webp')
    if not os.path.exists(p):
        err.append(f"{it['id']}: dosya yok"); continue
    sz = os.path.getsize(p)
    try:
        im = Image.open(p); im.load(); im = im.convert('RGB')
    except Exception as e:
        err.append(f"{it['id']}: açılmıyor ({e})"); continue
    w, h = im.size
    if abs(w / h - 4 / 3) > 0.01: err.append(f"{it['id']}: oran {w}x{h}")
    if not 12000 <= sz <= 24000: warn.append(f"{it['id']}: boyut {sz} B")
    a = np.asarray(im.convert('L'), dtype=np.float32)
    if a.std() < 12: err.append(f"{it['id']}: neredeyse boş (std {a.std():.1f})")
    g = np.asarray(im.convert('L').resize((9, 8), Image.LANCZOS), dtype=np.int16)
    H[it['id']] = (g[:, 1:] > g[:, :-1]).flatten()
    # köşe yazısı şüphesi: alt köşelerde ince yüksek frekanslı kontrast (imza)
    e = np.asarray(im.convert('L').filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    cw, ch = w // 6, h // 7
    for nm, blk in (('sol alt', e[-ch:, :cw]), ('sağ alt', e[-ch:, -cw:])):
        if blk.mean() > 2.6 * max(e.mean(), 1) and blk.mean() > 40: warn.append(f"{it['id']}: {nm} köşede yoğun çizgi (imza?)")
# benzer çiftler
ids = list(H)
for a, b in itertools.combinations(ids, 2):
    d = int((H[a] != H[b]).sum())
    if d <= 6: warn.append(f"{a} ~ {b}: çok benzer (dHash fark {d})")

# siluet maskeleri
bad_sil = []
if OUT:
    os.makedirs(OUT, exist_ok=True)
    for it in items:
        if it['g'] != 'siluet': continue
        im = Image.open(os.path.join(D, it['id'] + '.webp')).convert('RGB')
        sm = np.asarray(im.filter(ImageFilter.GaussianBlur(2.2)), dtype=np.float32)
        hh, ww, _ = sm.shape
        bd = np.concatenate([sm[0], sm[-1], sm[:, 0], sm[:, -1]])
        bg = np.median(bd, axis=0)
        spread = np.percentile(np.linalg.norm(bd - bg, axis=1), 90)
        dist = np.linalg.norm(sm - bg, axis=2)
        thr = max(26, spread * 1.8 + 10)
        cand = dist < thr
        lab, n = nd.label(cand)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bgm = np.isin(lab, list(edge))
        # iç boşluklar (makas sapı, çapa halkası): zemine çok yakın ve yeterince büyük bölgeler de zemin
        tight = dist < thr * 0.6
        lab2, n2 = nd.label(tight & ~bgm)
        if n2:
            areas = nd.sum(np.ones_like(dist), lab2, range(1, n2 + 1))
            for k, ar in enumerate(areas, 1):
                if ar > ww * hh * 0.004: bgm |= lab2 == k
        fg = ~bgm
        fg = nd.binary_opening(fg, iterations=1)
        lab3, n3 = nd.label(fg)
        if n3:
            areas = nd.sum(np.ones_like(dist), lab3, range(1, n3 + 1))
            keep = [k + 1 for k, ar in enumerate(areas) if ar >= max(areas.max() * 0.04, 60)]
            fg = np.isin(lab3, keep)
        # ince kıl çatlakları / küçük delikler (dikiş makinesi, teleskop): küçük iç boşlukları doldur
        holes = nd.binary_fill_holes(fg) & ~fg
        lab4, n4 = nd.label(holes)
        if n4:
            areas = nd.sum(np.ones_like(dist), lab4, range(1, n4 + 1))
            for k, ar in enumerate(areas, 1):
                if ar < ww * hh * 0.003: fg |= lab4 == k
        cover = fg.mean()
        # pürüz: kenar uzunluğu / yumuşatılmış maskenin kenar uzunluğu — dokulu zeminden taşan lekeli maske 1.65'i aşar
        P = lambda f: (f ^ nd.binary_erosion(f)).sum()
        rough = P(fg) / max(P(nd.binary_opening(nd.binary_closing(fg, iterations=3), iterations=3)), 1)
        # zemin sınırı dokunuşu: nesne kareyi kenardan kenara kaplıyorsa siluet okunmaz
        touch = np.mean([fg[0].mean(), fg[-1].mean(), fg[:, 0].mean(), fg[:, -1].mean()])
        ok = 0.04 < cover < 0.62 and touch < 0.12 and spread < 40 and rough < 1.65
        why = f"kaplama %{cover*100:.0f}, kenar %{touch*100:.0f}, zemin dağınıklığı {spread:.0f}, pürüz {rough:.2f}"
        if not ok: bad_sil.append(f"{it['id']} {it['dogru']}: siluet çıkmıyor ({why})")
        alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        alpha.save(os.path.join(OUT, it['id'] + ('.m.png' if ok else '.x.png')), optimize=True)

print(f"{len(items)} görsel denetlendi · {len(err)} hata · {len(warn)} uyarı · siluet: {sum(1 for i in items if i['g']=='siluet') - len(bad_sil)} temiz, {len(bad_sil)} çıkmıyor")
for x in err: print('HATA ', x)
for x in warn: print('UYARI', x)
for x in bad_sil: print('SİLUET', x)
sys.exit(1 if err else 0)
