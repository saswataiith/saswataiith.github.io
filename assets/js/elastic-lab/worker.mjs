// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
import { solvePlate, homogeneousEnergy } from "./solver.mjs?v=20260924c";
self.onmessage = ({ data }) => {
  try {
    const points = [];
    let worst = 0,
      maxIterations = 0;
    for (let i = 0; i < data.count; i++) {
      const angle = (i * Math.PI) / data.count,
        result = solvePlate({ ...data, angle });
      points.push({
        angle,
        value: result.energy,
        unrelaxedEnergy: result.unrelaxedEnergy,
      });
      worst = Math.max(worst, result.residual);
      maxIterations = Math.max(maxIterations, result.iterations);
      self.postMessage({ progress: (i + 1) / data.count });
    }
    const homogeneous = Object.keys(data.cm).every(
      (k) => data.cm[k] === data.cp[k],
    );
    let referenceError = null;
    if (homogeneous) {
      referenceError = Math.max(
        ...points.map(
          (p) =>
            Math.abs(
              p.value - homogeneousEnergy(data.n, p.angle, data.cm, data.eigen),
            ) / Math.max(p.value, 1e-30),
        ),
      );
    }
    self.postMessage({ points, worst, maxIterations, referenceError });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
