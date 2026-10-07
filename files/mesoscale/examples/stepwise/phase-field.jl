# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I work through step 1.
using FFTW, Statistics
n = 64
dt = 0.2
k = 2π .* fftfreq(n)
kx = repeat(reshape(k, n, 1), 1, n)
ky = permutedims(kx)
k2 = kx.^2 .+ ky.^2
noise = [sin(row*12.9898 + column*78.233)*43758.5453 for row in 1:n, column in 1:n]
noise = 0.02 .* (noise .- floor.(noise) .- 0.5)
noise .-= mean(noise)
initial = 0.5 .+ noise
@assert abs(mean(initial) - 0.5) < 1e-12
@assert k2[1, 1] == 0
println("Initial mean: ", mean(initial))

# I work through step 2.
chemical_kernel = zeros(size(k2))
bulk_derivative = 2 .* initial .* (1 .- initial) .* (1 .- 2 .* initial)
numerator = fft(initial) .- dt .* k2 .* fft(bulk_derivative)
denominator = 1 .+ dt .* k2 .* (k2 .+ chemical_kernel)
one_step = real.(ifft(numerator ./ denominator))
@assert all(isfinite, one_step)
@assert abs(mean(one_step) - mean(initial)) < 1e-12
println("Mean change: ", mean(one_step) - mean(initial))

# I work through step 3.
include("../phase_field.jl")
angles = range(0, 2π; length=33)
isotropic = kernel(cos.(angles), sin.(angles); c11=4, c12=2, c44=1)
@assert maximum(isotropic) - minimum(isotropic) < 1e-12
@assert all(abs.(kernel(kx, ky; eigenstrain=0)) .< 1e-12)
elastic_kernel = kernel(kx, ky; c11=4, c12=2, c44=3, eigenstrain=0.2)
partner = mod.(-(0:n-1), n) .+ 1
elastic_kernel = 0.5 .* (elastic_kernel .+ elastic_kernel[partner, partner])
@assert all(isfinite, elastic_kernel)
println("Isotropic angular variation: ", maximum(isotropic) - minimum(isotropic))

# I work through step 4.
chemical = copy(initial)
elastic = copy(initial)
for step in 1:50
    chemical_bulk = 2 .* chemical .* (1 .- chemical) .* (1 .- 2 .* chemical)
    chemical_spectrum = fft(chemical) .- dt .* k2 .* fft(chemical_bulk)
    chemical .= real.(ifft(chemical_spectrum ./ (1 .+ dt .* k2 .* (k2 .+ chemical_kernel))))
    elastic_bulk = 2 .* elastic .* (1 .- elastic) .* (1 .- 2 .* elastic)
    elastic_spectrum = fft(elastic) .- dt .* k2 .* fft(elastic_bulk)
    elastic .= real.(ifft(elastic_spectrum ./ (1 .+ dt .* k2 .* (k2 .+ elastic_kernel))))
end
for result in (chemical, elastic)
    @assert all(isfinite, result)
    @assert abs(mean(result) - mean(initial)) < 1e-10
end
@assert sum(abs2, chemical .- elastic) > 0
println("Final time: ", 50 * dt)
println("Field RMS difference: ", sqrt(mean((chemical .- elastic).^2)))
