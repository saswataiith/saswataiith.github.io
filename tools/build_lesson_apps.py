"""I export notebook code and recorded results for the interactive lesson apps.
Run: python tools/build_lesson_apps.py
I execute only the small, unchanged structure/correlation lesson for its diagrams.
Dependencies: NumPy and Matplotlib. Other notebook cells are not re-executed here.
"""
from pathlib import Path
import base64, contextlib, io, json, re, hashlib, warnings
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/lesson-apps'
OUT.mkdir(parents=True, exist_ok=True)
SHORT = ['diffusion','walkers','phase-field','monte-carlo','ternary-spinodal','structure-correlation']

def source(cell):
    text = cell['source']
    return ''.join(text) if isinstance(text,list) else text

def export(notebook_path, name):
    notebook = json.loads(notebook_path.read_text())
    frames = []
    title, explanation = 'Initial setup', 'I begin with the setup used in this notebook.'
    for index, cell in enumerate(notebook['cells']):
        text = source(cell)
        if cell['cell_type'] == 'markdown':
            if text.startswith('## '):
                title, _, explanation = text[3:].partition('\n\n')
            continue
        output_text, images = [], []
        for output in cell.get('outputs',[]):
            if output.get('output_type') == 'error':
                raise ValueError(f'Recorded error in {notebook_path}, cell {index}')
            if output.get('output_type') == 'stream':
                value = output['text']; output_text.append(''.join(value) if isinstance(value,list) else value)
            data = output.get('data',{})
            if 'image/png' in data:
                value=data['image/png']; value=''.join(value) if isinstance(value,list) else value
                image_name=f'{name}-{len(frames)+1}-{len(images)+1}.png'
                (OUT/image_name).write_bytes(base64.b64decode(value))
                images.append('/assets/lesson-apps/'+image_name)
            elif 'text/plain' in data:
                value=data['text/plain']; output_text.append(''.join(value) if isinstance(value,list) else value)
        frames.append(dict(title=title,logic=explanation,code=text,cell=index,
                           executed=cell.get('execution_count') is not None,
                           output='\n'.join(output_text),images=images))
    result=dict(name=name,notebook='/'+str(notebook_path.relative_to(ROOT)),frames=frames)
    if name=='short-structure-correlation':
        import matplotlib
        matplotlib.use('Agg')
        namespace={}
        for cell in notebook['cells']:
            if cell['cell_type']=='code':
                with contextlib.redirect_stdout(io.StringIO()), warnings.catch_warnings():
                    warnings.filterwarnings("ignore", message="FigureCanvasAgg is non-interactive.*", category=UserWarning)
                    exec(compile(source(cell),str(notebook_path),'exec'),namespace)
        import numpy as np
        field=namespace['fluctuation']; variance=namespace['variance']
        lags=[]
        for shift in range(field.shape[0]):
            shifted=np.roll(field,shift,axis=0); product=field*shifted
            mean=float(product.mean()); normalized=mean/variance
            assert abs(normalized-namespace['correlation'][shift,0]) < 1e-12
            lags.append(dict(shift=shift,shifted=shifted.tolist(),product=product.tolist(),
                             covariance=mean,correlation=normalized))
        result['correlationDemo']=dict(composition=namespace['composition'].tolist(),
            fluctuation=field.tolist(),spectrum=np.fft.fftshift(namespace['structure']).tolist(),
            correlation=namespace['correlation'].tolist(),variance=float(variance),lags=lags,
            radialR=namespace['r'].tolist(),radialC=namespace['radial_correlation'].tolist())
    path=OUT/(name+'.json')
    path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]

def install(page, name, revision):
    text=page.read_text()
    text=re.sub(r'<!-- LESSON-APP-START -->[\s\S]*?<!-- LESSON-APP-END -->\n?', '', text)
    app=f'''<!-- LESSON-APP-START -->
<link rel="stylesheet" href="/assets/css/lesson-app.css?v=1">
<section class="lesson-app" id="code-walkthrough" data-lesson-src="/assets/lesson-apps/{name}.json?v={revision}" aria-label="Interactive code lesson">
<h2>The calculation, one step at a time</h2>
<p>I show the purpose of each notebook cell beside its code and recorded result. The controls move through those results; they do not execute Python in the browser. The notebook remains available for running or changing the calculation.</p>
<p class="la-loading" role="status">Loading the lesson…</p>
</section>
<script src="/assets/js/lesson-app.js?v=1" defer></script>
<!-- LESSON-APP-END -->
'''
    if '<!-- CODE-STEPS-START -->' in text:
        text=text.replace('<!-- CODE-STEPS-START -->',app+'<!-- CODE-STEPS-START -->',1)
    else:
        marker='<section class="section python-lesson">'
        assert marker in text,page
        text=text.replace(marker,marker+'\n'+app,1)
    page.write_text(text)

for name in SHORT:
    notebook=ROOT/'files/mesoscale/examples/stepwise'/(name+'-python.ipynb')
    revision=export(notebook,'short-'+name)
    page='structure-correlation.html' if name=='structure-correlation' else 'code-'+name+'.html'
    install(ROOT/'_pages'/page,'short-'+name,revision)
for lesson in json.loads((ROOT/'tools/python-notebook-lessons.json').read_text()):
    name='python-'+lesson['slug']
    revision=export(ROOT/lesson['notebook'].lstrip('/'),name)
    install(ROOT/'_pages'/(name+'.html'),name,revision)
print('I updated 23 notebook-based lesson apps; existing notebook code and outputs are unchanged.')
