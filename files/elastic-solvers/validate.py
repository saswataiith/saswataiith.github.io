"""Run with python validate.py. NumPy only. Writes measured checks to JSON."""
import json
from pathlib import Path
import numpy as np
from elasticity_common import cubic,plate_problem,PeriodicGrid,stress,rms
from direct_iteration import solve_direct
from equivalent_eigenstrain import solve_equivalent

records=[]

def check(name,error,limit):
    error=float(error)
    assert np.isfinite(error) and error<limit, (name,error,limit)
    records.append(dict(test=name,error=error,limit=limit))

# 1. Independently assembled dense energy minimization on a small odd grid.
# The derivative matrix is explicitly summed, without using FFT response().
n=7
x=np.arange(n)/n
frequency=np.arange(-(n//2),n//2+1)
derivative=np.real(np.sum(2j*np.pi*frequency[None,None,:]*
    np.exp(2j*np.pi*(x[:,None,None]-x[None,:,None])*frequency),axis=2)/n)
dx=np.kron(derivative,np.eye(n)); dy=np.kron(np.eye(n),derivative)
pixels=n*n
gradient=np.zeros((pixels,4,2*pixels))
gradient[:,0,:pixels]=dx
gradient[:,1,:pixels]=dy/2; gradient[:,1,pixels:]=dx/2
gradient[:,2]=gradient[:,1]
gradient[:,3,pixels:]=dy
c,e,ref,h=plate_problem(n,contrast=2.0,matrix_constants=(4,2,2))
cflat=c.reshape(pixels,4,4); eflat=e.reshape(pixels,4)
matrix=np.einsum('pai,pab,pbj->ij',gradient,cflat,gradient)
rhs=np.einsum('pai,pab,pb->i',gradient,cflat,eflat)
u=np.linalg.lstsq(matrix,rhs,rcond=1e-12)[0]
dense_strain=np.einsum('pai,i->pa',gradient,u).reshape(n,n,2,2)
for solver in [solve_direct,solve_equivalent]:
 s=solver(c,e,ref,tolerance=1e-10)
 check(solver.__name__+' vs dense minimizer',rms(s['strain']-dense_strain)/rms(dense_strain),1e-8)

# 2. Exact layered solution at nonzero prescribed mean strain.
n=33
x=np.arange(n)/n
local_c11=np.broadcast_to((4+1.2*np.cos(2*np.pi*x))[:,None],(n,n))
factor=local_c11/4
c=factor[...,None,None,None,None]*cubic()
e=np.zeros((n,n,2,2)); e[...,0,0]=.01*np.sin(2*np.pi*x)[:,None]+.002
mean=np.diag([.003,0])
constant_stress=(mean[0,0]-e[...,0,0].mean())/np.mean(1/local_c11)
exact=e.copy(); exact[...,0,0]+=constant_stress/local_c11
for solver in [solve_direct,solve_equivalent]:
 s=solver(c,e,cubic(),mean_strain=mean,tolerance=1e-10)
 check(solver.__name__+' laminate strain',rms(s['strain']-exact)/rms(exact),1e-8)
 check(solver.__name__+' laminate stress',np.max(np.abs(s['stress'][...,0,0]-constant_stress)),1e-10)
 check(solver.__name__+' mean strain',rms(s['strain'].mean(axis=(0,1))-mean),1e-12)

# 3. Exact longitudinal Fourier mode, including 2*pi normalization.
grid=PeriodicGrid(33)
e=np.zeros((33,33,2,2)); e[...,0,0]=.01*np.sin(4*np.pi*np.arange(33)/33)[:,None]
u=grid.response(cubic(),stress(cubic(),e))
expected=-.01*np.cos(4*np.pi*np.arange(33)/33)/(4*np.pi)
check('Fourier displacement amplitude/sign',np.max(np.abs(u[...,0]-expected[:,None])),1e-14)

# 4. Homogeneous isotropic dilatational Fourier energy plus clamped zero mode.
n=33
c,e,ref,h=plate_problem(n,contrast=1,misfit_ratio=1)
s=solve_direct(c,e,ref,tolerance=1e-10)
# lambda=2, mu=1: B=4*mu*(lambda+mu)/(lambda+2*mu)=3 for E=I.
analytic=.5*3*.01**2*np.var(h)+6*(.01*h.mean())**2
check('Homogeneous isotropic energy including mean',abs(s['energy']/analytic-1),1e-9)

# 5. Full fields, physical residuals, mean strain and auxiliary stress matching.
for ratio in [.2,.5,1,2,5]:
 c,e,ref,h=plate_problem(33,contrast=ratio,matrix_constants=(4,2,2))
 direct=solve_direct(c,e,ref,tolerance=1e-10)
 equivalent=solve_equivalent(c,e,ref,tolerance=1e-10)
 check(f'contrast {ratio}: strain agreement',rms(direct['strain']-equivalent['strain'])/rms(direct['strain']),1e-8)
 check(f'contrast {ratio}: energy agreement',abs(direct['energy']/equivalent['energy']-1),1e-10)
 for label,s in [('direct',direct),('equivalent',equivalent)]:
  check(f'contrast {ratio}: {label} equilibrium',s['residual'],1e-9)
 check(f'contrast {ratio}: stress matching',equivalent['constitutive_mismatch'],1e-9)

# 6. Independent elastic anisotropies, nonzero shear and mean loading.
c,e,ref,h=plate_problem(33,precipitate_constants=(6,1,0.7),matrix_constants=(4,2,2))
e[...,0,1]=.003*h; e[...,1,0]=e[...,0,1]
mean=np.array([[.002,.001],[.001,-.001]])
a=solve_direct(c,e,ref,mean_strain=mean,tolerance=1e-10)
b=solve_equivalent(c,e,ref,mean_strain=mean,tolerance=1e-10)
check('Independent anisotropies with shear',rms(a['strain']-b['strain'])/rms(a['strain']),1e-8)
check('Imposed tensor shear',rms(a['strain'].mean(axis=(0,1))-mean),1e-12)

# 7. Spatial convergence at fixed geometry and interface width.
energies=[]
for size in [33,65,129]:
 c,e,ref,h=plate_problem(size,contrast=.5)
 energies.append(solve_direct(c,e,ref,tolerance=1e-10)['energy'])
check('65 to 129 relative energy change',abs(energies[1]/energies[2]-1),2e-3)
check('Refinement reduces energy difference',abs(energies[1]-energies[2])/abs(energies[0]-energies[1]),.5)

# 8. Failure must be explicit rather than returning an unconverged result.
for solver in [solve_direct,solve_equivalent]:
 c,e,ref,h=plate_problem(17)
 try:
  solver(c,e,ref,max_iterations=1,tolerance=1e-14)
 except RuntimeError:
  records.append(dict(test=solver.__name__+' rejects unconverged solve',passed=True))
 else:
  raise AssertionError('Expected convergence failure')
report=dict(checks=len(records),results=records,spatial_convergence=dict(grids=[33,65,129],energies=energies),
            scope='2D, periodic, prescribed mean strain, positive cubic stiffness; no vacuum or evolving phase field')
Path(__file__).with_name('validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
