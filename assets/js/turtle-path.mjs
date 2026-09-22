// Four-neighbor paths on the actual thresholded composition grid.
export function explore(mask, size, phase, start, periodic) {
  const parent = new Int32Array(mask.length).fill(-1);
  if (mask[start] !== phase) return { parent, farthest: start, count: 0 };
  const queue = [start];
  parent[start] = start;
  for (let iterator = 0; iterator < queue.length; iterator++) {
    const point = queue[iterator],
      x = point % size,
      y = Math.floor(point / size);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      let nx = x + dx,
        ny = y + dy;
      if (!periodic && (nx < 0 || ny < 0 || nx >= size || ny >= size)) continue;
      nx = (nx + size) % size;
      ny = (ny + size) % size;
      const next = ny * size + nx;
      if (mask[next] === phase && parent[next] === -1) {
        parent[next] = point;
        queue.push(next);
      }
    }
  }
  return { parent, farthest: queue[queue.length - 1], count: queue.length };
}
export function trace(parent, target) {
  if (parent[target] === -1) return [];
  const path = [target];
  while (parent[path[path.length - 1]] !== path[path.length - 1])
    path.push(parent[path[path.length - 1]]);
  return path.reverse();
}

// For an unreachable destination, stop at the nearest reachable phase boundary.
export function trapPlan(mask, size, phase, search, target, periodic) {
  if (search.parent[target] !== -1 || mask[target] !== phase) return null;
  const tx = target % size,
    ty = Math.floor(target / size);
  let best = null,
    distance = Infinity;
  for (let pixel = 0; pixel < mask.length; pixel++) {
    if (search.parent[pixel] === -1) continue;
    const x = pixel % size,
      y = Math.floor(pixel / size),
      blocked = [];
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (!periodic && (nx < 0 || ny < 0 || nx >= size || ny >= size))
        blocked.push([dx, dy]);
      else if (
        mask[((ny + size) % size) * size + ((nx + size) % size)] !== phase
      )
        blocked.push([dx, dy]);
    }
    let dx = Math.abs(x - tx),
      dy = Math.abs(y - ty);
    if (periodic) {
      dx = Math.min(dx, size - dx);
      dy = Math.min(dy, size - dy);
    }
    if (blocked.length && dx * dx + dy * dy < distance) {
      distance = dx * dx + dy * dy;
      best = { path: trace(search.parent, pixel), blocked, target };
    }
  }
  return best;
}
export const HELP_AFTER_ATTEMPTS = 7;

// Distance from the other phase (or a closed outer edge), in pixel steps.
export function phaseClearance(mask, size, phase, periodic) {
  const distance = new Float64Array(mask.length).fill(Infinity),
    queue = [];
  for (let point = 0; point < mask.length; point++) {
    const x = point % size,
      y = Math.floor(point / size);
    if (mask[point] !== phase) {
      distance[point] = 0;
      queue.push(point);
    } else if (
      !periodic &&
      (x === 0 || y === 0 || x === size - 1 || y === size - 1)
    ) {
      distance[point] = 1;
      queue.push(point);
    }
  }
  for (let iterator = 0; iterator < queue.length; iterator++) {
    const point = queue[iterator],
      x = point % size,
      y = Math.floor(point / size);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      let nx = x + dx,
        ny = y + dy;
      if (!periodic && (nx < 0 || ny < 0 || nx >= size || ny >= size)) continue;
      nx = (nx + size) % size;
      ny = (ny + size) % size;
      const next = ny * size + nx;
      if (distance[next] > distance[point] + 1) {
        distance[next] = distance[point] + 1;
        queue.push(next);
      }
    }
  }
  return distance;
}

// Move an endpoint toward the local channel centre, without crossing a phase.
export function centrePoint(mask, size, phase, start, periodic, clearance) {
  const queue = [[start, 0]],
    seen = new Set([start]);
  let best = start,
    bestScore = -Infinity;
  for (let iterator = 0; iterator < queue.length; iterator++) {
    const [point, steps] = queue[iterator];
    const score = clearance[point] - 0.08 * steps;
    if (score > bestScore) {
      bestScore = score;
      best = point;
    }
    if (steps >= 12) continue;
    const x = point % size,
      y = Math.floor(point / size);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      let nx = x + dx,
        ny = y + dy;
      if (!periodic && (nx < 0 || ny < 0 || nx >= size || ny >= size)) continue;
      nx = (nx + size) % size;
      ny = (ny + size) % size;
      const next = ny * size + nx;
      if (mask[next] === phase && !seen.has(next)) {
        seen.add(next);
        queue.push([next, steps + 1]);
      }
    }
  }
  return best;
}

// Dijkstra routing: close-to-interface steps cost more than central steps.
// This changes route preference, never which pixels are connected.
export function exploreCentred(mask, size, phase, start, periodic, clearance) {
  const parent = new Int32Array(mask.length).fill(-1),
    cost = new Float64Array(mask.length).fill(Infinity);
  const heap = [];
  function push(item) {
    let index = heap.length;
    heap.push(item);
    while (index > 0) {
      const up = (index - 1) >> 1;
      if (heap[up][0] <= item[0]) break;
      heap[index] = heap[up];
      index = up;
    }
    heap[index] = item;
  }
  function pop() {
    const first = heap[0],
      last = heap.pop();
    if (heap.length) {
      let index = 0;
      while (index * 2 + 1 < heap.length) {
        let child = index * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0])
          child++;
        if (heap[child][0] >= last[0]) break;
        heap[index] = heap[child];
        index = child;
      }
      heap[index] = last;
    }
    return first;
  }
  if (mask[start] !== phase) return { parent, count: 0, farthest: start };
  parent[start] = start;
  cost[start] = 0;
  push([0, start]);
  let count = 0,
    farthest = start;
  while (heap.length) {
    const [value, point] = pop();
    if (value !== cost[point]) continue;
    count++;
    farthest = point;
    const x = point % size,
      y = Math.floor(point / size);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      let nx = x + dx,
        ny = y + dy;
      if (!periodic && (nx < 0 || ny < 0 || nx >= size || ny >= size)) continue;
      nx = (nx + size) % size;
      ny = (ny + size) % size;
      const next = ny * size + nx;
      if (mask[next] !== phase) continue;
      const gap = (clearance[point] + clearance[next]) / 2;
      const proposal = value + 1 + 200 / gap ** 3;
      if (proposal < cost[next]) {
        cost[next] = proposal;
        parent[next] = point;
        push([proposal, next]);
      }
    }
  }
  return { parent, count, farthest };
}
