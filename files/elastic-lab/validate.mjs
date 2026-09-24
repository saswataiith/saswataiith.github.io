// SPDX-License-Identifier: GPL-3.0-or-later
// Run from the website root: node files/elastic-lab/validate.mjs
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  moduli,
  kernel,
  roots,
  projection,
  sample,
  minima,
} from "../../assets/js/elastic-lab/math.mjs";
import {
  solvePlate,
  homogeneousEnergy,
  pairCurve,
} from "../../assets/js/elastic-lab/solver.mjs";
import { referenceChecks } from "./reference-checks.mjs";
import { eshelbyChecks } from "./eshelby-checks.mjs";
const results = [];
function close(a, b, tol = 1e-10) {
  assert.ok(
    Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)),
    `${a} != ${b}`,
  );
}
function test(name, fn) {
  const details = fn();
  results.push({ name, passed: true, details });
  console.log("PASS", name);
}
const iso = { c11: 3, c12: 1, c44: 1 };
test("Isotropic dilatation kernel equals 8/3 for unit misfit", () => {
  for (const p of sample((a) => kernel(iso, [1, 1, 0], [1, 1, 0], a)))
    close(p.value, 8 / 3);
});
test("Habit roots at t=-1, t=0 and absence for positive t", () => {
  close(roots(-1)[0], Math.PI / 4);
  close(roots(-1)[1], (3 * Math.PI) / 4);
  close(roots(0)[0], Math.PI / 2);
  assert.equal(roots(0.1).length, 0);
  for (const t of [-1, -0.5, -0.001, 0])
    for (const angle of roots(t)) {
      close(projection(t, angle), 0);
      close(kernel(iso, [1, t, 0], [1, t, 0], angle + Math.PI / 2), 0);
    }
});
const c = moduli(2000, 1 / 3, 3),
  p = [0.01, 0.01, 0],
  q = [-0.01, -0.01, 0];
test("Sandeep Fig5.18 X2 reference values and minima", () => {
  close(c.c11, 7000);
  close(c.c12, 5000);
  close(c.c44, 3000);
  close(kernel(c, p, p, 0), 12 / 35);
  close(kernel(c, p, p, Math.PI / 4), 0.8);
  close(kernel(c, p, q, 0), -12 / 35);
  close(kernel(c, p, q, Math.PI / 4), -0.8);
  const self = minima(sample((a) => kernel(c, p, p, a))),
    cross = minima(sample((a) => kernel(c, p, q, a)));
  assert.deepEqual(
    self.global.map((v) => Math.round((v.angle * 180) / Math.PI)),
    [0, 90],
  );
  assert.deepEqual(
    cross.global.map((v) => Math.round((v.angle * 180) / Math.PI)),
    [45, 135],
  );
  return {
    c,
    selfAxes: 12 / 35,
    selfDiagonals: 0.8,
    crossAxes: -12 / 35,
    crossDiagonals: -0.8,
  };
});
test("X1 and X3, sign reversal, cross symmetry and cubic symmetry", () => {
  for (const angle of [0, 0.14, 0.73, 1.4]) {
    close(kernel(c, p, p, angle), kernel(c, p, p, angle + Math.PI / 2));
    close(kernel(c, p, q, angle), kernel(c, q, p, angle));
    close(kernel(c, p, q, angle), -kernel(c, p, p, angle));
    const b = [0.01265, 0.01265, 0],
      g = [-0.00632, -0.00632, 0];
    close(
      kernel(c, b, g, angle),
      ((-0.01265 * 0.00632) / 0.0001) * kernel(c, p, p, angle),
    );
    assert.ok(
      kernel(c, b, b, angle) * kernel(c, g, g, angle) -
        kernel(c, b, g, angle) ** 2 >
        -1e-10,
    );
  }
});
test("Homogeneous plate PCG versus independent Fourier energy", () => {
  let worst = 0;
  for (const n of [16, 32, 64])
    for (const angle of [0, 0.3, 0.7, Math.PI / 2]) {
      const eigen = [0.01, -0.005, 0.002],
        s = solvePlate({ n, angle, cm: c, cp: c, eigen }),
        ref = homogeneousEnergy(n, angle, c, eigen);
      worst = Math.max(worst, Math.abs(s.energy - ref) / ref);
      assert.ok(worst < 1e-10);
    }
  return { worstRelativeError: worst };
});
test("Soft and hard plate convergence, contrast tending to unity", () => {
  const eigen = [0.01, -0.005, 0],
    angle = 0.61,
    measure = [];
  for (const ratio of [0.5, 1, 2]) {
    const cp = Object.fromEntries(
      Object.entries(iso).map(([k, v]) => [k, ratio * v]),
    );
    const runs = [32, 64, 128].map((n) =>
      solvePlate({ n, angle, cm: iso, cp, eigen }),
    );
    const change = Math.abs(runs[2].energy - runs[1].energy) / runs[2].energy;
    assert.ok(change < 0.02);
    assert.ok(runs.every((r) => r.residual < 1e-7));
    measure.push({
      ratio,
      energies: runs.map((r) => r.energy),
      change64to128: change,
      iterations: runs.map((r) => r.iterations),
    });
  }
  const near = Object.fromEntries(
      Object.entries(iso).map(([k, v]) => [k, 1.000001 * v]),
    ),
    ref = homogeneousEnergy(64, angle, iso, eigen);
  assert.ok(
    Math.abs(
      solvePlate({ n: 64, angle, cm: iso, cp: near, eigen }).energy / ref - 1,
    ) < 2e-6,
  );
  return measure;
});
test("Angular convergence of finite plate at fixed spatial resolution", () => {
  const eigen = [0.01, -0.005, 0];
  const scans = [36, 72, 144].map((count) =>
    minima(sample((a) => homogeneousEnergy(64, a, iso, eigen), count)),
  );
  const values = scans.map((s) => s.lo);
  assert.ok(Math.abs(values[2] - values[1]) / values[2] < 0.01);
  return scans.map((s, i) => ({
    step: 180 / [36, 72, 144][i],
    minimum: s.lo,
    angles: s.global.map((p) => (p.angle * 180) / Math.PI),
  }));
});
test("Pair sign reversal, resolution convergence and cubic symmetry", () => {
  const a = pairCurve(c, p, q, { n: 32, count: 180 }),
    b = pairCurve(c, p, q, { n: 64, count: 180 }),
    same = pairCurve(c, p, p, { n: 64, count: 180 });
  const scale = Math.max(...b.map((p) => Math.abs(p.value)));
  let error = 0;
  for (let i = 0; i < b.length; i++) {
    close(b[i].value, -same[i].value);
    close(b[i].value, b[(i + 90) % 180].value);
    error = Math.max(error, Math.abs(a[i].value - b[i].value) / scale);
  }
  assert.ok(error < 0.01);
  return {
    maxRelative32to64: error,
    pairMinima: minima(b).global.map((p) => (p.angle * 180) / Math.PI),
  };
});
test("Inhomogeneous plate angular and spatial orientation convergence", () => {
  const cp = { c11: 1.5, c12: 0.5, c44: 0.5 };
  const eigen = [0.01, -0.005, 0];
  const scans = [
    { n: 32, count: 36 },
    { n: 64, count: 36 },
    { n: 128, count: 36 },
    { n: 64, count: 72 },
  ].map((config) => {
    const result = minima(
      sample(
        (angle) => solvePlate({ ...config, angle, cm: iso, cp, eigen }).energy,
        config.count,
      ),
    );
    return {
      ...config,
      minimum: result.lo,
      angles: result.global.map((point) => (point.angle * 180) / Math.PI),
    };
  });
  assert.ok(Math.abs(scans[2].minimum / scans[1].minimum - 1) < 0.02);
  assert.ok(Math.abs(scans[3].minimum / scans[1].minimum - 1) < 0.02);
  assert.ok(Math.abs(scans[2].angles[0] - scans[1].angles[0]) <= 5);
  return scans;
});
referenceChecks(test, close);
eshelbyChecks(test, close);
writeFileSync(
  "files/elastic-lab/validation-results.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      boundary: "periodic, fixed mean total strain zero",
      tests: results,
    },
    null,
    2,
  ),
);
