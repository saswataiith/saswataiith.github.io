// SPDX-License-Identifier: GPL-3.0-or-later
// Eshelby inclusion in a homogeneous 2-D (plane-strain) cubic matrix.
// Tensors are plain 2x2 arrays [[xx, xy], [yx, yy]]; shear is tensor shear.
import { spectrum, transform } from "./fft.mjs?v=20260924c";

export function stiffness4(c) {
  return (i, j, k, l) => {
    if (i === j && k === l) return i === k ? c.c11 : c.c12;
    if (i !== j && k !== l && ((i === k && j === l) || (i === l && j === k)))
      return c.c44;
    return 0;
  };
}
export function contract4(c, e) {
  const C = stiffness4(c),
    s = [
      [0, 0],
      [0, 0],
    ];
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++)
      for (let k = 0; k < 2; k++)
        for (let l = 0; l < 2; l++) s[i][j] += C(i, j, k, l) * e[k][l];
  return s;
}
export const ddot = (a, b) =>
  a[0][0] * b[0][0] + a[0][1] * b[0][1] + a[1][0] * b[1][0] + a[1][1] * b[1][1];
export const sub = (a, b) => a.map((r, i) => r.map((v, j) => v - b[i][j]));
export const symOuter = (g, n) => [
  [g[0] * n[0], 0.5 * (g[0] * n[1] + g[1] * n[0])],
  [0.5 * (g[0] * n[1] + g[1] * n[0]), g[1] * n[1]],
];
export function acoustic(c, n) {
  const C = stiffness4(c),
    Q = [
      [0, 0],
      [0, 0],
    ];
  for (let i = 0; i < 2; i++)
    for (let k = 0; k < 2; k++)
      for (let j = 0; j < 2; j++)
        for (let l = 0; l < 2; l++) Q[i][k] += C(i, j, k, l) * n[j] * n[l];
  return Q;
}
// Jump vector for normal n: Q(n) g = sigma0 n. It is also the thin-plate b.
export function jumpVector(c, sigma0, n) {
  const Q = acoustic(c, n),
    t = [
      sigma0[0][0] * n[0] + sigma0[0][1] * n[1],
      sigma0[1][0] * n[0] + sigma0[1][1] * n[1],
    ],
    det = Q[0][0] * Q[1][1] - Q[0][1] * Q[1][0];
  return [
    (Q[1][1] * t[0] - Q[0][1] * t[1]) / det,
    (Q[0][0] * t[1] - Q[1][0] * t[0]) / det,
  ];
}
// Thin-plate kernel B(m) = e0:C:e0 - (sigma0 m).Q^-1(sigma0 m).
export function kernelB(c, e0, m) {
  const s0 = contract4(c, e0),
    g = jumpVector(c, s0, m),
    t = [s0[0][0] * m[0] + s0[0][1] * m[1], s0[1][0] * m[0] + s0[1][1] * m[1]];
  return ddot(e0, s0) - (t[0] * g[0] + t[1] * g[1]);
}
// Interior displacement gradient of an ellipse (semi-axes a along angle phi, b
// across it): D = (1/2pi) int g(n) (x) n dtheta, n parallel to R(phi)(cos/a, sin/b).
// Its symmetric part is Eshelby's uniform interior strain S:e0.
export function interior(c, e0, a, b, phi, count = 4096) {
  const s0 = contract4(c, e0),
    cp = Math.cos(phi),
    sp = Math.sin(phi),
    D = [
      [0, 0],
      [0, 0],
    ];
  for (let q = 0; q < count; q++) {
    const th = (2 * Math.PI * (q + 0.5)) / count,
      zx = Math.cos(th) / a,
      zy = Math.sin(th) / b,
      gx = zx * cp - zy * sp,
      gy = zx * sp + zy * cp,
      L = Math.hypot(gx, gy),
      n = [gx / L, gy / L],
      g = jumpVector(c, s0, n);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) D[i][j] += (g[i] * n[j]) / count;
  }
  const strain = [
      [D[0][0], 0.5 * (D[0][1] + D[1][0])],
      [0.5 * (D[0][1] + D[1][0]), D[1][1]],
    ],
    stress = contract4(c, sub(strain, e0));
  return {
    gradient: D,
    strain,
    rotation: 0.5 * (D[1][0] - D[0][1]),
    stress,
    // Eshelby: E = -1/2 int_Omega sigma:e0 dV, per unit inclusion area.
    energy: -0.5 * ddot(stress, e0),
    eigenstress: s0,
  };
}
// Boundary point at parametric angle psi: position, outward normal m, tangent s.
export function boundaryPoint(a, b, phi, psi) {
  const cp = Math.cos(phi),
    sp = Math.sin(phi),
    lx = a * Math.cos(psi),
    ly = b * Math.sin(psi),
    nx = Math.cos(psi) / a,
    ny = Math.sin(psi) / b,
    L = Math.hypot(nx, ny),
    m = [(nx * cp - ny * sp) / L, (nx * sp + ny * cp) / L];
  return {
    x: lx * cp - ly * sp,
    y: lx * sp + ly * cp,
    m,
    s: [m[1], -m[0]],
  };
}
// Rotate a 2x2 tensor into the (s, m) frame: returns {ss, sm, mm}.
export function frame(T, s, m) {
  const p = (u, v) =>
    u[0] * (T[0][0] * v[0] + T[0][1] * v[1]) +
    u[1] * (T[1][0] * v[0] + T[1][1] * v[1]);
  return { ss: p(s, s), sm: p(s, m), mm: p(m, m) };
}
// Jump conditions at a boundary point of the ellipse.
export function interfaceJump(c, e0, inside, point) {
  const g = jumpVector(c, inside.eigenstress, point.m),
    strainOut = sub(inside.strain, symOuter(g, point.m)),
    stressOut = contract4(c, strainOut),
    row = (T) => frame(T, point.s, point.m);
  return {
    g,
    eigen: { inside: row(e0), outside: { ss: 0, sm: 0, mm: 0 } },
    strain: { inside: row(inside.strain), outside: row(strainOut) },
    stress: { inside: row(inside.stress), outside: row(stressOut) },
  };
}
// Periodic FFT solution for an ellipse in a unit cell (homogeneous C, mean
// total strain zero). Returns total strain and stress fields (xx, yy, xy).
export function fieldSolve(c, e0, { n = 256, a = 0.16, ratio = 0.5, phi = 0, sub: ss = 4 } = {}) {
  const b = a * ratio,
    cp = Math.cos(phi),
    sp = Math.sin(phi),
    h = new Float64Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let inside = 0;
      for (let u = 0; u < ss; u++)
        for (let v = 0; v < ss; v++) {
          const dx = (x + (u + 0.5) / ss) / n - 0.5,
            dy = (y + (v + 0.5) / ss) / n - 0.5,
            lx = dx * cp + dy * sp,
            ly = -dx * sp + dy * cp;
          if ((lx / a) ** 2 + (ly / b) ** 2 <= 1) inside++;
        }
      h[y * n + x] = inside / (ss * ss);
    }
  const s0 = contract4(c, e0),
    H = spectrum(h, n),
    E = [0, 1, 2].map(() => ({
      real: new Float64Array(n * n),
      imag: new Float64Array(n * n),
    }));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (x === n / 2 || y === n / 2 || (x === 0 && y === 0)) continue;
      const kx = x < n / 2 ? x : x - n,
        ky = y < n / 2 ? y : y - n,
        L = Math.hypot(kx, ky),
        nn = [kx / L, ky / L],
        g = jumpVector(c, s0, nn),
        e = symOuter(g, nn),
        i = y * n + x,
        comps = [e[0][0], e[1][1], e[0][1]];
      for (let k = 0; k < 3; k++) {
        E[k].real[i] = comps[k] * H.real[i];
        E[k].imag[i] = comps[k] * H.imag[i];
      }
    }
  for (const f of E) transform(f.real, f.imag, n, true);
  const exx = E[0].real,
    eyy = E[1].real,
    exy = E[2].real,
    sxx = new Float64Array(n * n),
    syy = new Float64Array(n * n),
    sxy = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const el = [
        [exx[i] - h[i] * e0[0][0], exy[i] - h[i] * e0[0][1]],
        [exy[i] - h[i] * e0[1][0], eyy[i] - h[i] * e0[1][1]],
      ],
      s = contract4(c, el);
    sxx[i] = s[0][0];
    syy[i] = s[1][1];
    sxy[i] = s[0][1];
  }
  return { n, a, b, phi, h, exx, eyy, exy, sxx, syy, sxy, fraction: h.reduce((p, q) => p + q, 0) / (n * n) };
}
// Bilinear sample of a periodic field at (x, y) in cell units, centre at 0.5.
export function sample(field, n, x, y) {
  const fx = (x + 0.5) * n - 0.5,
    fy = (y + 0.5) * n - 0.5,
    x0 = Math.floor(fx),
    y0 = Math.floor(fy),
    tx = fx - x0,
    ty = fy - y0,
    at = (i, j) => field[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
  return (
    (1 - tx) * (1 - ty) * at(x0, y0) +
    tx * (1 - ty) * at(x0 + 1, y0) +
    (1 - tx) * ty * at(x0, y0 + 1) +
    tx * ty * at(x0 + 1, y0 + 1)
  );
}
