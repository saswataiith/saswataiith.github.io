# Direct perturbative spectral iteration. GPL-3.0-or-later.
isdefined(@__MODULE__, :ElasticityCommon) || include("ElasticityCommon.jl")
using .ElasticityCommon, Printf, Statistics

function solve_direct(stiffness,eigenstrain,reference;mean_strain=nothing,
                      relaxation=0.8,tolerance=1e-8,max_iterations=4000)
    grid,mean_tensor,scale = prepare(stiffness,eigenstrain,mean_strain,reference,relaxation,tolerance,max_iterations)
    displacement = zeros(size(eigenstrain,1),size(eigenstrain,2),2)
    contrast = stiffness .- reshape(reference,1,1,2,2,2,2)
    history = Vector{Vector{Float64}}()
    for iterator in 0:max_iterations
        total_strain = reshape(mean_tensor,1,1,2,2) .+ ElasticityCommon.strain(grid,displacement)
        sigma,energy_density,residual = diagnostics(grid,stiffness,eigenstrain,total_strain,scale)
        push!(history,[iterator,residual,mean(energy_density)])
        residual < tolerance && return package_result(grid,stiffness,eigenstrain,total_strain,displacement,scale,history)
        polarization = stress(stiffness,eigenstrain)-stress(contrast,total_strain)
        candidate = ElasticityCommon.response(grid,reference,polarization)
        displacement .+= relaxation.*(candidate-displacement)
        isfinite(residual) && residual < 1e12 || break
    end
    error("Direct iteration did not converge. Try a better reference or smaller relaxation.")
end

if abspath(PROGRAM_FILE) == @__FILE__
    stiffness,eigenstrain,reference,phase = plate_problem()
    solution = solve_direct(stiffness,eigenstrain,reference)
    @printf "Energy = %.9g; residual = %.3g\n" solution.energy solution.residual
end
