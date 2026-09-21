"""NumPy counterpart of course order.jl and Potts.jl; periodic square lattice.
python monte_carlo.py [ising|potts] [output_directory]
Random sequential updates; pure Python loop favors clarity over speed.
Potts neighbor-copy proposals are grain-growth kinetics, not equilibrium sampling.
"""
from pathlib import Path
import sys
import numpy as np

def run(mode='ising',output='mc_output',n=256,sweeps=None,save_every=None):
    if mode not in ('ising','potts'): raise ValueError('ising or potts')
    sweeps=(2000 if mode=='potts' else 200) if sweeps is None else sweeps
    save_every=(25 if mode=='potts' else 5) if save_every is None else save_every
    out=Path(output);out.mkdir(parents=True,exist_ok=True);rng=np.random.default_rng(7)
    s=rng.choice([-1,1],(n,n)) if mode=='ising' else rng.permutation(np.arange(1,n*n+1)).reshape(n,n);rows=[]
    temperature=1.5 if mode=='ising' else .3
    for sweep in range(sweeps+1):
        if sweep:
            for _ in range(n*n):
                i,j=rng.integers(n,size=2)
                nb=[s[(i+1)%n,j],s[(i-1)%n,j],s[i,(j+1)%n],s[i,(j-1)%n]]
                old=s[i,j];candidate=-old if mode=='ising' else nb[rng.integers(4)]
                de=2*old*sum(nb) if mode=='ising' else sum(v!=candidate for v in nb)-sum(v!=old for v in nb)
                if de<=0 or rng.random()<np.exp(-de/temperature): s[i,j]=candidate
        if sweep%save_every==0:
            energy=-np.mean(s*(np.roll(s,1,0)+np.roll(s,1,1))) if mode=='ising' else np.mean(s!=np.roll(s,1,0))+np.mean(s!=np.roll(s,1,1))
            rows.append([sweep,energy,s.mean()]);np.savetxt(out/f'field_{sweep:04d}.csv',s,delimiter=',',fmt='%d')
    np.savetxt(out/'diagnostics.csv',rows,delimiter=',',header='sweep,energy_per_site,mean_label_or_spin',comments='')
    return s
if __name__=='__main__':run(*sys.argv[1:3])
