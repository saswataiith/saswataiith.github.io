# MS5033 teaching adaptation of PhaseField_Examples_Spectral.ipynb.
# julia phase_field.jl [chemical|elastic] [output_directory]
# Install FFTW: julia -e 'using Pkg; Pkg.add("FFTW")'
# Dimensionless periodic 2D model. CSV rows=x, columns=y.
using FFTW, Statistics, DelimitedFiles, Printf

function kernel(kx,ky; c11=4.,c12=2.,c44=3.,eigenstrain=.2)
    k2=kx .^ 2  .+  ky .^ 2
    radius=sqrt.(ifelse.(k2 .== 0,1.,k2)); nx=kx ./ radius; ny=ky ./ radius
    # Acoustic tensor Q_ik=C_ijkl*n_j*n_l: diagonal shear term is C44.
    q11=c11 .* nx .^ 2  .+  c44 .* ny .^ 2
    q22=c44 .* nx .^ 2  .+  c11 .* ny .^ 2
    q12=(c12+c44) .* nx .* ny
    det=q11 .* q22 .- q12 .^ 2; det[k2 .== 0] .= 1.
    stress=(c11+c12)*eigenstrain
    b=2*(c11+c12)*eigenstrain^2  .-  stress^2 .* (q22 .* nx .^ 2 .- 2  .* q12 .* nx .* ny .+ q11 .* ny .^ 2) ./ det
    b[k2 .== 0] .= 0.; return b
end

function run(mode="chemical",output="phase_output";n=(mode=="elastic" ? 256 : 64),dt=.2,steps=2000)
    mode in ("chemical","elastic") || error("Choose chemical or elastic")
    mkpath(output)
    k=2π .* fftfreq(n);kx=repeat(reshape(k,n,1),1,n);ky=permutedims(kx);k2=kx .^ 2 .+ ky .^ 2
    b=mode=="elastic" ? kernel(kx,ky) : zeros(n,n)
    # Conjugate-pair symmetrization of the discrete real-field kernel.
    partner=mod.(-(0:n-1),n) .+ 1
    b=0.5 .* (b .+ b[partner,partner])
    noise=[sin(i*12.9898+j*78.233)*43758.5453 for i=1:n,j=1:n]
    noise=.02 .* (noise .- floor.(noise) .-  .5);noise .-=mean(noise);c=.5 .+ noise
    initial_mean=mean(c);records=Vector{Float64}[]
    denominator=1  .+ dt .* k2 .* (k2 .+ b)
    function record(step)
        h=fft(c);energy=mean(c .^ 2 .* (1  .- c) .^ 2)+.5*sum((k2 .+ b) .* abs2.(h))/n^4
        push!(records,[step*dt,mean(c),energy,minimum(c),maximum(c)])
        writedlm(joinpath(output,@sprintf("field_%04d.csv",step)),c,',')
    end
    record(0)
    for step=1:steps
        h=(fft(c) .- dt .* k2 .* fft(2  .* c .* (1  .- c) .* (1  .- 2  .* c))) ./ denominator
        c=real.(ifft(h))
        (step%25==0 || step==steps) && record(step)
    end
    @assert all(isfinite,c)
    @assert abs(mean(c)-initial_mean)<1e-10
    open(joinpath(output,"diagnostics.csv"),"w") do io
        println(io,"time,mean,energy_density,min,max");writedlm(io,permutedims(hcat(records...)),',')
    end
    println(mode," mean drift ",abs(mean(c)-initial_mean)," energy ",records[1][3]," → ",records[end][3])
    return c,records
end
if abspath(PROGRAM_FILE) == @__FILE__
    run(ARGS...)
end
