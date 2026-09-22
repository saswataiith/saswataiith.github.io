"""Export the c=0.5 result of bicontinuity.py for the browser turtle.

Run after bicontinuity.py:
    python export_turtle_field.py bicontinuity_output/composition-0.5.npy turtle-field.json

Requires NumPy. The orientation matches save_image in bicontinuity.py.
The browser finds paths from this mask; no route is drawn in advance.
"""
from pathlib import Path
import json
import sys
import numpy as np

composition = np.load(sys.argv[1])
assert composition.shape == (256, 256)
assert abs(composition.mean() - 0.5) < 1e-10
screen_field = composition.T[::-1]
result = {
    'size': 256,
    'mean': float(composition.mean()),
    'threshold': 0.5,
    'source': 'bicontinuity.py, seed 20260921, time 400',
    'mask': (screen_field >= 0.5).astype(int).ravel().tolist(),
}
Path(sys.argv[2]).write_text(json.dumps(result, separators=(',', ':')))
