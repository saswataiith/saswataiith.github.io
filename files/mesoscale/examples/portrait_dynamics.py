"""No-target AC/CH portrait evolution; reverse playback is not inverse inference.
Usage: python portrait_dynamics.py photo.jpg output
numpy and pillow required. Periodic 256², dx=1, dt=.1, kappa=.4,
unit mobilities, stabilization S=2. Same double-well energy for both flows.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
u=np.array(Image.open(sys.argv[1]).convert('L').resize((256,256)),float)/127.5-1
ac=u.copy();ch=u.copy();mean0=u.mean();del u
k=2*np.pi*np.fft.fftfreq(256);k2=k[:,None]**2+k[None,:]**2;dt=.1;kap=.4;S=2
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',27);small=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',23)
records=[]
def energy(a):return np.mean((a*a-1)**2/4)+kap/2*np.sum(k2*abs(np.fft.fft2(a))**2)/256**4
for step in range(2001):
 if step%25==0:
  i=step//25;im=Image.new('RGB',(1160,730),'#f5f7f2');d=ImageDraw.Draw(im)
  d.text((24,15),'ONE FACE, TWO EVOLUTION LAWS',font=font,fill='#173d40');d.text((24,52),f'Forward simulation | time {step*dt:.1f} | no target image or fidelity term',font=small,fill='#173d40')
  for x,a,title in [(24,ac,'Allen-Cahn: nonconserved'),(604,ch,'Cahn-Hilliard: conserved')]:
   d.text((x,99),title,font=small,fill='#173d40');im.paste(Image.fromarray(np.uint8(np.clip((a+1)*127.5,0,255))).resize((528,528)),(x,139))
   d.text((x,685),f'Mean field: {a.mean():+.5f} | change: {a.mean()-mean0:+.5f}',font=small,fill='#173d40')
  im.save(out/f'frame-{i:03d}.png');records.append([step*dt,ac.mean(),ch.mean(),energy(ac),energy(ch)])
 if step==2000:break
 ac=np.fft.ifft2((np.fft.fft2(ac)-dt*np.fft.fft2(ac**3-ac-S*ac))/(1+dt*(S+kap*k2))).real
 ch=np.fft.ifft2((np.fft.fft2(ch)-dt*k2*np.fft.fft2(ch**3-ch-S*ch))/(1+dt*k2*(S+kap*k2))).real
assert np.isfinite(ac).all() and np.isfinite(ch).all()
assert abs(ch.mean()-mean0)<1e-10
np.savetxt(out/'diagnostics.csv',records,delimiter=',',header='time,AC_mean,CH_mean,AC_energy,CH_energy',comments='')
print('Initial/final mean:',mean0,ac.mean(),ch.mean())
