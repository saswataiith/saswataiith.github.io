# I calculate ternary spinodal decomposition using my polynomial model.

import numpy as np
import matplotlib.pyplot as plt

Nx = Ny = 256
dx = dy = 1.0
seed = 1234
rng = np.random.RandomState(seed)
noise_A = rng.normal(0.0, 0.001, (Nx, Ny))
noise_B = rng.normal(0.0, 0.001, (Nx, Ny))
cA = 1.0 / 3.0 + noise_A - noise_A.mean()
cB = 1.0 / 3.0 + noise_B - noise_B.mean()
cC = 1.0 - cA - cB
initial_A, initial_B = cA.copy(), cB.copy()
initial_means = np.array([cA.mean(), cB.mean(), cC.mean()])
assert np.max(np.abs(initial_means - 1.0 / 3.0)) < 1e-12
print("Initial mean mole fractions:", initial_means)

A1 = A2 = A3 = 1.0
B = 12.0
kA = kB = kC = 1.0
kAA, kBB, kAB = kA + kC, kB + kC, kC

def bulk_energy(a, b):
    c = 1.0 - a - b
    return A1*a**2*b**2 + A2*b**2*c**2 + A3*a**2*c**2 + B*a**2*b**2*c**2

assert bulk_energy(1.0, 0.0) == 0.0
assert bulk_energy(0.0, 1.0) == 0.0
assert bulk_energy(0.0, 0.0) == 0.0
print("Bulk energy at equal composition:", bulk_energy(1/3, 1/3))

def bulk_derivatives(a, b):
    c = 1.0 - a - b
    gA = (2*A1*a*b**2 - 2*A2*b**2*c
          + 2*A3*a*c**2 - 2*A3*a**2*c
          + 2*B*a*b**2*c**2 - 2*B*a**2*b**2*c)
    gB = (2*A1*a**2*b + 2*A2*b*c**2
          - 2*A2*b**2*c - 2*A3*a**2*c
          + 2*B*a**2*b*c**2 - 2*B*a**2*b**2*c)
    return gA, gB

check_points = rng.dirichlet([1, 1, 1], size=100)
a, b = check_points[:, 0], check_points[:, 1]
eps = 1e-6
gA, gB = bulk_derivatives(a, b)
fd_A = (bulk_energy(a+eps, b) - bulk_energy(a-eps, b)) / (2*eps)
fd_B = (bulk_energy(a, b+eps) - bulk_energy(a, b-eps)) / (2*eps)
derivative_error = max(np.max(np.abs(gA-fd_A)), np.max(np.abs(gB-fd_B)))
assert derivative_error < 1e-8
print("Maximum derivative error:", derivative_error)

M_AA = M_BB = 1.0
M_AB = 0.5
mobility = np.array([[M_AA, -M_AB], [-M_AB, M_BB]])
assert np.all(np.linalg.eigvalsh(mobility) > 0)
print("Mobility eigenvalues:", np.linalg.eigvalsh(mobility))

kx = 2*np.pi*np.fft.fftfreq(Nx, d=dx)
ky = 2*np.pi*np.fft.fftfreq(Ny, d=dy)
k2 = kx[:, None]**2 + ky[None, :]**2
k4 = k2**2
assert k2[0, 0] == 0.0
assert k2.shape == cA.shape
print("Maximum squared wave number:", k2.max())

dt = 0.1
K = np.array([[kAA, kAB], [kAB, kBB]])
LK = mobility @ K
H11 = 1 + 2*dt*k4*LK[0, 0]
H12 = 2*dt*k4*LK[0, 1]
H21 = 2*dt*k4*LK[1, 0]
H22 = 1 + 2*dt*k4*LK[1, 1]
determinant = H11*H22 - H12*H21
assert np.all(determinant > 0)

def advance(a, b):
    gA, gB = bulk_derivatives(a, b)
    a_hat, b_hat = np.fft.fft2(a), np.fft.fft2(b)
    gA_hat, gB_hat = np.fft.fft2(gA), np.fft.fft2(gB)
    rhs_A = a_hat - dt*k2*(M_AA*gA_hat - M_AB*gB_hat)
    rhs_B = b_hat - dt*k2*(M_BB*gB_hat - M_AB*gA_hat)
    new_A_hat = (H22*rhs_A - H12*rhs_B) / determinant
    new_B_hat = (H11*rhs_B - H21*rhs_A) / determinant
    return np.fft.ifft2(new_A_hat).real, np.fft.ifft2(new_B_hat).real

one_A, one_B = advance(cA, cB)
assert abs(one_A.mean() - cA.mean()) < 1e-12
assert abs(one_B.mean() - cB.mean()) < 1e-12
print("One-step conservation check passed.")

steps = 20000
cA, cB = initial_A.copy(), initial_B.copy()
history = []
for n in range(steps + 1):
    if n % 100 == 0 or n == steps:
        cC = 1.0 - cA - cB
        fields = np.array([cA, cB, cC])
        assert np.all(np.isfinite(fields))
        means = fields.mean(axis=(1, 2))
        drift = np.max(np.abs(means - initial_means))
        history.append([n*dt, drift, fields.min(), fields.max()])
    if n < steps:
        cA, cB = advance(cA, cB)
cC = 1.0 - cA - cB
history = np.array(history)
assert history[:, 1].max() < 1e-11
print("Final time:", steps*dt)
print("Maximum mean drift:", history[:, 1].max())
print("Final minimum and maximum:", min(cA.min(), cB.min(), cC.min()), max(cA.max(), cB.max(), cC.max()))

fig, axes = plt.subplots(1, 3, figsize=(12, 4), constrained_layout=True)
for ax, field, label in zip(axes, [cA, cB, cC], ["A", "B", "C"]):
    image = ax.imshow(field, origin="lower", vmin=0, vmax=1, cmap="viridis")
    ax.set_title("Mole fraction c" + label)
    ax.set_xlabel("y index (grid cells)")
    ax.set_ylabel("x index (grid cells)")
fig.colorbar(image, ax=axes, label="Mole fraction (dimensionless)", shrink=0.8)
fig.suptitle("Ternary spinodal decomposition: dimensionless time " + str(steps*dt))
plt.show()

np.savez_compressed("ternary-fields.npz", cA=cA, cB=cB, cC=cC,
                    dx=dx, dy=dy, dt=dt, steps=steps, seed=seed)
with np.load("ternary-fields.npz") as saved:
    assert np.array_equal(saved["cA"], cA)
    deviation = saved["cA"] - saved["cA"].mean()
    structure = np.abs(np.fft.fft2(deviation))**2 / deviation.size
    covariance = np.fft.ifft2(structure).real
    assert abs(covariance[0, 0] - np.mean(deviation**2)) < 1e-12
print("Saved ternary-fields.npz; covariance normalization check passed.")
