"""A portrait prescribed as the energy minimum, with exact AC/CH evolution.
Run: python portrait_energy_minimum.py portrait.jpg output_directory
Requires numpy, pillow. F[u] = (1/2) integral (u-r)^2 dA; mu=u-r.
AC: u_t=-L*(u-r); CH: u_t=M*laplacian(u-r).
The reference r IS encoded in the energy. This is not blind image recovery.
256² periodic grid on [0,32)^2. L=.03, M=1e-5. Exact Fourier propagators.
Individual-pixel permutation preserves the mean, so the CH constraint admits r.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
r=np.asarray(Image.open(sys.argv[1]).convert('L').resize((256,256)),float)/127.5-1
rng=np.random.default_rng(19)
u0=rng.permutation(r.ravel()).reshape(r.shape)
k=2*np.pi*np.fft.fftfreq(256,d=32/256);k2=k[:,None]**2+k[None,:]**2
e0=np.fft.fft2(u0-r);font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',25);small=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',22)
records=[];times=np.r_[0,np.geomspace(.1,3e7,240)]
for i,t in enumerate(times):
 ac=r+(u0-r)*np.exp(-.03*t);ch=r+np.fft.ifft2(e0*np.exp(-1e-5*k2*t)).real
 energies=[.5*np.mean((a-r)**2) for a in [ac,ch]]
 records.append([t,ac.mean(),ch.mean(),*energies])
 im=Image.new('RGB',(1160,754),'#f5f7f2');d=ImageDraw.Draw(im)
 d.text((24,14),'MY PORTRAIT IS THE ENERGY MINIMUM',font=font,fill='#173d40')
 d.text((24,51),f'Forward relaxation | time {t:.3g} | L=0.03, M=0.00001 | nonuniform time sampling',font=small,fill='#173d40')
 for x,a,title,e in [(24,ac,'Allen-Cahn | nonconserved',energies[0]),(604,ch,'Cahn-Hilliard | conserved',energies[1])]:
  d.text((x,99),title,font=small,fill='#173d40');im.paste(Image.fromarray(np.uint8(np.clip((a+1)*127.5,0,255))).resize((528,528)),(x,139))
  d.text((x,687),f'Energy / area: {e:.7f}',font=small,fill='#173d40');d.text((x,718),f'Mean field: {a.mean():+.5f}',font=small,fill='#173d40')
 im.save(out/f'frame-{i:03d}.png')
assert abs(ch.mean()-u0.mean())<1e-10
assert max(energies)<1e-6
np.savetxt(out/'diagnostics.csv',records,delimiter=',',header='time,AC_mean,CH_mean,AC_energy_per_area,CH_energy_per_area',comments='')
print('Final energy densities:',energies,'CH mean drift',abs(ch.mean()-u0.mean()))
