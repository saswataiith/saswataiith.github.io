# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I work through step 1.
using Random, Statistics
rng = MersenneTwister(7)
number = 50000
positions = zeros(Int, number, 2)
moves = [1 0; -1 0; 0 1; 0 -1]
@assert all(sum(moves.^2; dims=2) .== 1)
@assert all(positions .== 0)
println("Molecules: ", number)

# I work through step 2.
for molecule in axes(positions, 1)
    choice = rand(rng, 1:4)
    positions[molecule, :] .+= moves[choice, :]
end
@assert all(sum(positions.^2; dims=2) .== 1)
println("First-sweep mean-square displacement: ", mean(sum(positions.^2; dims=2)))

# I work through step 3.
sweep_count = 100
history = [0.0, 1.0]
for sweep in 2:sweep_count
    for molecule in axes(positions, 1)
        choice = rand(rng, 1:4)
        positions[molecule, :] .+= moves[choice, :]
    end
    push!(history, mean(sum(positions.^2; dims=2)))
end
relative_error = abs(history[end] / sweep_count - 1)
@assert relative_error < 0.06
println("Measured: ", history[end], "; prediction: ", sweep_count)

# I work through step 4.
mean_position = vec(mean(positions; dims=1))
root_mean_square_distance = sqrt(history[end])
@assert sqrt(sum(mean_position.^2)) < 0.1 * root_mean_square_distance
println("Mean position: ", mean_position)
println("Root-mean-square distance: ", root_mean_square_distance)
