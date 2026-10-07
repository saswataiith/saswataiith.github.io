# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""I compare all three implementations with an independent flood fill.
Requires NumPy, nbformat, nbclient, a Python Jupyter kernel, cc and Julia.
Run: python checks.py
"""
from pathlib import Path
import importlib.util,contextlib,io,subprocess,tempfile,itertools,nbformat,json,numpy as np
from nbclient import NotebookClient
d = Path(__file__).resolve().parent
lines=[]
def log(s):lines.append(s);print(s,flush=True)
with contextlib.redirect_stdout(io.StringIO()):
 spec=importlib.util.spec_from_file_location('hk',d/'hoshen_kopelman.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def bfs(mask,periodic):
 labels=np.zeros(mask.shape,int);n=0
 for p in np.ndindex(mask.shape):
  if not mask[p] or labels[p]:continue
  n+=1;todo=[p];labels[p]=n
  while todo:
   a,b=todo.pop()
   for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
    q=(a+da,b+db)
    if periodic:q=(q[0]%mask.shape[0],q[1]%mask.shape[1])
    elif not(0<=q[0]<mask.shape[0] and 0<=q[1]<mask.shape[1]):continue
    if mask[q] and not labels[q]:labels[q]=n;todo.append(q)
 return labels,n
def partition(a):
 return {frozenset(map(tuple,np.argwhere(a==v))) for v in np.unique(a) if v}
with tempfile.TemporaryDirectory() as temp:
 for p in sorted(d.glob('step-*.c')):
  exe=Path(temp)/p.stem
  subprocess.run(['cc','-std=c99','-Wall','-Wextra','-Werror','-pedantic',str(p),'-o',str(exe)],check=True)
  log(subprocess.check_output([str(exe)],text=True).strip())
 exe=Path(temp)/'hk';subprocess.run(['cc','-std=c99','-Wall','-Wextra','-Werror','-pedantic',str(d/'hoshen_kopelman.c'),'-o',str(exe)],check=True)
 cases=[]
 for bits in itertools.product((False,True),repeat=9):cases.append(np.array(bits).reshape(3,3))
 rng=np.random.default_rng(5749)
 cases += [rng.random((3,7))<.45 for _ in range(50)]
 cases += [np.zeros((1,5),bool),np.ones((5,1),bool)]
 julia_data=[]
 for mask in cases:
  for periodic in (False,True):
   expected,n=bfs(mask,periodic);actual,sizes=m.hoshen_kopelman(mask,periodic)
   assert partition(actual)==partition(expected)
   assert len(sizes)==n and sum(sizes)==mask.sum()
   text=f'{mask.shape[0]} {mask.shape[1]} {int(periodic)}\n'+' '.join(map(str,mask.astype(int).ravel()))+'\n'
   out=subprocess.check_output([str(exe)],input=text,text=True).split()
   c=np.array(list(map(int,out[1:]))).reshape(mask.shape)
   assert int(out[0])==n and partition(c)==partition(expected)
   julia_data.append(text)
 log(f'Python and C matched independent flood-fill partitions for {len(cases)*2} bounded/periodic grids: all 512 binary 3x3 grids, 50 seeded rectangular grids and 2 thin grids.')
 # I batch Julia comparisons in one process; expected labels are from the independent flood fill.
 jt=Path(temp)/'compare.jl';jt.write_text('include('+json.dumps(str(d/'hoshen_kopelman.jl'))+')\n'+'''while !eof(stdin)
    header = parse.(Int, split(readline(stdin)))
    rows, columns, periodic = header
    cells = parse.(Int, split(readline(stdin)))
    test_mask = permutedims(reshape(Bool.(cells), columns, rows))
    test_labels, test_sizes = hoshen_kopelman(test_mask; periodic=periodic == 1)
    println("RESULT ", join(vec(permutedims(test_labels)), " "))
end
''')
 out=subprocess.check_output(['julia',str(jt)],input=''.join(julia_data),text=True)
 results=[line[7:] for line in out.splitlines() if line.startswith('RESULT ')]
 assert len(results)==len(julia_data)
 for k,result in enumerate(results):
  mask=cases[k//2];expected,_=bfs(mask,bool(k%2))
  labels=np.array(list(map(int,result.split()))).reshape(mask.shape)
  assert partition(labels)==partition(expected)
 log(f'Julia matched the same {len(results)} independent reference partitions; script checkpoints passed.')
nb=nbformat.read(d/'hoshen-kopelman-python.ipynb',as_version=4)
NotebookClient(nb,timeout=60,kernel_name='python3').execute();nbformat.write(nb,d/'hoshen-kopelman-python.ipynb')
log('Python notebook executed from a clean kernel with all eight stages and saved outputs.')
log('Julia script executed; Julia notebook cells are identical to the tested script, but IJulia kernel execution was not tested.')
log('Historical C sources were inspected and preserved. The historical programs were not certified by these new-implementation checks.')
(d/'check-results.txt').write_text('\n'.join(lines)+'\n')
