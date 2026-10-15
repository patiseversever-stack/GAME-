"""Yüz öncelikli doku haritası + yüksek detaylı modelden renk/normal aktarımı (bake).
Kullanım: bake.py hi.glb lo.glb out_prefix --size 2048 --ycut 0.63 --head 0.45 --legy -0.05 --legscale 0.6
Çıktı: out_prefix.npz (pos, nrm, uv, tan, idx) + out_prefix_color.png + out_prefix_normal.png
"""
import argparse, numpy as np, trimesh, xatlas, time
from PIL import Image, ImageDraw
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("hi"); ap.add_argument("lo"); ap.add_argument("out")
ap.add_argument("--size", type=int, default=2048); ap.add_argument("--ycut", type=float, default=0.63)
ap.add_argument("--head", type=float, default=0.45); ap.add_argument("--legy", type=float, default=-0.05)
ap.add_argument("--legscale", type=float, default=0.6); ap.add_argument("--xh", type=float, default=0.43); ap.add_argument("--hy", type=float, default=0.25); ap.add_argument("--handscale", type=float, default=1.6); ap.add_argument("--pad", type=int, default=4)
a = ap.parse_args(); t0 = time.time()
def log(*m): print(f"[{time.time()-t0:6.1f}s]", *m, flush=True)

def unit(v): return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)

def tangents(V, F, UV, N):
    """glTF uyumlu köşe tanjantı: T = +u yönü, B = cross(N,T)*w = -v yönü (doku 'yukarı')."""
    v0, v1, v2 = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    w0, w1, w2 = UV[F[:, 0]], UV[F[:, 1]], UV[F[:, 2]]
    e1, e2, d1, d2 = v1 - v0, v2 - v0, w1 - w0, w2 - w0
    det = d1[:, 0] * d2[:, 1] - d2[:, 0] * d1[:, 1]
    r = np.where(np.abs(det) > 1e-14, 1.0 / np.where(det == 0, 1, det), 0.0)[:, None]
    sdir = (e1 * d2[:, 1:2] - e2 * d1[:, 1:2]) * r   # dP/du
    tdir = (e2 * d1[:, 0:1] - e1 * d2[:, 0:1]) * r   # dP/dv
    S = np.zeros_like(V); Tt = np.zeros_like(V)
    for k in range(3):
        np.add.at(S, F[:, k], sdir); np.add.at(Tt, F[:, k], tdir)
    T = unit(S - N * np.sum(N * S, -1, keepdims=True))
    w = np.where(np.sum(np.cross(N, T) * (-Tt), -1) < 0, -1.0, 1.0)
    return T, w

def load(path):
    m = trimesh.load(path, process=False, force="mesh")
    return m

hi = load(a.hi); lo = load(a.lo)
log("hi", len(hi.faces), "lo", len(lo.faces))
hV, hF = np.asarray(hi.vertices, np.float64), np.asarray(hi.faces)
hN = unit(np.asarray(hi.vertex_normals, np.float64)); hUV = np.asarray(hi.visual.uv, np.float64).copy(); hUV[:, 1] = 1.0 - hUV[:, 1]  # trimesh v eksenini çevirir; glTF düzenine geri dön
mat = hi.visual.material
col_img = np.asarray(mat.baseColorTexture.convert("RGB"), np.float32)
nrm_img = np.asarray(mat.normalTexture.convert("RGB"), np.float32) if getattr(mat, "normalTexture", None) is not None else None
hT, hW = tangents(hV, hF, hUV, hN)
log("hi tanjant hazır; doku", col_img.shape, None if nrm_img is None else nrm_img.shape)

lV, lF = np.asarray(lo.vertices, np.float64), np.asarray(lo.faces)
lN = unit(np.asarray(lo.vertex_normals, np.float64))
cen = lV[lF].mean(1); cy = cen[:, 1]
m_head = cy > a.ycut; m_hand = ~m_head & (np.abs(cen[:, 0]) > a.xh) & (cy < a.hy)
m_leg = ~m_head & ~m_hand & (cy < a.legy); m_rest = ~m_head & ~m_hand & ~m_leg
regions = [("kafa", m_head, None), ("el", m_hand, a.handscale), ("bacak", m_leg, a.legscale), ("govde", m_rest, 1.0)]
area = lambda F: trimesh.triangles.area(lV[F]).sum()
A_head = area(lF[regions[0][1]]); A_rest = area(lF[m_rest]) + area(lF[m_leg]) * a.legscale ** 2 + area(lF[m_hand]) * a.handscale ** 2
k_head = np.sqrt(a.head / (1 - a.head) * A_rest / A_head)
log(f"kafa ölçeği {k_head:.2f}")

atlas = xatlas.Atlas(); subs = []
for name, mask, sc in regions:
    F = lF[mask]; used, inv = np.unique(F, return_inverse=True)
    s = k_head if sc is None else sc
    atlas.add_mesh((lV[used] * s).astype(np.float32), inv.reshape(-1, 3).astype(np.uint32), lN[used].astype(np.float32))
    subs.append(used)
co = xatlas.ChartOptions(); po = xatlas.PackOptions()
po.resolution = a.size; po.padding = a.pad; po.bilinear = True; po.bruteForce = False
atlas.generate(co, po)
log("atlas", atlas.width, atlas.height, "chart", atlas.chart_count)
scale = a.size / max(atlas.width, atlas.height)
P, N, UV, I = [], [], [], []; base = 0
for mi, used in enumerate(subs):
    vmap, ind, uvs = atlas[mi]
    src = used[vmap]
    P.append(lV[src]); N.append(lN[src])
    UV.append(uvs * np.array([atlas.width, atlas.height]) * scale / a.size)  # 0..1, glTF (v aşağı)
    I.append(ind + base); base += len(vmap)
P, N, UV, I = np.concatenate(P), np.concatenate(N), np.concatenate(UV), np.concatenate(I).astype(np.int64)
T, W = tangents(P, I, UV, N)
log("yeni köşe", len(P), "üçgen", len(I))

# Doku piksellerini üçgenlere ata (ID haritası)
S = a.size
idimg = Image.new("I", (S, S), 0); dr = ImageDraw.Draw(idimg)
px = UV * S
for t in range(len(I)):
    dr.polygon([tuple(px[I[t, 0]]), tuple(px[I[t, 1]]), tuple(px[I[t, 2]])], fill=t + 1)
ids = np.asarray(idimg, np.int64) - 1
ys, xs = np.nonzero(ids >= 0); tri = ids[ys, xs]
log("dolu piksel", len(tri))
c = np.stack([xs + 0.5, ys + 0.5], 1)
a0, a1, a2 = px[I[tri, 0]], px[I[tri, 1]], px[I[tri, 2]]
v0, v1, v2 = a1 - a0, a2 - a0, c - a0
d00 = (v0 * v0).sum(1); d01 = (v0 * v1).sum(1); d11 = (v1 * v1).sum(1); d20 = (v2 * v0).sum(1); d21 = (v2 * v1).sum(1)
den = d00 * d11 - d01 * d01; den = np.where(np.abs(den) < 1e-12, 1e-12, den)
bv = (d11 * d20 - d01 * d21) / den; bw = (d00 * d21 - d01 * d20) / den; bu = 1 - bv - bw
B = np.stack([bu, bv, bw], 1)
def interp(arr): return (arr[I[tri]] * B[:, :, None]).sum(1)
Pl = interp(P); Nl = unit(interp(N)); Tl = unit(interp(T)); Tl = unit(Tl - Nl * (Tl * Nl).sum(1, keepdims=True))
Wl = W[I[tri, 0]][:, None]; Bl = np.cross(Nl, Tl) * Wl

# Yüksek detaylı yüzeye ışın: P + N*kafes'ten -N yönünde, P'ye en yakın isabet
cage = np.where(Pl[:, 1] > a.ycut, 0.006, 0.014)[:, None]
ray = hi.ray
org = Pl + Nl * cage
loc, ir, it = ray.intersects_location(org, -Nl, multiple_hits=True)
dist = np.linalg.norm(loc - Pl[ir], axis=1)
# Ters yüzlü (yanlış yüzey) isabetleri cezalandır: yüksek modelin üçgen normali düşük modelin normaliyle uyuşmalı
agree = (hi.face_normals[it] * Nl[ir]).sum(1)
dist = dist + np.where(agree > 0.25, 0.0, 1.0)
order = np.lexsort((dist, ir)); ir_s, it_s, loc_s, dist_s = ir[order], it[order], loc[order], dist[order]
first = np.ones(len(ir_s), bool); first[1:] = ir_s[1:] != ir_s[:-1]
hit_tri = np.full(len(Pl), -1); hit_loc = np.zeros_like(Pl); hit_d = np.full(len(Pl), np.inf)
hit_tri[ir_s[first]] = it_s[first]; hit_loc[ir_s[first]] = loc_s[first]; hit_d[ir_s[first]] = dist_s[first]
bad = (hit_tri < 0) | (hit_d > cage[:, 0] * 3)  # (cezalı isabetler de ıska sayılır)
log("ışın isabeti", (~bad).sum(), "ıska", bad.sum())
if bad.any():
    cp, dd, tid = trimesh.proximity.closest_point(hi, Pl[bad])
    hit_tri[bad] = tid; hit_loc[bad] = cp
hb = trimesh.triangles.points_to_barycentric(hV[hF[hit_tri]], hit_loc)
hb = np.clip(hb, 0, 1); hb /= hb.sum(1, keepdims=True)
def hinterp(arr): return (arr[hF[hit_tri]] * hb[:, :, None]).sum(1)
huv = hinterp(hUV)

def sample(img, uv):
    H, Wd = img.shape[:2]
    x = np.clip(uv[:, 0] * Wd - 0.5, 0, Wd - 1.001); y = np.clip(uv[:, 1] * H - 0.5, 0, H - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int); fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)

out_c = np.zeros((S, S, 3), np.float32); out_c[ys, xs] = sample(col_img, huv)
if nrm_img is not None:
    nts = sample(nrm_img, huv) / 255.0 * 2 - 1
    Nh = unit(hinterp(hN)); Th = unit(hinterp(hT)); Th = unit(Th - Nh * (Th * Nh).sum(1, keepdims=True))
    Bh = np.cross(Nh, Th) * hW[hF[hit_tri, 0]][:, None]
    nw = unit(Th * nts[:, 0:1] + Bh * nts[:, 1:2] + Nh * nts[:, 2:3])
else:
    nw = unit(hinterp(hN))
enc = np.stack([(nw * Tl).sum(1), (nw * Bl).sum(1), (nw * Nl).sum(1)], 1)
enc = unit(enc); enc[:, 2] = np.maximum(enc[:, 2], 0.05); enc = unit(enc)
out_n = np.zeros((S, S, 3), np.float32); out_n[..., 2] = 1.0; out_n[ys, xs] = enc

# Kenar dolgusu: boş pikselleri en yakın dolu pikselle doldur
mask = ids >= 0
_, (iy, ix) = ndimage.distance_transform_edt(~mask, return_indices=True)
out_c = out_c[iy, ix]; out_n = out_n[iy, ix]
Image.fromarray(np.clip(out_c, 0, 255).astype(np.uint8)).save(a.out + "_color.png")
Image.fromarray(np.clip((out_n * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8)).save(a.out + "_normal.png")
import json
for k, arr in [("pos", P.astype(np.float32)), ("nrm", N.astype(np.float32)), ("uv", UV.astype(np.float32)),
               ("tan", np.concatenate([T, W[:, None]], 1).astype(np.float32)), ("idx", I.astype(np.uint32))]:
    arr.tofile(a.out + "." + k + ".bin")
json.dump({"verts": int(len(P)), "tris": int(len(I))}, open(a.out + ".json", "w"))
log("bitti")
