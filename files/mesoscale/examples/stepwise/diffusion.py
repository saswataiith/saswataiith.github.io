# I work through step 1.
import numpy as np
n = 128
length = 2 * np.pi
spacing = length / n
x = spacing * np.arange(n)
k = 2 * np.pi * np.fft.fftfreq(n, d=spacing)
diffusivity = 1.0
assert np.isclose(n * spacing, length)
assert k[0] == 0
print("Grid points:", n, "spacing:", spacing)

# I work through step 2.
initial = 1 + 0.4 * np.cos(x) + 0.2 * np.cos(4 * x)
spectrum = np.fft.fft(initial)
assert abs(initial.mean() - 1) < 1e-12
assert np.max(np.abs(np.fft.ifft(spectrum).real - initial)) < 1e-12
print("Initial mean:", initial.mean())

# I work through step 3.
time = 0.3
decay = np.exp(-diffusivity * k**2 * time)
field = np.fft.ifft(spectrum * decay).real
exact = 1 + 0.4 * np.exp(-time) * np.cos(x) + 0.2 * np.exp(-16 * time) * np.cos(4 * x)
assert np.max(np.abs(field - exact)) < 1e-12
assert abs(field.mean() - initial.mean()) < 1e-12
print("Maximum analytical error:", np.max(np.abs(field - exact)))

# I work through step 4.
times = [0.0, 0.02, 0.1, 0.3, 1.0]
profiles = []
variation = []
for sample_time in times:
    decay = np.exp(-diffusivity * k**2 * sample_time)
    profile = np.fft.ifft(spectrum * decay).real
    profiles.append(profile)
    variation.append(np.mean((profile - profile.mean())**2))
assert all(abs(profile.mean() - 1) < 1e-12 for profile in profiles)
assert np.all(np.diff(variation) <= 0)
print("Concentration variances:", variation)

import matplotlib.pyplot as plt
fig, ax = plt.subplots()
for sample_time, profile in zip(times, profiles):
    ax.plot(x, profile, label=f"t = {sample_time}")
ax.set_xlabel("Position x (dimensionless)")
ax.set_ylabel("Concentration c (dimensionless)")
ax.legend()
plt.show()
