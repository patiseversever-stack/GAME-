# Kazı Kazan çevrimiçi karoları: her yapı görseli (dist/yapi/NN.webp) uzun kenarı 12 karo olacak biçimde kare karolara
# bölünür. Sunucu bu karoları yalnız istemcinin kazıdığı yere gönderir (src/game/sunucu.js ADIM.kazi); görselin
# kendisi ve numarası çevrimiçi istemciye gitmez. Kazınan pay = gönderilen karo / bütün karo (sunucunun saydığı).
#   python3 -I tools/yapi/karo.py            → sunucu-veri/yapi-karo/NN.json ve src/data/ek/kazi-boyut.js
# Karo verisi dist/ dışında (yayımlanan sayfayla gitmez); boyut tablosu istemcide (çevrimiçi kart yerleşimi için).
import glob, io, json, base64, os, math
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'dist', 'yapi')
OUT = os.path.join(ROOT, 'sunucu-veri', 'yapi-karo')
N = 12  # uzun kenardaki karo sayısı (src/quiz/d_kazi.js KARO ile aynı)
os.makedirs(OUT, exist_ok=True)
boy = {}
for f in sorted(glob.glob(os.path.join(SRC, '*.webp'))):
    no = os.path.basename(f)[:-5]
    im = Image.open(f).convert('RGBA')
    W, H = im.size
    T = max(W, H) / N
    tx = max(1, math.ceil(W / T - 1e-9))
    ty = max(1, math.ceil(H / T - 1e-9))
    tiles = []
    for j in range(ty):
        for i in range(tx):
            # kenarlar yarım yukarı yuvarlanır (JS Math.floor(x + 0.5) ile aynı; Python round çifte yuvarlar)
            R = lambda x: math.floor(x + 0.5)
            box = (R(i * T), R(j * T), min(W, R((i + 1) * T)), min(H, R((j + 1) * T)))
            if box[2] <= box[0] or box[3] <= box[1]:
                tiles.append(None)
                continue
            t = im.crop(box)
            a = t.getchannel('A').point(lambda x: 255 if x >= 8 else 0)
            if a.getbbox() is None:
                tiles.append(None)  # saydam: istemci boş karo çizer
                continue
            b = io.BytesIO()
            t.save(b, 'WEBP', quality=78, method=6)
            tiles.append('data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode())
    json.dump({'w': W, 'h': H, 'tx': tx, 'ty': ty, 't': tiles}, open(os.path.join(OUT, no + '.json'), 'w'), separators=(',', ':'))
    boy[no] = [W, H, tx, ty]
js = '// tools/yapi/karo.py üretir: yapı görsellerinin boyu ve karo ızgarası [en, boy, sütun, satır] (çevrimiçi Kazı Kazan kartının yerleşimi için)\nexport const KAZI_BOY = ' + json.dumps(boy, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'src', 'data', 'ek', 'kazi-boyut.js'), 'w').write(js)
print(len(boy), 'görsel')
