# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I work through step 1.
import numpy as np
rng = np.random.default_rng(7)
number = 50000
positions = np.zeros((number, 2), dtype=int)
moves = np.array([[1, 0], [-1, 0], [0, 1], [0, -1]])
assert np.all(np.sum(moves**2, axis=1) == 1)
assert np.all(positions == 0)
print("Molecules:", number)

# I work through step 2.
choices = rng.integers(0, 4, number)
positions += moves[choices]
assert np.all(np.sum(positions**2, axis=1) == 1)
print("Mean-square displacement after one sweep:", np.mean(np.sum(positions**2, axis=1)))

# I work through step 3.
sweep_count = 100
history = [0.0, 1.0]
for sweep in range(2, sweep_count + 1):
    choices = rng.integers(0, 4, number)
    positions += moves[choices]
    history.append(float(np.mean(np.sum(positions**2, axis=1))))
relative_error = abs(history[-1] / sweep_count - 1)
assert relative_error < 0.06
print("Measured:", history[-1], "prediction:", sweep_count)
print("Relative error:", relative_error)

# I work through step 4.
mean_position = positions.mean(axis=0)
root_mean_square_distance = np.sqrt(history[-1])
assert np.linalg.norm(mean_position) < 0.1 * root_mean_square_distance
print("Mean position:", mean_position)
print("Root-mean-square distance:", root_mean_square_distance)

import matplotlib.pyplot as plt
fig, ax = plt.subplots()
ax.plot(range(sweep_count + 1), history, label="Measured")
ax.plot(range(sweep_count + 1), range(sweep_count + 1), "--", label="Prediction")
ax.set_xlabel("Time (sweeps)")
ax.set_ylabel("Mean-square displacement (lattice spacing squared)")
ax.legend()
plt.show()
