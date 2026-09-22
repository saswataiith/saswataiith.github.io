// SPDX-License-Identifier: GPL-3.0-or-later
// Independent checks of the indicial equations, not transcriptions of matrix shorthand.
import assert from "node:assert/strict";
import {
  kernel,
  mohrState,
  contract,
  stress,
} from "../../assets/js/elastic-lab/math.mjs";
import {
  derivative,
  inverseAcoustic,
  spectrum,
} from "../../assets/js/elastic-lab/fft.mjs";
import { solvePlate, plate } from "../../assets/js/elastic-lab/solver.mjs";

// C_ijkl for the in-plane cubic sub-block. All four indices remain explicit.
function C(c, i, j, k, l) {
  if (i === j && k === l) return i === k ? c.c11 : c.c12;
  if (i !== j && k !== l) return c.c44;
  return 0;
}
function component(e, i, j) {
  return i === j ? e[i] : e[2];
}
function fullKernel(c, p, q, angle) {
  const n = [Math.cos(angle), Math.sin(angle)],
    Q = [
      [0, 0],
      [0, 0],
    ],
    a = [0, 0],
    b = [0, 0];
  let base = 0;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++)
      for (let k = 0; k < 2; k++)
        for (let l = 0; l < 2; l++) {
          base += component(p, i, j) * C(c, i, j, k, l) * component(q, k, l);
          Q[i][k] += C(c, i, j, k, l) * n[j] * n[l];
          a[i] += C(c, i, j, k, l) * component(p, k, l) * n[j];
          b[i] += C(c, i, j, k, l) * component(q, k, l) * n[j];
        }
  const det = Q[0][0] * Q[1][1] - Q[0][1] * Q[1][0];
  return (
    base -
    (a[0] * (Q[1][1] * b[0] - Q[0][1] * b[1]) +
      a[1] * (Q[0][0] * b[1] - Q[1][0] * b[0])) /
      det
  );
}
function strain(u, n) {
  const size = n * n,
    ux = u.slice(0, size),
    uy = u.slice(size);
  const xx = derivative(ux, n, 0),
    yy = derivative(uy, n, 1);
  const uxY = derivative(ux, n, 1),
    uyX = derivative(uy, n, 0);
  return [xx, yy, Float64Array.from(uxY, (v, i) => (v + uyX[i]) / 2)];
}
function minusDivergence(s, n) {
  const xxX = derivative(s[0], n, 0),
    xyY = derivative(s[2], n, 1);
  const xyX = derivative(s[2], n, 0),
    yyY = derivative(s[1], n, 1);
  const out = new Float64Array(2 * n * n);
  for (let i = 0; i < n * n; i++) {
    out[i] = -xxX[i] - xyY[i];
    out[n * n + i] = -xyX[i] - yyY[i];
  }
  return out;
}
// CICP Eq2.11: Cref:gradgrad u = div[C epsilon0 - (C-Cref):symgrad u].
// Midpoint reference permits this simple fixed-point iteration at these contrasts.
function spectralReference(n, h, cm, cp, eigen) {
  const ref = Object.fromEntries(
    Object.keys(cm).map((key) => [key, (cm[key] + cp[key]) / 2]),
  );
  let u = new Float64Array(2 * n * n),
    change = 1,
    iteration = 0;
  while (change > 1e-11 && iteration < 500) {
    const e = strain(u, n),
      source = [
        new Float64Array(n * n),
        new Float64Array(n * n),
        new Float64Array(n * n),
      ];
    for (let site = 0; site < h.length; site++) {
      const c = Object.fromEntries(
        Object.keys(cm).map((key) => [
          key,
          cm[key] + h[site] * (cp[key] - cm[key]),
        ]),
      );
      const delta = Object.fromEntries(
        Object.keys(c).map((key) => [key, c[key] - ref[key]]),
      );
      const mismatch = stress(
          c,
          eigen.map((v) => h[site] * v),
        ),
        perturbation = stress(
          delta,
          e.map((v) => v[site]),
        );
      for (let component = 0; component < 3; component++)
        source[component][site] = mismatch[component] - perturbation[component];
    }
    const next = inverseAcoustic(minusDivergence(source, n), n, ref);
    let difference = 0,
      norm = 0;
    for (let i = 0; i < u.length; i++) {
      difference += (next[i] - u[i]) ** 2;
      norm += next[i] ** 2;
    }
    change = Math.sqrt(difference / Math.max(norm, 1e-60));
    u = next;
    iteration++;
  }
  assert.ok(change <= 1e-11, "Spectral reference failed to converge");
  return { u, iteration };
}
export function referenceChecks(test, close) {
  test("Appendix A kernel: full four-index contraction including shear", () => {
    const c = { c11: 7, c12: 2, c44: 3 },
      p = [0.02, -0.006, 0.003],
      q = [-0.013, 0.004, -0.002];
    let worst = 0;
    for (let iterator = 0; iterator < 37; iterator++) {
      const a = (iterator * Math.PI) / 37,
        expected = fullKernel(c, p, q, a),
        actual = kernel(c, p, q, a);
      worst = Math.max(worst, Math.abs(actual - expected));
      close(actual, expected, 1e-13);
    }
    return { maxAbsoluteError: worst };
  });
  test("Mohr strain circle: tensor rotation, radius and zero-extension intersections", () => {
    for (const t of [-1, -0.5, 0, 0.5, 1])
      for (const angle of [0, 0.2, Math.PI / 4, Math.PI / 2]) {
        const m = mohrState(t, angle);
        close((m.normal - m.centre) ** 2 + m.shear ** 2, m.radius ** 2);
        close(m.normal + m.transverse, 1 + t);
        close(m.normal * m.transverse - m.shear ** 2, t);
      }
    close(mohrState(-1, Math.PI / 4).normal, 0);
    close(mohrState(0, Math.PI / 2).normal, 0);
  });
  test("CICP Fourier Green scaling: displacement decreases as inverse wave number", () => {
    const n = 32,
      c = { c11: 3, c12: 1, c44: 1 },
      amplitude = 0.01,
      values = [];
    for (const mode of [1, 2, 3]) {
      const h = Float64Array.from(
        { length: n * n },
        (v, i) => 0.5 + 0.1 * Math.cos((2 * Math.PI * mode * (i % n)) / n),
      );
      const result = solvePlate({
        n,
        cm: c,
        cp: c,
        eigen: [amplitude, 0, 0],
        profile: h,
        returnFields: true,
      });
      let error = 0;
      for (let i = 0; i < n * n; i++) {
        const exact =
          (0.1 * amplitude * Math.sin((2 * Math.PI * mode * (i % n)) / n)) /
          (2 * Math.PI * mode);
        error = Math.max(error, Math.abs(result.displacement[i] - exact));
      }
      assert.ok(error < 1e-12);
      values.push({ mode, maxDisplacementError: error });
    }
    return values;
  });
  test("CICP spectral iteration versus PCG, soft/hard anisotropic phases", () => {
    const n = 32,
      cm = { c11: 3, c12: 1, c44: 1 },
      eigen = [0.01, -0.005, 0.002],
      h = plate(n, 0.61),
      checks = [];
    for (const cp of [
      { c11: 1.8, c12: 0.4, c44: 0.8 },
      { c11: 5, c12: 1.4, c44: 2.3 },
    ]) {
      const a = spectralReference(n, h, cm, cp, eigen),
        b = solvePlate({
          n,
          cm,
          cp,
          eigen,
          profile: h,
          returnFields: true,
          tolerance: 1e-10,
        });
      let error = 0,
        norm = 0;
      for (let i = 0; i < a.u.length; i++) {
        error += (a.u[i] - b.displacement[i]) ** 2;
        norm += b.displacement[i] ** 2;
      }
      const relativeError = Math.sqrt(error / norm);
      assert.ok(relativeError < 1e-8);
      checks.push({
        cp,
        relativeDisplacementError: relativeError,
        referenceIterations: a.iteration,
        pcgResidual: b.residual,
      });
    }
    return checks;
  });
  test("Appendix B and Tushar driving force: re-equilibrated energy finite difference", () => {
    const n = 16,
      cm = { c11: 3, c12: 1, c44: 1 },
      eigen = [0.01, -0.005, 0.002],
      h = Float64Array.from(
        { length: n * n },
        (v, i) => 0.45 + 0.12 * Math.cos((2 * Math.PI * (i % n)) / n),
      );
    const direction = Float64Array.from(
      h,
      (v, i) =>
        0.3 +
        0.2 * Math.cos((2 * Math.PI * (i % n)) / n) +
        0.13 * Math.sin((2 * Math.PI * Math.floor(i / n)) / n),
    );
    const results = [];
    for (const cp of [cm, { c11: 5, c12: 1.4, c44: 2 }]) {
      const parameters = { n, cm, cp, eigen, tolerance: 1e-11 };
      const base = solvePlate({
        ...parameters,
        profile: h,
        returnFields: true,
      });
      const delta = Object.fromEntries(
        Object.keys(cm).map((key) => [key, cp[key] - cm[key]]),
      );
      let predicted = 0;
      for (let site = 0; site < h.length; site++) {
        const e = base.elastic.map((field) => field[site]),
          sigma = base.sigma.map((field) => field[site]);
        const g = 0.5 * contract(e, stress(delta, e)) - contract(sigma, eigen);
        if (cp === cm) {
          // Appendix B nonzero Fourier mode plus the deliberately clamped mean mode.
          const expected =
            contract(eigen, stress(cm, eigen)) * 0.45 +
            kernel(cm, eigen, eigen, 0) *
              0.12 *
              Math.cos((2 * Math.PI * (site % n)) / n);
          close(g, expected, 1e-12);
        }
        predicted += (g * direction[site]) / h.length;
      }
      const step = 1e-4;
      const energy = (sign) =>
        solvePlate({
          ...parameters,
          profile: Float64Array.from(
            h,
            (v, i) => v + sign * step * direction[i],
          ),
        }).energy;
      const measured = (energy(1) - energy(-1)) / (2 * step),
        relativeError = Math.abs(measured - predicted) / Math.abs(predicted);
      assert.ok(relativeError < 1e-6);
      results.push({
        homogeneous: cp === cm,
        predicted,
        finiteDifference: measured,
        relativeError,
      });
    }
    return results;
  });
}
