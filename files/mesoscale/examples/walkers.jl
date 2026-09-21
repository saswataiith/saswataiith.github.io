# Teaching adaptation of demo2_many_walkers_diffusion.jl.
# julia walkers.jl [output_directory]; standard-library dependencies only.
# All walkers step each sweep, unbounded 2D lattice, unit steps. D=1/4.
# Julia/NumPy RNGs differ; compare ensemble statistics, not paths.
using Random, Statistics, DelimitedFiles, Printf
function run(output="walkers_output")
    mkpath(output);rng=MersenneTwister(7);n=100000;pos=zeros(Int,n,2)
    dirs=[1 0;-1 0;0 1;0 -1];rows=Vector{Float64}[]
    for step=0:400
        if step>0
            for w=1:n
                d=rand(rng,1:4);pos[w,1]+=dirs[d,1];pos[w,2]+=dirs[d,2]
            end
        end
        if step%10==0
            msd=mean(sum(abs2,pos;dims=2));push!(rows,[step,msd,step]);hist=zeros(256,256)
            for w=1:n
                a=floor(Int,pos[w,1]+128)+1;b=floor(Int,pos[w,2]+128)+1
                # Histogram window only; walkers are not confined to this window.
                a==257 && pos[w,1]==128 && (a=256)
                b==257 && pos[w,2]==128 && (b=256)
                1<=a<=256 && 1<=b<=256 && (hist[a,b]+=1/n)
            end
            writedlm(joinpath(output,@sprintf("density_%04d.csv",step)),hist,',')
        end
    end
    open(joinpath(output,"diagnostics.csv"),"w") do io
        println(io,"steps,msd,theory");writedlm(io,permutedims(hcat(rows...)),',')
    end
    @assert abs(rows[end][2]/400-1)<.04
    println("Walker MSD at 400 steps ",rows[end][2]," theory 400")
end
if abspath(PROGRAM_FILE) == @__FILE__
    run(ARGS...)
end
