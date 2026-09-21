"""Two prescribed minima, same starting RGB field, same Allen-Cahn law.
Usage: python portrait_wrong_energy.py portrait.png cubist.png output
Requires numpy, pillow. Channels evolve independently. F = mean((u-r)^2)/2.
The wrong target is an intentionally chosen illustration, not a solver error.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
out=Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
a=np.array(Image.open(sys.argv[1]).convert('RGB').resize((256,312)),float)/255
b=np.array(Image.open(sys.argv[2]).convert('RGB').resize((256,312)),float)/255
# Shuffle rectangular tiles once; both runs start from exactly this field.
blocks=a.reshape(12,26,8,32,3).transpose(0,2,1,3,4).reshape(96,26,32,3)
u0=blocks[np.random.default_rng(19).permutation(96)].reshape(12,8,26,32,3).transpose(0,2,1,3,4).reshape(312,256,3)
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',24)
rows=[]
for i,t in enumerate(np.r_[0,np.geomspace(.1,240,80)]):
 im=Image.new('RGB',(1120,820),'#f5f7f2');d=ImageDraw.Draw(im)
 d.text((24,16),'SAME START. SAME DYNAMICS. DIFFERENT ENERGY MINIMA.',font=font,fill='#173d40')
 es=[]
 for x,r,title in [(24,a,'Intended minimum: my portrait'),(584,b,'Wrong target: cubist portrait')]:
  u=r+(u0-r)*np.exp(-.03*t);e=.5*np.mean((u-r)**2);es.append(e)
  d.text((x,64),title,font=font,fill='#173d40');im.paste(Image.fromarray(np.uint8(np.clip(u*255,0,255))).resize((512,624)),(x,108));d.text((x,752),f'Own energy: {e:.7f}',font=font,fill='#173d40')
 d.text((24,786),f'Allen-Cahn forward relaxation | time {t:.2f} | targets explicitly prescribed',font=font,fill='#173d40')
 im.save(out/f'frame-{i:03d}.png');rows.append([t,*es])
np.savetxt(out/'diagnostics.csv',rows,delimiter=',',header='time,intended_target_energy,wrong_target_energy',comments='')
assert all(np.diff(np.array(rows)[:,i]).max()<1e-12 for i in [1,2])
print('Both energies decrease. Final:',rows[-1])
