/* Analytic teaching models. Coordinates and coefficients are dimensionless. */
const TensorPhysics = {
  work(a, b) { return {lower: -a + b, upper: -a - b, circulation: 2*b, curl: 2*b, divergence: -2*a}; },
  balance(j0, slope, source) { return {left: j0, right: j0+slope, outward: slope, accumulation: source-slope}; },
  anisotropic(kx, ky, x, y) { return {force: [-y,-x], flux: [-kx*y,-ky*x], curl: kx-ky, divergence: 0, dissipation: kx*y*y+ky*x*x}; },
  coupled(x1,x2,r) { const j1=x1+r*x2,j2=r*x1+x2; return {j1,j2,production:x1*j1+x2*j2}; }
};
if(typeof module !== 'undefined') module.exports=TensorPhysics;
