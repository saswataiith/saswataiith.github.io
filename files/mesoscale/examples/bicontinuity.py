"""Spinodal decomposition and connectivity, explained step by step.

Install NumPy and Pillow, then run:
    python bicontinuity.py
    python bicontinuity.py my_output_folder

We compare mean compositions 0.5 and 0.4 using the SAME initial perturbation.
The model is dimensionless and periodic, with no elastic contribution:
    f(c) = A c^2 (1-c)^2
    mu = df/dc - kappa Laplacian(c)
    dc/dt = M Laplacian(mu)

The grid has 256 x 256 points, spacing 1, and final time 400.
Connectivity uses four edge-sharing neighbors. Corner contact does not count.
This example uses a queue-based flood fill, not Hoshen-Kopelman labeling.
"""

from collections import deque
from pathlib import Path
import json
import sys

import numpy as np
from PIL import Image


# Change these values to explore the model. The seed makes a run reproducible.
SEED = 20260921
GRID_SIZE = 256
GRID_SPACING = 1.0
TIME_STEP = 0.2
NUMBER_OF_STEPS = 2000
A = 1.0
MOBILITY = 1.0
KAPPA = 1.0
MEAN_COMPOSITIONS = (0.5, 0.4)
THRESHOLDS = (0.45, 0.5, 0.55)


def connectivity(mask):
    """Count regions and detect loops winding around the periodic domain.

    A True pixel belongs to the region we are measuring. We start at an
    unvisited True pixel and visit every neighbor connected to it. This gives
    one component. Then we start again at the next unvisited True pixel.

    Array coordinates wrap at the boundaries. Alongside them, we track
    unwrapped coordinates, which continue beyond the box. If two paths reach
    the SAME pixel with different unwrapped coordinates, their difference
    reveals a loop winding around the periodic box. Simply joining across
    an edge is not enough: a small island straddling an edge need not wrap.
    """
    size_x, size_y = mask.shape
    visited = np.zeros(mask.shape, dtype=bool)
    unwrapped_x = np.zeros(mask.shape, dtype=int)
    unwrapped_y = np.zeros(mask.shape, dtype=int)
    components = []
    neighbors = ((1, 0), (-1, 0), (0, 1), (0, -1))

    for start_x, start_y in np.argwhere(mask):
        if visited[start_x, start_y]:
            continue

        visited[start_x, start_y] = True
        queue = deque([(start_x, start_y)])
        pixel_count = 0
        wraps_x = False
        wraps_y = False

        while queue:
            x, y = queue.popleft()
            pixel_count += 1

            for step_x, step_y in neighbors:
                next_x = (x + step_x) % size_x
                next_y = (y + step_y) % size_y
                if not mask[next_x, next_y]:
                    continue

                proposed_x = unwrapped_x[x, y] + step_x
                proposed_y = unwrapped_y[x, y] + step_y

                if not visited[next_x, next_y]:
                    visited[next_x, next_y] = True
                    unwrapped_x[next_x, next_y] = proposed_x
                    unwrapped_y[next_x, next_y] = proposed_y
                    queue.append((next_x, next_y))
                else:
                    if proposed_x != unwrapped_x[next_x, next_y]:
                        wraps_x = True
                    if proposed_y != unwrapped_y[next_x, next_y]:
                        wraps_y = True

        components.append({
            'pixels': pixel_count,
            'wrap_x': wraps_x,
            'wrap_y': wraps_y,
        })

    # The largest-component fraction is relative to this region, not the box.
    region_pixels = int(mask.sum())
    largest_pixels = 0
    wrapping_components = []
    for component in components:
        largest_pixels = max(largest_pixels, component['pixels'])
        if component['wrap_x'] or component['wrap_y']:
            wrapping_components.append(component)

    largest_fraction = 0.0
    if region_pixels > 0:
        largest_fraction = largest_pixels / region_pixels

    return {
        'components': len(components),
        'area_fraction': float(mask.mean()),
        'largest_fraction_of_phase': largest_fraction,
        'wrapping_components': wrapping_components,
    }


def evolve(composition):
    """Advance Cahn-Hilliard with a semi-implicit Fourier method.

    In Fourier space, Laplacian becomes -k^2. Treat df/dc explicitly and
    the gradient-energy contribution implicitly:

    c_hat(new) = [c_hat - dt M k^2 FFT(df/dc)] / [1 + dt M kappa k^4].

    The k=0 coefficient never changes, so the mean composition is conserved.
    The explicit nonlinear term still requires a suitably small time step.
    """
    wave_numbers = 2 * np.pi * np.fft.fftfreq(GRID_SIZE, d=GRID_SPACING)
    k_squared = wave_numbers[:, None]**2 + wave_numbers[None, :]**2
    denominator = 1 + TIME_STEP * MOBILITY * KAPPA * k_squared**2

    for iterator in range(1, NUMBER_OF_STEPS + 1):
        chemical_derivative = 2 * A * composition * (1 - composition) * (1 - 2 * composition)
        composition_hat = np.fft.fft2(composition)
        derivative_hat = np.fft.fft2(chemical_derivative)
        next_hat = (composition_hat - TIME_STEP * MOBILITY * k_squared * derivative_hat) / denominator
        composition = np.fft.ifft2(next_hat).real

        if iterator % 500 == 0:
            print(f'  Step {iterator}, time {iterator * TIME_STEP:.1f}')

    return composition


def save_image(composition, filename):
    """Save a fixed rainbow scale: blue=0, green=0.5, red=1.

    Clipping is only for display. The saved numerical field is not clipped.
    Transpose and flip so array axis 0 is horizontal, with y pointing up.
    """
    levels = [0, 0.25, 0.5, 0.75, 1]
    colors = np.array([[0, 0, 255], [0, 255, 255], [0, 255, 0],
                       [255, 255, 0], [255, 0, 0]])
    display_values = np.clip(composition, 0, 1)
    rgb = np.zeros(composition.shape + (3,))
    for channel in range(3):
        rgb[:, :, channel] = np.interp(display_values, levels, colors[:, channel])

    image_pixels = rgb.astype('uint8').transpose(1, 0, 2)[::-1]
    image = Image.fromarray(image_pixels)
    image = image.resize((1024, 1024), Image.Resampling.NEAREST)
    image.save(filename)


def run(output='bicontinuity_output'):
    output_folder = Path(output)
    output_folder.mkdir(exist_ok=True, parents=True)

    # Remove the noise mean so each starting field has the requested mean.
    generator = np.random.default_rng(SEED)
    perturbation = 0.01 * generator.standard_normal((GRID_SIZE, GRID_SIZE))
    perturbation -= perturbation.mean()

    results = {}
    for mean in MEAN_COMPOSITIONS:
        print(f'Mean composition {mean}')
        composition = evolve(mean + perturbation)
        assert np.isfinite(composition).all(), 'Non-finite composition: check the time step.'
        assert abs(composition.mean() - mean) < 1e-10, 'Mean composition has drifted.'

        tag = f'{mean:.1f}'
        np.save(output_folder / f'composition-{tag}.npy', composition)
        save_image(composition, output_folder / f'composition-{tag}.png')

        # The ideal bulk high-c fraction equals mean c because the minima
        # are 0 and 1. A thresholded diffuse-field area is a different measure.
        threshold_results = {}
        for threshold in THRESHOLDS:
            threshold_results[str(threshold)] = {
                'high': connectivity(composition >= threshold),
                'low': connectivity(composition < threshold),
            }
        results[tag] = {
            'mean': float(composition.mean()),
            'thresholds': threshold_results,
        }

    report = output_folder / 'connectivity.json'
    report.write_text(json.dumps(results, indent=2))
    print(f'Images, numerical fields and connectivity report saved in {output_folder}')


if __name__ == '__main__':
    output = sys.argv[1] if len(sys.argv) > 1 else 'bicontinuity_output'
    run(output)
