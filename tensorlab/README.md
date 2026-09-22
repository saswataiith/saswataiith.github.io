# TensorLab interactive book

Public book: https://saswataiith.github.io/tensorlab/

Eleven chapters connect tensors, symmetry, vector calculus, potentials,
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
