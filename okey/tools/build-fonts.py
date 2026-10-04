#!/usr/bin/env python3
"""Fontları alt-kümeler (Türkçe dahil) ve base64 @font-face CSS'i üretir.
Kaynak paketler: @fontsource* (OFL). Kullanım: python3 tools/build-fonts.py <fontsource-node_modules-dizini>
Üretilen: assets/fonts/*.woff2 ve styles/fonts.generated.css (depoya eklenir; çevrimdışı çalışır)."""
import base64, os, subprocess, sys

src = sys.argv[1]
out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
css_path = os.path.join(os.path.dirname(__file__), '..', 'styles', 'fonts.generated.css')
os.makedirs(out_dir, exist_ok=True)

TEXT = ('U+0020-007E,U+00A0-00FF,U+011E-011F,U+0130-0131,U+015E-015F,U+2010-2015,U+2018-201E,'
        'U+2022,U+2026,U+2190-2193,U+2212,U+2715,U+2713,U+00B7,U+00D7,U+2605,U+25CF,U+25C6,U+25B2,U+25A0')
DIGITS = 'U+0030-0039,U+0020,U+002E,U+002B,U+002D,U+2212'

fonts = [
  # (çıktı adı, kaynak yolu, family, weight, style, unicodes)
  ('dmsans', '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', 'DM Sans', '400 800', 'normal', TEXT),
  ('dmsans-ext', '@fontsource-variable/dm-sans/files/dm-sans-latin-ext-wght-normal.woff2', 'DM Sans', '400 800', 'normal', TEXT),
  ('playfair800', '@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff2', 'Playfair Display', '800', 'normal', TEXT),
  ('playfair800-ext', '@fontsource/playfair-display/files/playfair-display-latin-ext-800-normal.woff2', 'Playfair Display', '800', 'normal', TEXT),
  ('playfair700i', '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2', 'Playfair Display', '700', 'italic', TEXT),
  ('playfair700i-ext', '@fontsource/playfair-display/files/playfair-display-latin-ext-700-italic.woff2', 'Playfair Display', '700', 'italic', TEXT),
  ('barlow700', '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2', 'Barlow Condensed', '700', 'normal', DIGITS),
  ('barlow800', '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2', 'Barlow Condensed', '800', 'normal', DIGITS),
]

css = ['/* ÜRETİLMİŞ — tools/build-fonts.py. Fontlar SIL OFL 1.1 lisanslıdır (DM Sans, Playfair Display, Barlow Condensed). */']
total = 0
for name, rel, family, weight, style, uni in fonts:
    inp = os.path.join(src, rel)
    outp = os.path.join(out_dir, name + '.woff2')
    subprocess.check_call(['pyftsubset', inp, f'--unicodes={uni}', '--flavor=woff2', f'--output-file={outp}',
                           '--layout-features=kern,liga,tnum,lnum,pnum', '--no-hinting', '--desubroutinize'])
    data = open(outp, 'rb').read()
    total += len(data)
    # unicode-range: latin-ext dosyası yalnızca Türkçe/ext aralığı için
    ur = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF' if name.endswith('-ext') else 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    b64 = base64.b64encode(data).decode()
    css.append(f"@font-face{{font-family:'{family}';font-style:{style};font-weight:{weight};font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:{ur}}}")
    print(f'{name}: {len(data)} bayt')
open(css_path, 'w').write('\n'.join(css) + '\n')
print('toplam woff2:', total, 'bayt; css:', os.path.getsize(css_path), 'bayt')
