// SPDX-License-Identifier: GPL-3.0-or-later
import { derivative, inverseAcoustic, spectrum } from "./fft.mjs";
import { kernel, contract, stress, validate } from "./math.mjs";
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
export function plate(n, angle) {
  // Same area at every angle: a smooth ellipse with long/short semiaxes .22/.045.
  const h = new Float64Array(n * n),
    c = Math.cos(angle),
    s = Math.sin(angle),
    r = new Float64Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5,
        dy = (y + 0.5) / n - 0.5;
      r[y * n + x] = Math.sqrt(
        ((dx * c + dy * s) / 0.22) ** 2 + ((-dx * s + dy * c) / 0.045) ** 2,
      );
    }
  let low = 0.5,
    high = 1.5;
  const target = Math.PI * 0.22 * 0.045;
  for (let iterator = 0; iterator < 45; iterator++) {
    const level = (low + high) / 2;
    let area = 0;
    for (let i = 0; i < h.length; i++) {
      h[i] = 0.5 * (1 - Math.tanh((r[i] - level) / 0.18));
      area += h[i] / h.length;
    }
    if (area < target) low = level;
    else high = level;
  }
  return h;
}
// D u: compatible total strain from a periodic displacement.
function strains(u, n) {
  const size = n * n,
    ux = u.slice(0, size),
    uy = u.slice(size),
    xx = derivative(ux, n, 0),
    yy = derivative(uy, n, 1),
    xy = derivative(ux, n, 1),
    yx = derivative(uy, n, 0);
  for (let i = 0; i < size; i++) xy[i] = (xy[i] + yx[i]) / 2;
  return [xx, yy, xy];
}
// D* sigma = -div(sigma), the force imbalance in the energy gradient.
function adjoint(s, n) {
  const a = derivative(s[0], n, 0),
    b = derivative(s[2], n, 1),
    c = derivative(s[2], n, 0),
    d = derivative(s[1], n, 1),
    out = new Float64Array(2 * n * n);
  for (let i = 0; i < n * n; i++) {
    out[i] = -a[i] - b[i];
    out[i + n * n] = -c[i] - d[i];
  }
  return out;
}
// Evaluate C(x):epsilon at each grid point, including the tensor-shear factor.
function localStress(e, h, cm, cp) {
  const out = e.map((a) => new Float64Array(a.length));
  for (let i = 0; i < h.length; i++) {
    const c11 = cm.c11 + (cp.c11 - cm.c11) * h[i],
      c12 = cm.c12 + (cp.c12 - cm.c12) * h[i],
      c44 = cm.c44 + (cp.c44 - cm.c44) * h[i];
    out[0][i] = c11 * e[0][i] + c12 * e[1][i];
    out[1][i] = c12 * e[0][i] + c11 * e[1][i];
    out[2][i] = 2 * c44 * e[2][i];
  }
  return out;
}
// Minimize 1/2 <(D u - epsilon0):C(x):(D u - epsilon0)>.
// The periodic displacement fixes the mean total strain to zero.
export function solvePlate({
  n = 32,
  angle = 0,
  cm,
  cp,
  eigen,
  tolerance = 1e-7,
  maxIterations = 300,
}) {
  validate(cm);
  validate(cp);
  const h = plate(n, angle),
    e0 = eigen.map((e) => Float64Array.from(h, (v) => v * e));
  // Equilibrium: (D* C D)u = D* C epsilon0. Never replace C(x) by its mean.
  const b = adjoint(localStress(e0, h, cm, cp), n),
    u = new Float64Array(b.length),
    r = Float64Array.from(b),
    bnorm = Math.sqrt(dot(b, b));
  // Matrix elasticity supplies a preconditioner only; PCG retains full C(x).
  let z = inverseAcoustic(r, n, cm),
    p = Float64Array.from(z),
    rz = dot(r, z),
    residual = bnorm ? 1 : 0,
    iterations = 0;
  while (residual > tolerance && iterations < maxIterations) {
    const ap = adjoint(localStress(strains(p, n), h, cm, cp), n),
      denom = dot(p, ap);
    if (!(denom > 0))
      throw Error("Non-positive solver direction. Check moduli.");
    const alpha = rz / denom;
    for (let i = 0; i < u.length; i++) {
      u[i] += alpha * p[i];
      r[i] -= alpha * ap[i];
    }
    iterations++;
    residual = Math.sqrt(dot(r, r)) / bnorm;
    if (residual <= tolerance) break;
    z = inverseAcoustic(r, n, cm);
    const next = dot(r, z),
      beta = next / rz;
    for (let i = 0; i < p.length; i++) p[i] = z[i] + beta * p[i];
    rz = next;
  }
  if (residual > tolerance)
    throw Error(
      `Elastic solve did not converge: relative residual ${residual.toExponential(2)}`,
    );
  // The energy uses elastic strain, not total strain or eigenstrain alone.
  const elastic = strains(u, n);
  for (let component = 0; component < 3; component++)
    for (let i = 0; i < h.length; i++)
      elastic[component][i] -= e0[component][i];
  const sigma = localStress(elastic, h, cm, cp);
  let energy = 0;
  for (let i = 0; i < h.length; i++)
    energy +=
      (0.5 *
        (elastic[0][i] * sigma[0][i] +
          elastic[1][i] * sigma[1][i] +
          2 * elastic[2][i] * sigma[2][i])) /
      h.length;
  // Compare with the same microstructure held at u = 0, before relaxation.
  const eigenstress = localStress(e0, h, cm, cp);
  let unrelaxedEnergy = 0;
  for (let i = 0; i < h.length; i++)
    unrelaxedEnergy +=
      (0.5 *
        (e0[0][i] * eigenstress[0][i] +
          e0[1][i] * eigenstress[1][i] +
          2 * e0[2][i] * eigenstress[2][i])) /
      h.length;
  return {
    unrelaxedEnergy,
    energy,
    residual,
    iterations,
    area: h.reduce((a, b) => a + b, 0) / h.length,
  };
}
// Independent Fourier-mode elimination provides the homogeneous regression test.
export function homogeneousEnergy(n, angle, c, eigen) {
  const h = plate(n, angle),
    f = spectrum(h, n),
    base = contract(eigen, stress(c, eigen));
  let energy = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const kx = x === n / 2 ? 0 : x < n / 2 ? x : x - n,
        ky = y === n / 2 ? 0 : y < n / 2 ? y : y - n,
        i = y * n + x,
        B = kx || ky ? kernel(c, eigen, eigen, Math.atan2(ky, kx)) : base;
      energy += (0.5 * B * (f.real[i] ** 2 + f.imag[i] ** 2)) / n ** 4;
    }
  return energy;
}
export function pairCurve(
  c,
  beta,
  gamma,
  { n = 64, distance = 0.32, radius = 0.045, count = 180 } = {},
) {
  // Periodic Gaussian profiles. Translation in Fourier space is exact for the sampled profile.
  const h = new Float64Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5,
        dy = (y + 0.5) / n - 0.5;
      h[y * n + x] = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
    }
  const f = spectrum(h, n),
    modes = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const kx = x < n / 2 ? x : x - n,
        ky = y < n / 2 ? y : y - n,
        i = y * n + x,
        B =
          kx || ky
            ? kernel(c, beta, gamma, Math.atan2(ky, kx))
            : contract(beta, stress(c, gamma));
      modes.push([
        2 * Math.PI * kx * distance,
        2 * Math.PI * ky * distance,
        (B * (f.real[i] ** 2 + f.imag[i] ** 2)) / n ** 4,
      ]);
    }
  return Array.from({ length: count }, (value, iterator) => {
    const angle = (iterator * Math.PI) / count;
    let energy = 0;
    for (const [kx, ky, weight] of modes)
      energy += weight * Math.cos(kx * Math.cos(angle) + ky * Math.sin(angle));
    return { angle, value: energy };
  });
}
