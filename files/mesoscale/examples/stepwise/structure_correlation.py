# I work through step 1.
import numpy as np
n = 16
dx = dy = 1.0
x = np.arange(n) * dx
composition = 0.5 + 0.2 * np.cos(2 * np.pi * x[:, None] / (n * dx)) * np.ones((1, n))
assert composition.shape == (n, n)
assert abs(composition.mean() - 0.5) < 1e-12
print("Mean composition:", composition.mean())

# I work through step 2.
fluctuation = composition - composition.mean()
variance = np.mean(fluctuation**2)
assert abs(fluctuation.mean()) < 1e-12
assert abs(variance - 0.02) < 1e-12
print("Composition variance:", variance)

# I work through step 3.
cells = composition.size
transform = np.fft.fft2(fluctuation)
structure = np.abs(transform)**2 / cells
assert np.all(structure >= 0)
assert abs(structure[0, 0]) < 1e-12
assert abs(structure.sum() / cells - variance) < 1e-12
print("Parseval check:", structure.sum() / cells, variance)

# I work through step 4.
def correlation_from_field(field):
    deviation = field - field.mean()
    variance = np.mean(deviation**2)
    if variance == 0:
        raise ValueError("A constant field has undefined normalized correlation.")
    structure = np.abs(np.fft.fft2(deviation))**2 / field.size
    covariance = np.fft.ifft2(structure).real
    return structure, covariance, covariance / variance

structure, covariance, correlation = correlation_from_field(composition)
assert abs(covariance[0, 0] - variance) < 1e-12
assert abs(correlation[0, 0] - 1) < 1e-12
try:
    correlation_from_field(np.ones((4, 4)))
except ValueError:
    print("Constant-field check passed.")
else:
    raise AssertionError("The constant field must be rejected.")

# I work through step 5.
direct = np.zeros_like(composition)
for row in range(n):
    for column in range(n):
        shifted = np.roll(fluctuation, (row, column), axis=(0, 1))
        direct[row, column] = np.mean(fluctuation * shifted)
expected = np.cos(2 * np.pi * np.arange(n)[:, None] / n) * np.ones((1, n))
assert np.max(np.abs(direct - covariance)) < 1e-12
assert np.max(np.abs(correlation - expected)) < 1e-12
print("Direct-sum maximum error:", np.max(np.abs(direct - covariance)))

# I work through step 6.
def radial_average(values, radii, bin_width):
    bins = np.floor(radii / bin_width + 0.5).astype(int)
    occupied_bins = np.unique(bins)
    centers = occupied_bins * bin_width
    means = np.array([values[bins == index].mean() for index in occupied_bins])
    counts = np.array([np.count_nonzero(bins == index) for index in occupied_bins])
    return centers, means, counts

rx = np.fft.fftfreq(n) * n * dx
ry = np.fft.fftfreq(n) * n * dy
real_radius = np.sqrt(rx[:, None]**2 + ry[None, :]**2)
kx = 2 * np.pi * np.fft.fftfreq(n, d=dx)
ky = 2 * np.pi * np.fft.fftfreq(n, d=dy)
wave_radius = np.sqrt(kx[:, None]**2 + ky[None, :]**2)
r, radial_correlation, counts = radial_average(correlation, real_radius, min(dx, dy))
k, radial_structure, mode_counts = radial_average(structure, wave_radius, min(2*np.pi/(n*dx), 2*np.pi/(n*dy)))
assert counts.sum() == cells and mode_counts.sum() == cells
assert radial_correlation[0] == correlation[0, 0]
print("Correlation radii:", r)
print("Wave-number magnitudes:", k)

# I work through step 7.
def first_zero(distances, values):
    for index in range(1, len(values)):
        if values[index - 1] > 0 and values[index] <= 0:
            fraction = values[index - 1] / (values[index - 1] - values[index])
            return distances[index - 1] + fraction * (distances[index] - distances[index - 1])
    return None

directional_zero = first_zero(x[:n//2+1], correlation[:n//2+1, 0])
assert abs(directional_zero - n * dx / 4) < 1e-12
assert first_zero(np.arange(3), np.ones(3)) is None
print("Directional first zero:", directional_zero)
print("Radial first zero:", first_zero(r, radial_correlation))

import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].plot(k, radial_structure, "o-")
axes[0].set_xlabel("Wave-number magnitude k (inverse length units)")
axes[0].set_ylabel("Radial structure function S (dimensionless)")
axes[1].plot(r, radial_correlation, "o-", label="Radial average")
axes[1].plot(x[:n//2+1], correlation[:n//2+1, 0], "--", label="x direction")
axes[1].axhline(0, color="gray", linewidth=0.7)
axes[1].set_xlabel("Displacement radius r (length units)")
axes[1].set_ylabel("Normalized correlation (dimensionless)")
axes[1].legend()
fig.tight_layout()
plt.show()
