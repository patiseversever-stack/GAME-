import re,glob,collections,sys
RX=re.compile(r'^### (GK-\d{3}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M|re.S)
items=[]
for f in sorted(glob.glob('P[1-6].md')):
    t=open(f).read()
    n=len(re.findall(r'^### GK-',t,re.M)); got=0
    for m in RX.finditer(t):
        gid,konu,us,z,g,cmd,q,s,b=m.groups(); got+=1
        opts=[x.strip() for x in s.split('·')]
        dogru=[o.replace('✅','').strip() for o in opts if '✅' in o]
        items.append(dict(id=gid,konu=konu.strip(),us=us.strip(),z=int(z),g=g.strip(),cmd=cmd,q=q,opts=[o.replace('✅','').strip() for o in opts],dogru=dogru[0] if dogru else None,b=b,f=f))
    print(f, n, 'başlık,', got, 'okundu')
print('toplam', len(items))
err=[]
ids=[i['id'] for i in items]
if len(set(ids))!=len(ids): err.append('yinelenen numara')
for i in items:
    if len(i['opts'])!=4: err.append(f"{i['id']} şık sayısı {len(i['opts'])}")
    if not i['dogru']: err.append(f"{i['id']} doğru şık yok")
    if len(i['q'])>110 or not i['q'].endswith('?'): err.append(f"{i['id']} soru")
    if any(len(o)>28 for o in i['opts']): err.append(f"{i['id']} şık uzun")
    if len(i['b'])>140: err.append(f"{i['id']} bilgi uzun")
    if not i['cmd'].rstrip().endswith('no logo'): err.append(f"{i['id']} komut sonu")
    if i['dogru'] and i['dogru'].lower() in i['q'].lower(): err.append(f"{i['id']} cevap soruda geçiyor: {i['dogru']}")
norm=lambda x: re.sub(r'[^a-zçğıöşü ]','',x.lower().replace('İ','i').replace('I','ı')).strip()
c=collections.defaultdict(list)
for i in items: c[norm(i['dogru'] or '')].append(i['id']+' '+i['konu'])
for k,v in c.items():
    if len(v)>1: err.append(f"AYNI CEVAP '{k}': {v}")
# başlıca kelime çakışması (cevaplarda ortak anlamlı sözcük)
stop={'ay','ve','ile','de','da','bir','eski','ilk','türk','osmanlı','büyük','gemi','taşı','kulesi'}
w=collections.defaultdict(list)
for i in items:
    for t in set(norm(i['dogru'] or '').split()):
        if len(t)>3 and t not in stop: w[t].append(i['id']+' '+i['dogru'])
for k,v in w.items():
    if len(v)>1: err.append(f"ortak sözcük '{k}': {v}")
print('\n'.join(err) or 'sorun yok')
