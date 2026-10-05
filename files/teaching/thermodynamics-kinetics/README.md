# Thermodynamics and Kinetics — computational laboratory 01

A 45–60 minute companion to [Thermodynamics and Kinetics of Materials (NPTEL)](https://nptel.ac.in/courses/113106109), linked from the existing Teaching page.

Open `phase-equilibria-01.ipynb` in JupyterLab or upload it to Google Colab. The notebook contains the complete model, instructions, three saved figures (four panels), five student exercises and an explicitly marked instructor solution/check section. No thermodynamic database is required. This is a fictional two-phase ideal-solution binary, not a real-alloy assessment.

## Local setup

Python 3.10+:

```sh
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m jupyter lab phase-equilibria-01.ipynb
```

Choose **Restart Kernel and Run All Cells**. Edit T, z and x_probe in the parameter cell and rerun downward. The intended temperature range is 200–3000 K. Instructor checks reset the reference energies to their original values. Dependency bounds are compatibility ranges; tested versions are recorded below and in the notebook output.

## Learning sequence

1. Differentiate total Gibbs energy to obtain both chemical potentials.
2. Read them from tangent intercepts; distinguish the slope from either potential.
3. Match tangent slopes and intercepts across two phases.
4. Connect the lower convex envelope to equilibrium energy and the lever rule.
5. Investigate overall composition, temperature and a shared affine reference shift.

The notebook distinguishes phase mole fractions from mass/volume fractions, curve crossings from common tangents, and equilibrium from kinetics. Each individual branch is convex; this example is not a single-phase spinodal model. pycalphad and FiPy are described as next steps, not dependencies or software used by this notebook.

## Reference result

At T = 800 K and overall B mole fraction z = 0.40:

| Quantity | Value |
|---|---:|
| x_alpha | 0.121167 |
| x_beta | 0.736021 |
| f_alpha | 0.546505 |
| f_beta | 0.453495 |
| mu_A (J/mol) | -859.122196 |
| mu_B (J/mol) | -2038.687054 |
| g_eq (J/mol) | -1330.948 |
| Homogeneous energy excess (J/mol) | 1654.364 |

## Validation performed

All nine code cells executed sequentially in a fresh Python 3.12.14 process with a shared namespace; three Matplotlib figures were captured and visually inspected. NumPy 2.3.5, SciPy 1.17.0 and Matplotlib 3.10.8 were used. Notebook schema validation passed. The review environment disallowed kernel sockets, so this was direct sequential execution rather than an end-to-end Jupyter kernel run; this limitation is also recorded in notebook metadata.

Checks passed for analytic coexistence compositions, equality of both chemical potentials, supporting-line stability on both branches, nonnegative fractions, unit fraction sum, composition conservation, pure endpoints, tie-line boundaries and invariance under a shared affine energy shift. These checks span 200, 600, 800, 1200 and 3000 K. An independent linear-programming minimization over 2,001 compositions per phase agreed with the default equilibrium energy within 0.000482 J/mol. Its small positive discrepancy is expected from grid discretization.

## Website integration

Prepared against `saswataiith/saswataiith.github.io` commit `34b2de98863a87e70539919cc6fee7c472b0014d`, with publication approved on 5 October 2026.

The Teaching page links this notebook from the NPTEL section using the site's existing styles. The download includes instructor solutions, as explicitly stated on the page. No additional website JavaScript or build dependencies are required.

Full Jekyll rendering was not run locally because Ruby/Jekyll was unavailable; the insertion and local link target were checked structurally. The notebook validation and its execution limitations are recorded above.

## Provenance and license

The numerical reference energies, exposition, code and figures are original teaching material, released under the MIT license embedded in the notebook, consistent with the site's MIT licensing. No external database, third-party figure, textbook extract or restricted course material is redistributed. Dependencies retain their respective licenses.
