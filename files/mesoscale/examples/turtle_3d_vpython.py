"""Native Python VPython viewer: python turtle_3d_vpython.py viewer.json.
Install: python -m pip install vpython
Uses identical saved voxel loops to the website; centre motion is phase-valid.
"""
import json, sys, time
from pathlib import Path
from vpython import canvas, vec, box, compound, ellipsoid, sphere, rate, menu, button, slider, checkbox, wtext, vertex, triangle

data=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else 'bicontinuity-3d-output/viewer.json').read_text())
n=data['n']
scene=canvas(title='Measured 3D bicontinuity: VPython turtle',width=800,height=550,background=vec(.98,.98,.96),center=vec(n/2,n/2,n/2),range=n*.8)
scene.forward=vec(-1,-.7,-1)
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
        surface=compound(faces);surface.opacity=.05;phases[name].append(surface)
marker=n/32
parts=[ellipsoid(size=vec(.85*marker,.65*marker,1.1*marker),color=vec(.2,.65,.22)),sphere(radius=.23*marker,color=vec(.35,.8,.3))]
offsets=[vec(0,0,0),vec(0,0,.65)]
for x in (-.38,.38):
    for z in (-.32,.32):
        parts.append(sphere(radius=.16*marker,color=vec(.35,.8,.3)));offsets.append(vec(x,-.18,z))
phase='red';direction='x';progress=0.;running=False

def visibility(_=None):
    for name,meshes in phases.items():
        for obj in meshes:
            obj.visible=name==phase or other.checked
            obj.opacity=opacity.value if name==phase else .08

def reset(_=None):
    global progress,running,phase,direction
    phase=phase_menu.selected;direction=direction_menu.selected;progress=0.;running=False;visibility()

def start(_):
    global running,progress
    if progress>=len(data['routes'][phase][direction])-1: progress=0.
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
scene.append_to_caption('\nSelected phase opacity: ')
opacity=slider(min=0,max=1,step=.05,value=.05,bind=visibility)
other=checkbox(text='Show other phase',checked=False,bind=visibility)
scene.append_to_caption('\nRotate: right-drag / Ctrl-drag. Zoom: wheel. Face crossings reappear on the opposite face.\nThe enlarged turtle body is a marker; its centre follows checked six-neighbour voxel routes.\n')
status=wtext(text='')
reset()
last=time.perf_counter()
while True:
    rate(60)
    now=time.perf_counter();dt=min(now-last,.1);last=now
    route=data['routes'][phase][direction]
    if running:
        progress=min(len(route)-1,progress+speed.value*dt)
        if progress>=len(route)-1:running=False
    i=min(int(progress),len(route)-2);t=1 if progress>=len(route)-1 else progress-i
    a,b=route[i:i+2];d=[(b[j]-a[j]+n//2)%n-n//2 for j in range(3)]
    p=vec(*((a[j]+.5+d[j]*t)%n for j in range(3)))
    for part,offset in zip(parts,offsets):part.pos=p+offset*marker
    status.text=f'{phase} · {direction} · step {int(progress)}/{len(route)-1} · '+('complete (winding +1)' if progress>=len(route)-1 else 'running' if running else 'paused')
