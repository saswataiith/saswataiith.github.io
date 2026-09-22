import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examples, field, residual, losses } from '../assets/js/pinn-model.mjs';

test('PDE and boundary conditions are independent, in every preset order', () => {
  for (const preceding of Object.values(examples)) {
    for (const name of ['equation', 'boundary', 'both']) {
      const state = { ...preceding, ...examples[name] };
      const error = losses(state);
      assert.equal(error.equation < 1e-12, name !== 'boundary');
      assert.equal(error.boundary < 1e-12, name !== 'equation');
    }
  }
});
test('curvature and endpoint errors agree with direct evaluation', () => {
  const state = { a: .73, b: -.12, c: -.61 };
  const step = 1e-4, x = .37;
  const negativeSecondDerivative = -(field(x+step,state)-2*field(x,state)+field(x-step,state))/step**2;
  assert.ok(Math.abs(negativeSecondDerivative-residual(x,state)) < 1e-7);
  assert.ok(Math.abs(losses(state).equation-4*state.c**2) < 1e-12);
  assert.ok(Math.abs(losses(state).boundary-(state.b**2+(state.a+state.b-1)**2)/2) < 1e-12);
});
test('joint constraints recover exact solution throughout the interval', () => {
  for (let point = 0; point <= 100; point++) assert.equal(field(point/100,examples.both),point/100);
});
