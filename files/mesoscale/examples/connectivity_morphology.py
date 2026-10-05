"""Hoshen–Kopelman style labeling, periodic winding, and interface morphology.
Uses the saved field; never evolves it. Install numpy scipy numba scikit-image.
Run: python connectivity_morphology.py composition.npy output_directory
"""
from pathlib import Path
import sys,json,gzip,time
import numpy as np
from numba import njit
from scipy import ndimage
from skimage.measure import marching_cubes
from skimage.measure._regionprops_utils import EULER_COEFS3D_26

@njit(cache=True)
def root_offset(parent,offset,u):
    r=u;delta=np.zeros(3,np.int32)
    while parent[r]!=r:
        delta+=offset[r];r=parent[r]
    v=u;prefix=np.zeros(3,np.int32)
    while parent[v]!=v:
        nxt=parent[v];old=offset[v].copy();parent[v]=r;offset[v]=delta-prefix
        prefix+=old;v=nxt
    return r,delta

@njit(cache=True)
def hk_scan(mask,periodic=True):
    """Scan occupied cells, union predecessor labels, then join periodic seams.
    Offsets encode lifted displacement from a root. Equal-root edges reveal
    winding loops. Background labels are -1. Work arrays use one slot per voxel.
    """
    n=mask.shape[0];size=mask.size;flat=mask.ravel()
    parent=np.arange(size,dtype=np.int32);offset=np.zeros((size,3),np.int32)
    height=np.zeros(size,np.uint8);strides=np.array([n*n,n,1]);loops=[]
    for seam in range(2 if periodic else 1):
        for u in range(size):
            if not flat[u]:continue
            coords=np.array([u//(n*n),(u//n)%n,u%n])
            for axis in range(3):
                if seam==0:
                    if coords[axis]==0:continue
                    v=u-strides[axis];step=-1
                else:
                    if coords[axis]!=n-1:continue
                    v=u-(n-1)*strides[axis];step=1
                if not flat[v]:continue
                ru,du=root_offset(parent,offset,u);rv,dv=root_offset(parent,offset,v)
                difference=du-dv;difference[axis]+=step
                if ru==rv:
                    assert np.all(difference%n==0)
                    if np.any(difference):loops.append((ru,difference[0]//n,difference[1]//n,difference[2]//n))
                elif height[ru]>=height[rv]:
                    parent[rv]=ru;offset[rv]=difference
                    if height[ru]==height[rv]:height[ru]+=1
                else:parent[ru]=rv;offset[ru]=-difference
    labels=np.full(size,-1,np.int32)
    for u in range(size):
        if flat[u]:labels[u]=root_offset(parent,offset,u)[0]
    # Loops may have been recorded before their root was merged.
    records=np.zeros((len(loops),4),np.int32)
    for i in range(len(loops)):
        records[i,0]=root_offset(parent,offset,loops[i][0])[0]
        for j in range(3):records[i,j+1]=loops[i][j+1]
    return labels.reshape(mask.shape),records

def label_phase(mask,periodic=True):
    if mask.ndim != 3 or len(set(mask.shape)) != 1 or mask.shape[0] < 3:
        raise ValueError("Expected a cubic 3D mask with at least three voxels per axis")
    labels,loops=hk_scan(mask,periodic)
    roots,counts=np.unique(labels[labels>=0],return_counts=True)
    basis={int(r):[] for r in roots}
    for record in loops:
        vectors=basis[int(record[0])];w=record[1:]
        if len(vectors)<3 and np.linalg.matrix_rank(np.array(vectors+[w.tolist()],float))>len(vectors):vectors.append(w.tolist())
    total=int(counts.sum());order=np.argsort(-counts)
    components=[{'root':int(roots[i]),'voxels':int(counts[i]),'winding_rank':len(basis[int(roots[i])]),'winding_basis':basis[int(roots[i])]} for i in order]
    return labels,{'components':len(roots),'phase_voxels':total,'phase_fraction':total/mask.size,
                   'largest_fraction_of_phase':int(counts.max())/total if total else 0,'clusters':components,
                   'method':'Hoshen–Kopelman style scan / union–find; weighted root displacements; per-component winding',
                   'neighbors':6,'periodic':periodic}

@njit(cache=True)
def flood_distance(mask,root):
    n=mask.shape[0];size=mask.size;flat=mask.ravel();distance=np.full(size,65535,np.uint16)
    queue=np.empty(size,np.int32);head=0;tail=1;queue[0]=root;distance[root]=0
    while head<tail:
        u=queue[head];head+=1;x=u//(n*n);y=(u//n)%n;z=u%n
        for axis in range(3):
            stride=n*n if axis==0 else n if axis==1 else 1
            coordinate=x if axis==0 else y if axis==1 else z
            for step in (-1,1):
                v=u+step*stride
                if coordinate+step<0:v+=n*stride
                if coordinate+step>=n:v-=n*stride
                if flat[v] and distance[v]==65535:
                    assert distance[u]<32766
                    distance[v]=distance[u]+1;queue[tail]=v;tail+=1
    return distance.reshape(mask.shape),tail

def periodic_euler(mask,neighbors=6):
    """Ohser digital Euler LUT as in skimage, with periodic rather than zero edges.
    6-connected foreground uses 26-connected background; 26 reverses this.
    LUT coefficients are from scikit-image (BSD-3-Clause), not historical code.
    """
    config=np.zeros((3,3,3),int)
    config[1:,1:,1:]=np.array([[[1,4],[2,8]],[[16,64],[32,128]]])
    code=ndimage.convolve(mask.astype(np.uint8),config,mode='wrap',output=np.uint8)
    hist=np.bincount(code.ravel(),minlength=256)
    coefficients=np.array(EULER_COEFS3D_26)[::-1] if neighbors==6 else np.array(EULER_COEFS3D_26)
    numerator=int(coefficients@hist);assert numerator%8==0
    return numerator//8

def interface_morphology(c,dx):
    """Full-resolution periodic c=.5 interface. Include seam cells explicitly.
    Mesh area/curvature use actual triangles before any display simplification.
    The oriented normals point out of the high-c phase (checked on test balls).
    """
    n=c.shape[0];extended=np.pad(c,((0,1),)*3,mode='wrap')
    vertices,faces,_,_=marching_cubes(extended,.5,allow_degenerate=False,gradient_direction="ascent")
    triangles=vertices[faces].astype(np.float64)*dx
    cross=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
    lengths=np.linalg.norm(cross,axis=1);normals=cross/lengths[:,None]
    area=float(.5*lengths.sum())
    # Weld periodic endpoints at a tolerance far below the voxel spacing.
    coordinates=np.round(np.mod(vertices,n),6)
    coordinates[coordinates>=n-1e-6]=0
    _,inverse=np.unique(coordinates,axis=0,return_inverse=True)
    welded=inverse[faces]
    oriented=np.concatenate([welded[:,[0,1]],welded[:,[1,2]],welded[:,[2,0]]])
    edge_positions=np.concatenate([triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,1],triangles[:,0]-triangles[:,2]])
    face_ids=np.tile(np.arange(len(faces)),3)
    sorted_edges=np.sort(oriented,axis=1);order=np.lexsort((sorted_edges[:,1],sorted_edges[:,0]))
    keys=sorted_edges[order];starts=np.r_[0,1+np.flatnonzero(np.any(keys[1:]!=keys[:-1],axis=1))]
    counts=np.diff(np.r_[starts,len(keys)]);closed=bool(np.all(counts==2))
    answer={'threshold':.5,'surface_area':area,'units':'dimensionless; dx applied',
            'vertices':int(len(np.unique(welded))),'edges':int(len(starts)),'triangles':int(len(faces)),
            'edge_incidence_two':closed,'boundary_or_nonmanifold_edges':int(np.count_nonzero(counts!=2)),
            'periodic_welding_tolerance_voxels':1e-6,'display_mesh_used':False}
    if not closed:return answer
    a=order[starts];b=order[starts+1]
    coherent=bool(np.all(oriented[a,0]==oriented[b,1]) and np.all(oriented[a,1]==oriented[b,0]))
    answer['coherent_orientation']=coherent
    if not coherent:return answer
    chi=answer['vertices']-answer['edges']+answer['triangles'];answer['surface_euler']=chi
    # Mesh surface components via a simple sparse graph (surface, not phase).
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    edges=keys[starts];nv=int(inverse.max()+1)
    graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(nv,nv))
    components=connected_components(graph,directed=False,return_labels=False)
    answer['surface_components']=int(components);answer['sum_surface_genera']=int(components-chi//2)
    assert chi%2==0
    direction=edge_positions[a];edge_length=np.linalg.norm(direction,axis=1);direction/=edge_length[:,None]
    na=normals[face_ids[a]];nb=normals[face_ids[b]]
    theta=np.arctan2(np.einsum('ij,ij->i',direction,np.cross(na,nb)),np.einsum('ij,ij->i',na,nb))
    answer['integrated_mean_curvature_high_c_outward']=float(.5*np.sum(edge_length*theta))
    answer['integrated_gaussian_curvature']=float(2*np.pi*chi)
    answer['curvature_convention']='H=(k1+k2)/2; convex high-c ball has positive integrated H; K integral from Gauss–Bonnet'
    return answer

def run(field,output,dx=.25):
    out=Path(output);out.mkdir(parents=True,exist_ok=True);c=np.load(field);n=c.shape[0]
    report={'field':Path(field).name,'grid':list(c.shape),'dx':dx,'thresholds':{},'morphology':{}}
    packed=np.zeros(c.shape,np.uint16);flood={}
    for threshold in (.45,.5,.55):
        results={}
        for phase,mask in [('red',c>=threshold),('blue',c<threshold)]:
            print('Labeling',threshold,phase,flush=True);labels,result=label_phase(mask)
            result['digital_euler_6']=periodic_euler(mask,6);result['digital_euler_26']=periodic_euler(mask,26)
            result['volume']=int(mask.sum())*dx**3;results[phase]=result
            if threshold==.5:
                assert result['components']==1
                center=np.array([n//2]*3);occupied=np.argwhere(mask)
                root=occupied[np.argmin(np.sum((occupied-center)**2,axis=1))];del occupied
                distance,reached=flood_distance(mask,int(np.ravel_multi_index(tuple(root),mask.shape)))
                assert reached==result['phase_voxels']
                packed[mask]=distance[mask]+(32768 if phase=='red' else 0)
                flood[phase]={'root':root.tolist(),'reached_voxels':reached,'maximum_distance':int(distance[mask].max()),
                              'distance':'shortest face-sharing steps from one seed, on the full periodic phase graph'}
            del labels
            print(json.dumps(result),flush=True)
        report['thresholds'][str(threshold)]=results
    report['flood']=flood
    with gzip.open(out/'phase-flood.bin.gz','wb',compresslevel=9) as f:f.write(packed.astype('<u2').tobytes())
    print('Measuring full-resolution periodic interface',flush=True)
    report['morphology']=interface_morphology(c,dx)
    report['morphology']['source']='New implementation inspired by morphological measures studied by Fiałkowski–Aksimentiev–Hołyst; not their recovered C code.'
    (out/'analysis.json').write_text(json.dumps(report,indent=2))
    print('Morphology',json.dumps(report['morphology']),flush=True)
    return report
if __name__=='__main__':run(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else 'connectivity-output')
