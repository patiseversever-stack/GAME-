import json, re
V=['eski','once','yeni']
N={'eski':'En eski (oturum başı)','once':'Bir önceki teslim','yeni':'Yeni'}
def J(f):
    try: return json.load(open(f'/home/user/work/{f}'))
    except Exception as e: return None
def cpu(v):
    try:
        t=open(f'/home/user/work/cpuprof_{v}.txt').read()
        tot=float(re.search(r'toplam (\d+)',t).group(1)); idle=float(re.search(r'\s(\d+) ms\s+[\d.]+%\s+\(idle\)',t).group(1))
        return 100*(tot-idle)/tot
    except Exception: return None
rows=[]
def add(name, f): rows.append((name,[f(v) for v in V]))
add('Düello akışında ana iş parçacığı meşguliyeti', lambda v: f"%{cpu(v):.0f}" if cpu(v) is not None else '-')
add('Düello akışı: 50 ms üstü takılma (adet / toplam / en uzun)', lambda v: (lambda j: f"{j['longtasks']} / {j['longMs']} ms / {j['enBuyuk']} ms" if j else '-')(J(f'jank_{v}.json')))
add('Harita kaydırma: 50 ms üstü takılma (adet / toplam / en uzun)', lambda v: (lambda j: f"{j['uzunIs']} / {j['uzunIsToplamMs']} ms / {j['enUzunIsMs']} ms" if j else '-')(J(f'pan_{v}.json')))
for tq,lab in (('mob','orta cihaz'),('mob0','düşük cihaz')):
    add(f'Soru açıkken saniyedeki kare ({lab}, telefon)', lambda v,tq=tq: (lambda j: f"{j['R']['soru']['fpsTarget']}" if j else '-')(J(f'prof_{v}_{tq}.json')))
    add(f'Soru açıkken kare başına gölge geçişi ({lab})', lambda v,tq=tq: (lambda j: f"{j['R']['soru']['shadowPassesPerFrame']}" if j else '-')(J(f'prof_{v}_{tq}.json')))
    add(f'Durgun haritada kare başına gölge geçişi ({lab})', lambda v,tq=tq: (lambda j: f"{j['R']['harita']['shadowPassesPerFrame']}" if j else '-')(J(f'prof_{v}_{tq}.json')))
    add(f'Ekran pikseli / kare ({lab})', lambda v,tq=tq: (lambda j: f"{j['R']['soru']['pixels']/1e6:.2f} M" if j else '-')(J(f'prof_{v}_{tq}.json')))
    add(f'Tam ekran bulanıklık geçişi ({lab})', lambda v,tq=tq: (lambda j: ('var' if j['R']['soru']['post'] else 'yok') if j else '-')(J(f'prof_{v}_{tq}.json')))
    add(f'Kare süresi, soru açık (yazılımsal GPU, göreli) ({lab})', lambda v,tq=tq: (lambda j: f"{j['R']['soru']['frameMs']:.0f} ms" if j else '-')(J(f'prof_{v}_{tq}.json')))
w=max(len(r[0]) for r in rows)
print('| Ölçüm | '+' | '.join(N[v] for v in V)+' |')
print('|---|'+'---|'*len(V))
for n,vals in rows: print(f'| {n} | '+' | '.join(vals)+' |')
