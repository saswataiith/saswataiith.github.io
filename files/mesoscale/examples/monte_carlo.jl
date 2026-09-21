using Random, DelimitedFiles, Statistics, Printf
@inline pidx(i, N) = (i < 1) ? i + N : (i > N ? i - N : i)

# count how many neighbors differ from candidate state (boundary energy proxy)
function mismatch_count(state::Matrix{Int}, i::Int, j::Int, cand::Int)
    Nx, Ny = size(state)
    ip = pidx(i+1, Nx); im = pidx(i-1, Nx)
    jp = pidx(j+1, Ny); jm = pidx(j-1, Ny)

    c = 0
    c += (state[ip,j] != cand)
    c += (state[im,j] != cand)
    c += (state[i,jp] != cand)
    c += (state[i,jm] != cand)
    return c
end

# one Potts update: propose adopting a neighbor's state (grain growth-like)
function potts_step!(state::Matrix{Int}, T::Float64, rng)
    Nx, Ny = size(state)
    i = rand(rng, 1:Nx)
    j = rand(rng, 1:Ny)

    # pick a random neighbor and propose its label
    r = rand(rng)
    di, dj = (r < 0.25) ? (1,0) : (r < 0.50) ? (-1,0) : (r < 0.75) ? (0,1) : (0,-1)
    ip = pidx(i+di, Nx)
    jp = pidx(j+dj, Ny)
    cand = state[ip, jp]
    old  = state[i, j]
    cand == old && return

    # "energy" = number of mismatching neighbors (grain boundary length proxy)
    E_before = mismatch_count(state, i, j, old)
    E_after  = mismatch_count(state, i, j, cand)
    dE = E_after - E_before

    if dE <= 0
        state[i,j] = cand
    elseif rand(rng) < exp(-dE / T)
        state[i,j] = cand
    end
    return
end

# local energy contribution of a site (nearest-neighbor Ising)
function local_energy(spin::Matrix{Int}, i::Int, j::Int, J::Float64)
    Nx, Ny = size(spin)
    ip = pidx(i+1, Nx); im = pidx(i-1, Nx)
    jp = pidx(j+1, Ny); jm = pidx(j-1, Ny)
    s = spin[i,j]
    nn = spin[ip,j] + spin[im,j] + spin[i,jp] + spin[i,jm]
    return -J * s * nn
end

# one Glauber flip attempt (NOT composition-conserving)
function glauber_step!(spin::Matrix{Int}, J::Float64, T::Float64, rng)
    Nx, Ny = size(spin)
    i = rand(rng, 1:Nx)
    j = rand(rng, 1:Ny)

    # energy before + after flipping this spin
    E_before = local_energy(spin, i, j, J)
    spin[i,j] = -spin[i,j]           # trial flip
    E_after  = local_energy(spin, i, j, J)
    dE = E_after - E_before

    # Metropolis accept/reject
    if dE <= 0
        return
    elseif rand(rng) < exp(-dE / T)
        return
    else
        spin[i,j] = -spin[i,j]       # reject flip
        return
    end
end


# Course-code adaptation. One sweep = n*n attempted updates; periodic boundaries.
# Potts neighbor proposals are a grain-growth heuristic, not equilibrium sampling.
function movie(mode="ising",output="mc_output";n=256,sweeps=(mode=="potts" ? 2000 : 200),save_every=(mode=="potts" ? 25 : 5))
    mode in ("ising","potts") || error("Choose ising or potts")
    mkpath(output);rng=MersenneTwister(7)
        # Each Potts pixel starts with its own orientation label; shuffled IDs avoid color bands.
    state=mode=="ising" ? [rand(rng,Bool) ? 1 : -1 for i=1:n,j=1:n] : reshape(randperm(rng,n*n),n,n)
    records=Vector{Float64}[]
    for sweep=0:sweeps
        if sweep>0
            for attempt=1:n*n
                mode=="ising" ? glauber_step!(state,1.,1.5,rng) : potts_step!(state,.3,rng)
            end
        end
        if sweep%save_every==0
            energy=mode=="ising" ? -sum(state.*(circshift(state,(1,0)).+circshift(state,(0,1))))/(n*n) : (sum(state.!=circshift(state,(1,0)))+sum(state.!=circshift(state,(0,1))))/(n*n)
            push!(records,[sweep,energy,mean(state)])
            writedlm(joinpath(output,@sprintf("field_%04d.csv",sweep)),state,',')
        end
    end
    open(joinpath(output,"diagnostics.csv"),"w") do io
        println(io,"sweep,energy_per_site,mean_label_or_spin");writedlm(io,permutedims(hcat(records...)),',')
    end
    println(mode," initial/final energy ",records[1][2]," ",records[end][2])
end
if abspath(PROGRAM_FILE)==@__FILE__
 movie(ARGS...)
end
