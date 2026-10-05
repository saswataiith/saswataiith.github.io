"""Static VPython view of both percolating networks. No turtle or simulation.
Install vpython; run: python percolation_3d_vpython.py viewer.json
"""
import json,sys
from pathlib import Path
from vpython import canvas,vec,vertex,triangle,compound,curve,distant_light,menu,checkbox,slider,button,rate

d=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else 'bicontinuity-3d-output/viewer.json').read_text());n=d['n']
scene=canvas(title='Both percolating phase networks',width=820,height=540,background=vec(.98,.98,.96),center=vec(n/2,n/2,n/2),range=n*.75)
scene.forward=vec(-1,-.7,-1);scene.lights=[];scene.ambient=vec(.22,.22,.22)
for direction,intensity in [((-.6,.8,-1),.45),((1,-.2,.4),.18),((.3,.7,1),.12)]:distant_light(direction=vec(*direction),color=vec(intensity,intensity,intensity))
surfaces=[];lines={'red':[],'blue':[]};loops={'red':[],'blue':[]};colors={'red':vec(.8,.08,.06),'blue':vec(.03,.28,.85)}
m=d['meshes']['red']
for start in range(0,len(m['triangles']),1500):
    vertices={}
    def point(i):
        if i not in vertices:vertices[i]=vertex(pos=vec(*m['vertices'][i]),normal=vec(*m['normals'][i]),color=vec(.5,.55,.58))
        return vertices[i]
    faces=[triangle(v0=point(t[0]),v1=point(t[1]),v2=point(t[2])) for t in m['triangles'][start:start+1500]]
    obj=compound(faces);obj.opacity=.04;obj.shininess=.25;surfaces.append(obj)
def draw_path(path,color,radius,out):
    points=[[x+.5 for x in path[0]]]
    def flush():
        if len(points)<2:return
        simple=[points[0]]
        for i in range(1,len(points)-1):
            a,b,c=points[i-1:i+2];u=vec(*(b[j]-a[j] for j in range(3)));v=vec(*(c[j]-b[j] for j in range(3)))
            if u.cross(v).mag>1e-8:simple.append(b)
        simple.append(points[-1]);out.append(curve(pos=[vec(*p) for p in simple],radius=radius,color=color,emissive=True))
    for a,b in zip(path,path[1:]):
        a=[x+.5 for x in a];b=[x+.5 for x in b];axis=next((j for j in range(3) if abs(b[j]-a[j])>n/2),None)
        if axis is not None:
            face=list(a);face[axis]=n if b[axis]<a[axis] else 0;points.append(face);flush();partner=list(face);partner[axis]=0 if face[axis]==n else n;points=[partner,b]
        else:points.append(b)
    flush()
for phase in ('red','blue'):
    net=d['networks'][phase];adj=[[] for _ in net['nodes']];seen=set()
    for u,v in net['edges']:adj[u].append(v);adj[v].append(u)
    for root in range(len(adj)):
        if len(adj[root])==2:continue
        for first in adj[root]:
            edge=tuple(sorted((root,first)))
            if edge in seen:continue
            prev=root;current=first;path=[net['nodes'][root]];seen.add(edge)
            while True:
                path.append(net['nodes'][current])
                if len(adj[current])!=2:break
                nxt=next(v for v in adj[current] if v!=prev);edge=tuple(sorted((current,nxt)))
                if edge in seen:break
                seen.add(edge);prev,current=current,nxt
            draw_path(path,colors[phase],n/650,lines[phase])
    assert len(seen)==len(net['edges'])
    for route in d['routes'][phase].values():draw_path(route,colors[phase],n/330,loops[phase])
def update(_=None):
    for obj in surfaces:obj.visible=interface.checked;obj.opacity=opacity.value
    for phase in ('red','blue'):
        visible=selection.selected in ('both',phase)
        for obj in lines[phase]:obj.visible=visible
        for obj in loops[phase]:obj.visible=visible and emphasized.checked
def reset_camera(_):scene.center=vec(n/2,n/2,n/2);scene.range=n*.75;scene.forward=vec(-1,-.7,-1)
scene.append_to_caption('\nRed and blue connected witness networks. Thick lines emphasize independent wrapping loops.\n')
selection=menu(choices=['both','red','blue'],bind=update)
interface=checkbox(text='Show c=0.5 interface',checked=True,bind=update)
emphasized=checkbox(text='Emphasize wrapping loops',checked=True,bind=update)
opacity=slider(min=0,max=1,step=.02,value=.04,bind=update)
button(text='Reset camera',bind=reset_camera)
scene.append_to_caption('\nRotate: right-drag / Ctrl-drag. Zoom: wheel. Periodic edges resume at the paired face.\nEach displayed graph connects 125 distributed sites and has winding rank 3.\nFull-volume connectivity: each entire phase is one connected component.\n')
update()
while True:rate(30)
