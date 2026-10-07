# Using the Elastic Stress Effects Laboratory

I use this laboratory to explain how misfit strain, elastic constants and particle shape affect stress and elastic energy. You can change the inputs, compare the results and download the source code.

The browser calculates elastic fields for specified shapes. It does not evolve a microstructure with time. The numerical examples use scaled model units: strain is dimensionless, and stiffness and energy density use a common energy-density scale. No particular material or conversion to SI units is assumed.

## Start with the browser

Open [the laboratory](https://saswataiith.github.io/research/elastic-lab/). Each module has its own inputs. Changing one module does not change another.

- **Module 0:** check elastic stability and convert between two ways of specifying cubic elastic constants.
- **Module I:** change the misfit strain and find a line that has no extension under that strain.
- **Module II:** calculate strain and stress inside and outside an elliptical inclusion. Compare the values on the two sides of its interface.
- **Module III:** calculate how the elastic energy coefficient changes with direction for one phase.
- **Module IV:** calculate the two self coefficients and the cross coefficient for two precipitate phases. Then compare the interaction energy for different particle separation directions.
- **Module V:** rotate a plate whose stiffness differs from the matrix stiffness and compare its elastic energy at different orientations.

**Try these values** repeats the calculation with the current inputs. **Reset this module** restores that module's initial inputs. Most plots also update when you change an input. Module II has a separate Copy button if you want to use the misfit from Module I.

You can enter C11, C12 and C44 directly, or use the Schmidt–Gross parameters: average shear parameter mu, effective Poisson parameter nu and Zener anisotropy ratio AZ. The conversion panels describe the units. Module IV keeps nu = 1/3 in its conversion panel, as in the thesis example. Its three stiffness inputs can still be changed independently.

## Read the angles carefully

The angle has a different meaning in each calculation:

| Calculation | Meaning of the angle |
| --- | --- |
| Habit line or plate | Direction along the line or long axis of the plate |
| Elastic energy coefficient | Direction of the Fourier wavevector, normal to a composition modulation |
| Particle pair | Direction of the line joining the two particle centers |

A plate tangent is perpendicular to its normal. A minimum in an elastic coefficient plot does not, by itself, identify the preferred direction between two particles. Use the particle-pair energy calculation for that comparison.

## Choose the plate calculation settings

Module V offers 32 by 32, 64 by 64 and 128 by 128 grids. Start with 32 by 32 for a quick calculation. Repeat at finer grids before relying on a small energy difference. Also reduce the angular step from 5 degrees to 2.5 or 1.25 degrees to check whether the estimated minimum changes.

The program solves mechanical equilibrium using **preconditioned conjugate gradients**, abbreviated PCG. This is an iterative method for solving the discretized displacement equations. The relative residual measures how closely those equations are satisfied. The browser calculation requires a residual below 10^-7 and stops after at most 300 iterations. It reports a failed solve instead of treating that result as converged.

Changing the mechanical inputs cancels the previous orientation calculation. The time required depends on the grid, stiffness contrast and computer. A completed calculation can be downloaded with its inputs and energies.

## Boundary conditions and scope

Module V uses a periodic square. Crossing a boundary returns to the opposite boundary, so the plate also interacts with periodic copies. The average total strain is fixed at zero. This constrains the overall size and shape of the square; it does not require the average stress to be zero.

The module calculates one selected beta or gamma plate at a time. It retains separate settings for both phases, but does not calculate a simultaneous three-phase microstructure with different stiffnesses in all three phases.

Module II uses separate solutions for the interior and exterior interface profiles. Its field map uses a periodic calculation, with selectable resolutions of 256, 512 or 1024 points in each direction. These two calculations have different boundary conditions, so their values need not agree exactly.

The laboratory uses small-strain, in-plane elasticity with the cubic (001) stiffness components. It does not include plastic deformation or a general three-dimensional elastic solution. The particle shapes and compositions are prescribed. To predict an evolving morphology, a phase-field calculation must also include the chemical and interfacial energies.

## Download and check the source

Download and extract [the source archive](https://saswataiith.github.io/files/elastic-lab/elastic-lab-source.zip). The archive retains the same folders as the website repository.

To run the numerical checks, install Node.js and run this command from the extracted archive's root directory:

```sh
node files/elastic-lab/validate.mjs
```

No additional Node packages are required. Each successful check prints PASS. If an assertion fails, the program stops with an error. The completed run writes the numerical results to `files/elastic-lab/validation-results.json`.

To run the webpage locally, place the archive's files in the website checkout and use the existing Jekyll setup:

```sh
bundle install
bundle exec jekyll serve
```

Open the local address printed by Jekyll and go to `/research/elastic-lab/`. The archive alone is not a complete website: it needs the website layout, Gemfile and local MathJax files. Opening the page directly from a file on disk will not run its browser modules and workers correctly.

## Where to find each calculation

| File | What it contains |
| --- | --- |
| `_pages/elastic-lab.html` | The text, inputs and layout of the laboratory |
| `assets/js/elastic-lab/math.mjs` | Stress, elastic coefficients, stiffness conversion and habit-line directions |
| `assets/js/elastic-lab/fft.mjs` | Fast Fourier transforms and spatial derivatives |
| `assets/js/elastic-lab/solver.mjs` | Mechanical equilibrium, plate energy and particle-pair energy |
| `assets/js/elastic-lab/worker.mjs` | Plate calculations performed separately from the browser interface |
| `assets/js/elastic-lab/eshelby.mjs` | Ellipse interior solution, interface jumps and field profiles |
| `assets/js/elastic-lab/state.mjs` | Inputs and checks on allowed values |
| `assets/js/elastic-lab/controls.mjs` | Stiffness conversion, stability example, Try and Reset buttons |
| `assets/js/elastic-lab/ui.mjs` and `eshelby-ui.mjs` | Updates to the controls and displayed results |
| `assets/js/elastic-lab/plots.mjs` and `math-render.mjs` | Diagrams and mathematical labels |
| `assets/js/elastic-lab/lab.css` | Page layout and appearance |
| `files/elastic-lab/validate.mjs` | The main numerical check program |
| `files/elastic-lab/reference-checks.mjs` and `eshelby-checks.mjs` | Comparisons with independently calculated results |

The archive also contains `interfaces.mjs` and `interfaces-ui.mjs`, which provide interpolation functions and a separate interface-profile demonstration. That demonstration is not currently a module on the main laboratory page.

Read `FORMULATION.md` for the equations and assumptions, and `SOURCE-AUDIT.md` for the references and explanations of notation. The numerical report records the cases actually checked; passing these cases does not establish accuracy for every possible input.

The website guide is generated from these three notes and the saved numerical report. After updating a note or rerunning the numerical checks, regenerate it with:

```sh
python3 files/elastic-lab/build-guide.py
```

This writes `_pages/elastic-lab-guide.html`. Keep that generated page with the updated notes when publishing.

## Licence

The laboratory source and new documentation use GPL-3.0-or-later; see `LICENSE.txt`. The existing website template retains its MIT licence. Referenced books, papers and thesis figures retain their original rights.
