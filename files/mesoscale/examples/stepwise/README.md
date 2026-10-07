# My teaching codes, developed in steps

I first write a small part, test it, then add the next part. Each notebook explains the calculation and includes stage checks. These are newly organized teaching versions; the original complete programs and historical sources remain separate.

## Python

`python -m pip install numpy matplotlib jupyter`

Extract this archive without changing its folder structure. Open a terminal in `examples/stepwise`, then use `jupyter notebook`. Select a Python notebook and run its cells in order. The phase-field lesson uses `../phase_field.py` for its existing elastic kernel.

## Julia

The algorithms use Julia Base and standard libraries. Fourier examples also require FFTW:

`julia -e 'using Pkg; Pkg.add("FFTW")'`

For notebooks install IJulia:

`julia -e 'using Pkg; Pkg.add("IJulia")'`

Select the Julia kernel in Jupyter. Complete scripts are included; for example `julia diffusion.jl`. Run scripts from `examples/stepwise`. The phase-field lesson uses `../phase_field.jl`. Python and Julia random generators differ, so individual random paths need not match.

## C

See `../hoshen-kopelman/README.md`. Six C checkpoints each compile and run independently. My original structure-function and pair-correlation C files are in `original-c/`, unchanged; they are reference sources, not certified current-build programs.

## Checks

See check-results.txt. Python notebooks have executed outputs. Julia scripts were executed; IJulia notebook-kernel execution was not tested. Short teaching workloads do not establish numerical convergence of a full simulation. The 256³ spinodal model remains available separately.

The website lessons define the quantities and conventions used by each model. New source follows my scoped MIT code terms. Original teaching prose follows the scoped CC BY 4.0 terms. Existing third-party terms remain unchanged. See https://saswataiith.github.io/using-my-resources/.
