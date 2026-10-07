# Copyright (c) 2026 Saswata Bhattacharyya.
# I permit free noncommercial teaching and demonstrations with acknowledgment.
# I require written permission for research or commercial use.
# I retain permissions granted by earlier licenses; dependencies keep their licenses.
# I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
# 1. I write a small grid and inspect it
mask = Bool[1 0 1; 1 1 1; 0 0 0]
@assert size(mask) == (3, 3)
@assert sum(mask) == 5
println(Int.(mask))

# 2. I find the representative of a label
function find_label(parent, label)
    while parent[label] != label
        label = parent[label]
    end
    return label
end
parent = [1, 1, 2]
@assert find_label(parent, 3) == 1
println("Label lookup passed.")

# 3. I merge two labels
function merge_labels!(parent, first, second)
    first_root = find_label(parent, first)
    second_root = find_label(parent, second)
    root = min(first_root, second_root)
    parent[max(first_root, second_root)] = root
    return root
end
parent = [1, 2, 3]
merge_labels!(parent, 2, 3)
merge_labels!(parent, 1, 3)
@assert [find_label(parent, k) for k in 1:3] == [1, 1, 1]
println("Label merging passed.")

# 4. I scan the grid once
function scan_grid(mask)
    rows, columns = size(mask)
    labels = zeros(Int, rows, columns)
    parent = Int[]
    for row in 1:rows
        for column in 1:columns
            if !mask[row, column]
                continue
            end
            above = row > 1 ? labels[row - 1, column] : 0
            left = column > 1 ? labels[row, column - 1] : 0
            if above == 0 && left == 0
                new_label = length(parent) + 1
                push!(parent, new_label)
                labels[row, column] = new_label
            elseif above == 0
                labels[row, column] = find_label(parent, left)
            elseif left == 0
                labels[row, column] = find_label(parent, above)
            else
                labels[row, column] = merge_labels!(parent, above, left)
            end
        end
    end
    return labels, parent
end
labels, parent = scan_grid(mask)
@assert labels[1, 1] != labels[1, 3]
@assert find_label(parent, labels[1, 1]) == find_label(parent, labels[1, 3])
println("Provisional labels: ", labels)

# 5. I replace provisional labels and count cells
function finish_labels(labels, parent)
    final = zeros(Int, size(labels))
    numbers = Dict{Int, Int}()
    for row in axes(labels, 1)
        for column in axes(labels, 2)
            label = labels[row, column]
            if label == 0
                continue
            end
            root = find_label(parent, label)
            if !haskey(numbers, root)
                numbers[root] = length(numbers) + 1
            end
            final[row, column] = numbers[root]
        end
    end
    sizes = [count(==(k), final) for k in 1:length(numbers)]
    return final, sizes
end
final, sizes = finish_labels(labels, parent)
@assert sizes == [5]
@assert (final .> 0) == mask
println("Final labels: ", final, "; sizes: ", sizes)

# 6. I add periodic connections as a separate step
function join_periodic_edges!(labels, parent)
    rows, columns = size(labels)
    for column in 1:columns
        top, bottom = labels[1, column], labels[rows, column]
        if top != 0 && bottom != 0
            merge_labels!(parent, top, bottom)
        end
    end
    for row in 1:rows
        left, right = labels[row, 1], labels[row, columns]
        if left != 0 && right != 0
            merge_labels!(parent, left, right)
        end
    end
end
function hoshen_kopelman(mask; periodic=false)
    @assert ndims(mask) == 2 && minimum(size(mask)) > 0
    labels, parent = scan_grid(Bool.(mask))
    if periodic
        join_periodic_edges!(labels, parent)
    end
    return finish_labels(labels, parent)
end
seam = falses(5, 5)
seam[1, 3] = seam[end, 3] = true
@assert hoshen_kopelman(seam)[2] == [1, 1]
@assert hoshen_kopelman(seam; periodic=true)[2] == [2]
println("Periodic seam check passed.")

# 7. I test examples before analyzing a microstructure
@assert hoshen_kopelman(falses(3, 5))[2] == Int[]
@assert hoshen_kopelman(trues(3, 5))[2] == [15]
corner = falses(3, 3)
for k in 1:3
    corner[k, k] = true
end
@assert hoshen_kopelman(corner)[2] == [1, 1, 1]
ring = trues(5, 5)
ring[2:4, 2:4] .= false
@assert hoshen_kopelman(ring)[2] == [16]
rectangle = falses(3, 5)
rectangle[2, 1] = rectangle[2, end] = true
@assert hoshen_kopelman(rectangle)[2] == [1, 1]
@assert hoshen_kopelman(rectangle; periodic=true)[2] == [2]
println("All small-grid checks passed.")

# 8. I apply a threshold and analyze both phases
composition = [0.8 0.2 0.7; 0.9 0.6 0.8; 0.1 0.2 0.1]
for (name, phase) in [("High composition", composition .>= 0.5),
                      ("Low composition", composition .< 0.5)]
    phase_labels, phase_sizes = hoshen_kopelman(phase; periodic=true)
    occupied = sum(phase)
    largest_fraction = occupied > 0 ? maximum(phase_sizes) / occupied : 0.0
    @assert sum(phase_sizes) == occupied
    println(name, ": occupied fraction = ", occupied / length(phase),
            "; clusters = ", length(phase_sizes), "; largest fraction = ", largest_fraction)
end
