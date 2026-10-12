import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../assets/js/hk-walkthrough-model.js';
const {hkWalkthrough, hkRoot} = model;

// I compare the final partition with an independent four-neighbor flood fill.
function flood(mask) {
  const labels = mask.map(row => row.map(() => 0));
  let count = 0;
  mask.forEach((line, r) => line.forEach((value, c) => {
    if (!value || labels[r][c]) return;
    const pending = [[r,c]]; labels[r][c] = ++count;
    while (pending.length) {
      const [row,column] = pending.pop();
      for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const y = row + dr, x = column + dc;
        if (mask[y]?.[x] && !labels[y][x]) {
          labels[y][x] = count; pending.push([y,x]);
        }
      }
    }
  }));
  return labels;
}
test('all 512 three-by-three masks agree with independent connectivity', () => {
  for (let bits = 0; bits < 512; bits++) {
    const mask = Array.from({length:3}, (_,r) => Array.from({length:3},(_,c) => (bits >> (3*r+c)) & 1));
    const frames = hkWalkthrough(mask), last = frames.at(-1);
    assert.deepEqual(last.final, flood(mask));
    for (const frame of frames) {
      for (let k = 1; k < frame.parent.length; k++) assert.ok(hkRoot(frame.parent,k) > 0);
    }
  }
});
test('joining arms retains provisional labels until the second pass', () => {
  const frames = hkWalkthrough([[1,0,1],[1,1,1],[0,0,0]]);
  const join = frames.find(f => f.pass.startsWith('Pass 1') && f.row === 1 && f.column === 2);
  assert.equal(join.parent[2],1);
  assert.equal(join.labels[0][2],2);
  assert.equal(join.final[0][2],0);
  assert.deepEqual(frames.at(-1).final,[[1,0,1],[1,1,1],[0,0,0]]);
  assert.equal(frames.at(-1).clusters,1);
});
