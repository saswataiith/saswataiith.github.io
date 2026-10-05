"""Generate a genuine 256^3 Cahn–Hilliard field ONCE; the viewers never evolve it.
Install numpy scipy numba scikit-image fast-simplification.
Usage: python bicontinuity_3d.py OUTPUT_DIRECTORY
The fixed field is saved as float32 composition.npy (64 MiB). Connectivity and
all turtle routes are measured on that saved 256^3 field, without downsampling.
An isosurface extracted at full resolution is simplified ONLY for display.
"""
from pathlib import Path
import json,sys,time
from importlib.metadata import version
import numpy as np
from scipy import fft
from numba import njit
from skimage.measure import marching_cubes
import fast_simplification
N, SEED, DT, STEPS = 256, 20261005, .5, 400
A = M = KAPPA = 1.0
DX, STABILIZATION, WORKERS = .25, 2.0, 4

@njit(cache=True)
def graph(mask,need_routes=False):
    """Periodic six-neighbour BFS with dense lifted coordinates and parent tree.
    Non-tree edges reveal winding vectors. Explicit unit-axis loops establish
    independent winding in x,y,z, rather than merely touching opposite faces.
    """
    n=mask.shape[0];size=n**3;flat=mask.ravel()
    visited=np.zeros(size,np.uint8);lift=np.zeros((size,3),np.int32)
    parent=np.full(size,-1,np.int32);queue=np.empty(size,np.int32)
    counts=np.zeros(size,np.int32);wrap=np.zeros((size,3),np.uint8)
    # At most 27 direction signatures for the short BFS-tree cycles in this graph.
    vectors=np.zeros((size,3),np.int32);nv=0;nc=0
    edge_u=np.full(3,-1,np.int32);edge_v=np.full(3,-1,np.int32);signs=np.ones(3,np.int32)
    strides=np.array([n*n,n,1])
    for root in range(size):
        if not flat[root] or visited[root]:continue
        visited[root]=1;head=0;tail=1;queue[0]=root;count=0
        while head<tail:
            u=queue[head];head+=1;count+=1
            coords=np.array([u//(n*n),(u//n)%n,u%n])
            for axis in range(3):
                for sign in (-1,1):
                    coord=coords[axis];v=u+sign*strides[axis]
                    if coord==0 and sign==-1:v+=n*strides[axis]
                    if coord==n-1 and sign==1:v-=n*strides[axis]
                    if not flat[v]:continue
                    if not visited[v]:
                        visited[v]=1;parent[v]=u
                        for j in range(3):lift[v,j]=lift[u,j]+(sign if j==axis else 0)
                        queue[tail]=v;tail+=1
                    else:
                        w=np.empty(3,np.int32);norm=0
                        for j in range(3):
                            delta=lift[u,j]+(sign if j==axis else 0)-lift[v,j]
                            assert delta%n==0
                            w[j]=delta//n;norm+=abs(w[j])
                            if w[j]!=0:wrap[nc,j]=1
                        if norm==0:continue
                        # Keep distinct signed winding vectors for rank calculation.
                        seen=False
                        for k in range(nv):
                            if vectors[k,0]==w[0] and vectors[k,1]==w[1] and vectors[k,2]==w[2]:seen=True;break
                        if not seen:
                            vectors[nv]=w;nv+=1
                        if need_routes and norm==1:
                            for j in range(3):
                                if w[j]!=0 and edge_u[j]==-1:edge_u[j]=u;edge_v[j]=v;signs[j]=w[j]
        counts[nc]=count;nc+=1
    return counts[:nc],wrap[:nc],vectors[:nv],parent,edge_u,edge_v,signs

def analyze(mask,need_routes=False):
    counts,wrap,vectors,parent,us,vs,signs=graph(mask,need_routes)
    n=mask.shape[0];routes={}
    if need_routes:
        def chain(u):
            path=[]
            while u!=-1:path.append(int(u));u=parent[u]
            return path[::-1]
        for axis in range(3):
            assert us[axis]!=-1,'No pure axis loop found'
            pu,pv=chain(us[axis]),chain(vs[axis]);k=0
            while k<min(len(pu),len(pv)) and pu[k]==pv[k]:k+=1
            route=pu[k-1:]+pv[k-1:][::-1]
            if signs[axis]<0:route.reverse()
            routes['xyz'[axis]]=[[u//(n*n),(u//n)%n,u%n] for u in route]
    largest=int(counts.max()) if len(counts) else 0
    return {'phase_fraction':float(mask.mean()),'components':len(counts),
            'largest_fraction_of_phase':largest/int(mask.sum()),
            'winding_rank':int(np.linalg.matrix_rank(vectors.astype(float))) if len(vectors) else 0,
            'component_details':[{'voxels':int(count),'wrap_xyz':w.astype(bool).tolist()} for count,w in zip(counts,wrap)]},routes

def validate_route(route,mask,axis):
    points=np.array(route);n=np.array(mask.shape)
    assert np.all(mask[tuple(points.T)]) and np.array_equal(points[0],points[-1])
    d=np.diff(points,axis=0);d=(d+n//2)%n-n//2
    assert np.all(np.abs(d).sum(axis=1)==1)
    target=np.zeros(3,dtype=int);target['xyz'.index(axis)]=1
    assert np.array_equal(d.sum(axis=0),target*n)
    return {'steps':len(route)-1,'winding':target.tolist(),'valid':True}

@njit(cache=True)
def interior_bfs(core,axis,start,margin):
    """A lifted slab: transverse faces are excluded; only the winding axis wraps.
    Start near the box centre, reach the identical voxel one period away.
    Parent codes store reverse neighbour steps, keeping memory bounded.
    """
    n=core.shape[0];width=n+1;size=width*n*n
    parents=np.full(size,-1,np.int32);queue=np.empty(size,np.int32)
    other0=(axis+1)%3;other1=(axis+2)%3
    # Axis lift runs from start[axis] to start[axis]+n, not from a box corner.
    s=start[other0]*n+start[other1];target=n*n*n+s
    queue[0]=s;parents[s]=s;head=0;tail=1
    while head<tail:
        u=queue[head];head+=1
        if u==target:break
        a=u//(n*n);b=(u//n)%n;c=u%n
        for coordinate in range(3):
            for sign in (-1,1):
                aa=a;bb=b;cc=c
                if coordinate==0:aa+=sign
                elif coordinate==1:bb+=sign
                else:cc+=sign
                if aa<0 or aa>n or bb<margin or bb>=n-margin or cc<margin or cc>=n-margin:continue
                v=(aa*n+bb)*n+cc
                if parents[v]!=-1:continue
                xyz=np.empty(3,np.int32);xyz[axis]=(start[axis]+aa)%n;xyz[other0]=bb;xyz[other1]=cc
                if not core[xyz[0],xyz[1],xyz[2]]:continue
                parents[v]=u;queue[tail]=v;tail+=1
    if parents[target]==-1:return np.empty((0,3),np.int32)
    count=1;u=target
    while u!=s:u=parents[u];count+=1
    route=np.empty((count,3),np.int32);u=target
    for i in range(count-1,-1,-1):
        route[i,axis]=(start[axis]+u//(n*n))%n;route[i,other0]=(u//n)%n;route[i,other1]=u%n
        u=parents[u]
    return route

def interior_routes(c,phase):
    """Select safe core voxels, then route across the interior lifted domain.
    Core thresholds are a route-clearance choice, not the phase definition.
    The measured phase boundary remains c=0.5 and is never changed.
    """
    from scipy.ndimage import binary_erosion,generate_binary_structure
    n=c.shape[0];mask=c>=.5 if phase=='red' else c<.5
    # Periodic erosion guarantees two face-sharing voxel layers of clearance.
    padded=np.pad(mask,2,mode='wrap')
    clearance=binary_erosion(padded,structure=generate_binary_structure(3,1),iterations=2)[2:-2,2:-2,2:-2]
    core=clearance & ((c>=.75) if phase=='red' else (c<=.25))
    candidates=np.argwhere(core[n//2-24:n//2+24,n//2-24:n//2+24,n//2-24:n//2+24])+n//2-24
    candidates=candidates[np.argsort(np.sum((candidates-n//2)**2,axis=1))]
    routes={};checks={}
    for axis in range(3):
        route=np.empty((0,3),np.int32)
        for candidate in candidates[:12]:
            route=interior_bfs(core,axis,candidate.astype(np.int32),32)
            if len(route):break
        assert len(route),f'No interior {phase} {"xyz"[axis]} loop'
        name='xyz'[axis];routes[name]=route.tolist();check=validate_route(routes[name],mask,name)
        transverse=[j for j in range(3) if j!=axis]
        check.update({'route_selection':'two-voxel eroded phase core, red c>=0.75 / blue c<=0.25; start near box centre; transverse coordinates bounded 32..223',
                      'minimum_transverse_box_clearance_voxels':int(np.minimum(route[:,transverse],n-1-route[:,transverse]).min()),
                      'composition_min':float(c[tuple(route.T)].min()),'composition_max':float(c[tuple(route.T)].max())})
        checks[name]=check
        print('Interior route',phase,name,check,flush=True)
    return routes,checks

def export_viewer(c,out,routes):
    """Extract the c=0.5 interface itself, without any artificial box-face caps.
    Both phases share this interface; normals point in opposite directions.
    """
    print('Extracting full-resolution c=0.5 isosurface (no caps)',flush=True)
    verts,faces,_,_=marching_cubes(c,level=.5,allow_degenerate=False)
    verts+=.5  # array samples are at voxel centres
    original=len(faces)
    verts,faces=fast_simplification.simplify(verts,faces,target_count=60000)
    vertices=np.round(np.clip(verts,.5,N-.5),3)
    normal=np.zeros_like(vertices);triangles=vertices[faces]
    face_normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
    for corner in range(3):np.add.at(normal,faces[:,corner],face_normals)
    norm=np.linalg.norm(normal,axis=1);norm[norm==0]=1;normal/=norm[:,None]
    meshes={}
    for phase in ('red','blue'):
        meshes[phase]={'vertices':vertices.tolist(),
                       'normals':np.round(normal if phase=='red' else -normal,5).tolist(),
                       'triangles':(faces if phase=='red' else faces[:,[0,2,1]]).tolist(),
                       'full_resolution_triangles':original,'isovalue':.5,'box_caps':False}
    viewer={'n':N,'threshold':.5,'routes':routes,'meshes':meshes,
            'display':'c=0.5 isosurface extracted at full resolution, no box-face caps, simplified to 60000 triangles; connectivity and routes use every saved voxel'}
    (out/'viewer.json').write_text(json.dumps(viewer,separators=(',',':')))
    print('Isosurface display triangles',len(faces),'from',original,flush=True)
    return {p:{'full_resolution_triangles':original,'display_triangles':len(faces),'isovalue':.5,'box_caps':False} for p in meshes}

def run(output):
    out=Path(output);out.mkdir(parents=True,exist_ok=True);start=time.perf_counter()
    print('Generating actual 256 x 256 x 256 field once',flush=True)
    rng=np.random.default_rng(SEED);c=.01*rng.standard_normal((N,N,N));c-=c.mean();c+=.5
    k=2*np.pi*fft.fftfreq(N,d=DX);kz=2*np.pi*fft.rfftfreq(N,d=DX)
    k2=k[:,None,None]**2+k[None,:,None]**2+kz[None,None,:]**2
    denom=1+DT*M*k2*(STABILIZATION+KAPPA*k2)
    prefactor=1+DT*M*STABILIZATION*k2
    ch=fft.rfftn(c,workers=WORKERS);ch[0,0,0]=.5*c.size
    weights=np.ones(ch.shape[-1]);weights[1:-1]=2
    def energy():
        bulk=float(np.sum(A*c*c*(1-c)**2))
        gradient=.5*KAPPA*np.sum(weights[None,None,:]*k2*(ch.real**2+ch.imag**2))/c.size
        return float((bulk+gradient)*DX**3)
    energies=[{'step':0,'energy':energy()}];max_drift=abs(float(c.mean())-.5)
    for step in range(1,STEPS+1):
        df=2*A*c*(1-c)*(1-2*c)
        dh=fft.rfftn(df,workers=WORKERS)
        ch=(prefactor*ch-DT*M*k2*dh)/denom
        c=fft.irfftn(ch,s=(N,N,N),workers=WORKERS)
        assert np.isfinite(c).all()
        max_drift=max(max_drift,abs(float(c.mean())-.5))
        if step%20==0:
            energies.append({'step':step,'energy':energy()})
            print('step',step,'time',step*DT,'energy',energies[-1]['energy'],'elapsed',round(time.perf_counter()-start),flush=True)
    assert max_drift<1e-10
    np.save(out/'composition.npy',c.astype(np.float32))
    # Assess precisely the stored field that students download.
    saved=np.load(out/'composition.npy');del c,ch,dh,df,k2,denom,prefactor
    report={'model':{'f':'A*c^2*(1-c)^2','A':A,'M':M,'kappa':KAPPA,'grid':[N]*3,'dx':DX,'box_length':N*DX,'dt':DT,'steps':STEPS,'time':DT*STEPS,'seed':SEED,'initial':'0.5 + zero-mean Gaussian noise, standard deviation 0.01','numpy_version':np.__version__,'units':'dimensionless','method':'stabilized semi-implicit Fourier, nonlinear f derivative explicit; stabilization S=2; no dealiasing','stabilization':STABILIZATION,'fft_workers':WORKERS},
            'mean':float(saved.mean(dtype=np.float64)),'max_mass_drift':max_drift,'dependencies':{p:version(p) for p in ('numpy','scipy','numba','scikit-image','fast-simplification')},'saved_precision':'float32; connectivity measured on saved field','min':float(saved.min()),'max':float(saved.max()),'energy_initial':energies[0]['energy'],'energy_final':energies[-1]['energy'],'energy_samples':energies,'maximum_sampled_energy_increase':max(np.diff([e['energy'] for e in energies])).item(),'thresholds':{},'routes':{}}
    allroutes={}
    for threshold in (.45,.5,.55):
        results={}
        for phase,mask in [('red',saved>=threshold),('blue',saved<threshold)]:
            print('Measuring full 256^3 graph',threshold,phase,flush=True)
            results[phase],_=analyze(mask,False)
            assert results[phase]['winding_rank']==3
            if threshold==.5:
                allroutes[phase],report['routes'][phase]=interior_routes(saved,phase)
            print(json.dumps(results[phase]),flush=True)
        report['thresholds'][str(threshold)]=results
    report['display_mesh']=export_viewer(saved,out,allroutes)
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print('Finished in',round(time.perf_counter()-start),'seconds',flush=True)
if __name__=='__main__':run(sys.argv[1] if len(sys.argv)>1 else 'bicontinuity-3d-output')
