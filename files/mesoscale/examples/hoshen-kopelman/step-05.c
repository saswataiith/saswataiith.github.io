// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
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

int main(void) {
    int mask[] = {1,0,1, 1,1,1, 0,0,0}, labels[9], parent[10], sizes[10];
    scan_grid(3,3,mask,labels,parent);
    assert(finish_labels(9,labels,parent,sizes) == 1);
    assert(sizes[1] == 5);
    puts("Step 5 passed: one cluster of five cells."); return 0;
}
