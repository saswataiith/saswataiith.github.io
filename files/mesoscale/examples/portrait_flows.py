"""Reference-assisted portrait restoration using AC and CH gradient flows.
Inspired by W. Craig Carter's historical homepage, not a reproduction of his code.
Requires numpy, pillow. Run: python portrait_flows.py portrait.jpg output_dir
The full original image is the reference in the fidelity term. No missing identity
is inferred. Block scrambling is a visual prelude, NOT a PDE solution/reversal.
Periodic domain [0,32)^2, n=256, dt=.02, kappa=.02, lambda=40, L=.05, M=.2.
Energy: integral [(u²-1)²/4 + kappa/2 |grad u|² + lambda/2 (u-r)²].
AC: u_t=-L mu; CH: u_t=M laplacian(mu). No clipping in the solver.
"""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

def run(path,output):
 out=Path(output);out.mkdir(parents=True,exist_ok=True)
 ref=np.asarray(Image.open(path).convert('L').resize((256,256)),dtype=float)/127.5-1
 rng=np.random.default_rng(19);blocks=ref.reshape(16,16,16,16).transpose(0,2,1,3).reshape(256,16,16)
 damaged=blocks[rng.permutation(256)].reshape(16,16,16,16).transpose(0,2,1,3).reshape(256,256)
 ac=damaged.copy();ch=damaged.copy();n=256;dt=.02;lam=40;kappa=.02;L=.05;M=.2
 k=2*np.pi*np.fft.fftfreq(n,d=32/n);k2=k[:,None]**2+k[None,:]**2;rhat=np.fft.fft2(ref)
 times=set(np.unique(np.round(np.geomspace(1,1000,90)).astype(int)));records=[];counter=0
 font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',24)
 def field(a):return Image.fromarray(np.uint8(np.clip((a+1)*127.5,0,255))).resize((512,512),Image.Resampling.NEAREST).convert('RGB')
 def frame(a,b,label):
  nonlocal counter
  im=Image.new('RGB',(1600,660),'#f5f7f2');d=ImageDraw.Draw(im)
  for x,img,title in [(16,ref,'Original reference'),(544,a,'Allen-Cahn'),(1072,b,'Cahn-Hilliard')]:
   d.text((x,15),title,fill='#173d40',font=font);im.paste(field(img),(x,60))
  d.text((16,590),label,fill='#173d40',font=font);d.text((16,625),'Reference-assisted restoration | 256 x 256 | grayscale intensity, not material composition',fill='#173d40',font=font)
  im.save(out/f'frame-{counter:03d}.png');counter+=1
 for a in np.linspace(0,1,17):frame((1-a)*ref+a*damaged,(1-a)*ref+a*damaged,'Disintegration prelude: block scrambling (not PDE evolution)')
 def energy(u):return np.mean((u*u-1)**2/4+lam*(u-ref)**2/2)+kappa/2*np.sum(k2*np.abs(np.fft.fft2(u))**2)/n**4
 for step in range(1001):
  if step==0 or step in times:
   records.append([step*dt,ac.mean(),ch.mean(),np.mean((ac-ref)**2),np.mean((ch-ref)**2),energy(ac),energy(ch)])
   frame(ac,ch,f'Restoration time {step*dt:.2f} | L=0.05, M=0.2 | full original retained as target')
  if step==1000:break
  ac=np.fft.ifft2((np.fft.fft2(ac)-dt*L*np.fft.fft2(ac**3-ac)+dt*L*lam*rhat)/(1+dt*L*(kappa*k2+lam))).real
  ch=np.fft.ifft2((np.fft.fft2(ch)-dt*M*k2*np.fft.fft2(ch**3-ch)+dt*M*k2*lam*rhat)/(1+dt*M*k2*(kappa*k2+lam))).real
 assert np.isfinite(ac).all() and np.isfinite(ch).all()
 assert abs(ch.mean()-damaged.mean())<1e-10
 np.savetxt(out/'diagnostics.csv',records,delimiter=',',header='time,AC_mean,CH_mean,AC_mse,CH_mse,AC_energy,CH_energy',comments='')
 Image.open(out/'frame-016.png').save(out/'poster.png')
 print('frames',counter,'MSE initial/final AC CH',records[0][3:5],records[-1][3:5],'CH mean drift',abs(ch.mean()-ref.mean()))
if __name__=='__main__':run(*sys.argv[1:3])
