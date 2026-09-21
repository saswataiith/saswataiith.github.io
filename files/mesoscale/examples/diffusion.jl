# Fourier diffusion lesson related to Fourier_Julia.ipynb.
# julia diffusion.jl [output_directory]; requires FFTW.
using FFTW, Statistics, DelimitedFiles, Printf
function run(output="diffusion_output")
    mkpath(output);n=128;x=2π .* (0:n-1) ./ n;k=2π .* fftfreq(n,n/(2π))
    c0=1  .+ .4 .* cos.(x) .+ .2 .* cos.(4  .* x);rows=Vector{Float64}[]
    for t in [0.,.02,.1,.3,1.]
        c=real.(ifft(fft(c0) .* exp.(-k .^ 2  .* t)))
        exact=1  .+ .4*exp(-t) .* cos.(x) .+ .2*exp(-16*t) .* cos.(4  .* x)
        push!(rows,[t,mean(c),maximum(abs.(c .- exact))])
        writedlm(joinpath(output,@sprintf("profile_%.2f.csv",t)),hcat(x,c),',')
    end
    open(joinpath(output,"diagnostics.csv"),"w") do io
        println(io,"time,mean,max_exact_error");writedlm(io,permutedims(hcat(rows...)),',')
    end
    @assert maximum(r[3] for r in rows)<1e-12
    println("Fourier diffusion: max exact error ",maximum(r[3] for r in rows))
end
if abspath(PROGRAM_FILE) == @__FILE__
    run(ARGS...)
end
