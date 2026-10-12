/* Copyright (c) 2026 Saswata Bhattacharyya.
   I give my code-use terms at /using-my-resources/. */
/* I show the saved grid state beside the corresponding Python operation. */
(() => {
  const panel = document.getElementById('hk-walkthrough');
  if (!panel) return;
  const patterns = {
    arms: [[1,0,1],[1,1,1],[0,0,0]],
    islands: [[1,1,0,1,1],[1,0,0,0,1],[0,0,1,0,0],[1,0,0,1,1]],
    ring: [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]]
  };
  const colors = ['#f4f6f5','#d8edfc','#ffead1','#dfdaf7','#d9efdc','#f6dfed'];
  const blocks = {
    prepare: {title:'The sequence of function calls', flow:'scan', active:[0], lines:[
      'labels, parent = scan_grid(mask)',
      'final, sizes = finish_labels(labels, parent)']},
    background: {title:'scan_grid: background cell',flow:'scan',active:[0,1],lines:[
      'if not mask[row, column]:', '    continue']},
    create: {title:'scan_grid: a new provisional label',flow:'scan',active:[1,2,3],lines:[
      'if above == 0 and left == 0:', '    new_label = len(parent)',
      '    parent.append(new_label)', '    labels[row, column] = new_label']},
    adopt: {title:'scan_grid calls find_label',flow:'root',active:[0,4,5],lines:[
      'labels[row, column] = find_label(parent, left)',
      '# I use above instead of left when left is 0.', '',
      'def find_label(parent, label):', '    while parent[label] != label:', '        label = parent[label]', '    return label']},
    merge: {title:'scan_grid calls merge_labels',flow:'merge',active:[0,3,4,5,6],lines:[
      'labels[row, column] = merge_labels(parent, above, left)', '',
      'def merge_labels(parent, first, second):',
      '    first_root = find_label(parent, first)',
      '    second_root = find_label(parent, second)',
      '    root = min(first_root, second_root)',
      '    parent[max(first_root, second_root)] = root',
      '    return root']},
    same: {title:'merge_labels: both roots are already the same',flow:'merge',active:[0,5,6],lines:[
      'labels[row, column] = merge_labels(parent, above, left)', '',
      'def merge_labels(parent, first, second):',
      '    first_root = find_label(parent, first)',
      '    second_root = find_label(parent, second)',
      '    root = min(first_root, second_root)',
      '    parent[max(first_root, second_root)] = root',
      '    return root']},
    between: {title:'The first pass is complete',flow:'finish',active:[1],lines:[
      'labels, parent = scan_grid(mask)',
      'final, sizes = finish_labels(labels, parent)']},
    finalBackground: {title:'finish_labels: background cell',flow:'finish',active:[0,1,2],lines:[
      'label = labels[row, column]', 'if label == 0:', '    continue']},
    resolve: {title:'finish_labels: resolve and renumber',flow:'finish',active:[1,2,3,4],lines:[
      'label = labels[row, column]', 'root = find_label(parent, label)',
      'if root not in numbers:', '    numbers[root] = len(numbers) + 1',
      'final[row, column] = numbers[root]']},
    done: {title:'Final labels and cluster sizes',flow:'finish',active:[0,1,2],lines:[
      'sizes = [int(np.count_nonzero(final == k))',
      '         for k in range(1, len(numbers) + 1)]',
      'return final, sizes']}
  };
  let mask, frames, position = 0, timer;
  const find = id => panel.querySelector('#hk-' + id);
  function pause() {
    clearInterval(timer); timer = undefined;
    find('play').textContent = 'Play';
  }
  function drawGrid(id, frame, isFinal) {
    const host = find(id);
    host.replaceChildren();
    host.style.gridTemplateColumns = `repeat(${mask[0].length}, minmax(32px, 1fr))`;
    mask.forEach((line, row) => line.forEach((occupied, column) => {
      const box = document.createElement('span');
      const label = (isFinal ? frame.final : frame.labels)[row][column];
      box.className = 'hk-cell';
      const coordinates = document.createElement('span');
      coordinates.className = 'hk-cell-coordinate';
      coordinates.textContent = `${row},${column}`;
      box.append(coordinates, String(label || (occupied ? '·' : 0)));
      box.style.background = occupied ? (label ? colors[1 + (label - 1) % (colors.length - 1)] : '#e7eff3') : colors[0];
      if (row === frame.row && column === frame.column) box.classList.add('hk-current');
      if (!isFinal && frame.pass.startsWith('Pass 1') &&
          ((row === frame.row - 1 && column === frame.column) ||
           (row === frame.row && column === frame.column - 1))) box.classList.add('hk-neighbor');
      box.setAttribute('aria-label', `Row ${row}, column ${column}: ${occupied ? 'occupied' : 'background'}, ${label ? 'label ' + label : 'not labeled'}`);
      host.append(box);
    }));
  }
  function drawArray(frame) {
    const host = find('parents'), list = document.createElement('div');
    list.className = 'hk-parent-array';
    frame.parent.forEach((value,label) => {
      const box = document.createElement('div');
      box.className = 'hk-parent-entry';
      if (frame.links.includes(label)) box.classList.add('hk-link-active');
      const index = document.createElement('span'), entry = document.createElement('strong');
      index.textContent = `[${label}]`; entry.textContent = value;
      box.append(index, entry); list.append(box);
    });
    host.append(list);
    find('parent-note').textContent = 'The index above each box is a label; the value inside is its next label. Entry 0 is reserved for background. A label pointing to itself is a root.';
  }
  function drawTree(frame) {
    const host = find('parents'), count = frame.parent.length - 1;
    if (!count) {host.textContent = 'No cluster labels yet.'; return;}
    const nodes = [];
    for (let label = 1; label <= count; label++) {
      let current = label, depth = 0;
      while (frame.parent[current] !== current) {current = frame.parent[current]; depth++;}
      nodes.push({label, root:current, depth});
    }
    nodes.sort((a,b) => a.root - b.root || a.label - b.label);
    const width = Math.max(320, count * 65), height = 90 + Math.max(...nodes.map(n => n.depth)) * 85;
    nodes.forEach((node,index) => {node.x = (index + .5) * width / count; node.y = 40 + node.depth * 85;});
    const namespace = 'http://www.w3.org/2000/svg';
    function element(tag, attrs, text) {
      const node = document.createElementNS(namespace, tag);
      Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key,value));
      if (text !== undefined) node.textContent = text;
      return node;
    }
    const svg = element('svg', {viewBox:`0 0 ${width} ${height}`,class:'hk-tree-svg',role:'img','aria-label':nodes.map(n => `Label ${n.label} points to ${frame.parent[n.label]}`).join('; ')});
    const defs = element('defs',{}), marker = element('marker',{id:'hk-arrow',markerWidth:8,markerHeight:8,refX:7,refY:4,orient:'auto'});
    marker.append(element('path',{d:'M0,0 L8,4 L0,8 Z',fill:'#527b94'}));defs.append(marker);svg.append(defs);
    for (const node of nodes) {
      if (!node.depth) continue;
      const parent = nodes.find(n => n.label === frame.parent[node.label]);
      svg.append(element('line',{x1:node.x,y1:node.y-22,x2:parent.x,y2:parent.y+25,stroke:'#527b94','stroke-width':2,'marker-end':'url(#hk-arrow)'}));
    }
    for (const node of nodes) {
      svg.append(element('circle',{cx:node.x,cy:node.y,r:22,fill:frame.links.includes(node.label)?'#fff0bd':'#deeffb',stroke:'#527b94','stroke-width':1.5}));
      svg.append(element('text',{x:node.x,y:node.y+6,'text-anchor':'middle','font-size':18,fill:'#173a52'},node.label));
      if (!node.depth) svg.append(element('text',{x:node.x,y:node.y+37,'text-anchor':'middle','font-size':12,fill:'#52635d'},'root'));
    }
    host.append(svg);
    find('parent-note').textContent = 'Arrows point from a label to its parent. Separate roots form separate trees. Roots point to themselves; I mark them as roots instead of drawing a loop. Background entry 0 is omitted.';
  }
  function render() {
    const frame = frames[position], block = blocks[frame.operation];
    const isFinal = frame.pass.startsWith('Pass 2') || frame.operation === 'done';
    find('phase').textContent = frame.pass;
    find('grid-title').textContent = `Grid state (${mask.length} × ${mask[0].length}): ${isFinal ? 'final labels' : 'provisional labels'}`;
    find('message').textContent = frame.message;
    find('operation').textContent = block.title;
    find('progress').textContent = `Step ${position + 1} / ${frames.length}`;
    find('previous').disabled = position === 0;
    find('next').disabled = position === frames.length - 1;
    find('play').disabled = position === frames.length - 1;
    drawGrid('grid',frame,isFinal);
    drawGrid('provisional',frame,false); drawGrid('final',frame,true);
    find('parents').replaceChildren();
    if (find('tree').checked) drawTree(frame); else drawArray(frame);
    find('code').replaceChildren();
    // I use the actual above-neighbor branch when the left neighbor is background.
    const lines = block.lines.slice();
    if (frame.operation === 'adopt' && (frame.column === 0 || !frame.labels[frame.row][frame.column - 1])) {
      lines[0] = 'labels[row, column] = find_label(parent, above)';
      lines[1] = '# I use left instead when above is 0.';
    }
    lines.forEach((text,index) => {
      const line = document.createElement('span');
      line.className = 'hk-code-line' + (block.active.includes(index) ? ' hk-code-active' : '');
      line.textContent = text || ' '; find('code').append(line);
    });
    panel.querySelectorAll('[data-hk-flow]').forEach(box => box.classList.toggle('hk-flow-active',box.dataset.hkFlow === block.flow));
    if (frame.row >= 0) {
      const above = frame.row > 0 ? frame.labels[frame.row - 1][frame.column] : 0;
      const left = frame.column > 0 ? frame.labels[frame.row][frame.column - 1] : 0;
      find('values').textContent = `row = ${frame.row}, column = ${frame.column}; ${isFinal ? 'provisional label = ' + frame.labels[frame.row][frame.column] : 'above = ' + above + ', left = ' + left}.`;
    } else if (frame.operation === 'done') {
      const sizes = Array.from({length:frame.clusters},(_,k) => frame.final.flat().filter(label => label === k + 1).length);
      find('values').textContent = `Cluster sizes: ${sizes.length ? sizes.join(', ') : 'none'} cells. Total occupied cells: ${sizes.reduce((a,b)=>a+b,0)}.`;
    } else find('values').textContent = '';
    if (position === frames.length - 1) pause();
  }
  function reset() {
    pause(); position = 0; mask = patterns[find('pattern').value];
    frames = hkWalkthrough(mask); render();
  }
  find('pattern').addEventListener('change', reset);
  find('tree').addEventListener('change', render);
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
