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
