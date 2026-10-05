# Thermodynamics and Kinetics — computational laboratory 01

A 75–90 minute companion to [Thermodynamics and Kinetics of Materials (NPTEL)](https://nptel.ac.in/courses/113106109), linked from the existing Teaching page.

Open `phase-equilibria-01-v3.ipynb` in JupyterLab or upload it to Google Colab. The notebook contains the complete model, instructions, six saved figures (ten panels), seven student exercises and an explicitly marked instructor solution/check section. No thermodynamic database is required. This is a fictional solid–liquid ideal-solution binary, not a real-alloy assessment.

## Local setup

Python 3.10+:

```sh
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m jupyter lab phase-equilibria-01-v3.ipynb
```

Choose **Restart Kernel and Run All Cells**. Edit T, z and x_probe in the parameter cell and rerun downward. The intended temperature range is 200–3000 K. Instructor checks reset the reference energies to their original values. Dependency bounds are compatibility ranges; tested versions are recorded below and in the notebook output.

## Learning sequence

1. Differentiate total Gibbs energy to obtain both chemical potentials.
2. Read them from tangent intercepts; distinguish the slope from either potential.
3. Match tangent slopes and intercepts across two phases.
4. Connect the lower convex envelope to equilibrium energy and the lever rule.
5. Construct explicit SER-based unary functions for A and B in solid alpha and liquid; compare with a common pure-solid Gibbs reference.
6. Demonstrate three-phase invariant equilibrium in a separate quadratic eutectic model, distinguish fixed intensive variables from nonunique phase amounts, and check neighboring temperatures.
7. Investigate overall composition, temperature and a shared affine reference shift.

The single-tangent and common-tangent plots have vertical axes at x_B=0 and x_B=1 on the same energy scale, with numerical mu_A and mu_B intercept labels.

The notebook distinguishes phase mole fractions from mass/volume fractions, curve crossings from common tangents, and equilibrium from kinetics. Each individual branch is convex; this example is not a single-phase spinodal model. pycalphad and FiPy are described as next steps, not dependencies or software used by this notebook.

## Reference result (initial illustrative reference convention)

At T = 800 K and overall B mole fraction z = 0.40:

| Quantity | Value |
|---|---:|
| x_alpha | 0.121167 |
| x_liquid | 0.736021 |
| f_alpha | 0.546505 |
| f_liquid | 0.453495 |
| mu_A (J/mol) | -859.122196 |
| mu_B (J/mol) | -2038.687054 |
| g_eq (J/mol) | -1330.948 |
| Homogeneous energy excess (J/mol) | 1654.364 |

## Validation performed

All thirteen code cells executed sequentially in a fresh Python 3.12.14 process with a shared namespace; six Matplotlib figures were captured and visually inspected. NumPy 2.3.5, SciPy 1.17.0 and Matplotlib 3.10.8 were used. Notebook schema validation passed. The review environment disallowed kernel sockets, so this was direct sequential execution rather than an end-to-end Jupyter kernel run; this limitation is also recorded in notebook metadata.

Checks passed for analytic coexistence compositions, equality of both chemical potentials, supporting-line stability on both branches, nonnegative fractions, unit fraction sum, composition conservation, pure endpoints, tie-line boundaries and invariance under a shared affine energy shift. These checks span 200, 600, 800, 1200 and 3000 K. An independent linear-programming minimization over 2,001 compositions per phase agreed with the default equilibrium energy within 0.000482 J/mol. Its small positive discrepancy is expected from grid discretization.

Additional SER checks verify solid/liquid equality at each pure element's melting point, G-H_SER = -T_ref*S_ref at 298.15 K, and invariant equilibrium compositions/fractions under a common species reference change. At 800 K the SER chemical potentials are mu_A = -32053.172438 and mu_B = -54671.547344 J/mol; under a common pure-solid Gibbs reference they become -859.122196 and -14038.687054 J/mol. The initial illustrative reference yields the table above. These are different reference conventions for the same 800 K equilibrium.

The initial frozen-endmember temperature sweep is only an entropy sensitivity exercise, not a melting phase diagram. The separate SER example constructs temperature-dependent solid/liquid functions with constant and equal phase heat capacities, specified elemental entropies and fusion enthalpies. No assessed data are used.

## Website integration

Prepared against `saswataiith/saswataiith.github.io` commit `34b2de98863a87e70539919cc6fee7c472b0014d`, with publication approved on 5 October 2026.

The Teaching page links this notebook from the NPTEL section using the site's existing styles. The download includes instructor solutions, as explicitly stated on the page. No additional website JavaScript or build dependencies are required.

Full Jekyll rendering was not run locally because Ruby/Jekyll was unavailable; the insertion and local link target were checked structurally. The notebook validation and its execution limitations are recorded above.

## Provenance and license

The numerical reference energies, exposition, code and figures are original teaching material, released under the MIT license embedded in the notebook, consistent with the site's MIT licensing. No external database, third-party figure, textbook extract or restricted course material is redistributed. Dependencies retain their respective licenses.


## Revision 3 — 5 October 2026

The distinct filenames `phase-equilibria-01-v3.ipynb` and `phase-equilibria-01-v3.html` identify this revision; the unversioned notebook is also updated for compatibility. The browser preview displays the saved figures without opening Jupyter. It is read-only; download the notebook to run or modify the calculations. The preview loads the site's existing local MathJax bundle for equations.

The three-phase example is a separate, explicitly illustrative quadratic model. At fixed pressure, C=2 and P=3 give F=0. At 1000 K one common supporting tangent touches alpha, liquid and beta at compositions 0.15, 0.50 and 0.85. Tests confirm the stable pairs below and above this temperature, both chemical-potential equalities at the invariant, nonnegative phase amounts and composition conservation. A fraction-family plot demonstrates why fixed overall composition alone leaves one free phase-amount parameter.
