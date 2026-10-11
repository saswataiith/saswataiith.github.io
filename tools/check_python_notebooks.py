"""I execute the new notebooks from fresh Python kernels.
Requires nbformat, nbclient and each lesson's listed dependencies.
The optional full-volume runs and interactive viewer loops remain disabled.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import nbformat, json, shutil, time
from nbclient import NotebookClient
root=Path(__file__).resolve().parents[1]
lessons=json.loads((root/'tools/python-notebook-lessons.json').read_text())
def execute(lesson):
 start=time.monotonic();folder=Path('/tmp/python-notebook-checks')/lesson['slug'];folder.mkdir(parents=True,exist_ok=True)
 data=folder/'lesson-data';data.mkdir(exist_ok=True)
 for asset in ['assets/images/saswata-landscape.png','assets/images/saswata-cubist.png','assets/examples/bicontinuity/composition-0.5.npy','assets/examples/bicontinuity-3d/viewer.json']:
  shutil.copyfile(root/asset,data/Path(asset).name)
 p=root/lesson['notebook'].lstrip('/');n=nbformat.read(p,4)
 try:
  NotebookClient(n,timeout=900,kernel_name='python3',resources={'metadata':{'path':str(folder)}}).execute()
  nbformat.write(n,p)
  result=dict(slug=lesson['slug'],status='passed',seconds=round(time.monotonic()-start,2),code_cells=sum(c.cell_type=='code' for c in n.cells),scope='required cells; interactive viewer disabled; optional full-volume runs disabled' if lesson['mode'] in ('viewer','large') else 'required cells; optional full-size Monte Carlo run disabled' if lesson['slug']=='monte-carlo' else 'all cells including original full default run')
 except Exception as e:
  result=dict(slug=lesson['slug'],status='failed',error=str(e)[-4500:])
 print(json.dumps(result),flush=True)
 return result
results=[]
with ThreadPoolExecutor(max_workers=3) as pool:
 futures=[pool.submit(execute,lesson) for lesson in lessons]
 for f in as_completed(futures):results.append(f.result())
(root/'files/mesoscale/examples/notebooks/notebook-check-results.json').write_text(json.dumps(sorted(results,key=lambda r:r['slug']),indent=2)+'\n')
assert all(r['status']=='passed' for r in results)
