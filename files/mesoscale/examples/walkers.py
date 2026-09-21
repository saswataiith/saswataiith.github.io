"""Teaching adaptation of demo2_many_walkers_diffusion.jl.
Run: python walkers.py [output_directory]. Requires NumPy.
Each walker takes one unit cardinal step per sweep on an unbounded 2D lattice.
This changes the classroom code's asynchronous periodic convention explicitly.
MSD uses unwrapped coordinates; theoretical MSD=steps, D=1/4.
"""
import sys
from pathlib import Path
import numpy as np

def run(output='walkers_output'):
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    rng=np.random.default_rng(7);n=100000;pos=np.zeros((n,2),dtype=int)
    dirs=np.array([[1,0],[-1,0],[0,1],[0,-1]]);rows=[]
    for step in range(401):
        if step:
            pos+=dirs[rng.integers(0,4,n)]
        if step%10==0:
            msd=np.mean(np.sum(pos*pos,axis=1));rows.append([step,msd,step])
            hist,_,_=np.histogram2d(pos[:,0],pos[:,1],bins=256,range=[[-128,128],[-128,128]])
            np.savetxt(out/f'density_{step:04d}.csv',hist/n,delimiter=',')
    np.savetxt(out/'diagnostics.csv',rows,delimiter=',',header='steps,msd,theory',comments='')
    assert abs(rows[-1][1]/400-1)<.04
    print('Walker MSD at 400 steps',rows[-1][1],'theory 400')
if __name__=='__main__':run(*sys.argv[1:2])
