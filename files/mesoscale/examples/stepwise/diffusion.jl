# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I work through step 1.
using FFTW, Statistics
n = 128
length_x = 2π
spacing = length_x / n
x = spacing .* (0:n-1)
k = 2π .* fftfreq(n, 1 / spacing)
diffusivity = 1.0
@assert isapprox(n * spacing, length_x)
@assert k[1] == 0
println("Grid points: ", n, "; spacing: ", spacing)

# I work through step 2.
initial = 1 .+ 0.4 .* cos.(x) .+ 0.2 .* cos.(4 .* x)
spectrum = fft(initial)
@assert abs(mean(initial) - 1) < 1e-12
@assert maximum(abs.(real.(ifft(spectrum)) .- initial)) < 1e-12
println("Initial mean: ", mean(initial))

# I work through step 3.
time = 0.3
decay = exp.(-diffusivity .* k.^2 .* time)
field = real.(ifft(spectrum .* decay))
exact = 1 .+ 0.4 * exp(-time) .* cos.(x) .+ 0.2 * exp(-16*time) .* cos.(4 .* x)
@assert maximum(abs.(field .- exact)) < 1e-12
@assert abs(mean(field) - mean(initial)) < 1e-12
println("Maximum analytical error: ", maximum(abs.(field .- exact)))

# I work through step 4.
times = [0.0, 0.02, 0.1, 0.3, 1.0]
profiles = Vector{Float64}[]
variation = Float64[]
for sample_time in times
    sample_decay = exp.(-diffusivity .* k.^2 .* sample_time)
    profile = real.(ifft(spectrum .* sample_decay))
    push!(profiles, profile)
    push!(variation, mean((profile .- mean(profile)).^2))
end
@assert all(abs(mean(profile) - 1) < 1e-12 for profile in profiles)
@assert all(diff(variation) .<= 0)
println("Concentration variances: ", variation)
