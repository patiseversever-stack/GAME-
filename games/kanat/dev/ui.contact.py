# Builds labelled UI contact sheets (≤ 1.5 MB JPEG each) from dev/ui.shots.mjs output.
# Usage: python3 dev/ui.contact.py tests/out/ui docs/shots/ui
import os, re, subprocess, sys

src, out = sys.argv[1], sys.argv[2]
order = re.findall(r"'([^']+)'", open(os.path.join(os.path.dirname(__file__), 'ui.shots.mjs')).read().split('export const SCREENS = [')[1].split('];')[0])
names = [s.replace('&variant=', '-') for s in order]
os.makedirs(out, exist_ok=True)
for lang in ['tr', 'en']:
    for o, tile, geo in [('p', '9x3', '300x649'), ('l', '3x9', '520x240')]:
        files = [f'{src}/{n}_{lang}_{o}.png' for n in names if os.path.exists(f'{src}/{n}_{lang}_{o}.png')]
        per = 27
        chunks = [files[i:i + per] for i in range(0, len(files), per)]
        for ci, ch in enumerate(chunks, 1):
            dest = f'{out}/ui_{lang}_{"portrait" if o == "p" else "landscape"}_{ci}.jpg'
            args = ['montage']
            for f in ch:
                args += ['-label', os.path.basename(f).rsplit('_', 2)[0], f]
            args += ['-tile', tile, '-geometry', geo + '+6+6', '-background', '#11161d', '-fill', '#d8d2c4', '-pointsize', '14',
                     '-title', f'KANAT UI  {lang.upper()}  {"390x844" if o == "p" else "844x390"}  {ci}/{len(chunks)}', '-quality', '84', dest]
            subprocess.run(args, check=True)
            print(dest, os.path.getsize(dest) // 1024, 'KB')
