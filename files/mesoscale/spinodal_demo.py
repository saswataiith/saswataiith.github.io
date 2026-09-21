"""Illustrative 2D Cahn-Hilliard simulation for teaching.

Install: python -m pip install numpy pillow
Run:     python spinodal_demo.py

Dimensionless model: dc/dt = Laplacian(c^3 - c - kappa*Laplacian(c)).
Periodic square, constant unit mobility, kappa=1, dx=1.
Semi-implicit Fourier update: linear gradient term implicit, bulk term explicit.
This is a pedagogical model, not a calibrated alloy simulation.
The scheme is not unconditionally energy stable; refine dt and grid separately.
"""
from pathlib import Path
import csv
import numpy as np
from PIL import Image


def run(n=128, dt=0.2, steps=1600, seed=42, output='spinodal_output'):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    c = 0.04 * rng.standard_normal((n, n))
    c -= c.mean()
    k = 2 * np.pi * np.fft.fftfreq(n, d=1.0)
    kx, ky = np.meshgrid(k, k, indexing='ij')
    k2 = kx*kx + ky*ky
    initial_mean = c.mean()
    history = []
    snapshots = {100: 1, 400: 2, steps: 3}

    def diagnostics(field):
        spectrum = np.fft.fft2(field)
        gx = np.fft.ifft2(1j*kx*spectrum).real
        gy = np.fft.ifft2(1j*ky*spectrum).real
        energy = np.mean((field*field-1)**2/4 + (gx*gx+gy*gy)/2)
        return float(field.mean()), float(energy)

    # Rainbow palette: c=-1 blue, c=0 green, c=+1 red.
    stops = np.array([[0,0,255],[0,255,255],[0,255,0],[255,255,0],[255,0,0]])
    for step in range(steps + 1):
        if step % 10 == 0:
            mean, energy = diagnostics(c)
            history.append((step, step*dt, mean, energy))
        if step in snapshots:
            v = np.clip((c+1)/2, 0, 1)
            rgb = np.stack([np.interp(v, [0, .25, .5, .75, 1], stops[:, j]) for j in range(3)], axis=-1)
            img = Image.fromarray(np.rint(rgb).astype('uint8'))
            img.resize((640, 640), Image.Resampling.BICUBIC).save(output/f'spinodal-{snapshots[step]}.png')
        if step == steps:
            break
        c_hat = np.fft.fft2(c)
        bulk_hat = np.fft.fft2(c*c*c-c)
        c = np.fft.ifft2((c_hat-dt*k2*bulk_hat)/(1+dt*k2*k2)).real
        if not np.isfinite(c).all():
            raise RuntimeError('Non-finite solution; reduce the time step.')
    with (output/'diagnostics.csv').open('w', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['step', 'dimensionless_time', 'mean_c', 'energy_density'])
        writer.writerows(history)
    np.save(output/'final_field.npy', c)
    drift = abs(c.mean()-initial_mean)
    max_energy_rise = max(np.diff([row[3] for row in history]))
    print(f'Mean drift: {drift:.3e}')
    print(f'Initial/final energy: {history[0][3]:.6f} / {history[-1][3]:.6f}')
    print(f'Max energy change between sampled states: {max_energy_rise:.3e}')
    if drift > 1e-10:
        raise RuntimeError('Conservation diagnostic failed.')
    return c, history


if __name__ == '__main__':
    run()
