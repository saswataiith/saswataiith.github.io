# TensorLab interactive book

Public book: https://saswataiith.github.io/tensorlab/

Sixteen chapters connect tensors, symmetry, vector calculus, potentials,
constitutive relations and transport balances. All computation runs in the browser.

## Edit

- `index.html`: original eight chapters and shared navigation/interactive figures.
- `connections.js`: LaTeX equations and three additional teaching chapters.
- `foundations.js`: independently testable analytic transport models.
- `experiments.js`: controls, readouts and canvas figures for the added chapters.
- `reading.css`: typography and responsive reading surface.
- `fonts/`: locally hosted STIX Two Text, under its included SIL Open Font License.

MathJax is loaded from the parent site's `assets/vendor/mathjax/tex-svg.js`.
Keep that asset and `assets/js/math-config.js` when using the book offline.
From the website root, run `python3 -m http.server 4176` and open
http://localhost:4176/tensorlab/ . No build or external service is required.

Run `node tensorlab/validate.cjs` from the website root for the scientific checks.
The tests independently integrate paths, differentiate fields, and check
control-volume balance and positivity of entropy production.

## Scientific review, September 2026

Added missing links between potential and work, flux and divergence,
conservation and constitutive laws. Explicitly distinguish conservative fields,
conserved quantities and solenoidal fluxes. Explain the simply connected domain
condition for a global potential, reference velocities, initial/boundary data,
variable coefficients, momentum-flux sign conventions, uphill diffusion and
positive mobility, entropy-conjugate forces, Curie selection and Onsager reciprocity.

The added experiments are dimensionless analytic examples, not calibrated
material models. The original note provenance remains in chapter panels.
New text is original synthesis cross-checked against the linked MIT teaching
material. Full textbook editions were not reread for this update; no claims of
page-by-page verification or verbatim reproduction are made.

The separate heat, mass and momentum Transport Laboratory is maintained at
https://github.com/saswataiith/transport-phenomena-course.

## Extended course foundations

The book now has sixteen chapters. New source files:

- `course-chapters.js`: lessons 12–16 and links from the introductory chapters.
- `course-models.js`: tensor transforms, stiffness, material trajectories and exact flow solutions.
- `course-experiments.js`: figures, controls and analytic trajectory playback.
- `validate-course.cjs`: independent checks of the extended examples.

Run `node tensorlab/validate-course.cjs` in addition to the original validation.
The additional tests check 3D tensor covariance, reflection parity, explicit index
orbits (81/36/21), energy reciprocity, engineering/Kelvin shear factors, finite-
difference derivatives, trajectories, flow boundary conditions, quadrature of
flow and dissipation, and thickness scaling. They do not establish applicability
outside the assumptions stated in each lesson.

Direct chapter links use `#chapter-12` through `#chapter-16` (and the same pattern
for earlier chapters). Playback is optional and starts only when requested.

The elasticity example is a stable cubic 3D model with imposed plane strain.
Observer rotations transform both stiffness and strain; they do not rotate the
crystal relative to a fixed load. The flow examples are exact idealized laminar,
fully developed solutions. All controls and units are documented in the text.

The supplied PDFs and Beamer source inform the lessons. Incorrect signs, mixed
active/passive conventions, invalid repeated indices, shear-face descriptions,
and free-surface pressure interpretations were corrected before incorporation.
No source PDF or textbook scan is included in this public directory.
