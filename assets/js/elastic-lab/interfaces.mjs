// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
// Scalar interpolation maps used by the sharp-to-diffuse teaching module.
export const kinds = ["linear", "cubic", "quintic", "tanh"];

export function interpolation(kind, eta, beta = 6) {
  if (kind === "linear") return eta;
  if (kind === "cubic") return eta * eta * (3 - 2 * eta);
  if (kind === "quintic")
    return eta ** 3 * (10 - 15 * eta + 6 * eta * eta);
  if (kind === "tanh") {
    const denominator = 2 * Math.tanh(beta / 2);
    return (
      (Math.tanh(beta * (eta - 0.5)) + Math.tanh(beta / 2)) /
      denominator
    );
  }
  throw Error(`Unknown interpolation: ${kind}`);
}

export function derivative(kind, eta, beta = 6) {
  if (kind === "linear") return 1;
  if (kind === "cubic") return 6 * eta * (1 - eta);
  if (kind === "quintic") return 30 * eta ** 2 * (1 - eta) ** 2;
  if (kind === "tanh") {
    const c = Math.cosh(beta * (eta - 0.5));
    return beta / (2 * Math.tanh(beta / 2) * c * c);
  }
  throw Error(`Unknown interpolation: ${kind}`);
}

export function secondDerivative(kind, eta, beta = 6) {
  if (kind === "linear") return 0;
  if (kind === "cubic") return 6 - 12 * eta;
  if (kind === "quintic") return 60 * eta * (1 - eta) * (1 - 2 * eta);
  if (kind === "tanh") {
    const z = beta * (eta - 0.5),
      c = Math.cosh(z);
    return (-beta * beta * Math.tanh(z)) / (Math.tanh(beta / 2) * c * c);
  }
  throw Error(`Unknown interpolation: ${kind}`);
}

export const spatialProfile = (distance, width) =>
  0.5 * (1 - Math.tanh(distance / width));

export function samples(kind, beta = 6, count = 101) {
  return Array.from({ length: count }, (unused, iterator) => {
    const eta = iterator / (count - 1);
    return {
      eta,
      value: interpolation(kind, eta, beta),
      slope: derivative(kind, eta, beta),
    };
  });
}
