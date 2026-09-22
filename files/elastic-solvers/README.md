# Two ways to solve inhomogeneous elasticity

Teaching examples for mesoscale microstructure modeling. New code is GPL-3.0-or-later. Download the complete ZIP, unzip it, and open one of the self-contained notebooks in Jupyter or Google Colab. Each notebook contains its numerical routines; no local helper files are needed for notebooks. The scripts share `elasticity_common.py` and must stay in the same folder.

Install: `python -m pip install numpy matplotlib jupyter`

Run scripts: `python direct_iteration.py` or `python equivalent_eigenstrain.py`.
Run checks: `python validate.py`. The solvers themselves require only NumPy. Matplotlib is for plots.

## The problem before the algorithm

A coherent precipitate would like to undergo the physical transformation strain ε⁰(x). The surrounding solid constrains it. Find a periodic displacement u and the resulting stress:

    ε = E + sym(grad u)
    εel = ε − ε⁰
    σ = C(x):εel
    div σ = 0
    F/V = mean[εel:σ]/2.

E is the prescribed mean TOTAL strain. The default E=0 represents macroscopic clamping, not zero mean stress. Mean u=0 fixes the arbitrary translation. The model is a periodic unit square; periodic images interact. It is small-strain 2-D elasticity with the in-plane cubic block, εzz=ε⁰zz=0. It is not plane stress or a fully 3-D dilatational inclusion. There is no applied body force, plasticity, phase-field time integration or traction-free outer boundary.

All units are dimensionless. Every tensor stores both xy and yx components; εxy is tensor shear, not engineering shear. Double contraction sums both, so the strain-energy formula includes the correct shear factor. x is the first array axis. Pictures transpose the scalar array for x-horizontal display.

The smooth plate has C(x)=(1−h)Cm+hCp and ε⁰(x)=h εp. Its orientation rotates the SHAPE while the crystal axes and transformation strain stay fixed. These are prescribed geometries, not predicted evolved morphologies.

## Solver 1: direct iterative perturbation

Split C=Cref+ΔC. Rearrange equilibrium without discarding ΔC:

    div(Cref:ε − P)=0,
    P = C:ε⁰ − ΔC:ε.

Given the current displacement, calculate ε and P. Solve the homogeneous reference problem for a candidate displacement. Mix it with the previous iterate. Repeating this treats the heterogeneous stiffness through successive corrections; it is not a first-order truncation of the contrast.

Using d/dxj ↔ i kj, define Qik(k)=Cref_ijkl kj kl. For nonzero k,

    ûi = −i [Q(k)⁻¹]im kj P̂mj.

The full wavevector Q contains |k|². If you use a unit-direction acoustic tensor instead, you must restore the 1/|k|² factor. The zero displacement mode is fixed to zero. Uniform Cref:E has zero divergence and does not alter that solve.

The `solve_direct` loop contains the complete iteration. `PeriodicGrid.response` shows the Fourier solve. No hidden external elasticity library is used.

## Solver 2: equivalent eigenstrain

Replace the heterogeneous solid, for the purpose of the equilibrium solve, by a uniform reference solid with an auxiliary eigenstrain η(x). Require its stress to match the physical stress:

    Cref:(ε−η) = C(x):(ε−ε⁰).

Since Cref is invertible on symmetric tensors,

    ηtarget = ε − Sref:C:(ε−ε⁰).

Start with η=ε⁰. Equilibrate the homogeneous reference solid, calculate the physical stress, and compare it with Cref:(ε−η). Correct η using the reference compliance and the stress mismatch. Repeat until BOTH the physical equilibrium residual and the constitutive mismatch are small.

η is a mathematical replacement for the stiffness contrast. It is not a new phase fraction, plastic strain or physical transformation strain. The reported energy always uses C(x) and ε⁰, never the energy of the fictitious uniform solid alone.

These two algorithms are closely related fixed-point formulations of the SAME equilibrium problem. Their agreement is useful, but is not an independent proof of correctness. The analytical laminate and separately assembled dense minimizer supply additional checks.

## Reference stiffness, relaxation and stopping

The default Cref=(Cm+Cp)/2 balances soft and hard regions. With the aligned stable cubic phase tensors constructed here, they share tensor eigenmodes and the midpoint bounds their relative contrast. Nevertheless convergence becomes slow for extreme contrasts. There is no claim of unconditional convergence for arbitrary anisotropic stiffness fields, voids or singular moduli. The examples reject nonpositive cubic constants; zero stiffness/vacuum is outside this implementation.

Relaxation ω mixes an old iterate with its proposed correction. It is a numerical parameter, not time, mobility or viscosity. The defaults use ω=0.8. Smaller values can slow convergence. A poor reference cannot always be rescued simply by requesting more iterations.

The equilibrium residual is RMS(div σ) divided by max(RMS(div σinitial), 2π RMS(σinitial), 10⁻³⁰). The second term keeps a useful scale for spatially uniform initial loading in the unit box. The equivalent method also checks RMS(σ−σref)/max(RMS(σinitial),10⁻³⁰). Energy alone is not a convergence test. Iteration exhaustion raises an error rather than returning a seemingly valid solution.

Odd grids 33, 65 and 129 avoid Nyquist ambiguities. The diffuse interface width is fixed in physical coordinates during refinement. Sharp interfaces and much thinner plates need further resolution checks. Angular sweeps give sampled minima only.

## What to explore

1. Set the modulus ratio to 1. The homogeneous reference is recovered; the equivalent method needs no constitutive correction when η=ε⁰.
2. Compare ratios 0.2, 0.5, 2 and 5 at unchanged geometry and eigenstrain.
3. Supply independent `precipitate_constants` to vary anisotropy as well as stiffness.
4. Change `misfit_ratio`, then the plate angle. Do not rotate the physical eigenstrain unintentionally.
5. Apply a nonzero symmetric `mean_strain`, including tensor shear.
6. Compare the physical transformation strain with η. Which regions require the largest correction?
7. Compare grid sizes before trusting a small energy difference between orientations.

## Sources and adaptation

The direct method follows the reference-stiffness split in Saswata Bhattacharyya's earlier C solver and the Fortran `muelast.f90` polycrystal solver, and the equations in Bhattacharyya, Heo, Chang and Chen, *A Spectral Iterative Method for the Computation of Effective Properties of Elastically Inhomogeneous Polycrystals*, CICP 11 (2012), 726–738, https://doi.org/10.4208/cicp.290610.060411a. Consult the laboratory's SOURCE-AUDIT.md for wavevector normalization and the mean-strain distinction. Tushar Jogi's thesis §§3.1.4–3.1.6 and Appendix B provide related equilibrium and driving-force formulations; no claim is made that these scripts are a line-by-line port of Tushar's code.

The second teaching example is inspired by Soumya Bandyopadhyay's equivalent/virtual-eigenstrain approach. His `src_inhomogeneous_elasticity/serial/elasticity.c` constructs transformation strains from polarization, solves a reference-medium problem and relaxes auxiliary eigenstrain in a film/vacuum geometry. This example independently derives a damped constitutive-matching iteration for two positive-stiffness solids. It does not reproduce his film boundary treatment or auxiliary-field time-relaxation law. It makes the common equivalent-eigenstrain principle explicit and testable.

## The corrected Elastic.ipynb

The course notebook introduced stiffness, acoustic tensors, eigenstrains and Bpq. The public teaching edition retains that progression but repairs the original Voigt-to-fourth-order mapping. It uses explicit cubic indices, treats k=0 separately instead of regularizing a singular inverse, includes shear and symmetry checks, and plots self/cross kernels. It uses a full 3-D cubic tensor for the kernel with in-plane n and explicitly specified εzz⁰. This distinction from the 2-D standalone solvers is stated in the notebook. Original private files were not overwritten.

## Validation

See validation.json: dense equilibrium minimization, an exact layered solution at imposed mean strain, analytic Fourier displacement, homogeneous energy including the clamped mean term, field agreement across contrasts, independent phase anisotropies and shear, spatial convergence, and explicit rejection of unconverged runs. All claims are limited to the stated cases.
