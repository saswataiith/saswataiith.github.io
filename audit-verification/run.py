import os,sys,json,time,subprocess,pathlib,shutil,zipfile
root=pathlib.Path.cwd(); label=sys.argv[1]; reports=root/'audit-reports';reports.mkdir(exist_ok=True)
env=os.environ.copy();env.update(MPLBACKEND='Agg',OMP_NUM_THREADS='2',OPENBLAS_NUM_THREADS='1')
work=root/'audit-work';shutil.copytree(root,work,ignore=shutil.ignore_patterns('.git','audit-work','audit-reports'),dirs_exist_ok=True)
def execute(command,cwd,timeout=1800):
 start=time.time()
 with (reports/(label+'.log')).open('a') as f:
  f.write('COMMAND '+repr(command)+'\n');f.flush()
  try:r=subprocess.run(command,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=timeout);code=r.returncode
  except subprocess.TimeoutExpired:code='timeout'
 return dict(command=command,returncode=code,seconds=time.time()-start)
if label=='nrcm':
 d=work/'nrcm';zipfile.ZipFile(work/'files/mesoscale/nrcm-2014/spinodal-precipitate-sources.zip').extractall(d);results=[]
 for name,exe in [('Spinodal','spinodal.out'),('PptCodes1D','pptg.out'),('PptCodes2D','pptg.out')]:
  folder=d/'PFWorkshop2014'/name;p=folder/'InputParams';lines=p.read_text().splitlines();lines=[('numsteps 2000') if 'numsteps' in line else line for line in lines];p.write_text('\n'.join(lines)+'\n')
  results.append(execute(['make'],folder));results.append(execute(['./'+exe],folder))
else:
 manifest=json.loads((root/'audit-verification/manifest.json').read_text()); rel=manifest[label];p=work/rel;cwd=p.parent;args=[]
 photo=str(work/'assets/images/saswata-landscape.png');out=str(work/'audit-output'/label)
 if p.name.startswith('portrait_'):args=[photo,out] if p.name!='portrait_wrong_energy.py' else [photo,str(work/'assets/images/saswata-cubist.png'),out]
 elif p.name=='phase_field.py':args=['chemical',out]
 elif p.name=='monte_carlo.py':args=['ising',out]
 elif p.name in ('diffusion.py','walkers.py','bicontinuity.py','bicontinuity_3d.py') and 'stepwise' not in rel:args=[out]
 elif p.name=='connectivity_morphology.py':args=[str(work/'assets/examples/bicontinuity-3d/composition.npy'),out]
 elif p.name=='export_turtle_field.py':
  import numpy as np
  d=json.loads((work/'assets/examples/bicontinuity/turtle-field.json').read_text())
  # The published browser stores thresholded pixels, not the original composition.
  # Regenerate with the documented producer rather than fabricate input.
  producer=cwd/'bicontinuity.py';execute([sys.executable,str(producer),str(work/'bicontinuity_output')],cwd)
  args=[str(work/'bicontinuity_output/composition-0.5.npy'),str(work/'turtle-field.json')]
 elif p.name=='structure_correlation.py':execute([sys.executable,str(cwd/'ternary_spinodal.py')],cwd)
 if 'vpython' in p.name:
  args=[str(work/'assets/examples/bicontinuity-3d/viewer.json')]
  hook=work/'viewer-launch.py';urlfile=work/'viewer-url.txt'
  hook.write_text("import webbrowser,pathlib,runpy,sys,faulthandler\nfaulthandler.dump_traceback_later(120,repeat=True)\nurl_path=pathlib.Path(sys.argv[1])\nwebbrowser.open=lambda url,*a,**k:url_path.write_text(url)\nsys.argv=sys.argv[2:]\nrunpy.run_path(sys.argv[0],run_name='__main__')\n")
  stream=(reports/(label+'.log')).open('a');proc=subprocess.Popen([sys.executable,str(hook),str(urlfile),str(p),*args],cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT)
  result={'command':[str(p),*args],'returncode':None,'note':'Interactive browser check'}
  try:
   from playwright.sync_api import sync_playwright
   deadline=time.time()+90
   while not urlfile.exists() and proc.poll() is None and time.time()<deadline:time.sleep(1)
   if not urlfile.exists():raise RuntimeError('VPython did not open a browser URL; exit='+str(proc.poll()))
   with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(urlfile.read_text());page.wait_for_function("document.body.innerText.includes('Full-volume connectivity') || document.body.innerText.includes('Magenta records only')",timeout=600000);page.wait_for_timeout(5000)
    if proc.poll() is not None:raise RuntimeError('Viewer exited after creating controls: '+str(proc.returncode))
    if 'turtle' in p.name:
     import re
     steps=[]
     for phase in ('red','blue'):
      for direction in ('x','y','z'):
       page.locator('select').nth(0).select_option(phase);page.locator('select').nth(1).select_option(direction)
       prefix=phase+' · '+direction+' · step '
       page.wait_for_function('(prefix) => document.body.innerText.includes(prefix + "0/")',arg=prefix,timeout=15000)
       page.get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(1500);page.get_by_role('button',name='Pause',exact=True).click();page.wait_for_timeout(500)
       body=page.locator('body').inner_text();match=re.search(re.escape(prefix)+r'(\d+)/',body)
       if not match or int(match[1])==0:raise RuntimeError('Route did not advance: '+prefix)
       steps.append(dict(phase=phase,direction=direction,step=int(match[1])))
       page.get_by_role('button',name='Reset',exact=True).click();page.wait_for_timeout(500)
     result['animated_routes']=steps
    else:
     for phase in ('red','blue','both'):
      page.locator('select').select_option(phase);page.wait_for_timeout(1000)
     page.locator('input[type=checkbox]').nth(0).uncheck();page.wait_for_timeout(3000)
     page.get_by_role('button',name='Reset camera',exact=True).click();page.wait_for_timeout(1000)
    if proc.poll() is not None:raise RuntimeError('Viewer stopped during interaction: '+str(proc.returncode))
    result.update(returncode=0 if not errors else 1,page_errors=errors,body=page.locator('body').inner_text()[:2000]);page.screenshot(path=str(reports/(label+'.png')));browser.close()
  except Exception as e:
   result.update(returncode=1,error=str(e),process_exit=proc.poll())
   if 'errors' in locals():result['page_errors']=errors
   if 'page' in locals():
    try:page.screenshot(path=str(reports/(label+'-failure.png')))
    except Exception:pass
  finally:proc.terminate();stream.close()
  results=[result]
 else:results=[execute([sys.executable,str(p),*args],cwd)]
(reports/(label+'.json')).write_text(json.dumps(results,indent=2));print(results);sys.exit(0 if all(r['returncode']==0 for r in results) else 1)
