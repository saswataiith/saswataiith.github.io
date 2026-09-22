"""Direct perturbative spectral iteration. GPL-3.0-or-later.
Based on the reference-stiffness split in the group's C/Fortran solvers
and Bhattacharyya et al., CICP 11 (2012), 726–738, Eqs. 2.6–2.16.
This is a small, independently written 2-D teaching adaptation.
"""
import numpy as np
from elasticity_common import prepare, stress, diagnostics, result, plate_problem, plot_solution


def solve_direct(stiffness, eigenstrain, reference, mean_strain=None,
                 relaxation=0.8, tolerance=1e-8, max_iterations=4000):
    grid, mean_strain, scale = prepare(stiffness,eigenstrain,mean_strain,reference,
                                      relaxation,tolerance,max_iterations)
    displacement = np.zeros(eigenstrain.shape[:2]+(2,))
    contrast = stiffness-reference
    history=[]
    for iterator in range(max_iterations+1):
        strain = mean_strain+grid.strain(displacement)
        sigma, energy_density, residual = diagnostics(grid,stiffness,eigenstrain,strain,scale)
        history.append([iterator,residual,float(energy_density.mean())])
        if residual < tolerance:
            return result(grid,stiffness,eigenstrain,strain,displacement,scale,history)
        # Move all heterogeneous terms to the RHS of a homogeneous problem:
        # Cref:epsilon - P = C:(epsilon-eigenstrain).
        polarization = stress(stiffness,eigenstrain)-stress(contrast,strain)
        candidate = grid.response(reference,polarization)
        displacement += relaxation*(candidate-displacement)
        if not np.isfinite(residual) or residual > 1e12:
            break
    raise RuntimeError(f'Direct iteration did not converge; residual={residual:.3e}. '
                       'Try a better reference, lower contrast or smaller relaxation.')


if __name__ == '__main__':
    stiffness,eigenstrain,reference,phase = plate_problem()
    solution=solve_direct(stiffness,eigenstrain,reference)
    print(f"Energy={solution['energy']:.9g}; residual={solution['residual']:.3g}")
    plot_solution(solution,phase).savefig('direct-iteration.png',dpi=180)
