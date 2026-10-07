# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# I work through step 1.
using Random
rng = MersenneTwister(7)
function neighbor_values(state, row, column)
    rows, columns = size(state)
    return [state[mod1(row+1,rows),column], state[mod1(row-1,rows),column],
            state[row,mod1(column+1,columns)], state[row,mod1(column-1,columns)]]
end
test_grid = [0 1 2; 3 4 5; 6 7 8]
@assert neighbor_values(test_grid, 1, 1) == [3, 6, 1, 2]
println("Periodic neighbor indexing passed.")

# I work through step 2.
function ising_energy_change(old_spin, neighbors)
    return 2 * old_spin * sum(neighbors)
end
@assert ising_energy_change(1, [1,1,1,1]) == 8
@assert ising_energy_change(-1, [1,1,1,1]) == -8
println("Ising energy changes passed.")

# I work through step 3.
function accept_trial(energy_change, temperature, rng)
    temperature > 0 || error("Use positive temperature in this example.")
    if energy_change <= 0
        return true
    end
    return rand(rng) < exp(-energy_change / temperature)
end
@assert accept_trial(-8, 1.5, rng)
@assert accept_trial(0, 1.5, rng)
@assert 0 < exp(-8 / 1.5) < 1
println("Acceptance checks passed.")

# I work through step 4.
function ising_trial!(state, temperature, rng)
    row = rand(rng, axes(state,1))
    column = rand(rng, axes(state,2))
    old = state[row,column]
    change = ising_energy_change(old, neighbor_values(state,row,column))
    if accept_trial(change, temperature, rng)
        state[row,column] = -old
    end
end
spins = rand(rng, [-1,1], 16,16)
for trial in 1:length(spins)*10
    ising_trial!(spins, 1.5, rng)
end
@assert all(value in (-1,1) for value in spins)
println("Ising state values: ", unique(spins))

# I work through step 5.
function potts_energy_change(old, candidate, neighbors)
    return count(!=(candidate), neighbors) - count(!=(old), neighbors)
end
@assert potts_energy_change(1,2,[2,2,2,1]) == -2
function potts_trial!(state, temperature, rng)
    row = rand(rng, axes(state,1))
    column = rand(rng, axes(state,2))
    neighbors = neighbor_values(state,row,column)
    candidate = rand(rng, neighbors)
    change = potts_energy_change(state[row,column],candidate,neighbors)
    if accept_trial(change,temperature,rng)
        state[row,column] = candidate
    end
end
grains = reshape(randperm(rng,256),16,16)
initial_labels = Set(grains)
for trial in 1:length(grains)*10
    potts_trial!(grains,0.3,rng)
end
@assert issubset(Set(grains),initial_labels)
println("Grains initially: ", length(initial_labels), "; remaining labels: ", length(unique(grains)))
