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

int main(void) {
    int parent[] = {0,1,2,3};
    merge_labels(parent,2,3); merge_labels(parent,1,3);
    for (int k = 1; k <= 3; ++k) assert(find_label(parent,k) == 1);
    puts("Step 3 passed: label merging."); return 0;
}
