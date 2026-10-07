/* I build shared-edge cluster labeling in small tested stages.
   This is a new teaching implementation. See README.md for references. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

int find_label(const int parent[], int label) {
    while (parent[label] != label) label = parent[label];
    return label;
}

int main(void) {
    int parent[] = {0,1,1,2};
    assert(find_label(parent, 3) == 1);
    puts("Step 2 passed: label lookup."); return 0;
}
