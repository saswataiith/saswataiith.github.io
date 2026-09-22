"""A portrait disintegrating into abstract art under Cahn-Hilliard evolution.
Usage: python portrait_ch_abstraction.py photo.png output
Three independent signed RGB fields; image analogy, not a material model.
Left: F=integral sum_j (u_j-r_j)^2/2, exact Fourier evolution M=1.
Right: F=integral sum_j [(u_j²-1)²/4+kappa*|grad u_j|²/2].
Periodic 256x312, dx=1, kappa=.4, dt=.1, M=1, stabilization 2.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
r=np.asarray(Image.open(sys.argv[1]).convert('RGB').resize((256,312)),float)/127.5-1
noise=np.random.default_rng(19).normal(0,.12,r.shape);noise-=noise.mean((0,1),keepdims=True)
u0=r+noise;u=u0.copy();mean0=u.mean((0,1));axes=(0,1)
kx=2*np.pi*np.fft.fftfreq(256);ky=2*np.pi*np.fft.fftfreq(312);k2=(ky[:,None]**2+kx[None,:]**2)[...,None]
fft=lambda x:np.fft.fft2(x,axes=axes)
ifft=lambda x:np.fft.ifft2(x,axes=axes).real
e0=fft(noise);N=256*312;dt=.1;kap=.4;S=2
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',23);rows=[]
def energy(a):return np.mean((a*a-1)**2/4)+kap/2*np.sum(k2*abs(fft(a))**2)/(3*N*N)
for step in range(2001):
 if step%25==0:
  t=step*dt;left=r+ifft(e0*np.exp(-k2*t));energies=[.5*np.mean((left-r)**2),energy(u)];drift=np.max(abs(u.mean((0,1))-mean0))
  rows.append([t,*energies,drift,*u.mean((0,1))])
  im=Image.new('RGB',(1120,845),'#f5f7f2');d=ImageDraw.Draw(im)
  d.text((24,16),'CAHN-HILLIARD IN BOTH PANELS: THE ENERGY CHANGES',font=font,fill='#173d40')
  for x,a,title,e in [(24,left,'Portrait energy: restores the face',energies[0]),(584,u,'Double-well energy: makes domains',energies[1])]:
   d.text((x,63),title,font=font,fill='#173d40');im.paste(Image.fromarray(np.uint8(np.clip((a+1)*127.5,0,255))).resize((512,624)),(x,108));d.text((x,750),f'Own energy / channel / area: {e:.6f}',font=font,fill='#173d40')
  d.text((24,790),f'Time {t:.1f} | each channel mean conserved',font=font,fill='#173d40')
  im.save(out/f'frame-{step//25:03d}.png')
 if step==2000:break
 u=ifft((fft(u)-dt*k2*fft(u**3-u-S*u))/(1+dt*k2*(S+kap*k2)))
assert np.isfinite(u).all() and drift<1e-10
v=np.array(rows);assert np.max(np.diff(v[:,2]))<1e-9
np.savetxt(out/'diagnostics.csv',rows,delimiter=',',header='time,portrait_energy,double_well_energy,max_channel_mean_drift,mean_R,mean_G,mean_B',comments='')
print('Final diagnostics:',rows[-1])
