"""I build notebook lessons from the unchanged teaching scripts.
Run this from the checkout: python tools/build_python_notebooks.py
After building I execute the notebooks before publishing their previews.
Requires nbformat and markdown.
"""
from pathlib import Path
import ast, copy, json, textwrap, hashlib
import nbformat as nb
import markdown
import html

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'files/mesoscale/examples/notebooks'
OUT.mkdir(exist_ok=True)
BASE = 'https://saswataiith.github.io/'
LICENSE = '''I permit free noncommercial teaching, learning and demonstrations with acknowledgment. Research and commercial use require my written permission. Earlier licensed releases retain their permissions. [Read the code-use terms](https://saswataiith.github.io/using-my-resources/).'''
FETCH = '''from pathlib import Path
from urllib.request import urlretrieve

work = Path("lesson-data")
work.mkdir(exist_ok=True)

def get_file(relative_path):
    # I download a public example only when its local copy is missing.
    destination = work / Path(relative_path).name
    if not destination.exists():
        urlretrieve("https://saswataiith.github.io/" + relative_path, destination)
    return destination
'''

def md(n, text): n.cells.append(nb.v4.new_markdown_cell(text))
def code(n, text, tags=None):
    cell=nb.v4.new_code_cell(text.strip())
    if tags: cell.metadata['tags']=tags
    n.cells.append(cell)

def begin(slug, title, context, deps, source):
    n=nb.v4.new_notebook()
    n.metadata.update(kernelspec={'display_name':'Python 3','language':'python','name':'python3'}, language_info={'name':'python'}, lesson_source={'path':source,'sha256':hashlib.sha256((ROOT/source).read_bytes()).hexdigest()})
    md(n,f'# {title}\n\n{context}\n\nI develop this calculation in small steps. I run a cell, inspect its result and test it before adding the next part. Run the cells in order in Jupyter. A code cell defines a part of the calculation or carries it out; defining a function does not run it.\n\n{LICENSE}')
    md(n,'## 1. Prepare the Python environment\n\nI install the packages listed in the next cell once in the same environment as the notebook. In Jupyter or Colab, remove the comment marker from the installation line below if a package is missing. NumPy stores arrays and evaluates numerical operations. Matplotlib displays plots. Pillow reads and writes images. This installation does not change the model parameters.')
    code(n,'# %pip install '+deps+'\nimport numpy as np\nassert np.isfinite(np.array([0.0, 1.0])).all()\nprint("NumPy is ready:", np.__version__)')
    return n

FUNCTIONS = {
 'portrait_font':('Choose a portable display font','I try the original font, then DejaVu Sans, then Pillow\'s default font. The font changes labels on the image only; it does not change a numerical field.'),
 'prepare_portrait':('Read and shuffle the color pixels','I call the fixed portrait target and the shuffled portrait initial. Each signed RGB channel ranges from −1 to 1. I shuffle whole pixels with seed 19, preserving the three channel means.'),
 'evolve':('Write the evolution rule','I calculate the Fourier wave numbers and the squared magnitude k2. For portrait restoration, the error is the current field minus the fixed target. The Allen–Cahn error decays locally; the Cahn–Hilliard Fourier modes decay at rates proportional to k2. The spatial transform leaves the channel axis unchanged.'),
 'kernel':('Calculate the elastic kernel','I calculate B for each wave-vector direction from the stiffness constants and a dilatational misfit. C11, C12 and C44 are the stiffness constants, and eigenstrain is the prescribed stress-free strain. This example uses dimensionless stiffness and strain. The zero mode corresponds to the specified macroscopic condition; it is not a directional mode.'),
 'connectivity':('Visit connected pixels and record wrapping','I start at one occupied pixel and add its edge-sharing neighbors to a queue. Periodic indices wrap at the image boundary. Unwrapped positions continue beyond that boundary. Two visits to the same pixel with different unwrapped positions reveal a winding loop. Coordinate flags indicate wrapping along an axis; they do not measure the number of independent winding directions.'),
 'periodic_components':('Separate seam joining from periodic winding','I keep a wrapped pixel address and a lifted, unwrapped position for each visited pixel. A loop displacement divided by the grid shape is a winding vector. Its independent directions determine winding rank. Four edge-sharing neighbors define this 2D graph. A seam crossing alone does not establish wrapping.'),
 'root_offset':('Find a union–find root and its displacement','I follow parent links to the representative root. offset stores the displacement along each parent link. I add these displacements, then shorten the parent chain without losing the displacement from each voxel to its root.'),
 'hk_scan':('Scan voxels and merge connected labels','I merge occupied predecessor neighbors during the first pass, then join periodic seams. If two voxels already have the same root, a nonzero residual displacement identifies a winding loop. Arrays index voxels, and each index has one parent and a three-component displacement.'),
 'label_phase':('Count components and independent windings','I count voxels attached to each root and divide by the occupied voxel count to obtain the largest fraction of that phase. I retain independent winding vectors for each component. The primary convention is six face-sharing neighbors, including periodic neighbors.'),
 'flood_distance':('Measure shortest graph distance from one seed','I visit face-sharing neighbors in breadth-first order. distance counts voxel steps from the seed; it is not physical time. The returned reached count is the number of occupied voxels visited. A disconnected component cannot be reached from this seed.'),
 'periodic_euler':('Calculate a periodic digital Euler characteristic','I classify local voxel configurations and apply scikit-image\'s Euler lookup coefficients. Periodic convolution includes seam cells. Six-connected foreground is paired with 26-connected background. Digital topology depends on this convention.'),
 'interface_morphology':('Measure the unsimplified periodic interface','I extract the c=0.5 surface, include seam cells, and weld paired periodic vertices. Surface area is calculated from triangles. I check that each mesh edge belongs to two triangles before interpreting a closed surface. The Euler characteristic is vertices minus edges plus faces. Curvature is a discrete mesh estimate, not a convergence result.'),
 'graph':('Build the periodic voxel graph','I use six face-sharing neighbors and a queue to visit each connected phase. Lifted coordinates retain periodic displacements. Non-tree edges can reveal noncontractible wrapping loops. Numba compiles the loops for speed; it does not change the neighbor convention.'),
 'analyze':('Count phase components and their winding directions','I obtain voxel counts and winding vectors from the periodic graph. Phase fraction divides occupied voxels by all voxels. Largest fraction divides the largest component by the occupied phase. Independent winding rank distinguishes one diagonal loop from independent x, y and z loops.'),
 'validate_route':('Check every step of a route','I check phase membership, periodic face-sharing adjacency and the sum of the lifted steps. The net displacement must equal one box length along the claimed axis. This establishes a valid route, not an exhaustive visit to the phase.'),
 'interior_bfs':('Search the phase interior','I search admissible voxel neighbors without crossing into the other phase. Parents record the route used to reach a voxel. These parents allow a connected path to be reconstructed.'),
 'interior_routes':('Find and verify three interior routes','I find routes through phase-core voxels, then check their membership, neighbor steps and net periodic displacement. Restricting display paths to the core improves visibility without changing the full-volume connectivity measurement.'),
 'core_tree':('Build a rooted tree in the phase core','I visit safe voxels from one root and save parent links. The number reached measures this rooted core component, which is a subset of the full phase.'),
 'percolation_network':('Join distributed sites into a connected witness','I connect sites distributed through the box and include independently checked wrapping routes. The displayed subgraph is a witness of connectivity. It is not the longest path and does not contain every phase voxel.'),
 'export_viewer':('Prepare the display mesh and route data','I extract the common c=0.5 interface at the full resolution, then simplify triangles for display only. The two phases use opposite interface normals. Connectivity and path checks still use the saved full-resolution field.'),
 'save_image':('Convert composition to display colors','I keep a fixed color scale. Clipping affects the displayed pixels only, not the simulated composition. The transpose and reversal match the coordinate orientation used on the website.'),
 'run_example':('Save the complete portrait sequence','I keep the original grid, seed, time samples and exact propagators. Each saved row contains time, channel means and energy density. The output folder contains 241 image frames and diagnostics.csv. The movie uses nonuniform simulation times, so its playback speed is not a physical rate comparison.'),
 'run':('Run the complete example','I keep the original algorithm, parameters, seed and output conventions. I inspect the saved diagnostics before interpreting the pictures. A finite run is not evidence of convergence or equilibrium.'),
 'energy':('Define the energy diagnostic','I calculate the bulk and gradient contributions in the same convention as the source program. Fourier normalization is part of this definition. I compare this quantity through time within one model; energies from different functionals need not have the same meaning.'),
 'draw_path':('Draw periodic paths without a false shortcut','I split a displayed line at a periodic face and resume it at the paired opposite face. I retain turns in the voxel route. A line across the middle of the box would incorrectly suggest passage through another phase.'),
 'position_at':('Interpolate a periodic voxel step','I interpolate only between consecutive verified face-sharing voxels. The shortest periodic displacement identifies a seam step. Display coordinates are wrapped back into the box.'),
 'extend_trail':('Record the executed path','I append only the route segments the turtle has executed. At a periodic crossing I end one trail on the face and start another at the opposite face.'),
 'reset':('Reset the selected route','I reset progress and the executed trail when the phase or winding direction changes. The saved route remains the source of the voxel positions.'),
 'visibility':('Control interface visibility','I change the displayed opacity and visibility to make the marker easier to see. These controls do not change the field or its connectivity.'),
 'start':('Start the animation','I change the running state when the user selects Start. The clock loop updates progress while this state is true.'),
 'pause':('Pause the animation','I stop advancing progress while keeping the executed trail visible.'),
 'begin_trail':('Start a new displayed trail','I create a new curve at the supplied position. A separate curve after a seam crossing avoids drawing a shortcut through the box.'),
 'update':('Apply the display controls','I apply phase selection, interface visibility and loop highlighting to the scene. These are display operations on saved data.'),
 'reset_camera':('Restore the initial camera','I reset the camera center, range and viewing direction. Right-drag rotates the view, and the wheel changes the zoom.'),
}

# Each tuple gives a source, title, context, dependencies and a run configuration.
LESSONS = [
('files/mesoscale/examples/diffusion.py','Fourier diffusion: reproduce the full example','I calculate diffusion of two cosine modes on a periodic line. c is a dimensionless concentration field, x is position on a dimensionless line of length 2π, t is dimensionless time, and D=1 is the dimensionless diffusivity. The mode with wave number 4 decays sixteen times faster than the mode with wave number 1.','numpy matplotlib', 'diffusion', 'expand', {'output':'diffusion-results'}),
('files/mesoscale/examples/walkers.py','Random walks: from molecular steps to diffusion','I follow 100,000 walkers. Each sweep gives every walker one unit step in a cardinal direction. pos contains unwrapped x and y positions. Mean-square displacement, MSD, is the mean squared distance from the starting point. Length is measured in lattice steps and time in sweeps. The corresponding diffusion coefficient is 1/4 in these units.','numpy matplotlib','walkers','expand',{'output':'walkers-results'}),
('files/mesoscale/examples/phase_field.py','Chemical and elastic spinodal decomposition','I evolve a conserved dimensionless composition c on a periodic grid. The bulk energy is c²(1−c)². The chemical potential contains its derivative, a gradient contribution and, in elastic mode, a homogeneous elastic contribution. n is the number of points per direction, dt is the time step, and steps is the number of updates. All model quantities are dimensionless.','numpy matplotlib','phase-field','expand',{'mode':'chemical','output':'phase-field-results','n':None,'dt':.2,'steps':2000}),
('files/mesoscale/examples/monte_carlo.py','Ising and Potts: reproduce the lattice calculations','I propose changes at randomly selected lattice sites. In the Ising model s is a spin, either −1 or 1. In the Potts example s is an orientation label. de is the proposed energy change. temperature is measured in units of the interaction energy divided by Boltzmann\'s constant. A sweep consists of n² trial updates. The Potts neighbor-copy rule models grain-growth kinetics, not equilibrium sampling.','numpy matplotlib','monte-carlo','function',{}),
('files/mesoscale/spinodal_demo.py','A first binary spinodal simulation','I calculate a dimensionless Cahn–Hilliard model with bulk energy (c²−1)²/4. c is the conserved field, not an SI concentration. The mobility and gradient coefficient are both 1, the grid spacing is 1, dt=0.2 and the random seed is 42. The nonlinear bulk term is explicit. Energy decrease alone does not establish numerical convergence.','numpy pillow matplotlib','spinodal','expand',{'n':128,'dt':.2,'steps':1600,'seed':42,'output':'spinodal-results'}),
('files/mesoscale/examples/portrait_energy_minimum.py','My color portrait as an energy minimum','I start with a shuffled color portrait and let it relax toward its original image. I treat red, green and blue as three independent signed fields. The fixed target r is explicitly included in the energy; this is an image analogy, not recovery of an unknown face. Every quantity is dimensionless.','numpy "pillow>=10.1" matplotlib','portrait-minimum','portrait',{}),
('files/mesoscale/examples/portrait_dynamics.py','One portrait and two double-well evolution laws','I use the same double-well and gradient energy for Allen–Cahn and Cahn–Hilliard evolution. The portrait supplies the initial field only. u is a dimensionless grayscale intensity between approximately −1 and 1; kappa=0.4 is the gradient coefficient, dt=0.1 is the step size and S=2 is numerical stabilization. These dynamics are not a reverse inference of the original image.','numpy "pillow>=10.1" matplotlib','portrait-dynamics','global',{}),
('files/mesoscale/examples/portrait_wrong_energy.py','The same starting image with two prescribed minima','I compare two explicitly chosen reference images under the same Allen–Cahn law. a is the portrait, b is an illustrated target, and u0 is their common starting field. Channel values range from 0 to 1. The energy is half the mean squared difference from each run\'s own reference. A different prescribed destination is not a solver error.','numpy "pillow>=10.1" matplotlib','portrait-targets','global',{}),
('files/mesoscale/examples/portrait_flows.py','Restoration with a fidelity and gradient energy','I add a reference-image penalty to the double-well and gradient energy. r is the grayscale reference and u the evolving signed intensity. lambda=40 weights the reference penalty, kappa=0.02 weights gradients, L=0.05 is Allen–Cahn mobility and M=0.2 is Cahn–Hilliard mobility. The time step is 0.02. All quantities are dimensionless. The block-scrambling prelude is a display operation, not PDE evolution.','numpy "pillow>=10.1" matplotlib','portrait-flows','function',{}),
('files/mesoscale/examples/portrait_ch_abstraction.py','Reproduce the color portrait and domain movie','I keep both panels under conserved Cahn–Hilliard dynamics and change the energy. r is the reference portrait and u the evolving RGB fields. The portrait energy is quadratic; the domain energy contains a double well and a gradient coefficient kappa=0.4. dt=0.1 and stabilization S=2. Channels are independent and all quantities are dimensionless. This reproduces the full movie source; the shorter introductory notebook remains available separately.','numpy "pillow>=10.1" matplotlib','portrait-abstraction','global',{}),
('files/mesoscale/examples/bicontinuity.py','Binary phase separation and periodic connectivity','I compare mean compositions 0.5 and 0.4 using the same zero-mean perturbation. Composition c, energy coefficients, grid spacing and time are dimensionless. The 256² simulation uses dt=0.2, 2000 steps and seed 20260921. I measure four-neighbor connectivity at thresholds 0.45, 0.5 and 0.55. Mean composition and thresholded phase fraction are different quantities.','numpy scikit-image matplotlib','bicontinuity-2d','expand',{'output':'bicontinuity-results'}),
('files/mesoscale/examples/topology_connectivity.py','Connected regions, periodic loops, holes and cavities','I construct small masks with known topology before analyzing a simulated microstructure. A mask is a Boolean array: True means occupied. In 2D I use four edge-sharing neighbors. In 3D I use six face-sharing neighbors. Distances are measured in cells. A graph loop, a hole in a filled region and a closed boundary contour are different objects.','numpy scikit-image matplotlib','topology','expand',{}),
('files/mesoscale/examples/connectivity_morphology.py','Three-dimensional labeling, winding and morphology','I measure a saved field without evolving it. c is a dimensionless composition, the phase threshold is 0.5 and dx=0.25 is dimensionless voxel spacing. Six face-sharing neighbors define phase connectivity. Surface area has units of dx² and integrated mean curvature units of dx within this dimensionless model. A simplified display mesh is not used for these measurements.','numpy scipy numba scikit-image matplotlib','morphology-3d','large',{}),
('files/mesoscale/examples/bicontinuity_3d.py','The 256³ spinodal field, connectivity and display','I generate the original 256³ dimensionless Cahn–Hilliard example once. c is composition; A=M=kappa=1, dx=0.25, dt=0.5, stabilization=2 and the run has 400 updates. The seed is 20261005. Connectivity uses the saved float32 field at full resolution. Display simplification does not change the measured field. The full calculation needs several gigabytes of memory.','numpy scipy numba scikit-image fast-simplification matplotlib','spinodal-3d','large',{}),
('files/mesoscale/examples/export_turtle_field.py','Prepare the 2D field for the browser turtle','I load the saved 256² field and convert c≥0.5 into a phase mask. c is dimensionless composition. The transpose and reversal match the screen coordinates. I save a JSON array of occupied pixels, not a predefined turtle route.','numpy','turtle-field','global',{}),
('files/mesoscale/examples/turtle_3d_vpython.py','A VPython turtle on verified periodic routes','I display the saved c=0.5 interface and checked voxel routes. n is the number of voxels per direction. progress counts route steps, and speed is measured in voxels per second of display time. Display time is unrelated to the original simulation time. An enlarged turtle is a marker; its center follows the checked route.','numpy vpython "setuptools<82"','turtle-vpython','viewer',{}),
('files/mesoscale/examples/percolation_3d_vpython.py','Both phase networks in VPython','I display connected witness graphs for both phases and their independent wrapping loops. All positions are in voxel coordinates. Opacity, lighting and camera controls affect display only. The witness graphs are subsets of the measured full phase networks.','numpy vpython "setuptools<82"','percolation-vpython','viewer',{}),
]

def format_nodes(nodes):
    # I disable only Numba's disk cache in notebook-defined functions.
    tree=copy.deepcopy(ast.Module(body=nodes,type_ignores=[]))
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='njit':
            for kw in node.keywords:
                if kw.arg=='cache': kw.value=ast.Constant(False)
    return ast.unparse(tree)

def heading(n, title, text):
    num=1+sum(c.cell_type=='markdown' and c.source.startswith('## ') for c in n.cells)
    md(n,f'## {num}. {title}\n\n{text}')

def node_groups(nodes):
    group=[]
    for node in nodes:
        if isinstance(node,(ast.FunctionDef,ast.ClassDef,ast.For,ast.While,ast.With,ast.Try)):
            if group: yield group; group=[]
            yield [node]
        else:
            group.append(node)
            if len(group)>=9: yield group;group=[]
    if group:yield group

def explain(group):
    first=group[0]
    if isinstance(first,ast.FunctionDef):
        return FUNCTIONS.get(first.name,(f'Define {first.name}',ast.get_docstring(first) or 'I define this operation before calling it. I keep its arguments explicit so I can test it separately.'))
    if isinstance(first,ast.For):
        s=ast.unparse(first)
        if 'range(2001)' in s or 'range(steps' in s or 'range(1, steps' in s or 'for mean in ' in s:
            return ('Advance the field and record the result','I apply the update in its original order. I record the mean, energy or other diagnostics at the specified intervals. I do not clip the numerical field. A saved picture is a display of the field, not a substitute for a conservation check.')
        return ('Repeat the operation and inspect each case','I repeat the operation over the specified cases. Read the loop variable first, then follow what changes on each pass. The assertions check the stated numerical or topological condition.')
    if isinstance(first,ast.While): return ('Keep the viewer responsive','I keep the VPython clock running so mouse and button events can update the scene. Run this cell interactively and interrupt the kernel when finished. This is an event loop, not a simulation of phase separation.')
    names=[ast.unparse(x.targets[0]) for x in group if isinstance(x,ast.Assign)]
    if any(x in names for x in ['k','kx','wave_numbers','k2','denominator']):return ('Set up the Fourier grid','I calculate wave numbers consistent with the grid spacing and periodic domain. k2 denotes the squared magnitude of a wave vector. The denominator contains the term treated implicitly in the original update. The zero Fourier mode represents the spatial mean.')
    if any(isinstance(x,(ast.Assert,ast.Raise)) for x in group): return ('Check the result before continuing','I check finite values, conservation or the known reference result as specified below. An assertion stops the notebook if the condition fails. Inspect the quantities and tolerance rather than suppressing a failure.')
    if any(x.startswith(('out','output','work')) for x in names):return ('Prepare inputs and output locations','I name the input data and output directory explicitly. Re-running these cells replaces files in that lesson\'s output directory. I keep the original image or composition field separate from the evolving array.')
    return ('Prepare the next part of the calculation','I define '+(', '.join('`'+x+'`' for x in names[:7]) if names else 'the following operations')+'. These are the same operations as in the original source, written on separate lines so their order is clear. Inspect their values before running the next cell.')


def finish(n, slug, source):
    heading(n,'Review and extend the calculation','I first restart the kernel and run all the required cells. Then I change one input, predict its effect and compare the result with that prediction. A successful check establishes the tested property; it does not establish convergence or equilibrium. I retain the [complete script]('+BASE+source+') for command-line use. The notebook embeds the calculation directly and does not need that script to run.')
    dest=OUT/(slug+'.ipynb');nb.write(n,dest)
    return dest

catalog=[]
for source,title,context,deps,slug,mode,bindings in LESSONS:
    n=begin(slug,title,context,deps,source)
    text=(ROOT/source).read_text();tree=ast.parse(text)
    body=[x for x in tree.body if not (isinstance(x,ast.Expr) and isinstance(x.value,ast.Constant) and isinstance(x.value.value,str)) and not (isinstance(x,ast.If) and '__name__' in ast.unparse(x.test))]
    if 'portrait' in slug:
        heading(n,'Read the image and check its dimensions','I download my public portrait once, or replace this path with my own image. An RGB array has two position axes and one channel axis. The three channels are red, green and blue.')
        code(n,FETCH+'\nportrait = get_file("assets/images/saswata-landscape.png")\noutput = "'+slug+'-results"')
        if slug=='portrait-targets':code(n,'other_portrait = get_file("assets/images/saswata-cubist.png")')
    if slug=='turtle-field':
        heading(n,'Read the saved composition','I use the original saved 256² field. I check its dimensions and mean before applying a threshold.')
        code(n,FETCH+'\nfield_path = get_file("assets/examples/bicontinuity/composition-0.5.npy")\noutput_path = work / "turtle-field.json"')
    if mode=='viewer':
        heading(n,'Load data and decide when to open the scene','I download the public viewer data, then check the route definitions without opening VPython. I use local Jupyter for the native viewer; Colab does not provide the same interactive VPython environment. I leave the window disabled initially so Run All does not enter an endless display loop.')
        code(n,FETCH+'\nviewer_path = get_file("assets/examples/bicontinuity-3d/viewer.json")\nopen_viewer = False\nviewer_data = __import__("json").loads(viewer_path.read_text())\nassert viewer_data["n"] == 256\nfor phase in ("red", "blue"):\n    for axis in "xyz":\n        route = np.asarray(viewer_data["routes"][phase][axis])\n        steps = (np.diff(route, axis=0) + 128) % 256 - 128\n        assert np.all(np.abs(steps).sum(axis=1) == 1)\n        assert np.array_equal(steps.sum(axis=0), np.eye(3, dtype=int)["xyz".index(axis)] * 256)\nprint("All six saved routes have face-sharing steps and the stated winding.")')
    runfun=next((x for x in body if isinstance(x,ast.FunctionDef) and x.name in ('run','main','run_example')),None)
    if mode=='expand':
        nodes=[x for x in body if x is not runfun]
        heading(n,'Choose the input values','I retain the default values from the original calculation. The output name locates the files written by this notebook.')
        if bindings:code(n,'\n'.join(k+' = '+repr(v) for k,v in bindings.items()))
        for group in node_groups(nodes):
            a,b=explain(group);heading(n,a,b);code(n,format_nodes(group))
        for group in node_groups(runfun.body):
            if len(group)==1 and isinstance(group[0],ast.Return):continue
            group=[x for x in group if not isinstance(x,ast.Return)]
            if not group:continue
            a,b=explain(group);heading(n,a,b);code(n,format_nodes(group))
    elif mode=='portrait':
        for group in node_groups(body):
            a,b=explain(group);heading(n,a,b);code(n,format_nodes(group))
        heading(n,'Check the shuffle before evolving anything','I prepare the target r and starting field u0 as 256 × 256 × 3 arrays. I check that each channel has the same mean before and after shuffling. I display the two arrays side by side; signed values are mapped back to display colors only.')
        code(n,'''target, initial = prepare_portrait(portrait, color=True)
assert target.shape == initial.shape == (256, 256, 3)
assert np.allclose(initial.mean((0, 1)), target.mean((0, 1)), atol=1e-13, rtol=0)
import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(9, 4))
for ax, field, title in zip(axes, (initial, target), ("Shuffled pixels", "Fixed target")):
    ax.imshow(np.clip((field + 1) / 2, 0, 1))
    ax.set_title(title)
    ax.axis("off")
plt.show()
print("Channel means:", initial.mean((0, 1)))''')
        heading(n,'Define energy and verify its minimum',r'''I choose $F=\tfrac12\int_\Omega\sum_j(u_j-r_j)^2\,dA$. Here $j$ identifies an RGB channel, $\Omega$ is the image domain and $dA$ is an area element. The mean energy density below is $F/(3|\Omega|)$. Every squared difference is nonnegative, so the minimum is exactly $F=0$ when $u=r$. This is the number zero. A finite-time solution approaches this minimum asymptotically.''')
        code(n,'''def mean_energy(field):
    return 0.5 * np.mean((field - target)**2)
assert mean_energy(target) == 0.0
assert mean_energy(initial) > 0.0
print("Target energy:", mean_energy(target))
print("Initial energy:", mean_energy(initial))''')
        heading(n,'Take one step and compare the two laws',r'''For channel $j$, Allen–Cahn gives $\partial_tu_j=-L(u_j-r_j)$, with $L=0.03$. Cahn–Hilliard gives $\partial_tu_j=M\nabla^2(u_j-r_j)$, with $M=10^{-5}$. Here $t$ is dimensionless time and $\nabla^2$ is the spatial Laplacian. This local quadratic energy gives a second-order conserved equation; a gradient energy would supply the familiar fourth-order term. I use the exact propagators at time 100.''')
        code(n,'''ac, ch = evolve(target, initial, 100.0)
assert mean_energy(ac) <= mean_energy(initial)
assert mean_energy(ch) <= mean_energy(initial)
assert np.allclose(ch.mean((0, 1)), initial.mean((0, 1)), atol=2e-13, rtol=0)
fig, axes = plt.subplots(1, 2, figsize=(9, 4))
for ax, field, title in zip(axes, (ac, ch), ("Allen–Cahn, t=100", "Cahn–Hilliard, t=100")):
    ax.imshow(np.clip((field + 1) / 2, 0, 1))
    ax.set_title(title)
    ax.axis("off")
plt.show()''')
        heading(n,'Test mean drift separately from motion','I add a spatially uniform offset of 0.1 to the target. Allen–Cahn removes this mean offset exponentially. Cahn–Hilliard preserves it. Neither rule translates the fixed target across the image. Other Allen–Cahn energies can drive interface motion; this example does not test that.')
        code(n,'''offset_ac, offset_ch = evolve(target, target + 0.1, 100.0)
assert np.allclose(offset_ac - target, 0.1 * np.exp(-0.03 * 100), atol=1e-14)
assert np.allclose(offset_ch - target, 0.1, atol=1e-14)
print("AC remaining offset:", (offset_ac - target).mean())
print("CH remaining offset:", (offset_ch - target).mean())''')
        heading(n,'Save the original 241-frame color calculation','I now use the complete frame writer defined earlier. I preserve the original nonuniform sample times, ending at 30,000,000. The PNG files and diagnostics.csv are written in the chosen output folder. Frames are not uniformly spaced in simulation time.')
        code(n,'run_example(portrait, output, color=True)')
        heading(n,'Plot energy and check every saved mean','I read the measured diagnostics, rather than infer conservation from the colors. Both energy sequences must be nonincreasing within the stated round-off tolerance. Each Cahn–Hilliard channel mean must remain within 2×10⁻¹³ of its initial value.')
        code(n,'''records = np.loadtxt(Path(output) / "diagnostics.csv", delimiter=",", skiprows=1)
assert records.shape == (241, 9)
assert np.isfinite(records).all()
assert np.max(np.abs(records[:, 4:7] - records[0, 4:7])) < 2e-13
assert np.max(np.diff(records[:, 7:9], axis=0)) < 1e-15
plt.figure(figsize=(7, 4))
for col, name in [(7, "Allen–Cahn"), (8, "Cahn–Hilliard")]:
    positive = records[:, col] > 0
    plt.loglog(records[positive, 0], records[positive, col], label=name)
plt.xlabel("Dimensionless time")
plt.ylabel("Mean energy density F / (3 × area)")
plt.legend()
plt.show()
print("Final mean energy densities:", records[-1, 7:9])''')
    else:
        if mode=='global':
            text=text.replace('sys.argv[1]','portrait' if 'portrait' in slug else 'field_path').replace('sys.argv[2]','other_portrait' if slug=='portrait-targets' else ('output' if 'portrait' in slug else 'output_path')).replace('sys.argv[3]','output')
            body=[x for x in ast.parse(text).body if not (isinstance(x,ast.Expr) and isinstance(x.value,ast.Constant) and isinstance(x.value.value,str))]
        for group in node_groups(body):
            a,b=explain(group);heading(n,a,b)
            sourcecode=format_nodes(group)
            if mode=='viewer':
                sourcecode=sourcecode.replace("sys.argv[1] if len(sys.argv) > 1 else 'bicontinuity-3d-output/viewer.json'",'viewer_path')
                code(n,'if open_viewer:\n'+textwrap.indent(sourcecode,'    '),['interactive'])
            else:code(n,sourcecode)
        if slug=='monte-carlo':
            heading(n,'Test a short run before choosing a large calculation','I first run both rules on a 16² grid for five sweeps, with the original seed and temperature. This tests execution and legal labels, not equilibrium. The unchanged full defaults, 256² and 200 or 2000 sweeps, remain available in the optional cell. A pure Python trial loop can take a long time.')
            code(n,'''ising = run("ising", "ising-check", n=16, sweeps=5, save_every=1)
potts = run("potts", "potts-check", n=16, sweeps=5, save_every=1)
assert set(np.unique(ising)).issubset({-1, 1})
assert potts.min() >= 1 and potts.max() <= 256
print("Both short calculations completed.")''')
            code(n,'''# I run the complete original defaults only when I choose to do so.
run_full_calculation = False
if run_full_calculation:
    run("ising", "ising-results")
    run("potts", "potts-results")''')
        if slug=='portrait-flows':code(n,'run(portrait, output)')
        if mode=='large':
            heading(n,'Test a small case with a known answer','I test the measurement routines on a small exact mask before allocating the full volume. This is a function check, not a smaller replacement for the published 256³ simulation. Notebook-defined Numba functions disable only the disk cache; numerical operations are unchanged.')
            if slug=='spinodal-3d':code(n,'''mask = np.ones((8, 8, 8), dtype=bool)
result, routes = analyze(mask, need_routes=True)
assert result["components"] == 1 and result["winding_rank"] == 3
for axis in "xyz":
    print(axis, validate_route(routes[axis], mask, axis))
print(result)''')
            else:code(n,'''mask = np.ones((8, 8, 8), dtype=bool)
labels, result = label_phase(mask)
assert result["components"] == 1
assert result["clusters"][0]["winding_rank"] == 3
assert periodic_euler(mask, 6) == 0
shell = np.zeros((8, 8, 8), dtype=bool)
shell[2:6, 2:6, 2:6] = True
shell[3:5, 3:5, 3:5] = False
assert periodic_euler(shell, 6) == 2
surface = interface_morphology(shell.astype(float), 1.0)
assert surface["edge_incidence_two"]
print(result)
print(surface)''')
            heading(n,'Choose the optional full-resolution calculation','I leave this expensive calculation off by default. Setting run_full_calculation to True runs the unchanged original model or full saved-field analysis. Generation and full morphology each need substantial memory. The small tests above do not certify a new full run; the published reports describe the original full-resolution results.')
            if slug=='spinodal-3d':code(n,'run_full_calculation = False\nif run_full_calculation:\n    run("bicontinuity-3d-results")')
            else:code(n,FETCH+'\nrun_full_calculation = False\nif run_full_calculation:\n    field_path = get_file("assets/examples/bicontinuity-3d/composition.npy")\n    report = run(field_path, "morphology-3d-results", dx=0.25)')
    dest=finish(n,slug,source)
    catalog.append(dict(slug=slug,title=title,source=source,notebook='/'+str(dest.relative_to(ROOT)),mode=mode))

(ROOT/'tools/python-notebook-lessons.json').write_text(json.dumps(catalog,indent=2)+'\n')
print('Created',len(catalog),'notebooks')

import runpy
runpy.run_path(str(ROOT / "tools/refine_python_notebooks.py"))
