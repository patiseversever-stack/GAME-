# Tarihi dokular (tamamen prosedürel; fotoğraf yok): eski kâğıt, papirüs, parşömen, gazete kâğıdı, kurşun metal.
# python3 scripts/textures.py  →  remotion/public/tex/*.jpg
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'remotion', 'public', 'tex')
os.makedirs(OUT, exist_ok=True)
W, H = 1620, 2880
rng = np.random.default_rng(1928)


def noise(w, h, cell, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    g = r.random((max(2, int(h / cell) + 2), max(2, int(w / cell) + 2)))
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im).astype(np.float32) / 255.0


def fbm(w, h, base=400, octaves=6, pers=0.55, seed=0):
    tot = np.zeros((h, w), np.float32); amp = 1.0; cell = base; norm = 0
    for o in range(octaves):
        tot += amp * noise(w, h, cell, seed + o); norm += amp
        amp *= pers; cell = max(1.5, cell / 2)
    return tot / norm


def streaks(w, h, sx, sy, seed):
    # yönlü lif: bir eksende uzun, diğerinde kısa hücreli gürültü
    r = np.random.default_rng(seed)
    g = r.random((max(2, int(h / sy)), max(2, int(w / sx))))
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32) / 255.0


def edge_burn(w, h, strength=0.55, power=2.6):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = np.abs(x / (w - 1) * 2 - 1); dy = np.abs(y / (h - 1) * 2 - 1)
    d = np.maximum(dx ** power, dy ** power) ** (1 / power)
    return np.clip((d - 0.62) / 0.38, 0, 1) ** 1.6 * strength


def colorize(t, dark, light):
    dark = np.array(dark, np.float32); light = np.array(light, np.float32)
    return dark[None, None, :] * (1 - t[..., None]) + light[None, None, :] * t[..., None]


def fibers(img, n, color, alpha, length=(6, 40), width=1, seed=3, horizontal_bias=0.0):
    r = np.random.default_rng(seed)
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for _ in range(n):
        x, y = r.random() * img.size[0], r.random() * img.size[1]
        L = r.uniform(*length)
        a = r.normal(0, 1.2) if horizontal_bias == 0 else r.normal(0, 0.15)
        d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=color + (int(alpha * r.uniform(0.4, 1) * 255),), width=width)
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')


def spots(img, n, color, rmin, rmax, alpha, seed=5):
    r = np.random.default_rng(seed)
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for _ in range(n):
        x, y = r.random() * img.size[0], r.random() * img.size[1]; rad = r.uniform(rmin, rmax)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=color + (int(alpha * r.uniform(0.3, 1) * 255),))
    ov = ov.filter(ImageFilter.GaussianBlur(rmax * 0.35))
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')


def save(arr_or_img, name, q=88):
    im = arr_or_img if isinstance(arr_or_img, Image.Image) else Image.fromarray(np.clip(arr_or_img, 0, 255).astype(np.uint8))
    im.save(os.path.join(OUT, name), quality=q, optimize=True, progressive=True)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


# ---- Eski kâğıt (gazete ve mühür arka yüzü) ----------------------------------------------------
t = fbm(W, H, 520, 6, 0.55, 10) * 0.55 + fbm(W, H, 60, 4, 0.5, 20) * 0.45
base = colorize(np.clip((t - 0.25) * 1.6, 0, 1), (196, 170, 124), (240, 227, 198))
base *= (1 - edge_burn(W, H, 0.5))[..., None]
img = fibers(Image.fromarray(base.astype(np.uint8)), 9000, (120, 95, 60), 0.18, seed=7)
img = fibers(img, 5000, (255, 250, 235), 0.22, seed=8)
img = spots(img, 90, (130, 90, 45), 2, 9, 0.35, seed=9)    # küflenme lekeleri
img = spots(img, 8, (150, 110, 60), 40, 140, 0.10, seed=10)  # su lekeleri
save(img, 'kagit-eski.jpg')

# ---- Gazete kâğıdı (daha açık, ince lifli) -----------------------------------------------------------
t = fbm(W, H, 300, 5, 0.5, 30) * 0.4 + fbm(W, H, 18, 3, 0.5, 40) * 0.6
base = colorize(np.clip((t - 0.2) * 1.5, 0, 1), (208, 198, 176), (241, 235, 220))
base *= (1 - edge_burn(W, H, 0.28))[..., None]
img = fibers(Image.fromarray(base.astype(np.uint8)), 14000, (110, 100, 85), 0.12, length=(4, 18), seed=11)
save(img, 'gazete-kagidi.jpg')

# ---- Papirüs (çapraz sazlık şeritleri) ---------------------------------------------------------------
hl = streaks(W, H, 1400, 2.2, 50) * 0.45 + streaks(W, H, 420, 1.1, 51) * 0.55  # yatay lifler
vl = streaks(W, H, 3, 900, 52) * 0.5 + streaks(W, H, 1.4, 260, 53) * 0.5     # dikey (arka katman)
strip_h = rng.integers(70, 130, 60); ys = np.cumsum(strip_h); band = np.zeros(H, np.float32)
for y0 in ys:
    if y0 < H:
        band[max(0, int(y0) - 3):int(y0) + 3] += 1
band = np.convolve(band, np.ones(7) / 7, mode='same')
strip_w = rng.integers(90, 170, 40); xs = np.cumsum(strip_w); vband = np.zeros(W, np.float32)
for x0 in xs:
    if x0 < W:
        vband[max(0, int(x0) - 3):int(x0) + 3] += 1
vband = np.convolve(vband, np.ones(7) / 7, mode='same')
# lifleri hafifçe dalgalandır (el yapımı sazlık şeritleri düz değildir)
warp = (fbm(W, H, 420, 3, 0.5, 56) - 0.5) * 26
yy = np.clip((np.arange(H)[:, None] + warp).astype(int), 0, H - 1)
hl = np.take_along_axis(hl, yy, axis=0)
t = 0.5 * hl + 0.12 * vl + 0.38 * fbm(W, H, 240, 5, 0.55, 54)
t = t - 0.16 * np.take(band, yy) - 0.07 * vband[None, :]
col = colorize(np.clip((t - 0.1) * 1.55, 0, 1), (150, 110, 55), (236, 205, 140))
col *= (1 - edge_burn(W, H, 0.6, 3.0))[..., None]
img = spots(Image.fromarray(col.astype(np.uint8)), 50, (95, 65, 30), 3, 12, 0.3, seed=55)
save(img, 'papirus.jpg')

# ---- Parşömen (deri: lekeli, damarlı, sıcak) --------------------------------------------------------
t = fbm(W, H, 700, 6, 0.6, 60)
veins = 1 - np.abs(fbm(W, H, 260, 5, 0.5, 61) * 2 - 1)
veins = np.clip((veins - 0.82) / 0.18, 0, 1) ** 2
t2 = np.clip((t - 0.28) * 1.7, 0, 1) - 0.18 * veins
col = colorize(np.clip(t2, 0, 1), (178, 138, 88), (243, 222, 180))
col *= (1 - edge_burn(W, H, 0.62, 2.2))[..., None]
img = spots(Image.fromarray(col.astype(np.uint8)), 14, (140, 95, 50), 60, 220, 0.12, seed=62)
img = fibers(img, 3000, (255, 245, 220), 0.12, length=(10, 60), seed=63)
save(img, 'parsomen.jpg')

# ---- Kurşun / pirinç metal (dizgi harfleri, pres) — küçük döşeme ----------------------------------------
w = h = 512
t = streaks(w, h, 200, 1.2, 70) * 0.7 + fbm(w, h, 64, 4, 0.5, 71) * 0.3
save(colorize(np.clip((t - 0.2) * 1.4, 0, 1), (70, 72, 78), (170, 174, 182)), 'kursun.jpg', 90)
t = streaks(w, h, 3, 220, 72) * 0.6 + fbm(w, h, 80, 4, 0.5, 73) * 0.4
save(colorize(np.clip((t - 0.2) * 1.4, 0, 1), (60, 36, 20), (120, 78, 44)), 'ahsap.jpg', 90)
