// SPDX-License-Identifier: GPL-3.0-or-later
// Module II checks: Eshelby interior field, interface jumps and limits.
import assert from "node:assert/strict";
import {
  interior,
  boundaryPoint,
  interfaceJump,
  kernelB,
  jumpVector,
  contract4,
  symOuter,
  fieldSolve,
  sample,
} from "../../assets/js/elastic-lab/eshelby.mjs";
export function eshelbyChecks(test, close) {
  const iso = { c11: 3, c12: 1, c44: 1 },
    cub = { c11: 3, c12: 1, c44: 3 },
    e0 = [
      [0.01, 0.002],
      [0.002, -0.005],
    ];
  test("Eshelby ellipse: angular integral equals Mura's isotropic closed form", () => {
    const nu = iso.c12 / (iso.c11 + iso.c12),
      out = [];
    for (const [a1, a2] of [[1, 1], [1, 0.3], [1, 0.05]]) {
      const f = 1 / (2 * (1 - nu)),
        s = a1 + a2,
        S1111 = f * ((a2 * a2 + 2 * a1 * a2) / s ** 2 + ((1 - 2 * nu) * a2) / s),
        S1122 = f * ((a2 * a2) / s ** 2 - ((1 - 2 * nu) * a2) / s),
        S2211 = f * ((a1 * a1) / s ** 2 - ((1 - 2 * nu) * a1) / s),
        S2222 = f * ((a1 * a1 + 2 * a1 * a2) / s ** 2 + ((1 - 2 * nu) * a1) / s),
        S1212 = f * ((a1 * a1 + a2 * a2) / (2 * s * s) + (1 - 2 * nu) / 2),
        I = interior(iso, e0, a1, a2, 0);
      close(I.strain[0][0], S1111 * e0[0][0] + S1122 * e0[1][1], 1e-9);
      close(I.strain[1][1], S2211 * e0[0][0] + S2222 * e0[1][1], 1e-9);
      close(I.strain[0][1], 2 * S1212 * e0[0][1], 1e-9);
      out.push({ aspect: a2 / a1, exx: I.strain[0][0], eyy: I.strain[1][1], exy: I.strain[0][1] });
    }
    // Circle, dilatation: eps_c = eps/(2(1-nu)).
    const d = interior(iso, [[0.01, 0], [0, 0.01]], 1, 1, 0);
    close(d.strain[0][0], 0.01 / (2 * (1 - nu)), 1e-9);
    return out;
  });
  test("Eshelby ellipse: thin-plate limit gives sym(g(m) x m) and energy B(m)/2", () => {
    const out = [];
    for (const phi of [0, 0.4, 1.1]) {
      const m = [-Math.sin(phi), Math.cos(phi)],
        T = interior(cub, e0, 1, 0.001, phi, 16384),
        plate = symOuter(jumpVector(cub, contract4(cub, e0), m), m),
        half = 0.5 * kernelB(cub, e0, m);
      assert.ok(Math.abs(T.strain[0][0] - plate[0][0]) < 2e-5);
      assert.ok(Math.abs(T.strain[0][1] - plate[0][1]) < 2e-5);
      // Absolute check scaled by the unrelaxed energy (B can be near zero).
      const s0 = contract4(cub, e0),
        full = 0.5 * (s0[0][0] * e0[0][0] + 2 * s0[0][1] * e0[0][1] + s0[1][1] * e0[1][1]);
      assert.ok(Math.abs(T.energy - half) < 0.005 * full);
      out.push({ phi, energy: T.energy, halfB: half });
    }
    return out;
  });
  test("Eshelby interface: eps_ss and traction continuous at every boundary point", () => {
    let worst = 0;
    for (const [c, ratio, phi] of [[iso, 0.4, 0.3], [cub, 0.2, 1.0], [cub, 1, 0]]) {
      const I = interior(c, e0, 1, ratio, phi);
      for (let k = 0; k < 72; k++) {
        const J = interfaceJump(c, e0, I, boundaryPoint(1, ratio, phi, (k * Math.PI) / 36));
        worst = Math.max(
          worst,
          Math.abs(J.strain.inside.ss - J.strain.outside.ss),
          Math.abs(J.stress.inside.sm - J.stress.outside.sm),
          Math.abs(J.stress.inside.mm - J.stress.outside.mm),
        );
      }
    }
    assert.ok(worst < 1e-15);
    return { worst };
  });
  test("Eshelby field map: periodic FFT interior agrees with the exact solution", () => {
    const I = interior(cub, e0, 0.12, 0.06, 0.4),
      F = fieldSolve(cub, e0, { n: 256, a: 0.12, ratio: 0.5, phi: 0.4 }),
      exx = sample(F.exx, 256, 0, 0),
      eyy = sample(F.eyy, 256, 0, 0);
    assert.ok(Math.abs(exx / I.strain[0][0] - 1) < 0.06);
    assert.ok(Math.abs(eyy / I.strain[1][1] - 1) < 0.06);
    return { fraction: F.fraction, fft: [exx, eyy], exact: [I.strain[0][0], I.strain[1][1]] };
  });
}
