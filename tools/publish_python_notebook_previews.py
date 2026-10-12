"""I render the tested notebook cells as website lessons.
Run after executing notebooks: python tools/publish_python_notebook_previews.py
Requires nbformat and markdown. I do not run numerical calculations here.
"""
from pathlib import Path
import json,re,html,base64
import nbformat
import markdown
ROOT=Path(__file__).resolve().parents[1]
lessons=json.loads((ROOT/'tools/python-notebook-lessons.json').read_text())
style='''<style>.python-lesson{max-width:1050px}.python-lesson pre{overflow-x:auto;background:#eef3f0;border:1px solid #d4dfd9;padding:20px;font:14px/1.65 ui-monospace,monospace}.python-lesson h2{margin-top:40px}.python-lesson p,.python-lesson li{line-height:1.8}.python-lesson details{margin:20px 0;padding:18px;background:#f1f5f2}.python-lesson summary{cursor:pointer;font-weight:600}.python-lesson img{max-width:100%;height:auto}.cell-result{padding:12px;background:#f7f8f6}.python-lesson .formula-box{overflow-x:auto}</style>'''
def render_markdown(text):
 text=re.sub(r"^(## )([0-9]+)\. ", r"\1Step \2: ", text, flags=re.M)
 math=[]
 def hold(match):
  math.append(match.group());return 'MATHPLACEHOLDER'+str(len(math)-1)+'END'
 text=re.sub(r'\$\$[\s\S]*?\$\$|\$[^$\n]+\$',hold,text)
 result=markdown.markdown(text,extensions=['fenced_code','tables'])
 for i,value in enumerate(math):
  display=value.startswith('$$');contents=value[2:-2] if display else value[1:-1]
  result=result.replace('MATHPLACEHOLDER'+str(i)+'END',('\\[' if display else '\\(')+html.escape(contents)+('\\]' if display else '\\)'))
 return result
for lesson in lessons:
 n=nbformat.read(ROOT/lesson['notebook'].lstrip('/'),4)
 title=lesson['title'];slug=lesson['slug']
 blocks=[f'''---
layout: scholar
title: {json.dumps(title)}
permalink: /resources/python/{slug}/
nav_active: resources
description: {json.dumps('I develop '+title.lower()+' in explained Python cells, with numerical checks and a downloadable notebook.')}
---
''',style,'<section class="page-heading"><span class="eyebrow">PYTHON · STEP-BY-STEP LESSON</span><h1>'+html.escape(title)+'</h1><p>I write a small part, check it, and then add the next part.</p><p><a class="button primary" href="'+lesson['notebook']+'" download>Download the notebook ↓</a> <a class="button secondary" href="https://colab.research.google.com/github/saswataiith/saswataiith.github.io/blob/master'+lesson['notebook']+'">Open in Colab ↗</a></p><p><a href="/resources/python-notebooks/">All Python notebook lessons →</a></p></section><section class="section python-lesson">']
 if lesson['mode']=='viewer':
  blocks[-1]=blocks[-1].replace('<a class="button secondary" href="https://colab.research.google.com/github/saswataiith/saswataiith.github.io/blob/master'+lesson['notebook']+'">Open in Colab ↗</a>','')
  blocks.append('<p><strong>Local Jupyter is required for the native VPython display.</strong> The checked default cells inspect routes without opening a scene. Set <code>open_viewer=True</code> and run the remaining cells interactively; interrupt the final event loop when finished.</p>')
 if lesson['mode']=='large':blocks.append('<p><strong>The full 256³ calculation is optional.</strong> Small exact-mask checks run by default. Set <code>run_full_calculation=True</code> only when enough memory and time are available. I have not rerun the optional full-volume calculation for this notebook conversion.</p>')
 for idx,c in enumerate(n.cells):
  if c.cell_type=='markdown':blocks.append(render_markdown(c.source.split('\n',1)[1] if idx==0 else c.source))
  else:
   code='<pre><code class="language-python">'+html.escape(c.source)+'</code></pre>'
   if len(c.source.splitlines())>35 and not c.metadata.get('keep_visible',False):code='<details><summary>Read this complete operation ('+str(len(c.source.splitlines()))+' lines)</summary>'+code+'</details>'
   blocks.append(code)
   for output in c.get('outputs',[]):
    if output.get('output_type')=='stream':blocks.append('<pre class="cell-result">'+html.escape(output['text'])+'</pre>')
    elif 'image/png' in output.get('data',{}):
     path=ROOT/'assets/images/python-lessons'/f'{slug}-{idx}.png';path.parent.mkdir(exist_ok=True)
     path.write_bytes(base64.b64decode(output['data']['image/png']))
     blocks.append('<figure><img loading="lazy" src="/'+str(path.relative_to(ROOT))+'" alt="Computed result from the '+html.escape(title)+' notebook"><figcaption>Result from the executed notebook cell.</figcaption></figure>')
 blocks.append('<p><a href="/files/mesoscale/examples/notebooks/notebook-check-results.json">Read the notebook execution checks →</a> · <a href="/resources/step-by-step-codes/">More Python, Julia and C lessons →</a></p></section>')
 (ROOT/'_pages'/('python-'+slug+'.html')).write_text('\n'.join(blocks)+'\n')
print('Rendered',len(lessons),'notebook lessons')

# I keep both the new collection and the course bundle in sync with the cells.
import zipfile
examples=ROOT/'files/mesoscale/examples'
folder=examples/'notebooks'
with zipfile.ZipFile(examples/'python-notebook-lessons.zip','w',zipfile.ZIP_DEFLATED) as bundle:
    for source in sorted(folder.iterdir()):
        bundle.write(source,'notebooks/'+source.name)
    for name in ('README.md','LICENSING.md','CODE-USE-TERMS.txt'):
        bundle.write(examples/name,name)
archive=ROOT/'files/mesoscale/MS5033-Julia-NumPy-Examples.zip'
with zipfile.ZipFile(archive) as bundle:
    entries=[(info,bundle.read(info.filename)) for info in bundle.infolist()]
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
    for info,data in entries:
        if info.filename.startswith('notebooks/'):
            continue
        source=examples/info.filename
        bundle.writestr(info,source.read_bytes() if source.is_file() else data)
    for source in sorted(folder.iterdir()):
        bundle.write(source,'notebooks/'+source.name)
