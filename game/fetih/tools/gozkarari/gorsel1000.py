# 1000 yeni görselin teslim dosyaları: python3 -I tools/gozkarari/gorsel1000.py
#   Kaynak (soru, şık, bilgi, komut): tools/gozkarari/P9–P12.md (Göz Kararı GK-511–1310) ve tools/yapi/Y1–Y2.md (yapı YP-101–300)
#   Çıktı (depo kökü):
#     GORSEL-1000.md          kullanıcının okuduğu özet: her görselin numarası, hangi soru tipine gittiği, sorusu ve cevabı
#     GORSEL-1000-K1..K5.md   ChatGPT'ye verilecek parçalar (200'er görsel): yalnız talimat + komutlar (soru/cevap yok:
#                             görsele yazı sızmasın), her parça kendi ZIP adıyla
# Biçim denetimi de yapar: ayrıştırılamayan madde, eksik/çift numara varsa durur.
import os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GK = re.compile(r'^### (GK-\d{3,4}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M | re.S)
YP = re.compile(r'^### (YP-\d{3}) · ([^·]+) · Zorluk (\d) · Tipler: ([^\n]+)\n```\n(.*?)\n```\n((?:- \*\*[^\n]+\n?)+)', re.M | re.S)
ALAN = re.compile(r'^- \*\*([^:*]+):\*\* (.*)$', re.M)


def oku_gk():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'gozkarari', 'P*.md')), key=lambda p: int(re.findall(r'P(\d+)', p)[-1])):
        if int(re.findall(r'P(\d+)', f)[-1]) < 9:
            continue
        for m in GK.finditer(open(f).read()):
            gid, konu, us, z, g, cmd, q, s, b = m.groups()
            dogru = [o.replace('✅', '').strip() for o in s.split('·') if '✅' in o][0]
            out.append(dict(id=gid, konu=konu.strip(), us=us.strip(), z=int(z), g=g.strip(), cmd=cmd.strip(), q=q.strip(), dogru=dogru, b=b.strip()))
    return out


def oku_yp():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'yapi', 'Y*.md'))):
        for m in YP.finditer(open(f).read()):
            yid, bolge, z, tip, cmd, alanlar = m.groups()
            a = dict(ALAN.findall(alanlar))
            kazi = [o.replace('✅', '').strip() for o in a['Kazı şıkları'].split('·') if '✅' in o][0]
            out.append(dict(id=yid, bolge=bolge.strip(), z=int(z), tip=tip.strip(), cmd=cmd.strip(), ad=a['Yapı'], yer=a['Yer'], kq=a['Kazı sorusu'], kdogru=kazi, golge='Gölge' in tip))
    return out


gk, yp = oku_gk(), oku_yp()
no = lambda s: int(s.split('-')[1])
hata = []
if [no(x['id']) for x in gk] != list(range(511, 511 + len(gk))): hata.append('GK numaraları sıralı/eksiksiz değil')
if [no(x['id']) for x in yp] != list(range(101, 101 + len(yp))): hata.append('YP numaraları sıralı/eksiksiz değil')
for x in gk + yp:
    if not x['cmd'].endswith('no logo'): hata.append(x['id'] + ': komut "no logo" ile bitmiyor')
if hata:
    sys.exit('\n'.join(hata))
print('Göz Kararı', len(gk), '· yapı', len(yp))

ORTAK = '''2. Bana hiçbir soru sorma, onay bekleme, ara özet yazma. Bir görsel bitince hemen sıradakine geç. Sınıra takılıp durursan, ben "devam" yazınca kaldığın numaradan sürdür.
3. Her görselin altına yalnızca numarasını yaz ve görseli o adla sakla ({ornek}.png).
4. Hepsi bitince bütün görselleri TEK bir ZIP dosyasında ver: adı **{zip}**, içinde **{ilk}.png … {son}.png** ve **bu dosyanın kendisi ({md})**. Üretemediğin numara olursa ZIP'ten sonra listesini yaz.'''

KURAL_GK = '''**Her görselde geçerli kurallar:**
- Yatay 4:3 oran.
- Görselde hiçbir yazı, harf, rakam, imza, filigran ya da logo olmayacak.
- Gerçek bir kişinin yüzü ya da benzeri olmayacak; insanlar genel ve isimsiz figürler olacak (tablolar hariç, aşağıya bak).
- Konu tek, net ve ortada olacak; kenarlardan taşmayacak, arka plan sade olacak.
- Komutta yazan üsluba tam sadık kal; üslupları birbirine karıştırma.'''

KURAL_TABLO = '''**Tablolar ({ilk} – {son}):** Bunlar telifi dolmuş, kamu malı ünlü tabloların yeniden üretimi. Tabloyu aslına olabildiğince sadık çiz: kompozisyon, renkler, figürlerin yeri ve duruşu orijinaldeki gibi olsun. Tablodaki figürler için "gerçek kişi yüzü yok" kuralı geçerli değil, orijinalde nasılsa öyle. Yazı, imza, çerçeve ve filigran yine olmayacak. Dikey tabloları yatay 4:3 tuvalin ortasına sığdır, yanları sade koyu müze duvarı olsun.'''

KURAL_YP = '''**Her görselde geçerli kurallar:**
- Kare 1:1 (1024×1024).
- Dış zemin SAF BEYAZ (#FFFFFF), düz; zemin, gökyüzü, manzara, insan, araç, gölge YOK. Yapı tek başına, bütünüyle ve ortada; dört kenarda boşluk kalsın.
- Beyaz ya da açık renkli yapılar (mermer, badana) fildişi/açık taş tonunda ve gölgeli çizilsin ki beyaz zeminden ayrılsın.
- Görselde hiçbir yazı, harf, rakam, tabela, yazıt, imza, filigran ya da logo olmayacak.
- Yapı gerçeğine sadık olsun: kule, kubbe, minare, kemer sayısı ve biçimi komutta nasılsa öyle.
- Bütün görseller aynı üslupta: komutun sonundaki 3D mimari maket üslubu.'''


def parca(k, ad, liste, tur):
    ilk, son = liste[0]['id'], liste[-1]['id']
    md = f'GORSEL-1000-K{k}.md'
    zipad = f'Gorsel-1000-K{k}.zip'
    s = [f'# {ad} ({ilk} – {son}) · {len(liste)} GÖRSEL', '', '## ChatGPT için talimat (önce bunu oku, sonra hemen başla)', '',
         f'Bu dosyada bir bilgi yarışması oyunu için {len(liste)} görsel komutu var. Görevin:', '',
         f'1. Aşağıdaki {len(liste)} komutun HEPSİNİ, {ilk} numarasından {son} numarasına kadar SIRAYLA, her komut için ayrı bir görsel olarak üret.',
         ORTAK.format(ornek=ilk, zip=zipad, ilk=ilk, son=son, md=md), '']
    if tur == 'gk':
        s.append(KURAL_GK)
        tab = [x for x in liste if x['us'].startswith('Tablo')]
        if tab:
            s += ['', KURAL_TABLO.format(ilk=tab[0]['id'], son=tab[-1]['id'])]
    else:
        s.append(KURAL_YP)
    s += ['', '## Komutlar', '']
    for x in liste:
        us = x['us'] if tur == 'gk' else '3D yapı · kare · beyaz zemin'
        s += [f"**{x['id']}** · {us}  ", x['cmd'], '']
    open(os.path.join(ROOT, md), 'w').write('\n'.join(s).rstrip() + '\n')
    return md, zipad, ilk, son


parcalar = []
for i in range(0, len(gk), 200):
    parcalar.append(parca(len(parcalar) + 1, 'GÖZ KARARI', gk[i:i + 200], 'gk'))
if yp:
    parcalar.append(parca(len(parcalar) + 1, 'YAPI GÖRSELLERİ (Kazı Kazan + Gölge Oyunu)', yp, 'yp'))

# özet (kullanıcı için)
o = ['# 1000 YENİ GÖRSEL · özet', '',
     'Bu dosya senin için: her görselin numarası, oyunda hangi soru tipine gideceği, sorusu ve doğru cevabı.',
     'ChatGPT\'ye bu dosyayı DEĞİL, aşağıdaki parça dosyalarını ver (her biri kendi içinde talimatlı; soru ve cevap yazmaz ki görsele yazı sızmasın).', '',
     '## Parçalar', '', '| Parça | Numaralar | Görsel | Soru tipi | ZIP adı |', '|---|---|---|---|---|']
for md, zipad, ilk, son in parcalar:
    gkmi = ilk.startswith('GK')
    n = no(son) - no(ilk) + 1
    o.append(f"| `{md}` | {ilk} – {son} | {n} | {'Göz Kararı' if gkmi else 'Kazı Kazan + Gölge Oyunu'} | `{zipad}` |")
o += ['', 'Hepsi bir gecede yetişmezse sorun değil: gelen parça oyuna bağlanır, görseli gelmeyen numara maçta çıkmaz.', '',
      '## Görsel nereye gidiyor', '',
      '- **Göz Kararı:** görsel bulanıktan netleşir, yakından uzaklaşır, siluetten renge geçer ya da bir tablonun parçasından bütününe açılır; 4 şıktan biri seçilir.',
      '- **Kazı Kazan:** yapı folyonun altındadır; kazıdıkça görünür, 4 şıktan biri seçilir.',
      '- **Gölge Oyunu:** yapının yalnız gölgesi Karagöz perdesine düşer; üç ipucu sırayla açılır. Gölgesi ayırt edilemeyen yapı yalnız Kazı Kazan\'a gider.', '']
konu = None
o += ['## Göz Kararı', '']
for x in gk:
    if x['konu'] != konu:
        konu = x['konu']
        o += ['', f'### {konu}', '', '| No | Zorluk · gösterim | Soru | Cevap |', '|---|---|---|---|']
    o.append(f"| {x['id']} | {x['z']} · {x['g']} | {x['q']} | **{x['dogru']}** |")
if yp:
    o += ['', '## Yapı görselleri', '', '| No | Tip | Yapı · yer | Kazı sorusu | Cevap |', '|---|---|---|---|---|']
    for x in yp:
        tip = 'Kazı + Gölge' if x['golge'] else 'Kazı'
        o.append(f"| {x['id']} | {tip} | {x['ad']} · {x['yer']} | {x['kq']} | **{x['kdogru']}** |")
open(os.path.join(ROOT, 'GORSEL-1000.md'), 'w').write('\n'.join(o).rstrip() + '\n')
print('yazıldı: GORSEL-1000.md +', ', '.join(p[0] for p in parcalar))
