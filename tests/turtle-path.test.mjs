import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { explore, trace } from "../assets/js/turtle-path.mjs";
const data = JSON.parse(
  readFileSync(
    new URL(
      "../assets/examples/bicontinuity/turtle-field.json",
      import.meta.url,
    ),
  ),
);
test("paths remain in their phase and use only edge-sharing neighbors", () => {
  for (const phase of [0, 1])
    for (const periodic of [true, false]) {
      const start = data.mask.indexOf(phase),
        result = explore(data.mask, data.size, phase, start, periodic),
        path = trace(result.parent, result.farthest);
      assert.ok(path.length > 1);
      for (let iterator = 0; iterator < path.length; iterator++) {
        assert.equal(data.mask[path[iterator]], phase);
        if (iterator === 0) continue;
        const a = path[iterator - 1],
          b = path[iterator];
        let dx = Math.abs((a % data.size) - (b % data.size)),
          dy = Math.abs(Math.floor(a / data.size) - Math.floor(b / data.size));
        if (periodic) {
          dx = Math.min(dx, data.size - dx);
          dy = Math.min(dy, data.size - dy);
        }
        assert.equal(dx + dy, 1);
      }
    }
});
test("periodic edges connect correctly without inventing connections", () => {
  const mask = [1, 0, 1, 0, 0, 0, 0, 0, 0];
  assert.equal(explore(mask, 3, 1, 0, false).count, 1);
  const joined = explore(mask, 3, 1, 0, true);
  assert.deepEqual(trace(joined.parent, 2), [0, 2]);
  assert.deepEqual(trace(joined.parent, 1), []);
});
test("actual field components agree with the existing connectivity report", () => {
  const report = JSON.parse(
    readFileSync(
      new URL(
        "../assets/examples/bicontinuity/connectivity.json",
        import.meta.url,
      ),
    ),
  )["0.5"].thresholds["0.5"];
  for (const phase of [0, 1]) {
    const visited = new Set();
    let components = 0,
      largest = 0;
    for (let start = 0; start < data.mask.length; start++) {
      if (data.mask[start] !== phase || visited.has(start)) continue;
      const result = explore(data.mask, data.size, phase, start, true);
      components++;
      largest = Math.max(largest, result.count);
      for (let index = 0; index < result.parent.length; index++)
        if (result.parent[index] >= 0) visited.add(index);
    }
    const reference = report[phase ? "high" : "low"];
    assert.equal(components, reference.components);
    assert.ok(
      Math.abs(largest / visited.size - reference.largest_fraction_of_phase) <
        1e-12,
    );
  }
});
