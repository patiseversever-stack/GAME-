"""Meshy karakteri için yüz ifade altyapısı (morph hedefleri + ağız ayrımı + göz kabukları).
Kullanım: build_rig.py <bake_prefix> <lm3d.json> <ortho.png> <cx> <cy> <s> <out_prefix> [--mustache]
"""
import sys, json, numpy as np, trimesh
from scipy.interpolate import RBFInterpolator
from PIL import Image
sys.path.insert(0, "/tmp/claude-0/-home-user-GAME-/499c3370-0338-5c74-89f4-291f8645472f/scratchpad/face")
from lmdefs import *

pre, lmp, ortho, cx, cy, s, out = sys.argv[1], sys.argv[2], sys.argv[3], *map(float, sys.argv[4:7]), sys.argv[7]
P = np.fromfile(pre + ".pos.bin", np.float32).reshape(-1, 3).astype(np.float64)
NRM = np.fromfile(pre + ".nrm.bin", np.float32).reshape(-1, 3)
UV = np.fromfile(pre + ".uv.bin", np.float32).reshape(-1, 2)
TAN = np.fromfile(pre + ".tan.bin", np.float32).reshape(-1, 4)
IDX = np.fromfile(pre + ".idx.bin", np.uint32).reshape(-1, 3).astype(np.int64)
L = np.array(json.load(open(lmp))["pts"])
nv = len(P)

# --- Yüz çerçevesi ---
eR, eL = np.nanmean(L[R_EYE], 0), np.nanmean(L[L_EYE], 0)
O = (eR + eL) / 2; X = (eL - eR); u = np.linalg.norm(X); X /= u
Y = np.array([0, 1.0, 0]); Y -= X * (Y @ X); Y /= np.linalg.norm(Y); Z = np.cross(X, Y)
R = np.stack([X, Y, Z])                        # dünya→yerel
loc = lambda p: (p - O) @ R.T / u              # yerel, u biriminde
wld = lambda d: (d * u) @ R                    # yerel yer değiştirme → dünya
PL = loc(P); LL = loc(L)
print("u", round(u, 4), "çene y", LL[152, 1].round(3), "ağız y", LL[13, 1].round(3))

# Konuma göre birleştirilmiş normal hesabı (UV dikişlerinde süreklilik)
key = np.round(P * 1e6).astype(np.int64)
_, weld = np.unique(key, axis=0, return_inverse=True); weld = weld.ravel()
def vnormals(pos):
    f = pos[IDX]; fn = np.cross(f[:, 1] - f[:, 0], f[:, 2] - f[:, 0])
    acc = np.zeros((weld.max() + 1, 3))
    for k in range(3): np.add.at(acc, weld[IDX[:, k]], fn)
    n = acc[weld]; return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
N0 = vnormals(P)

# --- Bölgeler ---
head = PL[:, 1] > LL[152, 1] - 0.9                           # çenenin biraz altından yukarısı
face_zone = head & (PL[:, 2] > -0.6)

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

OVAL_ANCH = [i for i in OVAL]
EYES_ALL = R_EYE + L_EYE
def rbf_morph(moves, anchors, radius=0.55, falloff=0.22):
    """moves: [(landmark, (dx,dy,dz))] yerel u biriminde. anchors: sabit kalacak noktalar."""
    mi = [m for m, _ in moves]; D = np.array([d for _, d in moves], float)
    ai = [a for a in anchors if a not in mi and not np.isnan(LL[a]).any()]
    C = np.concatenate([LL[mi], LL[ai]]); V = np.concatenate([D, np.zeros((len(ai), 3))])
    f = RBFInterpolator(C, V, kernel="thin_plate_spline", smoothing=1e-4)
    idx = np.nonzero(face_zone)[0]
    q = PL[idx]
    dmin = np.min(np.linalg.norm(q[:, None, :] - LL[mi][None], axis=2), axis=1)
    m = 1 - smooth(radius - falloff, radius, dmin)
    d = f(q) * m[:, None]
    out = np.zeros((nv, 3)); out[idx] = d
    return out

morphs = {}
side = lambda s_: 1 if s_ == "L" else -1        # karakterin solu +x
BR = {"R": ([70, 63, 105, 66, 107], [46, 53, 52, 65, 55]), "L": ([300, 293, 334, 296, 336], [276, 283, 282, 295, 285])}
EU = {"R": R_EYE_UP, "L": L_EYE_UP}; ELo = {"R": R_EYE_LO, "L": L_EYE_LO}
NOSE_FIX = [168, 6, 197, 195, 5, 4, 1, 2]
FORE = [10, 151, 109, 338, 67, 297]
for S_ in "RL":
    up, lo = BR[S_]; sx = side(S_)
    w = [0.25, 0.5, 0.75, 1.0, 1.0]   # dış→iç
    # Kaş çatma (kızgın)
    mv = [(up[k], (-sx * 0.05 * w[k], -0.12 * w[k] - 0.02, 0.01)) for k in range(5)] + [(lo[k], (-sx * 0.05 * w[k], -0.11 * w[k] - 0.02, 0.01)) for k in range(5)]
    morphs[f"browDown{S_}"] = rbf_morph(mv, EU[S_] + ELo[S_] + NOSE_FIX + FORE + OVAL_ANCH + BR["L" if S_ == "R" else "R"][0])
    # Kaşın dışını kaldırma
    w2 = [1.0, 0.85, 0.55, 0.3, 0.15]
    mv = [(up[k], (0, 0.11 * w2[k], 0)) for k in range(5)] + [(lo[k], (0, 0.10 * w2[k], 0)) for k in range(5)]
    morphs[f"browOuterUp{S_}"] = rbf_morph(mv, EU[S_] + ELo[S_] + NOSE_FIX + [10] + OVAL_ANCH)
    # Göz kısma: alt kapak + yanak yukarı
    lid = ELo[S_][2:-2]
    mv = [(i, (0, 0.035, 0.005)) for i in lid]
    cheek = [117, 118, 119, 100, 101] if S_ == "R" else [346, 347, 348, 329, 330]
    mv += [(i, (0, 0.04, 0.01)) for i in cheek]
    morphs[f"eyeSquint{S_}"] = rbf_morph(mv, EU[S_] + NOSE_FIX + OVAL_ANCH + up + [ELo[S_][0], ELo[S_][-1]], radius=0.45)
    # Göz açma: üst kapak yukarı
    mv = [(i, (0, 0.035, 0.0)) for i in EU[S_][2:-2]]
    morphs[f"eyeWide{S_}"] = rbf_morph(mv, ELo[S_] + NOSE_FIX + OVAL_ANCH + [EU[S_][0], EU[S_][-1]], radius=0.4, falloff=0.2)
    # Yanak kaldırma
    ck = [50, 205, 187, 123, 116, 206, 216] if S_ == "R" else [280, 425, 411, 352, 345, 426, 436]
    mv = [(i, (sx * 0.025, 0.07, 0.025)) for i in ck]
    morphs[f"cheekRaise{S_}"] = rbf_morph(mv, NOSE_FIX + OVAL_ANCH + EU[S_] + [13, 14, 0, 17, 152], radius=0.6)
    # Gülümseme: ağız köşesi yukarı/dışarı
    corner = 61 if S_ == "R" else 291
    near_up = [185, 40] if S_ == "R" else [409, 270]; near_lo = [146, 91] if S_ == "R" else [375, 321]
    near_ck = [57, 186, 92] if S_ == "R" else [287, 410, 322]
    mv = [(corner, (sx * 0.08, 0.13, -0.03))] + [(i, (sx * 0.05, 0.08, -0.01)) for i in near_up] + [(i, (sx * 0.05, 0.08, -0.01)) for i in near_lo] + [(i, (sx * 0.05, 0.08, 0.02)) for i in near_ck]
    morphs[f"mouthSmile{S_}"] = rbf_morph(mv, [0, 13, 14, 17, 37 if S_ == "L" else 267, 84 if S_ == "L" else 314, 152] + NOSE_FIX + OVAL_ANCH + EYES_ALL, radius=0.6)
    # Somurtma: köşe aşağı
    mv = [(corner, (sx * 0.02, -0.11, 0.0))] + [(i, (sx * 0.01, -0.06, 0)) for i in near_lo] + [(i, (0, -0.05, 0)) for i in near_ck]
    morphs[f"mouthFrown{S_}"] = rbf_morph(mv, [0, 13, 14, 17, 152] + NOSE_FIX + OVAL_ANCH + EYES_ALL, radius=0.55)
    # Burun kırıştırma
    nw = [98, 129, 64, 102] if S_ == "R" else [327, 358, 294, 331]
    mv = [(i, (sx * 0.005, 0.045, -0.01)) for i in nw] + [(39 if S_ == "R" else 269, (0, 0.03, 0))]
    morphs[f"noseSneer{S_}"] = rbf_morph(mv, [1, 4, 5, 168, 0, 13, 14, 17] + EYES_ALL + OVAL_ANCH, radius=0.45)

# İç kaş kaldırma (üzgün/şaşkın, iki taraf)
mv = []
for S_ in "RL":
    up, lo = BR[S_]; w = [0.1, 0.3, 0.6, 1.0, 1.0]
    mv += [(up[k], (0, 0.12 * w[k], 0)) for k in range(5)] + [(lo[k], (0, 0.11 * w[k], 0)) for k in range(5)]
mv += [(9, (0, 0.05, 0)), (151, (0, 0.03, 0))]
morphs["browInnerUp"] = rbf_morph(mv, R_EYE_UP + L_EYE_UP + R_EYE_LO + L_EYE_LO + NOSE_FIX + [10] + OVAL_ANCH)
# Büzme
mv = [(61, (0.09, 0.0, 0.03)), (291, (-0.09, 0.0, 0.03))] + [(i, (0, 0, 0.06)) for i in [0, 17, 37, 267, 84, 314, 13, 14]]
morphs["mouthPucker"] = rbf_morph(mv, NOSE_FIX + OVAL_ANCH + EYES_ALL + [152], radius=0.55)
# Çene/alt dudak yukarı (dudak bükme)
mv = [(i, (0, 0.035, 0.03)) for i in [17, 84, 314, 181, 405]] + [(152, (0, 0.03, 0.01)), (175, (0, 0.02, 0)), (199, (0, 0.03, 0.02))]
morphs["chinRaise"] = rbf_morph(mv, [0, 13, 37, 267, 61, 291] + NOSE_FIX + OVAL_ANCH + EYES_ALL, radius=0.5)
# Ağzı yana kaydırma
for S_ in "RL":
    sx = side(S_)
    mv = [(i, (sx * 0.07, 0, 0)) for i in [61, 291, 0, 17, 13, 14, 37, 267, 84, 314, 40, 270, 91, 321]]
    morphs[f"mouthShift{S_}"] = rbf_morph(mv, NOSE_FIX + OVAL_ANCH + EYES_ALL, radius=0.5)

# --- Çene (döndürme) ve dudak ayrımı ---
mouthY = (LL[IN_UP, 1] + LL[IN_LO, 1]) / 2; mouthX = LL[IN_UP, 0]
o = np.argsort(mouthX); mx, my = mouthX[o], mouthY[o]
halfw = (LL[291, 0] - LL[61, 0]) / 2; mcx = (LL[291, 0] + LL[61, 0]) / 2
def mouth_line(x):
    y = np.interp(x, mx, my)
    over = np.abs(x - mcx) - halfw                      # köşelerin dışında hafif yukarı kıvrım
    return y + np.clip(over, 0, None) * 0.35
ly = PL[:, 1] - mouth_line(PL[:, 0])
ax = np.abs(PL[:, 0] - mcx) / halfw                     # 0 merkez, 1 köşe
width = 0.004 + np.clip(ax - 0.85, 0, None) * 0.45      # dudakta keskin, yanakta yumuşak geçiş
s_mouth = 1 - smooth(-width, width, ly)                 # çizginin altı → 1
chin_y = LL[152, 1]
f_neck = smooth(chin_y - 0.55, chin_y - 0.05, PL[:, 1])
oval_half = np.abs(LL[234, 0] - LL[454, 0]) / 2
f_side = 1 - smooth(oval_half * 0.62, oval_half * 0.95, np.abs(PL[:, 0] - mcx))
f_z = smooth(-1.5, -1.0, PL[:, 2])
jawW = np.where(head, s_mouth * f_neck * f_side * f_z, 0.0)
# Bıyık/üst dudak koruması: ağız çizgisinin üstündekiler asla hareket etmez
jawW[ly > width] = 0
pivot = np.array([mcx, (LL[2, 1] + LL[13, 1]) / 2 + 0.25, (LL[234, 2] + LL[454, 2]) / 2 - 0.15])
th = np.radians(20)
def rotx(p, a):
    q = p - pivot; c, s2 = np.cos(a), np.sin(a)
    return np.stack([q[:, 0], q[:, 1] * c - q[:, 2] * s2, q[:, 1] * s2 + q[:, 2] * c], 1) + pivot
jaw_d = (rotx(PL, th) - PL) * jawW[:, None]             # +X etrafında: çene aşağı ve geri
morphs["jawOpen"] = jaw_d

# --- Ağız boşluğu üçgenlerini ayır (kopya köşeler) ---
tw = jawW[IDX]; spread = tw.max(1) - tw.min(1)
tri_ax = ax[IDX].mean(1)
tri_ly = ly[IDX].mean(1)
gap_tri = (spread > 0.5) & (tri_ax < 1.15) & (np.abs(tri_ly) < 0.2)
print("ağız boşluğu üçgeni", int(gap_tri.sum()))
gv = np.unique(IDX[gap_tri]); newi = np.arange(nv, nv + len(gv)); mp = dict(zip(gv, newi))
IDX2 = IDX.copy()
for t in np.nonzero(gap_tri)[0]:
    IDX2[t] = [mp[v] for v in IDX[t]]
def ext(a): return np.concatenate([a, a[gv]])
P2, N2, UV2, TAN2 = ext(P), ext(NRM), ext(UV), ext(TAN)
GAP = np.concatenate([np.zeros(nv), np.ones(len(gv))]).astype(np.float32)
JAW = ext(jawW).astype(np.float32)
FX = ext(np.clip((PL[:, 0] - mcx) / halfw, -1.5, 1.5)).astype(np.float32)
morphs = {k: ext(v) for k, v in morphs.items()}

# --- Kafa sözde-kemiği ağırlığı ---
headW = smooth(chin_y - 0.85, chin_y - 0.1, PL[:, 1]) * (1 - smooth(1.6, 2.4, np.abs(PL[:, 0])))
headW = np.where(PL[:, 1] > chin_y - 0.85, headW, 0)
HEADW = ext(headW).astype(np.float32)
neck_pivot = O + wld(np.array([0, chin_y - 0.7, -0.6]))

# --- Morph'ları dünya uzayına çevir, normal farklarını hesapla ---
nv2 = len(P2)
P2w = P2
morph_out = {}
for k, d in morphs.items():
    dw = wld(d)
    weld2 = np.concatenate([weld, weld[gv]])
    # normal farkı: deforme köşeler üzerinden (asıl ağ için)
    nd = vnormals(P + dw[:nv]) - N0
    nd = np.concatenate([nd, nd[gv]])
    nz = np.nonzero(np.abs(dw).sum(1) > 1e-7)[0]
    morph_out[k] = (nz.astype(np.uint32), dw[nz].astype(np.float32), nd[nz].astype(np.float32))
    print(f"{k:16s} köşe {len(nz):5d}  maks {np.abs(dw).max()*1000:.1f} mm")

# --- Göz kabukları ---
mesh = trimesh.Trimesh(P, IDX, process=False)
img = Image.open(ortho).convert("RGB"); IW = img.size[0]
eyes = {}
for S_, up, lo in [("R", R_EYE_UP, R_EYE_LO), ("L", L_EYE_UP, L_EYE_LO)]:
    cu, cl = LL[up], LL[lo]
    xs = np.linspace(min(cu[:, 0].min(), cl[:, 0].min()), max(cu[:, 0].max(), cl[:, 0].max()), 17)
    ou, ol = np.argsort(cu[:, 0]), np.argsort(cl[:, 0])
    yu = np.interp(xs, cu[ou, 0], cu[ou, 1]); yl = np.interp(xs, cl[ol, 0], cl[ol, 1])
    x0, x1 = xs[0] - 0.06, xs[-1] + 0.06; y0, y1 = yl.min() - 0.08, yu.max() + 0.10
    gx, gy = np.meshgrid(np.linspace(x0, x1, 36), np.linspace(y0, y1, 22))
    gl = np.stack([gx.ravel(), gy.ravel(), np.full(gx.size, 3.0)], 1)
    org = O + wld(gl); d = np.tile(-Z, (len(org), 1))
    hit, ir, it = mesh.ray.intersects_location(org, d, multiple_hits=False)
    ok = np.zeros(len(org), bool); ok[ir] = True
    pts = np.zeros((len(org), 3)); pts[ir] = hit; tri = np.zeros(len(org), int); tri[ir] = it
    bc = trimesh.triangles.points_to_barycentric(P[IDX[tri]], pts)
    nrm = (N0[IDX[tri]] * bc[:, :, None]).sum(1); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    shell = pts + nrm * (0.012 * u)
    # kabuk köşelerinin morph ve kafa ağırlığı: isabet üçgeninden aktar
    sm = {}
    for k, (nz, dw, nd) in morph_out.items():
        full = np.zeros((nv2, 3)); full[nz] = dw
        sm[k] = (full[IDX[tri]] * bc[:, :, None]).sum(1).astype(np.float32)
    shw = (headW[IDX[tri]] * bc).sum(1)
    # ızgara üçgenleri (yalnız isabetli köşeler)
    W_, H_ = 36, 22; faces = []
    for j in range(H_ - 1):
        for i in range(W_ - 1):
            a, b, c, e = j * W_ + i, j * W_ + i + 1, (j + 1) * W_ + i, (j + 1) * W_ + i + 1
            if ok[[a, b, c, e]].all(): faces += [[a, c, b], [b, c, e]]
    eyes[S_] = dict(pos=shell.astype(np.float32), nrm=nrm.astype(np.float32), q=gl[:, :2].astype(np.float32), idx=np.array(faces, np.uint32),
                    xs=xs.tolist(), yu=yu.tolist(), yl=yl.tolist(), morph=sm, headW=shw.astype(np.float32))
    print("göz", S_, "kabuk üçgeni", len(faces))

# Göz yaması: ön ortografik görüntüden yerel koordinatlı kırpım
def l2px(xl, yl_):
    w = O + wld(np.array([xl, yl_, 0]))
    return (w[0] - (cx - s / 2)) / s * IW, ((cy + s / 2) - w[1]) / s * IW
xmin = min(eyes["R"]["xs"][0], eyes["L"]["xs"][0]) - 0.15; xmax = max(eyes["R"]["xs"][-1], eyes["L"]["xs"][-1]) + 0.15
ymin = min(min(eyes["R"]["yl"]), min(eyes["L"]["yl"])) - 0.2; ymax = max(max(eyes["R"]["yu"]), max(eyes["L"]["yu"])) + 0.3
pa, pb = l2px(xmin, ymax), l2px(xmax, ymin)
patch = img.crop((int(pa[0]), int(pa[1]), int(pb[0]) + 1, int(pb[1]) + 1))
patch.save(out + "_eyepatch.png")
# kırpımın gerçek yerel sınırları (tam piksel)
def px2l(px, py):
    w = np.array([cx - s / 2 + px / IW * s, cy + s / 2 - py / IW * s, O[2]])
    return loc(w)[:2]
ptl = px2l(int(pa[0]), int(pa[1])); pbr = px2l(int(pb[0]) + 1, int(pb[1]) + 1)

# --- Yaz ---
def wbin(name, arr): np.ascontiguousarray(arr).tofile(f"{out}.{name}.bin")
for nm, arr in [("pos", P2.astype(np.float32)), ("nrm", N2.astype(np.float32)), ("uv", UV2.astype(np.float32)), ("tan", TAN2.astype(np.float32)),
                ("idx", IDX2.astype(np.uint32)), ("gap", GAP), ("jaw", JAW), ("fx", FX), ("headw", HEADW)]:
    wbin(nm, arr)
meta = {"verts": int(nv2), "tris": int(len(IDX2)), "u": float(u), "origin": O.tolist(), "axes": R.tolist(),
        "neckPivot": neck_pivot.tolist(), "morphs": [], "eyes": {}, "eyePatch": {"tl": ptl.tolist(), "br": pbr.tolist()}}
for k, (nz, dw, nd) in morph_out.items():
    wbin(f"m_{k}_i", nz); wbin(f"m_{k}_p", dw); wbin(f"m_{k}_n", nd); meta["morphs"].append({"name": k, "n": int(len(nz))})
for S_, e in eyes.items():
    for nm in ["pos", "nrm", "q", "idx", "headW"]: wbin(f"eye{S_}_{nm}", e[nm])
    for k, v in e["morph"].items(): wbin(f"eye{S_}_m_{k}", v)
    meta["eyes"][S_] = {"n": int(len(e["pos"])), "tris": int(len(e["idx"])), "xs": e["xs"], "yu": e["yu"], "yl": e["yl"]}
json.dump(meta, open(out + ".json", "w"), indent=1)
print("yazıldı", out)
