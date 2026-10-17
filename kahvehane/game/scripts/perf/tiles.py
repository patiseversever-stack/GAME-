#!/usr/bin/env python3
# Eksik karo yoklaması (probe.mjs çıktısı): masanın orta bandında çıplak .ar zemin rengine (#070b2e) eşit piksel oranı. Normal
# karede orada hep aydınlık keçe/hüzmeler vardır; karo bütçesi aşılınca eksik karolar bu renkte çizilir (ekran "kararır").
# Kullanım: python3 scripts/perf/tiles.py <probeKlasörü> [eşik=0.04]   (numpy + Pillow). Eksik karolu kare varsa çıkış kodu 1.
import json, sys, os
import numpy as np
from PIL import Image
run = sys.argv[1]
thr = float(sys.argv[2]) if len(sys.argv) > 2 else 0.04
d = json.load(open(os.path.join(run, 'data.json')))
bg = np.array([7, 11, 46], dtype=np.float32)
out = []
start = min([(e[0] - d['t0']) / 1000 for e in d['ev'] if e[1] == 'anim' and (e[2] in ('ar__ring', 'ar__tint') or e[2].startswith('bl-'))] or [0]) + 0.5
for ts, name in d['frameIdx']:
    t = (ts - d['t0']) / 1000
    a = np.asarray(Image.open(os.path.join(run, 'frames', name)).convert('RGB').resize((103, 229)), dtype=np.float32)
    dist = np.abs(a - bg).max(axis=2)
    flat = dist < 9
    h = a.shape[0]
    mid = flat[int(h * .3):int(h * .7)].mean()
    full = flat.mean()
    out.append((t, name, float(mid), float(full)))
bad = [o for o in out if o[2] > thr and o[0] >= start]
print(f'{run}: frames {len(out)} (in-game from {start:.1f}s: {sum(1 for o in out if o[0] >= start)}), missing-tile frames (mid-band bare bg > {thr:.0%}): {len(bad)}')
for o in bad[:40]:
    print(f'  {o[0]:7.2f} {o[1]} mid {o[2]:.2f} full {o[3]:.2f}')
json.dump(out, open(os.path.join(run, 'tiles.json'), 'w'))
sys.exit(1 if bad else 0)
