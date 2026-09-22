// Dimensionless steady diffusion: -u'' = 0, u(0) = 0, u(1) = 1.
export const examples = Object.freeze({
  equation: { a: 0.4, b: 0.25, c: 0 },
  boundary: { a: 1, b: 0, c: 0.6 },
  both: { a: 1, b: 0, c: 0 },
  reset: { a: 0.6, b: 0.2, c: 0.4 },
});
export function field(x, { a, b, c }) { return a*x + b + c*x*(1-x); }
export function residual(x, { c }) { return 2*c; }
export function losses(parameters) {
  let equation = 0;
  for (let point = 1; point <= 64; point++) {
    equation += residual(point/65, parameters)**2/64;
  }
  const boundary = (field(0, parameters)**2 + (field(1, parameters)-1)**2)/2;
  return { equation, boundary };
}
