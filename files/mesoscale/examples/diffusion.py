# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""Diffusion example based on my teaching notebook Fourier_Julia.ipynb.
Purpose: show how Fourier modes decay during diffusion.
Run: python diffusion.py [output_directory]. Requires NumPy.
Periodic domain L=2*pi; D=1. Exact Fourier propagation, not time stepping.
"""
import sys
from pathlib import Path
import numpy as np

def run(output='diffusion_output'):
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    n=128;x=2*np.pi*np.arange(n)/n;k=2*np.pi*np.fft.fftfreq(n,d=2*np.pi/n)
    c0=1+.4*np.cos(x)+.2*np.cos(4*x);rows=[]
    for t in [0,.02,.1,.3,1.]:
        c=np.fft.ifft(np.fft.fft(c0)*np.exp(-k*k*t)).real
        exact=1+.4*np.exp(-t)*np.cos(x)+.2*np.exp(-16*t)*np.cos(4*x)
        rows.append([t,c.mean(),np.max(np.abs(c-exact))])
        np.savetxt(out/f'profile_{t:.2f}.csv',np.column_stack([x,c]),delimiter=',')
    np.savetxt(out/'diagnostics.csv',rows,delimiter=',',header='time,mean,max_exact_error',comments='')
    assert max(r[2] for r in rows)<1e-12
    print('Fourier diffusion: max exact error',max(r[2] for r in rows))
if __name__=='__main__':run(*sys.argv[1:2])
