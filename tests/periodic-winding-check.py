# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""Independent winding check using weighted union-find; requires NumPy and Numba.
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
from numba import njit

@njit(cache=True)
def root_offset(parent,weight,u):
    r=u;x=y=z=0
    while parent[r]!=r:
        x+=weight[r,0];y+=weight[r,1];z+=weight[r,2];r=parent[r]
    v=u;px=py=pz=0
    while parent[v]!=v:
        nxt=parent[v];wx=weight[v,0];wy=weight[v,1];wz=weight[v,2]
        parent[v]=r;weight[v,0]=x-px;weight[v,1]=y-py;weight[v,2]=z-pz
        px+=wx;py+=wy;pz+=wz;v=nxt
    return r,x,y,z

@njit(cache=True)
def dense_winding(mask):
    # Independent weighted union-find, unlike the generator's BFS tree.
    n=mask.shape[0];size=n**3;flat=mask.ravel()
    parent=np.arange(size,dtype=np.int32);weight=np.zeros((size,3),np.int32)
    ranks=np.zeros(size,np.uint8);vectors=np.zeros((1024,3),np.int32);nv=0
    strides=np.array([n*n,n,1]);total=0
    for u in range(size):
        if not flat[u]:continue
        total+=1
        coords=np.array([u//(n*n),(u//n)%n,u%n])
        for axis in range(3):
            v=u+strides[axis]
            if coords[axis]==n-1:v-=n*strides[axis]
            if not flat[v]:continue
            ru,ux,uy,uz=root_offset(parent,weight,u)
            rv,vx,vy,vz=root_offset(parent,weight,v)
            dx=ux-vx+(1 if axis==0 else 0)
            dy=uy-vy+(1 if axis==1 else 0)
            dz=uz-vz+(1 if axis==2 else 0)
            if ru==rv:
                assert dx%n==0 and dy%n==0 and dz%n==0
                if dx==0 and dy==0 and dz==0:continue
                x=dx//n;y=dy//n;z=dz//n;seen=False
                for i in range(nv):
                    if vectors[i,0]==x and vectors[i,1]==y and vectors[i,2]==z:seen=True;break
                if not seen:
                    assert nv<1024
                    vectors[nv,0]=x;vectors[nv,1]=y;vectors[nv,2]=z;nv+=1
            elif ranks[ru]>=ranks[rv]:
                parent[rv]=ru;weight[rv,0]=dx;weight[rv,1]=dy;weight[rv,2]=dz
                if ranks[ru]==ranks[rv]:ranks[ru]+=1
            else:
                parent[ru]=rv;weight[ru,0]=-dx;weight[ru,1]=-dy;weight[ru,2]=-dz
    counts=np.zeros(size,np.int32)
    for u in range(size):
        if flat[u]:
            r,_,_,_=root_offset(parent,weight,u);counts[r]+=1
    components=0;largest=0
    for count in counts:
        if count:components+=1
        largest=max(largest,count)
    return components,largest,total,vectors[:nv]

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
            components,largest,total,vectors=dense_winding(m)
            rank=int(np.linalg.matrix_rank(vectors.astype(float)))
            assert components==1 and rank==3 and largest==total
            print('Full 256³',t,name,{'components':components,'winding_rank':rank,'largest_fraction_of_phase':largest/total})
