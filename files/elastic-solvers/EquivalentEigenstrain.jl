# Equivalent-eigenstrain fixed-point iteration. GPL-3.0-or-later.
isdefined(@__MODULE__, :ElasticityCommon) || include("ElasticityCommon.jl")
using .ElasticityCommon, Printf, Statistics

function solve_equivalent(stiffness,eigenstrain,reference;mean_strain=nothing,
                          relaxation=0.8,tolerance=1e-8,max_iterations=4000)
    grid,mean_tensor,scale = prepare(stiffness,eigenstrain,mean_strain,reference,relaxation,tolerance,max_iterations)
    eta = copy(eigenstrain)
    history = Vector{Vector{Float64}}()
    stress_scale = max(rms(stress(stiffness,reshape(mean_tensor,1,1,2,2).-eigenstrain)),1e-30)
    for iterator in 0:max_iterations
        displacement = ElasticityCommon.response(grid,reference,stress(reference,eta))
        total_strain = reshape(mean_tensor,1,1,2,2) .+ ElasticityCommon.strain(grid,displacement)
        sigma,energy_density,residual = diagnostics(grid,stiffness,eigenstrain,total_strain,scale)
        reference_stress = stress(reference,total_strain-eta)
        mismatch = sigma-reference_stress
        mismatch_norm = rms(mismatch)/stress_scale
        push!(history,[iterator,residual,mean(energy_density),mismatch_norm])
        max(residual,mismatch_norm) < tolerance && return package_result(
            grid,stiffness,eigenstrain,total_strain,displacement,scale,history;
            equivalent_eigenstrain=eta,constitutive_mismatch=mismatch_norm)
        eta .-= relaxation.*reference_compliance(reference,mismatch)
        all(isfinite,(residual,mismatch_norm)) && max(residual,mismatch_norm) < 1e12 || break
    end
    error("Equivalent-eigenstrain iteration did not converge.")
end

if abspath(PROGRAM_FILE) == @__FILE__
    stiffness,eigenstrain,reference,phase = plate_problem()
    solution = solve_equivalent(stiffness,eigenstrain,reference)
    @printf "Energy = %.9g; residual = %.3g\n" solution.energy solution.residual
end
