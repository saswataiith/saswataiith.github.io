"""MS5033 teaching adaptation of PhaseField_Examples_Spectral.ipynb.
Run: python phase_field.py [chemical|elastic] [output_directory]
Requires NumPy. CSV rows index x, columns index y; all units dimensionless.
Periodic 2D homogeneous elasticity; zero mean stress. Not a calibrated alloy.
The explicit bulk term means time-step convergence must be checked.
"""
import sys
from pathlib import Path
import numpy as np


def kernel(kx, ky, c11=4., c12=2., c44=3., eigenstrain=.2):
    """B = E:C:E - (sigma0.n).Q^-1.(sigma0.n), E=eigenstrain*I.
    Q_ik=C_ijkl*n_j*n_l; Q11=C11*nx²+C44*ny² (not C12).
    This is a 2D constitutive model, not a reduction with epsilon_zz eigenstrain.
    """
    k2 = kx*kx + ky*ky
    radius = np.sqrt(np.where(k2 == 0, 1., k2))
    nx, ny = kx/radius, ky/radius
    q11 = c11*nx*nx + c44*ny*ny
    q22 = c44*nx*nx + c11*ny*ny
    q12 = (c12+c44)*nx*ny
    det = q11*q22-q12*q12
    det = np.where(k2 == 0, 1., det)
    stress = (c11+c12)*eigenstrain
    b = 2*(c11+c12)*eigenstrain**2-stress**2*(q22*nx*nx-2*q12*nx*ny+q11*ny*ny)/det
    return np.where(k2 == 0, 0., b)


def run(mode='chemical', output='phase_output', n=None, dt=.2, steps=2000):
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    if n is None: n = 256 if mode == 'elastic' else 64
    if mode not in ('chemical','elastic'): raise ValueError('Choose chemical or elastic')
    k=2*np.pi*np.fft.fftfreq(n);kx,ky=np.meshgrid(k,k,indexing='ij');k2=kx*kx+ky*ky
    b=kernel(kx,ky) if mode == 'elastic' else np.zeros_like(k2)
    # Real-field discrete operator: symmetrize conjugate partners on even grids.
    # Only Nyquist lines can differ from the continuum directional kernel.
    partner=(-np.arange(n)) % n
    b=.5*(b+b[np.ix_(partner,partner)])
    i,j=np.meshgrid(np.arange(n),np.arange(n),indexing='ij')
    # Deterministic broadband perturbation, identical across Julia and NumPy.
    noise=np.sin((i+1)*12.9898+(j+1)*78.233)*43758.5453
    noise=.02*(noise-np.floor(noise)-.5);noise-=noise.mean();c=.5+noise
    initial_mean=c.mean();records=[]
    denominator=1+dt*k2*(k2+b)
    def record(step):
        h=np.fft.fft2(c)
        energy=np.mean(c*c*(1-c)**2)+.5*np.sum((k2+b)*np.abs(h)**2)/n**4
        records.append([step*dt,c.mean(),energy,c.min(),c.max()])
        np.savetxt(out/f'field_{step:04d}.csv',c,delimiter=',')
    record(0)
    for step in range(1,steps+1):
        h=(np.fft.fft2(c)-dt*k2*np.fft.fft2(2*c*(1-c)*(1-2*c)))/denominator
        c=np.fft.ifft2(h).real
        if step%25 == 0 or step==steps: record(step)
    assert np.isfinite(c).all()
    assert abs(c.mean()-initial_mean)<1e-10
    np.savetxt(out/'diagnostics.csv',records,delimiter=',',header='time,mean,energy_density,min,max',comments='')
    print(mode,'mean drift',abs(c.mean()-initial_mean),'energy',records[0][2],records[-1][2])
    return c,np.array(records)

if __name__=='__main__': run(*(sys.argv[1:3]))
