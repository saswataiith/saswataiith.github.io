# MS5033 worked examples — Julia and NumPy

Teaching adaptations of Saswata Bhattacharya's course material. All quantities are dimensionless. These are simplified educational models, not calibrated materials predictions.

## Run

Python: install NumPy with `python -m pip install numpy`.
Julia: install FFTW with `julia -e 'using Pkg; Pkg.add("FFTW")'` (not needed for walkers).

| Lesson | Python | Julia |
|---|---|---|
| Random walks | `python walkers.py walkers_results` | `julia walkers.jl walkers_results` |
| Fourier diffusion | `python diffusion.py diffusion_results` | `julia diffusion.jl diffusion_results` |
| Chemical spinodal | `python phase_field.py chemical chemical_results` | `julia phase_field.jl chemical chemical_results` |
| Elastic spinodal | `python phase_field.py elastic elastic_results` | `julia phase_field.jl elastic elastic_results` |

Each run writes CSV snapshots and diagnostics. Use different output directories for different runs. Scripts do not require plotting libraries. Website viewers display results generated from these NumPy scripts. Field CSV row index is x, column index is y; transpose for common plotting conventions.

## Model provenance and changes

- `walkers.*`: adapted from `demo2_many_walkers_diffusion.jl`. Updates every walker once per sweep on an unbounded lattice rather than asynchronous moves in a periodic box. MSD uses unwrapped coordinates. Julia and NumPy use different random-number generators; compare ensemble statistics, not identical trajectories.
- `diffusion.*`: a compact worked example related to `Fourier_Julia.ipynb`, with two Fourier modes and an exact analytic benchmark.
- `phase_field.*`: simplified from the chemical and elastochemical sections of `PhaseField_Examples_Spectral.ipynb`. Chemical free energy is c²(1−c)². FFT-based semi-implicit integration, constant mobility and gradient coefficient, periodic boundaries. Explicit nonlinear term; not unconditionally stable, not dealiased. No clipping of composition.
- Elastic example: homogeneous 2D square-symmetric stiffness, linear dilatational composition eigenstrain, zero mean stress. Uses the acoustic-tensor contraction Q_ik=C_ijkl n_j n_l. Q11=C11 nx²+C44 ny² and Q22=C44 nx²+C11 ny². The supplied notebook used C12 in place of C44 in these diagonal terms; this adaptation corrects them. This is not a full 3D plane-strain eigenstrain reduction.
- The elastic default uses n=256, with conjugate-pair symmetrization of the discrete kernel for a real self-adjoint operator on even grids. To compare chemical and elastic evolution, use n=256 for BOTH runs and the same initial condition/time. Default chemical n=64 and elastic n=256 galleries are separate demonstrations. Increasing n at fixed grid spacing increases the domain; it is not fixed-domain refinement. Snapshots are saved every 25 steps.
- Deterministic broadband perturbations enable cross-language checks, but math libraries can give small floating-point differences.

## Validation performed

Both languages were executed (Julia 1.12.6, NumPy 2.3.5). Fourier diffusion maximum analytic error was 4.45e-16 or less. Original small-grid chemical/elastic diagnostic arrays agreed within 5e-13 across languages; the new 256-square elastic run also agrees within 1e-9. Mean composition drift was below 9e-14. Sampled energies decreased in both default examples; this does not establish unconditional stability or spatial convergence. The isotropic elastic kernel is direction independent to floating-point precision and equals 0.12 for C11=4, C12=2, C44=1, eigenstrain=0.2. Walker MSD at 400 steps: NumPy 399.31192, Julia 399.95048, theory 400.

Before quantitative use, assess time-step and spatial convergence at fixed physical domain, including FFT wavevector scaling; verify the elastic constitutive assumptions for the intended problem. The defaults are teaching demonstrations.

## Editing parameters

Edit the source or import/include it and call the functions. Python: `run('elastic', 'results', n=256, dt=0.1, steps=4000)`. Julia: `run("elastic", "results"; n=256, dt=0.1, steps=4000)`. Both reach time 400. For chemical evolution call the same function with `chemical`. The elastic constants and eigenstrain are keyword defaults in `kernel`; change them there. Zero eigenstrain should recover the chemical evolution on the same grid.

Ink-drop defaults now use 100,000 walkers and 256-square density bins in [-128,128], with frames every 10 steps. The plotting window is not a physical boundary. MC examples are in `monte_carlo.jl` and `monte_carlo.py`: Ising Metropolis flips and the course Potts neighbor-copy heuristic. Julia movies: 256-square, 200 Ising sweeps and 2,000 Potts sweeps; NumPy smoke runs: 16-square, 5 sweeps. The latter do not validate long-run equilibrium. Potts starts with one distinct orientation label per pixel (a shuffled permutation of 1 through n²), with frames every 25 sweeps. Colors are fixed categorical labels, not crystallographic angles. Four-neighbor, equal-energy boundaries retain lattice anisotropy.
