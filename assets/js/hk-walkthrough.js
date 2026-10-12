/* Copyright (c) 2026 Saswata Bhattacharyya.
   I give my code-use terms at /using-my-resources/. */
/* I display saved algorithm states; the animation does not change the calculation. */
(() => {
  const panel = document.getElementById('hk-walkthrough');
  if (!panel) return;
  const patterns = {
    arms: [[1,0,1],[1,1,1],[0,0,0]],
    islands: [[1,1,0,1,1],[1,0,0,0,1],[0,0,1,0,0],[1,0,0,1,1]],
    ring: [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]]
  };
  const colors = ['#f3f5f4','#bbe0cd','#f8d4a4','#c9d8f2','#e0c6e5','#f0bdbb'];
  let mask, frames, position = 0, timer;
  const find = id => panel.querySelector('#hk-' + id);
  function pause() {
    clearInterval(timer); timer = undefined;
    find('play').textContent = 'Play';
  }
  function cellText(frame, row, column, isFinal) {
    const label = (isFinal ? frame.final : frame.labels)[row][column];
    if (label) return String(label);
    return mask[row][column] ? '·' : '0';
  }
  function drawGrid(id, frame, isFinal) {
    const host = find(id);
    host.replaceChildren();
    host.style.gridTemplateColumns = `repeat(${mask[0].length}, minmax(35px, 1fr))`;
    mask.forEach((line, row) => line.forEach((occupied, column) => {
      const box = document.createElement('span');
      const label = (isFinal ? frame.final : frame.labels)[row][column];
      box.className = 'hk-cell';
      box.textContent = cellText(frame, row, column, isFinal);
      box.style.background = occupied ? (label ? colors[1 + (label - 1) % (colors.length - 1)] : '#e4eee9') : colors[0];
      if (row === frame.row && column === frame.column) box.classList.add('hk-current');
      if (!isFinal && frame.pass.startsWith('Pass 1') &&
          ((row === frame.row - 1 && column === frame.column) ||
           (row === frame.row && column === frame.column - 1))) box.classList.add('hk-neighbor');
      box.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}: ${occupied ? 'occupied' : 'background'}, ${label ? 'label ' + label : 'not labeled'}`);
      host.append(box);
    }));
  }
  function render() {
    const frame = frames[position];
    find('phase').textContent = frame.pass;
    find('message').textContent = frame.message;
    find('progress').textContent = `Display ${position + 1} of ${frames.length}`;
    find('previous').disabled = position === 0;
    find('next').disabled = position === frames.length - 1;
    find('play').disabled = position === frames.length - 1;
    drawGrid('provisional', frame, false);
    drawGrid('final', frame, true);
    find('parents').replaceChildren();
    for (let label = 1; label < frame.parent.length; label++) {
      const line = document.createElement('p');
      let current = label;
      const trail = [current];
      while (frame.parent[current] !== current) {
        current = frame.parent[current]; trail.push(current);
      }
      line.textContent = `parent[${label}] = ${frame.parent[label]}: ${trail.join(' → ')} (root ${current})`;
      if (frame.links.includes(label)) line.className = 'hk-link-active';
      find('parents').append(line);
    }
    if (frame.parent.length === 1) find('parents').textContent = 'No labels have been assigned yet.';
    if (position === frames.length - 1) pause();
  }
  function reset() {
    pause(); position = 0; mask = patterns[find('pattern').value];
    frames = hkWalkthrough(mask); render();
  }
  find('pattern').addEventListener('change', reset);
  find('reset').addEventListener('click', reset);
  find('previous').addEventListener('click', () => {pause(); position--; render();});
  find('next').addEventListener('click', () => {pause(); position++; render();});
  find('play').addEventListener('click', () => {
    if (timer) {pause(); return;}
    find('play').textContent = 'Pause';
    timer = setInterval(() => {position++; render();}, 950);
  });
  reset();
})();
