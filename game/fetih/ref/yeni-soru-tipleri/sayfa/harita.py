import json
from collections import deque
d=json.load(open('/home/user/GAME-/game/fetih/src/data/turkiye.json'))
P={p['id']:p for p in d['provinces']}
def rdp(pts,eps):
    if len(pts)<3: return pts
    import math
    (x1,y1),(x2,y2)=pts[0],pts[-1]
    dx,dy=x2-x1,y2-y1; L=math.hypot(dx,dy) or 1e-9
    i,mx=0,0
    for k in range(1,len(pts)-1):
        x,y=pts[k]; dd=abs(dy*x-dx*y+x2*y1-y2*x1)/L
        if dd>mx: i,mx=k,dd
    if mx>eps: return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps)
    return [pts[0],pts[-1]]
xs=[];ys=[]
paths={}
for p in d['provinces']:
    segs=[]
    for r in p['rings']:
        pts=[(r[i],-r[i+1]) for i in range(0,len(r),2)]
        s=rdp(pts,0.12)
        if len(s)<3: continue
        xs+= [a for a,b in s]; ys+=[b for a,b in s]
        segs.append('M'+' '.join(f'{a:.1f} {b:.1f}' for a,b in s)+'Z')
    paths[p['id']]=''.join(segs)
print('bbox',min(xs),max(xs),min(ys),max(ys))
print('size',sum(len(v) for v in paths.values()))
name={p['id']:p['name'] for p in d['provinces']}
nb={p['id']:p['nb'] for p in d['provinces']}
def bfs(a,b):
    q=deque([a]);prev={a:None}
    while q:
        u=q.popleft()
        if u==b: break
        for v in nb[u]:
            if v not in prev: prev[v]=u;q.append(v)
    out=[b]
    while prev[out[-1]] is not None: out.append(prev[out[-1]])
    return out[::-1]
for a,b in [(42,61),(6,61),(35,44),(16,25),(1,61),(42,55)]:
    r=bfs(a,b); print(name[a],'->',name[b],len(r)-1,[name[x] for x in r])
json.dump({'paths':paths,'centers':{p['id']:[p['center'][0],-p['center'][1]] for p in d['provinces']},'names':name,'nb':nb},open('harita.json','w'),ensure_ascii=False)
