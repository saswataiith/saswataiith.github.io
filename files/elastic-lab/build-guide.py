# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I combine the current notes and numerical report into the readable website guide.
import json
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / 'files' / 'elastic-lab'
report = json.loads((folder / 'validation-results.json').read_text())
checks = [
    ('Stiffness conversion and stability', 'Convert stiffnesses to the averaged parameters and back. Check which side of the stability boundary is allowed.'),
    ('Interpolation functions', 'Check the pure-phase values, derivatives and symmetry of the smooth interpolation functions.'),
    ('Isotropic dilatational misfit', 'Check that equal in-plane expansion with isotropic stiffness gives the same elastic coefficient in every direction.'),
    ('Zero-extension lines', 'Check the line directions for negative misfit ratios, the limiting zero ratio and the absence of a solution for positive ratios.'),
    ('Sandeep’s X2 example', 'Compare all three coefficients with the reference values along the axes and diagonals.'),
    ('Misfit signs and crystal symmetry', 'Check the other thesis misfit cases, reversal of a cross coefficient when one misfit changes sign, and the expected cubic symmetry.'),
    ('Uniform-stiffness plate energy', 'Compare the displacement solver with an independent Fourier energy calculation.'),
    ('Soft and hard plates', 'Repeat selected energies at finer grids and check recovery of the uniform-stiffness limit.'),
    ('Angular spacing for a uniform-stiffness plate', 'Repeat the orientation calculation with smaller angle steps at the same spatial resolution.'),
    ('Particle-pair energy', 'Check sign reversal, symmetry and changes between two Fourier resolutions.'),
    ('Orientation of a plate with different stiffness', 'Compare the sampled minimum at finer spatial grids and smaller angle steps.'),
    ('Elastic coefficient including shear', 'Compare the compact formula with a component-by-component calculation that retains shear terms.'),
    ('Mohr’s circle of strain', 'Check the transformed strain components, circle radius and zero-extension intersections.'),
    ('Fourier wave number', 'Check the displacement amplitude for specified sinusoidal modes, including its inverse dependence on wave number.'),
    ('Two mechanical-equilibrium solvers', 'Compare complete displacement fields from conjugate gradients and a separate Fourier iteration.'),
    ('Elastic energy derivative', 'Compare the analytical derivative with a small-change calculation of energy after mechanical equilibrium is solved again.'),
    ('Strain inside an ellipse', 'Compare the angular integration with Mura’s closed expression for isotropic stiffness.'),
    ('Thin-plate limit', 'Compare a very flat ellipse with the ideal thin-plate strain and energy. The energy tolerance uses the unrelaxed energy scale because the limiting energy can be nearly zero.'),
    ('Continuity at the interface', 'Check tangential total strain and both traction components at the sampled interface points.'),
    ('Periodic field map', 'Compare the centre strain with the infinite-matrix ellipse result. The allowed difference is 6%, because the periodic map has different boundary conditions.'),
]
if len(checks) != len(report['tests']):
    raise ValueError('Update the explanations when the numerical check groups change.')

recorded = datetime.fromisoformat(report['date'].replace('Z', '+00:00')).strftime('%d %B %Y at %H:%M UTC')
passed = sum(test['passed'] is True for test in report['tests'])
lines = [
    '# Numerical checks',
    '',
    f"The saved report records **{passed} of {len(checks)} check groups passing**. The run was recorded at {recorded}. Each group contains comparisons for specified inputs and tolerances.",
    '',
    'I check the calculations by comparing independently calculated results and by repeating selected examples at finer resolutions. Passing a check means that its comparison met the tolerance in the check program. It does not mean that every possible input has been tested.',
    '',
    '## What was compared',
    '',
    '| Check | Result | What it checks |',
    '| --- | --- | --- |',
]
for (name, explanation), test in zip(checks, report['tests']):
    status = 'Passed' if test['passed'] is True else 'Failed'
    lines.append(f'| {name} | {status} | {explanation} |')

uniform = report['tests'][6]['details']['worstRelativeError']
solver = max(case['relativeDisplacementError'] for case in report['tests'][14]['details'])
lines += [
    '',
    '## How to interpret the numerical differences',
    '',
    'A relative difference is the difference between two results divided by the specified reference scale. It is dimensionless. An absolute difference retains the units of the quantity being compared. The check code states the scale and tolerance for each comparison.',
    '',
    f'- For the uniform-stiffness plate, the largest recorded relative energy difference between the two calculations is {uniform:.3g}.',
    f'- For the selected soft and hard anisotropic cases, the largest recorded relative displacement difference between the two equilibrium solvers is {solver:.3g}.',
    '- For the selected soft, uniform and hard plate cases, changing the grid from 64 by 64 to 128 by 128 changes energy by about 0.0093% to 0.0275%. These values apply to those cases.',
    '- The orientation estimate can change with resolution. In one different-stiffness plate example, the lowest sampled angle changes from 60 degrees on a 32 by 32 grid to 65 degrees on a 64 by 64 grid. Reducing the angular step gives 62.5 degrees. This is why small energy differences need spatial and angular checks.',
    '- The periodic ellipse map is compared with an isolated ellipse in an infinite matrix. These have different boundary conditions. Its check allows a 6% centre-strain difference; it is not an exact equality test.',
    '',
    'The laboratory does not evolve a phase field or establish the final shape of a decomposing alloy. The checks concern the elastic calculations described here.',
    '',
    '[Download the numerical values as JSON](/files/elastic-lab/validation-results.json). JSON is the structured data file used by the program. [Download the source and check programs](/files/elastic-lab/elastic-lab-source.zip).',
]

parts = [
    ('checks', '\n'.join(lines)),
    ('equations', (folder / 'FORMULATION.md').read_text()),
    ('references', (folder / 'SOURCE-AUDIT.md').read_text()),
    ('instructions', (folder / 'README.md').read_text()),
]
page = ['---', 'layout: scholar', 'title: "Elastic Lab: equations, checks and instructions"',
        'permalink: /research/elastic-lab/guide/', 'nav_active: research', '---',
        '<link rel="stylesheet" href="/assets/js/elastic-lab/lab.css?v=20261007-notes" />',
        '<link rel="stylesheet" href="/assets/css/elastic-lab-guide.css?v=20261007-notes" />',
        '<div class="elastic-formulation-page elastic-lab-guide">',
        '<section class="page-heading"><h1>Elastic Lab: equations, checks and instructions</h1>',
        '<p>Read what each calculation assumes, how it was checked and how to run the source.</p>',
        '<p><a href="/research/elastic-lab/#validation">Return to the laboratory</a> · <a href="#checks">Numerical checks</a> · <a href="#equations">Equations and assumptions</a> · <a href="#references">References and notation</a> · <a href="#instructions">Using the source</a></p></section>']
for section, text in parts:
    # I place the document title below the page title and keep its subsections smaller.
    text = '\n'.join('#' + line if line.startswith('#') else line for line in text.splitlines())
    page += [f'<section class="section" id="{section}">',
             '{% capture guide_text %}', text, '{% endcapture %}',
             '{{ guide_text | markdownify }}', '</section>']
page += ['</div>', '']
(root / '_pages' / 'elastic-lab-guide.html').write_text('\n'.join(page))
print('Updated the readable guide from the notes and saved numerical report.')
