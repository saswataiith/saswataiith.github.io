"""Independent winding check using weighted union-find; requires NumPy.
Run from any folder: python tests/periodic-winding-check.py
"""
import numpy as np,json,sys
from itertools import product
# Independent weighted union-find. Edge constraints track lifted displacements.
def winding(mask,diagonal=False):
 shape=np.array(mask.shape);d=mask.ndim;size=mask.size
 par=np.arange(size);weight=np.zeros((size,d),dtype=int);rank=np.zeros(size,dtype=int);loops=[]
 def find(i):
  if par[i]!=i:
   r,p=find(par[i]);weight[i]+=p;par[i]=r
  return par[i],weight[i].copy()
 steps=[tuple(int(j==a) for j in range(d)) for a in range(d)]
 if diagonal:steps=[s for s in product((-1,0,1),repeat=d) if any(s) and next(x for x in s if x)>0]
 for u in map(tuple,np.argwhere(mask)):
  i=np.ravel_multi_index(u,mask.shape)
  for step in steps:
   v=tuple((np.array(u)+step)%shape)
   if not mask[v]:continue
   j=np.ravel_multi_index(v,mask.shape);ri,pi=find(i);rj,pj=find(j);delta=pi+step-pj
   if ri==rj:
    assert np.all(delta%shape==0)
    if np.any(delta):loops.append(delta//shape)
   elif rank[ri]>=rank[rj]:
    par[rj]=ri;weight[rj]=delta
    if rank[ri]==rank[rj]:rank[ri]+=1
   else:par[ri]=rj;weight[ri]=-delta
 counts={}
 for i in np.flatnonzero(mask):
  r,_=find(i);counts[r]=counts.get(r,0)+1
 return {'components':len(counts),'winding_rank':int(np.linalg.matrix_rank(np.array(loops))) if loops else 0,'wrap':np.any(np.array(loops)!=0,axis=0).tolist() if loops else [False]*d}
if __name__ == '__main__':
    root=__import__('pathlib').Path(__file__).resolve().parents[1]
    saved=json.loads((root/'assets/examples/bicontinuity/turtle-field.json').read_text())
    c=np.array(saved['mask']).reshape(saved['size'],saved['size'])
    for name,m in [('red',c==1),('blue',c==0)]:
        for diagonal in (False,True):
            r=winding(m,diagonal)
            assert r['components']==(16 if name=='red' else 4)
            assert r['winding_rank']==(0 if name=='red' else 2)
            print('Saved 2D',name,'8' if diagonal else '4',r)
    c=np.load(root/'assets/examples/bicontinuity-3d/composition.npy')
    for t in (.45,.5,.55):
        for name,m in [('red',c>=t),('blue',c<t)]:
            r=winding(m)
            assert r['components']==1 and r['winding_rank']==3
            print('3D',t,name,r)
