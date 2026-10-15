"""2B yüz noktalarını (ön ortografik görüntü) optimize modelin yüzeyine izdüşür, yüz çerçevesini hesapla.
Kullanım: landmarks3d.py lm2d.json prefix(bake) cx cy s out.json"""
import sys, json, numpy as np, trimesh
sys.path.insert(0, sys.path[0])
lm2d, pre, cx, cy, s, out = sys.argv[1], sys.argv[2], *map(float, sys.argv[3:6]), sys.argv[6]
P = np.fromfile(pre + ".pos.bin", np.float32).reshape(-1, 3).astype(np.float64)
I = np.fromfile(pre + ".idx.bin", np.uint32).reshape(-1, 3)
mesh = trimesh.Trimesh(P, I, process=False)
L = np.array(json.load(open(lm2d)))
x = cx + (L[:, 0] - 0.5) * s; y = cy + (0.5 - L[:, 1]) * s
org = np.stack([x, y, np.full_like(x, 2.0)], 1); d = np.tile([0, 0, -1.0], (len(x), 1))
loc, ir, it = mesh.ray.intersects_location(org, d, multiple_hits=False)
pts = np.full((len(x), 3), np.nan); pts[ir] = loc
print("isabet", len(ir), "/", len(x))
json.dump({"pts": pts.tolist()}, open(out, "w"))
