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

test("traps require a disconnected destination and stop at a blocked boundary", async () => {
  const { trapPlan, HELP_AFTER_ATTEMPTS } =
    await import("../assets/js/turtle-path.mjs");
  const mask = [1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  const search = explore(mask, 4, 1, 0, false);
  assert.equal(trapPlan(mask, 4, 1, search, 1, false), null);
  const plan = trapPlan(mask, 4, 1, search, 3, false);
  assert.ok(plan.path.length > 0);
  assert.equal(plan.target, 3);
  const end = plan.path.at(-1),
    x = end % 4,
    y = Math.floor(end / 4);
  for (const [dx, dy] of plan.blocked) {
    const nx = x + dx,
      ny = y + dy;
    assert.ok(
      nx < 0 || ny < 0 || nx >= 4 || ny >= 4 || mask[ny * 4 + nx] !== 1,
    );
  }
  assert.equal(HELP_AFTER_ATTEMPTS, 7);
});
