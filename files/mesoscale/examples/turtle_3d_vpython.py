# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""Native Python VPython viewer: python turtle_3d_vpython.py viewer.json.
Install: python -m pip install vpython "setuptools<82"
I use setuptools below 82 because VPython needs pkg_resources.
Uses identical saved voxel loops to the website; centre motion is phase-valid.
"""
import json, sys, time
from pathlib import Path
from vpython import canvas, vec, box, compound, ellipsoid, sphere, rate, menu, button, slider, checkbox, wtext, vertex, triangle, distant_light, curve

data=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else 'bicontinuity-3d-output/viewer.json').read_text())
n=data['n']
scene=canvas(title='Measured 3D bicontinuity: VPython turtle',width=800,height=550,background=vec(.98,.98,.96),center=vec(n/2,n/2,n/2),range=n*.8)
scene.forward=vec(-1,-.7,-1)
scene.lights=[];scene.ambient=vec(.22,.22,.22)
distant_light(direction=vec(-.6,.8,-1),color=vec(.45,.45,.45))
distant_light(direction=vec(1,-.2,.4),color=vec(.18,.18,.18))
distant_light(direction=vec(.3,.7,1),color=vec(.12,.12,.12))
colors={'red':vec(.85,.14,.12),'blue':vec(.12,.38,.85)}
phases={}
# The native viewer loads the same saved display surfaces; no simulation runs.
for name in colors:
    mesh=data['meshes'][name];phases[name]=[]
    for start in range(0,len(mesh['triangles']),1500):
        vertices={}
        def point(i):
            if i not in vertices:vertices[i]=vertex(pos=vec(*mesh['vertices'][i]),normal=vec(*mesh['normals'][i]),color=colors[name])
            return vertices[i]
        faces=[triangle(v0=point(t[0]),v1=point(t[1]),v2=point(t[2])) for t in mesh['triangles'][start:start+1500]]
        surface=compound(faces);surface.opacity=.1;surface.shininess=.25;phases[name].append(surface)
marker=n/32
parts=[ellipsoid(size=vec(.85*marker,.65*marker,1.1*marker),color=vec(.2,.65,.22)),sphere(radius=.23*marker,color=vec(.35,.8,.3))]
offsets=[vec(0,0,0),vec(0,0,.65)]
for x in (-.38,.38):
    for z in (-.32,.32):
        parts.append(sphere(radius=.16*marker,color=vec(.35,.8,.3)));offsets.append(vec(x,-.18,z))
phase='red';direction='x';progress=0.;running=False
trails=[];current_trail=None;executed=0.;crossings=0;route=[]

def visibility(_=None):
    for name,meshes in phases.items():
        for obj in meshes:
            obj.visible=name==phase and other.checked
            obj.opacity=opacity.value

def position_at(q):
    i=min(int(q),len(route)-2);t=1 if q>=len(route)-1 else q-i
    a,b=route[i:i+2];d=[(b[j]-a[j]+n//2)%n-n//2 for j in range(3)]
    return [((a[j]+.5+d[j]*t)%n) for j in range(3)]

def begin_trail(p):
    global current_trail
    current_trail=curve(pos=[vec(*p)],radius=n/350,color=vec(.68,.02,.42),emissive=True)
    trails.append(current_trail)

def extend_trail(to):
    global executed,crossings
    q=executed
    while q<to-1e-9:
        i=min(int(q+1e-9),len(route)-2);end=min(to,i+1)
        a,b=route[i:i+2];axis=next((j for j in range(3) if abs(b[j]-a[j])>n/2),None)
        if axis is not None and q<i+.5-1e-9 and end>=i+.5:
            face=[x+.5 for x in a];face[axis]=n if b[axis]<a[axis] else 0
            current_trail.append(pos=vec(*face));partner=list(face);partner[axis]=0 if face[axis]==n else n
            begin_trail(partner);q=i+.5;crossings+=1
        else:
            current_trail.append(pos=vec(*position_at(end)));q=end
    executed=to

def reset(_=None):
    global progress,running,phase,direction,executed,crossings,route
    phase=phase_menu.selected;direction=direction_menu.selected;progress=0.;running=False;executed=0.;crossings=0
    route=data['routes'][phase][direction]
    for trail in trails:trail.clear();trail.visible=False
    trails.clear();begin_trail(position_at(0));visibility()

def start(_):
    global running,progress
    if progress>=len(route)-1: reset()
    running=True

def pause(_):
    global running
    running=False
scene.append_to_caption('\nPhase: ')
phase_menu=menu(choices=['red','blue'],bind=reset)
scene.append_to_caption(' Winding direction: ')
direction_menu=menu(choices=['x','y','z'],bind=reset)
button(text='Start',bind=start);button(text='Pause',bind=pause);button(text='Reset',bind=reset)
scene.append_to_caption('\nSpeed (voxels/s): ')
speed=slider(min=5,max=200,value=40,bind=lambda _:None)
scene.append_to_caption('\nc = 0.5 isosurface opacity: ')
opacity=slider(min=0,max=1,step=.02,value=.1,bind=visibility)
other=checkbox(text='Show c = 0.5 interface',checked=True,bind=visibility)
scene.append_to_caption('\nRotate: right-drag / Ctrl-drag. Zoom: wheel. Face crossings reappear on the opposite face.\nMagenta records only the executed path. The isosurface has no box-face caps.\nThe enlarged turtle body is a marker; its centre follows checked six-neighbour voxel routes.\n')
status=wtext(text='')
reset()
last=time.perf_counter()
while True:
    rate(60)
    now=time.perf_counter();dt=min(now-last,.1);last=now
    route=data['routes'][phase][direction]
    if running:
        progress=min(len(route)-1,progress+speed.value*dt)
        extend_trail(progress)
        if progress>=len(route)-1:running=False
    p=vec(*position_at(progress))
    for part,offset in zip(parts,offsets):part.pos=p+offset*marker
    status.text=f'{phase} · {direction} · step {int(progress)}/{len(route)-1} · '+('complete (winding +1)' if progress>=len(route)-1 else 'running' if running else 'paused')
