/* Copyright (c) 2026 Saswata Bhattacharyya.
   I give my code-use terms at /using-my-resources/. */
/* I record both Hoshen–Kopelman passes so each displayed step can be inspected. */
function hkRoot(parent, label) {
  while (parent[label] !== label) label = parent[label];
  return label;
}

function hkWalkthrough(mask) {
  const rows = mask.length, columns = mask[0].length;
  const labels = mask.map(row => row.map(() => 0));
  const final = mask.map(row => row.map(() => 0));
  const parent = [0], numbers = new Map(), frames = [];
  function record(pass, row, column, message, links = [], operation = 'prepare') {
    frames.push({pass, row, column, message, links, operation,
      labels: labels.map(row => row.slice()), final: final.map(row => row.slice()),
      parent: parent.slice(), clusters: numbers.size});
  }
  record('Before scanning', -1, -1,
    'The occupied cells are marked with dots. In the first pass I assign provisional labels; in the second I replace them with final cluster numbers.');
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!mask[row][column]) {
        record('Pass 1: provisional labels', row, column, 'This cell is background. Its label remains 0.', [], 'background');
        continue;
      }
      const above = row > 0 ? labels[row - 1][column] : 0;
      const left = column > 0 ? labels[row][column - 1] : 0;
      const links = [];
      let message, operation;
      if (!above && !left) {
        operation = 'create';
        const label = parent.length;
        parent.push(label);
        labels[row][column] = label;
        message = `Neither processed neighbor is occupied. I create label ${label}, with parent[${label}] = ${label}.`;
      } else if (!above || !left) {
        operation = 'adopt';
        const label = above || left;
        const root = hkRoot(parent, label);
        labels[row][column] = root;
        links.push(label);
        message = `One processed neighbor is occupied. I follow label ${label} to root ${root} and assign ${root} to this cell.`;
      } else {
        const first = hkRoot(parent, above), second = hkRoot(parent, left);
        const root = Math.min(first, second), other = Math.max(first, second);
        operation = first === second ? 'same' : 'merge';
        links.push(above, left);
        parent[other] = root;
        labels[row][column] = root;
        message = first === second
          ? `Both neighbors already lead to root ${root}. They belong to the same cluster.`
          : `The two arms meet here. Their roots are ${first} and ${second}. I set parent[${other}] = ${root}; the earlier grid labels remain provisional.`;
      }
      record('Pass 1: provisional labels', row, column, message, links, operation);
    }
  }
  record('Between the two passes', -1, -1,
    'The first pass is complete. Linked labels now identify the same cluster, but the grid still contains the numbers assigned during the scan. The second pass resolves those labels.', [], 'between');
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const label = labels[row][column];
      if (!label) {
        record('Pass 2: final labels', row, column, 'Background remains 0.', [], 'finalBackground');
        continue;
      }
      const root = hkRoot(parent, label);
      if (!numbers.has(root)) numbers.set(root, numbers.size + 1);
      final[row][column] = numbers.get(root);
      record('Pass 2: final labels', row, column,
        `Provisional label ${label} leads to root ${root}. I replace it with final cluster number ${numbers.get(root)}.`, [label], 'resolve');
    }
  }
  record('Complete', -1, -1,
    `The two passes identify ${numbers.size} connected ${numbers.size === 1 ? 'cluster' : 'clusters'}. Only shared edges connect cells in this example; opposite boundaries are not joined.`, [], 'done');
  return frames;
}

if (typeof module !== 'undefined') module.exports = {hkRoot, hkWalkthrough};
