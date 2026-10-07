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

int main(void) {
    int mask[] = {1,0,1, 1,1,1, 0,0,0};
    int occupied = 0;
    for (int p = 0; p < 9; ++p) occupied += mask[p];
    assert(occupied == 5);
    puts("Step 1 passed: five occupied cells.");
    return 0;
}
