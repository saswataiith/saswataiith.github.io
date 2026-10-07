# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
"""Small, executable lessons in connectivity and topology.
Install: python -m pip install numpy scikit-image
Run: python topology_connectivity.py
Axes follow NumPy row/column order. This is for small teaching grids;
use bicontinuity_3d.py for the full 256^3 periodic connectivity measurement.
"""
from collections import deque
import numpy as np
from skimage.measure import label, euler_number, find_contours


def periodic_components(mask):
    """Four-neighbour components and independent periodic winding vectors.

    The graph measures connectivity. Its many local cycles must NOT be
    interpreted as holes of the filled pixel region.
    """
    mask = np.asarray(mask, dtype=bool)
    shape = np.array(mask.shape)
    assert mask.ndim == 2 and min(shape) >= 3
    seen = np.zeros(mask.shape, dtype=bool)
    lifts = np.zeros((*mask.shape, 2), dtype=np.int64)
    result = []
    for start in map(tuple, np.argwhere(mask)):
        if seen[start]:
            continue
        seen[start] = True
        queue = deque([start])
        count, basis = 0, []
        while queue:
            p = queue.popleft()
            count += 1
            for step in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = tuple((np.array(p) + step) % shape)
                if not mask[q]:
                    continue
                proposed = lifts[p] + step
                if not seen[q]:
                    seen[q] = True
                    lifts[q] = proposed
                    queue.append(q)
                else:
                    difference = proposed - lifts[q]
                    assert np.all(difference % shape == 0)
                    w = difference // shape
                    if np.any(w) and (not basis or (len(basis) == 1 and
                            basis[0][0]*w[1] - basis[0][1]*w[0] != 0)):
                        basis.append(tuple(map(int, w)))
        result.append({'pixels': count, 'winding_rank': len(basis), 'basis': basis})
    return result


def main():
    # An island split by the image seam: one periodic component, no winding.
    seam = np.zeros((8, 8), bool)
    seam[[0, 7], 3:5] = True
    assert label(seam, connectivity=1).max() == 2
    assert periodic_components(seam)[0]['winding_rank'] == 0

    # A full stripe closes around the periodic box.
    stripe = np.zeros((8, 8), bool)
    stripe[:, 3:5] = True
    assert periodic_components(stripe)[0]['winding_rank'] == 1

    # A staircase loop advances along BOTH axes, but has only ONE
    # independent winding. Two nonzero coordinate flags do not mean rank 2.
    staircase = np.zeros((8, 8), bool)
    for i in range(8):
        staircase[i, i] = staircase[(i+1) % 8, i] = True
    assert periodic_components(staircase)[0]['winding_rank'] == 1
    full = np.ones((8, 8), bool)
    assert periodic_components(full)[0]['winding_rank'] == 2

    # Corner contact changes digital connectivity.
    diagonal = np.eye(3, dtype=bool)
    assert label(diagonal, connectivity=1).max() == 3
    assert label(diagonal, connectivity=2).max() == 1

    # Bounded filled regions: chi = components - holes.
    disk = np.zeros((9, 9), bool)
    disk[2:7, 2:7] = True
    ring = disk.copy()
    ring[3:6, 3:6] = False
    assert euler_number(disk, connectivity=1) == 1
    assert euler_number(ring, connectivity=1) == 0
    contours = find_contours(ring.astype(float), .5, fully_connected='low')
    assert len(contours) == 2
    assert all(np.allclose(path[0], path[-1]) for path in contours)

    # Bounded 3D solids, with ample background padding.
    ball = np.zeros((11, 11, 11), bool)
    ball[2:9, 2:9, 2:9] = True  # cube is topologically a ball
    shell = ball.copy()
    shell[3:8, 3:8, 3:8] = False
    tunnel = ball.copy()
    tunnel[4:7, 4:7, :] = False  # a through-hole, not an enclosed cavity
    assert euler_number(ball, connectivity=1) == 1
    assert euler_number(shell, connectivity=1) == 2
    assert euler_number(tunnel, connectivity=1) == 0
    for name, region in [('seam island', seam), ('stripe', stripe),
                         ('staircase', staircase), ('full periodic grid', full)]:
        print(name, periodic_components(region))
    print('Bounded 2D Euler: disk=1, annulus=0; annulus boundary contours=2')
    print('Bounded 3D Euler: ball=1, shell=2, solid with one tunnel=0')
    print('All worked examples passed. Ordinary skimage calls above are NOT periodic.')


if __name__ == '__main__':
    main()
