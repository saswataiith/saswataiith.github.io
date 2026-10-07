/* I build shared-edge cluster labeling in small tested stages.
   This is a new teaching implementation. See README.md for references. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

int find_label(const int parent[], int label) {
    while (parent[label] != label) label = parent[label];
    return label;
}

int merge_labels(int parent[], int first, int second) {
    int a = find_label(parent, first);
    int b = find_label(parent, second);
    int root = a < b ? a : b;
    parent[a > b ? a : b] = root;
    return root;
}

void scan_grid(int rows, int columns, const int mask[], int labels[], int parent[]) {
    int next = 1;
    parent[0] = 0;
    for (int row = 0; row < rows; ++row) {
        for (int column = 0; column < columns; ++column) {
            int p = row * columns + column;
            labels[p] = 0;
            if (!mask[p]) continue;
            int above = row > 0 ? labels[p - columns] : 0;
            int left = column > 0 ? labels[p - 1] : 0;
            if (!above && !left) {
                parent[next] = next;
                labels[p] = next++;
            } else if (!above) labels[p] = find_label(parent, left);
            else if (!left) labels[p] = find_label(parent, above);
            else labels[p] = merge_labels(parent, above, left);
        }
    }
}

int finish_labels(int cells, int labels[], const int parent[], int sizes[]) {
    int numbers[cells + 1];
    int clusters = 0;
    for (int k = 0; k <= cells; ++k) { numbers[k] = 0; sizes[k] = 0; }
    for (int p = 0; p < cells; ++p) {
        if (!labels[p]) continue;
        int root = find_label(parent, labels[p]);
        if (!numbers[root]) numbers[root] = ++clusters;
        labels[p] = numbers[root];
        ++sizes[labels[p]];
    }
    return clusters;
}

void join_periodic_edges(int rows, int columns, const int labels[], int parent[]) {
    for (int column = 0; column < columns; ++column) {
        int top = labels[column], bottom = labels[(rows - 1) * columns + column];
        if (top && bottom) merge_labels(parent, top, bottom);
    }
    for (int row = 0; row < rows; ++row) {
        int left = labels[row * columns], right = labels[row * columns + columns - 1];
        if (left && right) merge_labels(parent, left, right);
    }
}

int hoshen_kopelman(int rows, int columns, const int mask[], int labels[], int sizes[], int periodic) {
    int parent[rows * columns + 1];
    scan_grid(rows, columns, mask, labels, parent);
    if (periodic) join_periodic_edges(rows, columns, labels, parent);
    return finish_labels(rows * columns, labels, parent, sizes);
}

int main(void) {
    int mask[25] = {0}, labels[25], sizes[26];
    mask[2] = mask[22] = 1;
    assert(hoshen_kopelman(5,5,mask,labels,sizes,0) == 2);
    assert(hoshen_kopelman(5,5,mask,labels,sizes,1) == 1);
    assert(sizes[1] == 2);
    puts("Step 6 passed: periodic seam."); return 0;
}
