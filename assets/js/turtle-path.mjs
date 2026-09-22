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
