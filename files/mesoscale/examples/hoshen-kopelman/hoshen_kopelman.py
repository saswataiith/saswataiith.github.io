# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""I build and test shared-edge cluster labeling in eight steps. Requires NumPy."""

# 1. I write a small grid and inspect it
import numpy as np

mask = np.array([[1, 0, 1],
                 [1, 1, 1],
                 [0, 0, 0]], dtype=bool)
assert mask.shape == (3, 3)
assert mask.sum() == 5
print(mask.astype(int))


# 2. I find the representative of a label
def find_label(parent, label):
    while parent[label] != label:
        label = parent[label]
    return label

parent = [0, 1, 1, 2]
assert find_label(parent, 3) == 1
assert find_label(parent, 1) == 1
print("Label 3 belongs to the cluster represented by label 1.")


# 3. I merge two labels
def merge_labels(parent, first, second):
    first_root = find_label(parent, first)
    second_root = find_label(parent, second)
    root = min(first_root, second_root)
    parent[max(first_root, second_root)] = root
    return root

parent = [0, 1, 2, 3]
merge_labels(parent, 2, 3)
merge_labels(parent, 1, 3)
assert [find_label(parent, k) for k in (1, 2, 3)] == [1, 1, 1]
print("Three labels now identify one cluster.")


# 4. I scan the grid once
def scan_grid(mask):
    rows, columns = mask.shape
    labels = np.zeros(mask.shape, dtype=int)
    parent = [0]
    for row in range(rows):
        for column in range(columns):
            if not mask[row, column]:
                continue
            above = labels[row - 1, column] if row > 0 else 0
            left = labels[row, column - 1] if column > 0 else 0
            if above == 0 and left == 0:
                new_label = len(parent)
                parent.append(new_label)
                labels[row, column] = new_label
            elif above == 0:
                labels[row, column] = find_label(parent, left)
            elif left == 0:
                labels[row, column] = find_label(parent, above)
            else:
                labels[row, column] = merge_labels(parent, above, left)
    return labels, parent

labels, parent = scan_grid(mask)
assert labels[0, 0] != labels[0, 2]
assert find_label(parent, labels[0, 0]) == find_label(parent, labels[0, 2])
print("Provisional labels:")
print(labels)


# 5. I replace provisional labels and count cells
def finish_labels(labels, parent):
    final = np.zeros(labels.shape, dtype=int)
    numbers = {}
    for row in range(labels.shape[0]):
        for column in range(labels.shape[1]):
            label = labels[row, column]
            if label == 0:
                continue
            root = find_label(parent, label)
            if root not in numbers:
                numbers[root] = len(numbers) + 1
            final[row, column] = numbers[root]
    sizes = [int(np.count_nonzero(final == k))
             for k in range(1, len(numbers) + 1)]
    return final, sizes

final, sizes = finish_labels(labels, parent)
assert sizes == [5]
assert np.array_equal(final > 0, mask)
print("Final labels:")
print(final)
print("Cluster sizes:", sizes)


# 6. I add periodic connections as a separate step
def join_periodic_edges(labels, parent):
    rows, columns = labels.shape
    for column in range(columns):
        top = labels[0, column]
        bottom = labels[rows - 1, column]
        if top and bottom:
            merge_labels(parent, top, bottom)
    for row in range(rows):
        left = labels[row, 0]
        right = labels[row, columns - 1]
        if left and right:
            merge_labels(parent, left, right)


def hoshen_kopelman(mask, periodic=False):
    mask = np.asarray(mask, dtype=bool)
    if mask.ndim != 2 or min(mask.shape) == 0:
        raise ValueError("Use a nonempty two-dimensional grid.")
    labels, parent = scan_grid(mask)
    if periodic:
        join_periodic_edges(labels, parent)
    return finish_labels(labels, parent)

seam = np.zeros((5, 5), dtype=bool)
seam[0, 2] = seam[-1, 2] = True
assert hoshen_kopelman(seam)[1] == [1, 1]
assert hoshen_kopelman(seam, periodic=True)[1] == [2]
print("Seam island: 2 bounded clusters; 1 periodic cluster.")


# 7. I test examples before analyzing a microstructure
assert hoshen_kopelman(np.zeros((3, 5), bool))[1] == []
assert hoshen_kopelman(np.ones((3, 5), bool))[1] == [15]
assert hoshen_kopelman(np.eye(3, dtype=bool))[1] == [1, 1, 1]
ring = np.ones((5, 5), dtype=bool)
ring[1:4, 1:4] = False
assert hoshen_kopelman(ring)[1] == [16]
rectangle = np.zeros((3, 5), dtype=bool)
rectangle[1, 0] = rectangle[1, -1] = True
assert hoshen_kopelman(rectangle)[1] == [1, 1]
assert hoshen_kopelman(rectangle, periodic=True)[1] == [2]
print("All small-grid checks passed.")


# 8. I apply a threshold and analyze both phases
composition = np.array([[0.8, 0.2, 0.7],
                        [0.9, 0.6, 0.8],
                        [0.1, 0.2, 0.1]])
for name, phase in [("High composition", composition >= 0.5),
                    ("Low composition", composition < 0.5)]:
    labels, sizes = hoshen_kopelman(phase, periodic=True)
    occupied = int(phase.sum())
    largest_fraction = max(sizes) / occupied if occupied else 0.0
    assert sum(sizes) == occupied
    print(name, "occupied fraction:", occupied / phase.size,
          "clusters:", len(sizes), "largest-cluster fraction:", largest_fraction)
