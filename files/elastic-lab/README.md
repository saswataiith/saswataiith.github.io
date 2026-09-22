# Elastic Stress Effects Laboratory

A browser-based teaching tool for prescribed-shape linear elasticity. It runs on static hosting. No server, build framework or external numerical dependency is required. MathJax comes from the surrounding site.

## Open and edit
Open `/research/elastic-lab/` on the website. Jekyll source: `_pages/elastic-lab.html`.

Numerical and UI modules are in `assets/js/elastic-lab/`:
- `math.mjs`: constitutive law, acoustic tensor, Bpq, habit roots, minima.
- `fft.mjs`: radix-2 FFT, derivatives and acoustic preconditioner.
- `solver.mjs`: real-space heterogeneous equilibrium solve, independent homogeneous Fourier energy and finite-profile pair energy.
- `worker.mjs`: cancellable plate sweeps off the main thread.
- `plots.mjs`: accessible SVG diagrams and signed-axis plotting.
- `state.mjs`: parameters and input validation.
- `ui.mjs`: interactions, explanations and downloads.
- `lab.css`: responsive layout, scoped to the laboratory.

The standalone source archive preserves these paths. To run the tests from its root, use a modern Node.js:

    node files/elastic-lab/validate.mjs

This writes `files/elastic-lab/validation-results.json`. No npm install is required. To run the page, copy its files into the existing Jekyll website and build/serve with the existing Gemfile. Raw Jekyll source needs the website layout and local MathJax assets; opening it as file:// does not run ES modules or workers.

## Numerical controls
The plate scan uses 32, 64 or 128 square grids, and 5°, 2.5° or 1.25° steps. Start at 32² for exploration; confirm at 64² and 128². Changing mechanical parameters cancels the previous scan. PCG relative residual tolerance is 1e-7, with a 300-iteration cap. Failed solves return an error. Browser hardware affects the time required.

A completed sweep can be downloaded as JSON with parameters, boundary conditions and energies. Plate angles are line/tangent angles, kernel angles are Fourier normal angles, and pair angles are centre-to-centre separation angles. Never interchange them.

Read FORMULATION.md for the boundary condition and reduction. The inhomogeneous module fixes mean total strain to zero; it does not enforce zero mean stress. It models one smooth plate of the selected phase in the matrix. Independent beta and gamma settings are retained, but it does not solve simultaneous inhomogeneous three-phase microstructures. That is a future extension.

## Evidence and limitations
The reference from Sandeep's thesis is Chapter5 Fig5.18 and its Table5.1/5.2 parameters. The tests reproduce all three X2 kernel curves numerically and check X1 and X3 scaling, as well as a separate finite-profile pair calculation. No full ternary decomposition is rerun. The real-space pair model includes periodic images and diffuse Gaussian profiles. It should not be read as an infinite-domain sharp-particle potential.

Numerical angular minima are sampled, not rigorous global continuum minima. Weak orientation preferences must be checked against spatial and angular refinement. The current model has no evolving phase field, interfacial-energy minimization, plastic relaxation or arbitrary 3-D compatibility. It is a foundation for a larger education ecosystem, not a drop-in microSIM simulation backend.

## Provenance
Saswata Bhattacharya: Evolution of Multivariant Microstructures with Anisotropic Misfit: A Phase Field Study. Chapter3 Eq3.2; Chapter4 Eq4.10 and Fig4.4. The line/normal angle discrepancy between Eq3.2 and the wording at Eq4.10 is explicitly documented.
Sandeep Sugathan: A Phase-Field Study of Elastic Stress Effects on Phase Separation in Ternary Alloy Systems. IIT Hyderabad, June 2019, Chapter3 Eqs3.22,3.27–3.29; Chapter5 Eq5.1, Tables5.1–5.2, Fig5.18. Formulas and numeric reference values are recorded in FORMULATION.md and validation-results.json.

## Licence
New files in `assets/js/elastic-lab/` and `files/elastic-lab/`, and `_pages/elastic-lab.html`, are GPL-3.0-or-later. See LICENSE.txt. Existing site template and its MIT notice remain unchanged. Referenced thesis text and figures retain their authors' rights and are not relicensed as software. This is an independently implemented educational tool, not an official microSIM distribution.
