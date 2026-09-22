"""Shared 2-D periodic elasticity routines. GPL-3.0-or-later."""
module ElasticityCommon

using FFTW, LinearAlgebra, Statistics

export PeriodicGrid, cubic, stress, reference_compliance, rms, prepare,
       diagnostics, package_result, plate_problem

function cubic(c11=4.0, c12=2.0, c44=1.0)
    minimum((c44, c11-c12, c11+2c12)) > 0 || error("Choose stable cubic constants.")
    stiffness = zeros(2,2,2,2)
    for i in 1:2, j in 1:2, k in 1:2, l in 1:2
        stiffness[i,j,k,l] = i == j == k == l ? c11 :
            (i == j && k == l ? c12 :
            ((i == k && j == l) || (i == l && j == k) ? c44 : 0.0))
    end
    stiffness
end

function stress(stiffness, strain)
    size(strain)[end-1:end] == (2,2) || error("Strain must end in two tensor axes.")
    result = zeros(size(strain))
    if ndims(stiffness) == 4
        for x in axes(strain,1), y in axes(strain,2), i in 1:2, j in 1:2, k in 1:2, l in 1:2
            result[x,y,i,j] += stiffness[i,j,k,l]*strain[x,y,k,l]
        end
    else
        for x in axes(strain,1), y in axes(strain,2), i in 1:2, j in 1:2, k in 1:2, l in 1:2
            result[x,y,i,j] += stiffness[x,y,i,j,k,l]*strain[x,y,k,l]
        end
    end
    result
end

function reference_compliance(reference, tensor)
    c11, c12, c44 = reference[1,1,1,1], reference[1,1,2,2], reference[1,2,1,2]
    result = similar(tensor)
    denominator = c11^2-c12^2
    result[:,:,1,1] = (c11*tensor[:,:,1,1]-c12*tensor[:,:,2,2])/denominator
    result[:,:,2,2] = (c11*tensor[:,:,2,2]-c12*tensor[:,:,1,1])/denominator
    result[:,:,1,2] = tensor[:,:,1,2]/(2c44)
    result[:,:,2,1] = result[:,:,1,2]
    result
end

struct PeriodicGrid
    size::Int
    wave_x::Matrix{Float64}
    wave_y::Matrix{Float64}
end

function PeriodicGrid(size=65)
    size >= 5 && isodd(size) || error("Use an odd grid size of at least 5.")
    frequencies = vcat(0:(size÷2), -(size÷2):-1) .* (2pi)
    PeriodicGrid(size, repeat(frequencies,1,size), repeat(frequencies',size,1))
end

transform(field) = fft(field,(1,2))
inverse(field) = real(ifft(field,(1,2)))

function strain(grid::PeriodicGrid, displacement)
    displacement_hat = transform(displacement)
    strain_hat = zeros(ComplexF64,grid.size,grid.size,2,2)
    wave = (grid.wave_x,grid.wave_y)
    for i in 1:2, j in 1:2
        strain_hat[:,:,i,j] = 0.5im .* (wave[j].*displacement_hat[:,:,i] + wave[i].*displacement_hat[:,:,j])
    end
    inverse(strain_hat)
end

function divergence(grid::PeriodicGrid, tensor)
    tensor_hat = transform(tensor)
    result_hat = zeros(ComplexF64,grid.size,grid.size,2)
    for i in 1:2
        result_hat[:,:,i] = im .* (grid.wave_x.*tensor_hat[:,:,i,1] + grid.wave_y.*tensor_hat[:,:,i,2])
    end
    inverse(result_hat)
end

function response(grid::PeriodicGrid, reference, polarization)
    polarization_hat = transform(polarization)
    displacement_hat = zeros(ComplexF64,grid.size,grid.size,2)
    for x in 1:grid.size, y in 1:grid.size
        k = (grid.wave_x[x,y],grid.wave_y[x,y])
        if x != 1 || y != 1
            acoustic = [sum(reference[i,j,m,l]*k[j]*k[l] for j in 1:2,l in 1:2) for i in 1:2,m in 1:2]
            force = [sum(polarization_hat[x,y,i,j]*k[j] for j in 1:2) for i in 1:2]
            displacement_hat[x,y,:] = -im .* (acoustic \ force)
        end
    end
    inverse(displacement_hat)
end

rms(array) = sqrt(mean(abs2,array))

function prepare(stiffness,eigenstrain,mean_strain,reference,relaxation,tolerance,max_iterations)
    size = axes(eigenstrain,1).stop
    grid = PeriodicGrid(size)
    mean_tensor = isnothing(mean_strain) ? zeros(2,2) : Matrix{Float64}(mean_strain)
    0 < relaxation <= 1 || error("Relaxation must lie in (0,1].")
    tolerance > 0 && max_iterations > 0 || error("Tolerance and iteration limit must be positive.")
    imposed = reshape(mean_tensor,1,1,2,2) .- eigenstrain
    initial_stress = stress(stiffness,imposed)
    scale = max(rms(divergence(grid,initial_stress)),2pi*rms(initial_stress),1e-30)
    grid, mean_tensor, scale
end

function diagnostics(grid,stiffness,eigenstrain,total_strain,scale)
    elastic_strain = total_strain-eigenstrain
    sigma = stress(stiffness,elastic_strain)
    energy_density = 0.5 .* dropdims(sum(elastic_strain.*sigma,dims=(3,4)),dims=(3,4))
    sigma,energy_density,rms(divergence(grid,sigma))/scale
end

function package_result(grid,stiffness,eigenstrain,total_strain,displacement,scale,history; extras...)
    sigma,energy_density,residual = diagnostics(grid,stiffness,eigenstrain,total_strain,scale)
    (; strain=total_strain,displacement,stress=sigma,energy_density,
       energy=mean(energy_density),residual,history=reduce(vcat,permutedims.(history)),extras...)
end

function plate_problem(;size=65,contrast=0.5,angle=30.0,misfit_ratio=-0.5,
                       matrix_constants=(4.0,2.0,1.0),precipitate_constants=nothing)
    PeriodicGrid(size)
    matrix = cubic(matrix_constants...)
    precipitate_values = isnothing(precipitate_constants) ? contrast .* collect(matrix_constants) : precipitate_constants
    precipitate = cubic(precipitate_values...)
    coordinate = collect(0:size-1)./size .- 0.5
    x = repeat(coordinate,1,size); y = repeat(coordinate',size,1)
    theta = deg2rad(angle)
    along = x.*cos(theta)+y.*sin(theta); across = -x.*sin(theta)+y.*cos(theta)
    phase = 0.5 .* (1 .- tanh.(((along./0.23).^2+(across./0.075).^2 .- 1)./0.35))
    stiffness = reshape(matrix,1,1,2,2,2,2) .+ reshape(phase,size,size,1,1,1,1).*reshape(precipitate-matrix,1,1,2,2,2,2)
    eigenstrain = zeros(size,size,2,2)
    eigenstrain[:,:,1,1] = 0.01phase; eigenstrain[:,:,2,2] = 0.01misfit_ratio.*phase
    stiffness,eigenstrain,0.5.*(matrix+precipitate),phase
end

end
