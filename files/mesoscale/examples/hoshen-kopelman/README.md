# Hoshen–Kopelman, one tested step at a time

I begin with a small grid, then add label lookup, merging, scanning, final labels and periodic connections. I test each new part before continuing. The Python and Julia notebooks explain the same eight steps; the C checkpoints implement the first six as separate complete programs. This is a new teaching sequence, not a claim about the editing history of the historical files.

## Run

Python: `python -m pip install numpy jupyter`, then `jupyter notebook hoshen-kopelman-python.ipynb`. Run the cells in order. The complete script is `python hoshen_kopelman.py`.

Julia script: `julia hoshen_kopelman.jl`. Only Julia Base is required. For the notebook install IJulia with `julia -e 'using Pkg; Pkg.add("IJulia")'`, then open the Julia notebook with a Julia kernel.

C: `cc -std=c99 -Wall -Wextra -pedantic step-01.c -o step-01`, then `./step-01`. Continue with steps 02 through 06. Each prints a passed message after its assertions. Do not disable assertions with NDEBUG.

Final C program: `cc -std=c99 -Wall -Wextra -pedantic hoshen_kopelman.c -o hk`. Run `./hk` and enter:

```
3 3 0
1 0 1
1 1 1
0 0 0
```

The first line gives rows, columns and periodic mode (0 bounded, 1 periodic). The program prints one cluster and the final label grid. This small version limits input to 100 by 100 to keep its automatic arrays modest. It is not the full-volume analyzer.

## Meaning of the result

Cells connect through shared edges, not corners. Occupancy values, labels and counts are dimensionless. If physical grid spacings are dx and dy, a cluster area is its count times dx times dy. Periodic connections join matching opposite-edge cells. They do not establish wrapping. Component counts also do not give hole counts. The topology tutorial explains these additional measurements.

## Tests and limitations

See check-results.txt for actual execution and cross-language comparisons. To reproduce them, install NumPy, nbformat, nbclient and a Python Jupyter kernel, ensure cc and Julia are available, then run `python checks.py`. Label numbers themselves are arbitrary; comparisons use the partitions they define. The small implementations use simple representative lookup without path compression. For large fields use the full-volume connectivity_morphology.py implementation.

## References and credits

J. Hoshen and R. Kopelman, Physical Review B 14, 3438 (1976), https://doi.org/10.1103/PhysRevB.14.3438.

Tobin Fricke, The Hoshen–Kopelman Algorithm, https://www.ocf.berkeley.edu/~fricke/projects/hoshenkopelman/hoshenkopelman.html.

The downloadable teaching code is a new implementation. Historical C files retain their existing credits, including Prof. T. A. Abinandanan, my PhD adviser (Abi in the original source comments). A separate Fricke C source retains his copyright and GPL notice; it is not included in this download or relicensed here.

I permit free noncommercial teaching, learning and demonstrations with acknowledgment. Research (including academic research) and commercial use require my explicit written permission. Earlier MIT and GPL releases retain their existing permissions. See CODE-USE-TERMS.txt. Original prose follows CC BY 4.0.
