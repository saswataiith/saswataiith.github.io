"""I add observations and plots to the notebook lessons without changing their updates."""
from pathlib import Path
import nbformat as nb,ast,textwrap
root=Path(__file__).resolve().parents[1]
folder=root/'files/mesoscale/examples/notebooks'
for p in folder.glob('*.ipynb'):
 n=nb.read(p,4)
 if 'Copyright (c)' not in n.cells[0].source:
  n.cells[0].source += '\n\nCopyright (c) 2026 Saswata Bhattacharyya.'
 # I place the frame-writing function after the small numerical experiments.
 if p.stem=='portrait-minimum':
  idx=next(i for i,c in enumerate(n.cells) if c.cell_type=='code' and c.source.startswith('def run_example('))
  pair=n.cells[idx-1:idx+1];del n.cells[idx-1:idx+1]
  insert=next(i for i,c in enumerate(n.cells) if c.cell_type=='code' and c.source=='run_example(portrait, output, color=True)')
  n.cells[insert:insert]=pair
 # I make the viewer opt-in control a separate cell so it is easy to rerun.
 if p.stem in ('turtle-vpython','percolation-vpython'):
  for c in n.cells:
   if c.cell_type=='code' and 'open_viewer = False' in c.source:
    c.source=c.source.replace('open_viewer = False','')
    idx=n.cells.index(c)
    n.cells[idx+1:idx+1]=[nb.v4.new_markdown_cell('## Choose whether to open the interactive viewer\n\nI first run the data checks with this setting left False. To use the viewer in local Jupyter, change it to True, run this cell, then run the cells below it in order. The last cell runs until I interrupt the kernel. I must restart the kernel before rebuilding a second scene.'),nb.v4.new_code_cell('open_viewer = False')]
    break
 # I renumber the visible stages after adding or moving a section.
 num=0
 for c in n.cells:
  if c.cell_type=='markdown' and c.source.startswith('## '):
   num+=1
   import re
   c.source=re.sub(r'^## (?:\d+\. )?',f'## {num}. ',c.source)
 nb.write(n,p)

plots={
'diffusion':('Plot both modes and the conserved mean','I compare the profiles at the saved times. The rapidly varying mode fades first, while the mean remains 1. The horizontal coordinate and concentration are dimensionless.', '''import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(8, 4))
for t in (0, .02, .1, .3, 1.):
    profile = np.loadtxt(out / f"profile_{t:.2f}.csv", delimiter=",")
    ax.plot(profile[:, 0], profile[:, 1], label=f"t={t}")
ax.set_xlabel("Dimensionless position x")
ax.set_ylabel("Dimensionless concentration c")
ax.legend()
plt.show()'''),
'walkers':('Compare the numerical MSD with its prediction','I compare MSD with the number of sweeps. In these units the prediction is MSD=steps. Agreement concerns an ensemble, not an individual walker path. The density image is a normalized count per unit lattice bin.', '''import matplotlib.pyplot as plt
records = np.asarray(rows)
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].plot(records[:, 0], records[:, 1], label="Measured")
axes[0].plot(records[:, 0], records[:, 2], "--", label="Theory")
axes[0].set_xlabel("Sweeps")
axes[0].set_ylabel("MSD (lattice-step squared)")
axes[0].legend()
axes[1].imshow(hist.T / n, origin="lower", extent=(-128, 128, -128, 128))
axes[1].set_title("Density after 400 sweeps")
axes[1].set_xlabel("x (lattice steps)")
axes[1].set_ylabel("y (lattice steps)")
plt.show()'''),
'phase-field':('Inspect the final composition and its energy history','I plot c without changing its stored values. The color scale is a display choice. The mean checks test conservation, while the sampled energy history helps assess this particular run. It does not prove stability for arbitrary time steps.', '''import matplotlib.pyplot as plt
values = np.asarray(records)
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
image = axes[0].imshow(c, origin="lower")
fig.colorbar(image, ax=axes[0], label="Dimensionless composition c")
axes[0].set_title(mode + " phase separation")
axes[0].set_xlabel("Grid index")
axes[0].set_ylabel("Grid index")
axes[1].plot(values[:, 0], values[:, 2])
axes[1].set_xlabel("Dimensionless time")
axes[1].set_ylabel("Dimensionless mean energy density")
plt.show()'''),
'spinodal':('Look at the calculated field and energy','I show the calculated final field and sampled energy. The composition scale follows this model, whose minima are −1 and 1. These values do not represent a mole fraction between 0 and 1.', '''import matplotlib.pyplot as plt
values = np.asarray(history)
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
im = axes[0].imshow(c, origin="lower", cmap="turbo", vmin=-1, vmax=1)
fig.colorbar(im, ax=axes[0], label="Dimensionless field c")
axes[0].set_title("Final field")
axes[0].set_xlabel("Grid index")
axes[0].set_ylabel("Grid index")
axes[1].plot(values[:, 1], values[:, 3])
axes[1].set_xlabel("Dimensionless time")
axes[1].set_ylabel("Mean energy density")
plt.show()'''),
'monte-carlo':('Inspect the two short calculations','I distinguish spin values from orientation labels. Potts colors indicate labels only; they are not crystallographic angles. Five sweeps on 16² sites are a short execution check, not the published full movies.', '''import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].imshow(ising, cmap="coolwarm", vmin=-1, vmax=1)
axes[0].set_title("Ising: spin values −1 and 1")
axes[1].imshow(potts, cmap="tab20")
axes[1].set_title("Potts: orientation labels")
for ax in axes:
    ax.set_xlabel("Lattice column")
    ax.set_ylabel("Lattice row")
plt.show()'''),
'bicontinuity-2d':('Compare both compositions and measured components','I display the original fixed color mapping. I examine the connected-component counts rather than conclude bicontinuity from an image alone. A conserved mean of 0.5 does not require both thresholded phases to have the same connectivity.', '''import matplotlib.pyplot as plt
from PIL import Image
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
for ax, mean in zip(axes, MEAN_COMPOSITIONS):
    ax.imshow(Image.open(output_folder / f"composition-{mean:.1f}.png"))
    ax.set_title(f"Mean composition {mean}")
    ax.axis("off")
    print(mean, results[f"{mean:.1f}"]["thresholds"]["0.5"])
plt.show()'''),
}
for slug,(title,explanation,source) in plots.items():
 p=folder/(slug+'.ipynb');n=nb.read(p,4);idx=len(n.cells)-1
 if not any(c.cell_type=='markdown' and 'Plot and interpret the result' in c.source for c in n.cells):
  n.cells[idx:idx]=[nb.v4.new_markdown_cell('## Plot and interpret the result\n\n'+explanation),nb.v4.new_code_cell(source)]
 nb.write(n,p)

# I embed the existing short lesson's kernel instead of loading a separate .py.
p=root/'files/mesoscale/examples/stepwise/phase-field-python.ipynb'
n=nb.read(p,4)
module=ast.parse((root/'files/mesoscale/examples/phase_field.py').read_text())
kernel=next(x for x in module.body if isinstance(x,ast.FunctionDef) and x.name=='kernel')
for c in n.cells:
 if c.cell_type=='code' and 'source = Path("../phase_field.py")' in c.source:
  rest=c.source[c.source.index('angles ='):].replace('model.kernel(', 'kernel(')
  c.source=ast.unparse(kernel)+'\n\n'+rest
  c.outputs=[];c.execution_count=None
nb.write(n,p)
# I keep the downloadable companion program consistent with the notebook.
s=(root/'files/mesoscale/examples/stepwise/phase-field.py').read_text()
if 'from pathlib import Path' in s:
 a=s.index('from pathlib import Path');b=s.index('angles =',a)
 s=s[:a]+ast.unparse(kernel)+'\n\n'+s[b:];s=s.replace('model.kernel(', 'kernel(')
(root/'files/mesoscale/examples/stepwise/phase-field.py').write_text(s)

# I break embedded elasticity helpers into separately explained operations.
notes={
'cubic':'I assemble Cijkl from C11, C12 and C44 after checking the cubic stability inequalities. All constants in this teaching example are dimensionless. Both tensor shear components are retained.',
'stress':'I contract Cijkl with elastic strain to calculate stress. einsum states which tensor indices are summed and leaves the spatial indices unchanged.',
'reference_compliance':'I apply the inverse reference stiffness on symmetric tensors. The factor 2 in the shear denominator follows from using tensor shear strain, rather than engineering shear strain.',
'PeriodicGrid':'I define the periodic Fourier derivative and equilibrium response on a unit square. Displacement u has two components. Strain is the symmetric displacement gradient, and divergence of stress is the equilibrium residual. The odd grid avoids an ambiguous first derivative at a Nyquist mode.',
'rms':'I use the root-mean-square magnitude to compare arrays without cancellation between positive and negative entries.',
'prepare':'I check shapes, stiffness stability, prescribed mean strain and numerical iteration settings before allocating the equilibrium solver.',
'diagnostics':'I calculate physical stress, local elastic energy density and the stress-divergence residual. These use the actual stiffness, not just the reference solid.',
'result':'I collect the field and its measured diagnostics so I can inspect displacement, strain, stress, energy and convergence separately.',
'plate_problem':'I construct the prescribed plate-shaped inclusion. Angle is in degrees. The shape is fixed; this calculation finds elastic equilibrium rather than evolving the precipitate.',
'plot_solution':'I plot the strain, stress and phase fields with labeled color scales. Plotting does not change the equilibrium solution.'}
for filename in ('Direct-iteration.ipynb','Equivalent-eigenstrain.ipynb'):
 p=root/'files/elastic-solvers'/filename;n=nb.read(p,4);cells=[]
 for c in n.cells:
  if c.cell_type=='code' and 'def cubic(' in c.source and 'class PeriodicGrid:' in c.source:
   tree=ast.parse(c.source)
   for node in tree.body:
    if isinstance(node,ast.Expr) and isinstance(node.value,ast.Constant):continue
    if isinstance(node,(ast.FunctionDef,ast.ClassDef)):
     cells.append(nb.v4.new_markdown_cell('### '+node.name+'\n\n'+notes[node.name]))
    cells.append(nb.v4.new_code_cell(ast.unparse(node)))
  else:cells.append(c)
 n.cells=cells;nb.write(n,p)
print('Added plots, embedded the kernel, and split elasticity helpers.')

# I place the frame writer before the instruction that calls it.
p=folder / "portrait-minimum.ipynb"
n=nb.read(p,4)
a=next(i for i,c in enumerate(n.cells) if c.cell_type=="markdown" and "Save the original 241-frame" in c.source)
if n.cells[a+1].cell_type=="markdown" and "Save the complete portrait" in n.cells[a+1].source:
 save=n.cells[a];definition=n.cells[a+1:a+3]
 n.cells[a:a+3]=definition+[save]
for c in n.cells:
 if c.cell_type=="markdown":
  c.source=c.source.replace("complete frame writer defined earlier", "complete frame writer defined in the preceding cell")
num=0
for c in n.cells:
 if c.cell_type=="markdown" and c.source.startswith("## "):
  num+=1;c.source=re.sub(r"^## (?:\d+\. )?",f"## {num}. ",c.source)
nb.write(n,p)
