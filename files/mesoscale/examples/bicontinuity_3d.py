"""Dimensionless periodic Cahn–Hilliard example. See bicontinuity-3d.html.
Usage: python bicontinuity_3d.py OUTPUT_DIRECTORY
Requires numpy. Outputs composition.npy, viewer.json and report.json.
"""
from collections import deque
from pathlib import Path
import json, sys
import numpy as np

N, SEED, DT, STEPS = 24, 20261005, 0.1, 1200
A = M = KAPPA = DX = 1.0
STEPS6 = [tuple(s if j == a else 0 for j in range(3)) for a in range(3) for s in (-1, 1)]

def analyze(mask, routes=False):
    """Lift a periodic six-neighbour graph to Z^3; cycles give true windings.
    Tree paths plus a non-tree edge give explicit closed voxel routes.
    Rank is measured from all winding vectors, not opposite-face contact.
    """
    shape = np.array(mask.shape)
    visited, lift, parent = set(), {}, {}
    components, saved = [], {}
    for v in map(tuple, np.argwhere(mask)):
        if v in visited: continue
        visited.add(v); lift[v] = np.zeros(3, dtype=int); parent[v] = None
        queue = deque([v]); size = 0; windings = set()
        while queue:
            u = queue.popleft(); size += 1
            for step in STEPS6:
                w = tuple((np.array(u) + step) % shape)
                if not mask[w]: continue
                proposed = lift[u] + step
                if w not in visited:
                    visited.add(w); lift[w] = proposed; parent[w] = u; queue.append(w)
                else:
                    delta = proposed - lift[w]
                    assert np.all(delta % shape == 0)
                    winding = tuple(delta // shape)
                    if not any(winding): continue
                    windings.add(winding)
                    if routes and sum(abs(x) for x in winding) == 1:
                        axis = 'xyz'[next(i for i,x in enumerate(winding) if x)]
                        if axis in saved: continue
                        def chain(p):
                            path = []
                            while p is not None: path.append(p); p = parent[p]
                            return path[::-1]
                        pu, pw = chain(u), chain(w)
                        k = 0
                        while k < min(len(pu), len(pw)) and pu[k] == pw[k]: k += 1
                        route = pu[k-1:] + list(reversed(pw[k-1:]))
                        if sum(winding) < 0: route.reverse()
                        saved[axis] = [list(map(int,p)) for p in route]
        vectors = np.array(sorted(windings), dtype=int).reshape(-1,3)
        components.append({'voxels':size, 'winding_rank':int(np.linalg.matrix_rank(vectors)) if len(vectors) else 0,
                           'wrap_xyz': [bool(np.any(vectors[:,i])) if len(vectors) else False for i in range(3)]})
    total = int(mask.sum())
    return {'phase_fraction':float(mask.mean()), 'components':len(components),
            'largest_fraction_of_phase':max((x['voxels'] for x in components), default=0)/max(1,total),
            'component_details':components}, saved

def validate_route(route, mask, axis):
    points = np.array(route); n = np.array(mask.shape)
    assert np.all(mask[tuple(points.T)]) and np.array_equal(points[0],points[-1])
    d = np.diff(points,axis=0); d = (d+n//2)%n-n//2
    assert np.all(np.abs(d).sum(axis=1)==1)
    target=np.zeros(3,dtype=int); target['xyz'.index(axis)]=1
    assert np.array_equal(d.sum(axis=0), target*n)
    return {'steps':len(route)-1,'winding':target.tolist(),'valid':True}

def run(output):
    out=Path(output); out.mkdir(parents=True,exist_ok=True)
    rng=np.random.default_rng(SEED); noise=.01*rng.standard_normal((N,N,N)); noise-=noise.mean(); c=.5+noise
    k=2*np.pi*np.fft.fftfreq(N,d=DX); k2=k[:,None,None]**2+k[None,:,None]**2+k[None,None,:]**2
    def energy(c):
        ch=np.fft.fftn(c)
        return float(np.sum(A*c*c*(1-c)**2)*DX**3 + KAPPA*.5*np.sum(k2*np.abs(ch)**2)/c.size*DX**3)
    energies=[energy(c)]; max_drift=0.
    for step in range(STEPS):
        df=2*A*c*(1-c)*(1-2*c)
        c=np.fft.ifftn((np.fft.fftn(c)-DT*M*k2*np.fft.fftn(df))/(1+DT*M*KAPPA*k2**2)).real
        assert np.isfinite(c).all()
        max_drift=max(max_drift,abs(float(c.mean())-.5)); energies.append(energy(c))
    assert max_drift < 1e-12
    report={'model':{'f':'A*c^2*(1-c)^2','A':A,'M':M,'kappa':KAPPA,'grid':[N]*3,'dx':DX,'dt':DT,'steps':STEPS,'time':DT*STEPS,'seed':SEED,'initial':'0.5 + zero-mean Gaussian noise, standard deviation 0.01','numpy_version':np.__version__,'units':'dimensionless','method':'semi-implicit Fourier: nonlinear f derivative explicit, gradient term implicit; no dealiasing'},
            'mean':float(c.mean()),'max_mass_drift':max_drift,'min':float(c.min()),'max':float(c.max()),'energy_initial':energies[0],'energy_final':energies[-1],'maximum_energy_step_increase':float(max(np.diff(energies))),'thresholds':{},'routes':{}}
    allroutes={}
    for threshold in (.45,.5,.55):
        results={}
        for phase, mask in [('red',c>=threshold),('blue',c<threshold)]:
            results[phase], routes=analyze(mask,threshold==.5)
            if threshold==.5:
                assert set(routes)==set('xyz'), 'Missing axis route'
                allroutes[phase]=routes
                report['routes'][phase]={a:validate_route(r,mask,a) for a,r in routes.items()}
            assert results[phase]['components']==1 and results[phase]['component_details'][0]['winding_rank']==3
        report['thresholds'][str(threshold)]=results
    np.save(out/'composition.npy',c)
    (out/'report.json').write_text(json.dumps(report,indent=2))
    (out/'viewer.json').write_text(json.dumps({'n':N,'threshold':.5,'red':np.argwhere(c>=.5).tolist(),'blue':np.argwhere(c<.5).tolist(),'routes':allroutes},separators=(',',':')))
    print(json.dumps(report,indent=2))
if __name__=='__main__': run(sys.argv[1] if len(sys.argv)>1 else 'bicontinuity-3d-output')
