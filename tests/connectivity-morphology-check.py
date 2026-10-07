# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""Known-shape and saved-field checks for label/winding and morphology."""
import sys,json,gzip
from pathlib import Path
import numpy as np
from skimage.measure import euler_number
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'files/mesoscale/examples'))
from connectivity_morphology import label_phase,periodic_euler,interface_morphology
n=16;m=np.zeros((n,n,n),bool);m[[0,n-1],4:7,4:7]=True
r=label_phase(m)[1];assert r['components']==1 and r['clusters'][0]['winding_rank']==0
assert label_phase(m,False)[1]['components']==2
m[:]=False;m[:,4:7,4:7]=True;m[8,11:13,11:13]=True
r=label_phase(m)[1];assert r['components']==2 and sorted(c['winding_rank'] for c in r['clusters'])==[0,1]
full=np.ones((n,n,n),bool);assert label_phase(full)[1]['clusters'][0]['winding_rank']==3
assert periodic_euler(full)==0
for shell in (False,True):
 m[:]=False;m[3:13,3:13,3:13]=True
 if shell:m[5:11,5:11,5:11]=False
 for neighbors,connectivity in [(6,1),(26,3)]:assert periodic_euler(m,neighbors)==euler_number(m,connectivity=connectivity)
for size in (20,32):
 x=np.indices((size,)*3);radius=size/4;c=.5+(radius-np.sqrt(((x-size/2)**2).sum(axis=0)))/radius*.2
 result=interface_morphology(c,.25);r=radius*.25
 assert result['surface_euler']==2 and result['sum_surface_genera']==0
 assert abs(result['surface_area']/(4*np.pi*r*r)-1)<.03
 assert abs(result['integrated_mean_curvature_high_c_outward']/(4*np.pi*r)-1)<.03
path=root/'assets/examples/bicontinuity-3d';c=np.load(path/'composition.npy');a=json.loads((path/'analysis.json').read_text());old=json.loads((path/'report.json').read_text())
for t,phases in a['thresholds'].items():
 for p,result in phases.items():
  assert result['components']==old['thresholds'][t][p]['components']==1
  assert result['clusters'][0]['winding_rank']==old['thresholds'][t][p]['winding_rank']==3
  assert result['digital_euler_6']==result['digital_euler_26']==-106
v=np.frombuffer(gzip.decompress((path/'phase-flood.bin.gz').read_bytes()),dtype='<u2').reshape(c.shape)
red=v>=32768;assert np.array_equal(red,c>=.5);distance=v&32767
for p,mask in [('red',red),('blue',~red)]:
 seed=tuple(a['flood'][p]['root']);assert distance[seed]==0
 has_parent=np.zeros(c.shape,bool)
 for axis in range(3):
  for step in (-1,1):
   same=np.roll(mask,step,axis)&mask;neighbor=np.roll(distance,step,axis)
   assert np.all(np.abs(distance[same].astype(int)-neighbor[same].astype(int))<=1)
   has_parent|=same&(neighbor.astype(np.int32)==distance.astype(np.int32)-1)
 has_parent[seed]=True;assert np.all(has_parent[mask])
 assert np.count_nonzero(mask)==a['flood'][p]['reached_voxels']
m=a['morphology'];assert m['edge_incidence_two'] and m['coherent_orientation']
assert m['surface_components']==1 and m['surface_euler']==-212 and m['sum_surface_genera']==107
print('Known-shape HK/winding/Euler/curvature and every saved voxel/distance check passed.')
