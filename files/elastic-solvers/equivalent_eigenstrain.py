"""Equivalent-eigenstrain fixed-point iteration. GPL-3.0-or-later.
Inspired by the equivalent/virtual eigenstrain idea in Soumya's group code.
This is NOT a transcription of its film/vacuum time-relaxation algorithm.
Here a damped constitutive-matching update handles positive solid stiffness.
"""
import numpy as np
from elasticity_common import (prepare,stress,reference_compliance,diagnostics,
                               result,rms,plate_problem,plot_solution)


def solve_equivalent(stiffness,eigenstrain,reference,mean_strain=None,
                     relaxation=0.8,tolerance=1e-8,max_iterations=4000):
    grid,mean_strain,scale=prepare(stiffness,eigenstrain,mean_strain,reference,
                                  relaxation,tolerance,max_iterations)
    # eta is an auxiliary eigenstrain, NOT the physical transformation strain.
    eta=eigenstrain.copy()
    history=[]
    stress_scale=max(rms(stress(stiffness,mean_strain-eigenstrain)),1e-30)
    for iterator in range(max_iterations+1):
        # Every step equilibrates a homogeneous reference solid with eigenstrain eta.
        displacement=grid.response(reference,stress(reference,eta))
        strain=mean_strain+grid.strain(displacement)
        sigma,energy_density,residual=diagnostics(grid,stiffness,eigenstrain,strain,scale)
        reference_stress=stress(reference,strain-eta)
        mismatch=sigma-reference_stress
        mismatch_norm=rms(mismatch)/stress_scale
        history.append([iterator,residual,float(energy_density.mean()),mismatch_norm])
        if max(residual,mismatch_norm)<tolerance:
            return result(grid,stiffness,eigenstrain,strain,displacement,scale,history,
                          equivalent_eigenstrain=eta,constitutive_mismatch=mismatch_norm)
        # Cref:(epsilon-eta) = C:(epsilon-epsilon0).
        # Thus eta_new = epsilon - Sref:C:(epsilon-epsilon0).
        # Equivalently eta_new = eta - Sref:(sigma-sigma_reference).
        eta -= relaxation*reference_compliance(reference,mismatch)
        if not np.isfinite(residual+mismatch_norm) or max(residual,mismatch_norm)>1e12:
            break
    raise RuntimeError(f'Equivalent-eigenstrain iteration did not converge; '
                       f'equilibrium={residual:.3e}, matching={mismatch_norm:.3e}.')


if __name__ == '__main__':
    stiffness,eigenstrain,reference,phase=plate_problem()
    solution=solve_equivalent(stiffness,eigenstrain,reference)
    print(f"Energy={solution['energy']:.9g}; residual={solution['residual']:.3g}")
    plot_solution(solution,phase).savefig('equivalent-eigenstrain.png',dpi=180)
