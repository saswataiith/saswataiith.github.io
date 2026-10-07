# I work through step 1.
import numpy as np
rng = np.random.default_rng(7)
def neighbor_values(state, row, column):
    rows, columns = state.shape
    return [state[(row + 1) % rows, column], state[(row - 1) % rows, column],
            state[row, (column + 1) % columns], state[row, (column - 1) % columns]]

test_grid = np.arange(9).reshape(3, 3)
assert neighbor_values(test_grid, 0, 0) == [3, 6, 1, 2]
print("Periodic neighbor indexing passed.")

# I work through step 2.
def ising_energy_change(old_spin, neighbors):
    return 2 * old_spin * sum(neighbors)

assert ising_energy_change(1, [1, 1, 1, 1]) == 8
assert ising_energy_change(-1, [1, 1, 1, 1]) == -8
print("Ising energy changes passed.")

# I work through step 3.
def accept_trial(energy_change, temperature, rng):
    if temperature <= 0:
        raise ValueError("Use positive temperature in this example.")
    if energy_change <= 0:
        return True
    return rng.random() < np.exp(-energy_change / temperature)

assert accept_trial(-8, 1.5, rng)
assert accept_trial(0, 1.5, rng)
assert 0 < np.exp(-8 / 1.5) < 1
print("Acceptance checks passed.")

# I work through step 4.
def ising_trial(state, temperature, rng):
    row = rng.integers(state.shape[0])
    column = rng.integers(state.shape[1])
    old = state[row, column]
    change = ising_energy_change(old, neighbor_values(state, row, column))
    if accept_trial(change, temperature, rng):
        state[row, column] = -old

spins = rng.choice([-1, 1], (16, 16))
for trial in range(spins.size * 10):
    ising_trial(spins, 1.5, rng)
assert set(np.unique(spins)) <= {-1, 1}
print("Ising state values:", np.unique(spins))

# I work through step 5.
def potts_energy_change(old, candidate, neighbors):
    before = sum(value != old for value in neighbors)
    after = sum(value != candidate for value in neighbors)
    return after - before

assert potts_energy_change(1, 2, [2, 2, 2, 1]) == -2

def potts_trial(state, temperature, rng):
    row = rng.integers(state.shape[0])
    column = rng.integers(state.shape[1])
    neighbors = neighbor_values(state, row, column)
    candidate = neighbors[rng.integers(4)]
    change = potts_energy_change(state[row, column], candidate, neighbors)
    if accept_trial(change, temperature, rng):
        state[row, column] = candidate

grains = rng.permutation(np.arange(1, 257)).reshape(16, 16)
initial_labels = set(grains.ravel())
for trial in range(grains.size * 10):
    potts_trial(grains, 0.3, rng)
assert set(grains.ravel()) <= initial_labels
print("Grains initially:", len(initial_labels), "remaining labels:", len(np.unique(grains)))

import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].imshow(spins, vmin=-1, vmax=1, cmap="coolwarm")
axes[0].set_title("Ising: spins -1 and +1")
axes[1].imshow(grains, cmap="tab20")
axes[1].set_title("Potts: grain labels")
for ax in axes:
    ax.set_xlabel("Column index")
    ax.set_ylabel("Row index")
plt.show()
