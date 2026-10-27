# Türkçe harf eki üreticisi: Lilita One ve Fredoka'nın gömülü alt kümelerinde Ğ ğ İ Ş ş yok
# (tarayıcı bunları başka yazı tipinden çiziyordu). Bu betik her yazı tipinin kendi G g I S s ve
# çengel (¸) çizimlerinden bileşik harfler kurar; kısa çizgisi (breve) ve İ noktası yazı tipinin
# kendi i noktası ve Ü iki noktası ölçülerinden çizilir. Çıktı yalnızca bu beş harfi içeren küçük
# woff2'lerdir; trglyphs.js aynı aile adıyla, dar unicode-range ile @font-face olarak ekler.
#
#   pip install fonttools brotli
#   python3 src/ui/trfont.py node_modules/@fontsource src/ui/trglyphs.js
import base64, io, json, math, sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools import subset

SRC = sys.argv[1] if len(sys.argv) > 1 else 'node_modules/@fontsource'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/ui/trglyphs.js'
FONTS = [('Lilita One', 'lilita-one', 400), ('Fredoka', 'fredoka', 500), ('Fredoka', 'fredoka', 600), ('Fredoka', 'fredoka', 700)]
CODES = {0x11E: ('G', 'cap', 'breve'), 0x11F: ('g', 'low', 'breve'), 0x130: ('I', 'cap', 'dot'), 0x15E: ('S', None, 'ced'), 0x15F: ('s', None, 'ced')}


def contours(font, name):
    g = font['glyf'][name]
    coords, ends, flags = g.getCoordinates(font['glyf'])
    out, s = [], 0
    for e in ends:
        out.append((list(coords[s:e + 1]), list(flags[s:e + 1])))
        s = e + 1
    return out


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def glyph_bbox(font, name):
    pts = [p for c, _ in contours(font, name) for p in c]
    return bbox(pts) if pts else (0, 0, 0, 0)


def draw_contours(pen, cs):
    # TrueType eğrileri: on-curve bayrağı 1, değilse ikinci derece kontrol noktası
    for pts, fl in cs:
        n = len(pts)
        start = next((i for i in range(n) if fl[i] & 1), None)
        if start is None:
            continue
        order = pts[start:] + pts[:start]
        oflags = fl[start:] + fl[:start]
        pen.moveTo(tuple(order[0]))
        buf = []
        for p, f in zip(order[1:] + [order[0]], oflags[1:] + [oflags[0]]):
            if f & 1:
                if buf:
                    pen.qCurveTo(*[tuple(b) for b in buf], tuple(p))
                    buf = []
                else:
                    pen.lineTo(tuple(p))
            else:
                buf.append(p)
        if buf:
            pen.qCurveTo(*[tuple(b) for b in buf], tuple(order[0]))
        pen.closePath()


def accent_level(font, name, ref):
    # Ü/ü üzerindeki iki noktanın tabanı ve iki nokta arası genişlik
    acc = [c for c, _ in contours(font, name) if bbox(c)[1] > ref * 0.82]
    pts = [p for c in acc for p in c]
    x0, y0, x1, y1 = bbox(pts)
    return y0, x1 - x0, y1 - y0


def crescent(pen, cx, y0, w, h, t):
    # kalın uçlu yay (breve): dış yarım elips + iç yarım elips
    n = 20
    outer = [(cx + (w / 2) * math.cos(a), y0 + h + h * math.sin(a)) for a in [math.pi + math.pi * k / n for k in range(n + 1)]]
    inner = [(cx + (w / 2 - t) * math.cos(a), y0 + h + (h - t) * math.sin(a)) for a in [math.pi + math.pi * k / n for k in range(n + 1)]]
    pts = outer + inner[::-1]
    # saat yönünde (TrueType dış kontur)
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area > 0:
        pts = pts[::-1]
    pen.moveTo((round(pts[0][0]), round(pts[0][1])))
    for p in pts[1:]:
        pen.lineTo((round(p[0]), round(p[1])))
    pen.closePath()


def build(path):
    f = TTFont(path)
    glyf, hmtx, cmap = f['glyf'], f['hmtx'], f.getBestCmap()
    os2 = f['OS/2']
    cap = getattr(os2, 'sCapHeight', 0) or 700
    xh = getattr(os2, 'sxHeight', 0) or 500
    # i noktası
    ic = [c for c in contours(f, cmap[ord('i')]) if bbox(c[0])[1] > xh * 0.8]
    dot = ic[0]
    dx0, dy0, dx1, dy1 = bbox(dot[0])
    capY, capW, capH = accent_level(f, cmap[ord('Ü')], cap)
    lowY, lowW, lowH = accent_level(f, cmap[ord('ü')], xh)
    order = f.getGlyphOrder()
    new = {}

    def add(name, glyph, adv=0, lsb=0):
        glyf.glyphs[name] = glyph
        order.append(name)
        hmtx.metrics[name] = (adv, lsb)
        new[name] = glyph

    for code, (base, lvl, kind) in CODES.items():
        bname = cmap[ord(base)]
        bx0, by0, bx1, by1 = glyph_bbox(f, bname)
        adv = hmtx[bname][0]
        cx = (bx0 + bx1) / 2 if base not in 'gs' else adv / 2
        if base in 'Ss':
            cx = (bx0 + bx1) / 2
        aname = f'tr.{kind}.{base}'
        if kind == 'dot':
            pen = TTGlyphPen(None)
            ox = cx - (dx0 + dx1) / 2
            oy = capY - dy0
            draw_contours(pen, [([(x + ox, y + oy) for x, y in dot[0]], dot[1])])
            add(aname, pen.glyph())
        elif kind == 'breve':
            pen = TTGlyphPen(None)
            w = (capW if lvl == 'cap' else lowW) * 0.92
            h = w * 0.42
            t = (dy1 - dy0) * 0.62
            crescent(pen, cx, capY if lvl == 'cap' else lowY, w, h, t)
            add(aname, pen.glyph())
        cname = f'tr.{base}.{kind}'
        pen = TTGlyphPen(f.getGlyphSet())
        pen.addComponent(bname, (1, 0, 0, 1, 0, 0))
        if kind == 'ced':
            ced = cmap[0xB8]
            c0, _, c1, _ = glyph_bbox(f, ced)
            pen.addComponent(ced, (1, 0, 0, 1, round(cx - (c0 + c1) / 2), 0))
        else:
            pen.addComponent(aname, (1, 0, 0, 1, 0, 0))
        g = pen.glyph()
        add(cname, g, adv, hmtx[bname][1])
        for t in f['cmap'].tables:
            if t.isUnicode():
                t.cmap[code] = cname
    f.setGlyphOrder(order)
    f['maxp'].numGlyphs = len(order)
    for name, g in new.items():
        if hasattr(g, 'recalcBounds'):
            g.recalcBounds(glyf)
    buf = io.BytesIO()
    f.flavor = None
    f.save(buf)
    buf.seek(0)
    # yalnızca beş harf (ve bileşenleri)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = []
    opts.hinting = False
    opts.name_IDs = ['*']
    opts.notdef_outline = False
    ft = TTFont(buf)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=list(CODES))
    sub.subset(ft)
    out = io.BytesIO()
    ft.flavor = 'woff2'
    ft.save(out)
    return out.getvalue()


css = []
for fam, pkg, w in FONTS:
    data = build(f'{SRC}/{pkg}/files/{pkg}-latin-{w}-normal.woff2')
    b64 = base64.b64encode(data).decode()
    css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:U+011E-011F,U+0130,U+015E-015F}}")
    print(fam, w, len(data), 'bayt', file=sys.stderr)
with open(OUT, 'w') as fo:
    fo.write('// Türkçe harf eki (Ğ ğ İ Ş ş): Lilita One ve Fredoka alt kümelerinde bu harfler yok.\n')
    fo.write('// trfont.py üretir; elle düzenleme. Yazı tipinin kendi G g I S s ve çengelinden bileşik harfler.\n')
    fo.write('export const TR_FONTS = ' + json.dumps(''.join(css)) + ';\n')
