# Cross-check the Julia implementations and the published NumPy reference values.
include("DirectIteration.jl")
include("EquivalentEigenstrain.jl")
using Test, Printf

contrasts = [0.2,0.5,1.0,2.0,5.0]
python_reference = [1.3632297728738906e-6,2.223838244109954e-6,3.1685843786932684e-6,
                    4.34308812547343e-6,6.139336152619793e-6]

@testset "Julia inhomogeneous elasticity" begin
    for (contrast,expected_energy) in zip(contrasts,python_reference)
        stiffness,eigenstrain,reference,phase = plate_problem(size=33,contrast=contrast)
        direct = solve_direct(stiffness,eigenstrain,reference)
        equivalent = solve_equivalent(stiffness,eigenstrain,reference)
        @test direct.residual < 1e-8
        @test equivalent.residual < 1e-8
        @test equivalent.constitutive_mismatch < 1e-8
        @test isapprox(direct.energy,equivalent.energy;rtol=2e-7)
        @test isapprox(direct.energy,expected_energy;rtol=2e-7)
        @printf "contrast %.1f: energy %.10e, direct residual %.2e, equivalent residual %.2e\n" contrast direct.energy direct.residual equivalent.residual
    end
end
