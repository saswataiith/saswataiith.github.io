"""Two-dimensional spinodal comparison: mean c=0.5 and 0.4.
Requires NumPy and Pillow. Run: python bicontinuity.py
Same zero-mean perturbation, 256-square periodic grid, dx=1, dt=.2, time=400.
f(c)=c²(1-c)², M=kappa=1, chemical energy only. Educational, not calibrated.
Connectivity is a digital 4-neighbor test with periodic edges and winding detection.
A corner-only contact does not count as a connection. Thresholds matter.
"""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image

def connectivity(mask):
    n,m=mask.shape;seen=np.zeros_like(mask,bool);ux=np.zeros_like(mask,dtype=int);uy=ux.copy();components=[]
    for i,j in zip(*np.where(mask)):
        if seen[i,j]:continue
        seen[i,j]=True;queue=deque([(i,j)]);size=0;wx=wy=False
        while queue:
            x,y=queue.popleft();size+=1
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                a,b=(x+dx)%n,(y+dy)%m
                if not mask[a,b]:continue
                lx,ly=ux[x,y]+dx,uy[x,y]+dy
                if not seen[a,b]:
                    seen[a,b]=True;ux[a,b]=lx;uy[a,b]=ly;queue.append((a,b))
                else:
                    wx |= lx!=ux[a,b];wy |= ly!=uy[a,b]
        components.append({'pixels':size,'wrap_x':bool(wx),'wrap_y':bool(wy)})
    return {'components':len(components),'area_fraction':float(mask.mean()),'largest_fraction_of_phase':max((c['pixels'] for c in components),default=0)/max(1,int(mask.sum())), 'wrapping_components':[c for c in components if c['wrap_x'] or c['wrap_y']]}

def run(output='bicontinuity_output'):
    out=Path(output);out.mkdir(exist_ok=True,parents=True);n=256;dt=.2
    rng=np.random.default_rng(42);noise=.01*rng.standard_normal((n,n));noise-=noise.mean()
    k=2*np.pi*np.fft.fftfreq(n);k2=k[:,None]**2+k[None,:]**2;denom=1+dt*k2*k2
    palette=np.array([[0,0,255],[0,255,255],[0,255,0],[255,255,0],[255,0,0]])
    result={}
    for mean in [.5,.4]:
        c=mean+noise
        for _ in range(2000):c=np.fft.ifft2((np.fft.fft2(c)-dt*k2*np.fft.fft2(2*c*(1-c)*(1-2*c)))/denom).real
        assert np.isfinite(c).all() and abs(c.mean()-mean)<1e-10
        tag=f'{mean:.1f}';np.save(out/f'composition-{tag}.npy',c)
        v=np.clip(c,0,1);rgb=np.stack([np.interp(v,[0,.25,.5,.75,1],palette[:,j]) for j in range(3)],axis=-1)
        Image.fromarray(rgb.astype('uint8').transpose(1,0,2)[::-1]).resize((1024,1024),Image.Resampling.NEAREST).save(out/f'composition-{tag}.png')
        result[tag]={'mean':float(c.mean()),'thresholds':{str(t):{'high':connectivity(c>=t),'low':connectivity(c<t)} for t in [.45,.5,.55]}}
    (out/'connectivity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':
 import sys
 run(*sys.argv[1:2])
