import { examples, field, residual, losses } from './pinn-model.mjs';
const controls = {
  a: document.getElementById('pinn-amplitude'),
  b: document.getElementById('pinn-offset'),
  c: document.getElementById('pinn-curvature'),
};
const canvas = document.getElementById('pinn-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  function draw() {
    const parameters = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, Number(input.value)]));
    ctx.fillStyle = '#f3f5eb'; ctx.fillRect(0, 0, 700, 460);
    ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#234444';
    ctx.fillText('FIELD: blue trial / dashed gray reference', 65, 24);
    ctx.fillText('EQUATION RESIDUAL: orange', 65, 310);
    const xx = x => 65 + 575*x;
    const yy = u => 265 - (u + .5)/2.5*215;
    const rr = r => 380 - r*24;
    function grid(value, y) {
      ctx.strokeStyle = '#cbd3c9'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(65, y(value)); ctx.lineTo(640, y(value)); ctx.stroke();
      ctx.fillStyle = '#234444'; ctx.fillText(String(value), 32, y(value)+4);
    }
    for (const value of [0, 1, 2]) grid(value, yy);
    for (const value of [-2, 0, 2]) grid(value, rr);
    function curve(fn, y, color, dash = []) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash); ctx.beginPath();
      for (let point = 0; point <= 200; point++) {
        const x = point/200;
        if (point === 0) ctx.moveTo(xx(x), y(fn(x)));
        else ctx.lineTo(xx(x), y(fn(x)));
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curve(x => x, yy, '#87918b', [7, 5]);
    curve(x => field(x, parameters), yy, '#176da4');
    curve(x => residual(x, parameters), rr, '#bc5323');
    for (const x of [0, .5, 1]) {
      ctx.fillStyle = '#234444'; ctx.fillText('x = '+x, xx(x)-12, 285);
      ctx.fillText('x = '+x, xx(x)-12, 455);
    }
    for (const x of [0, 1]) {
      ctx.strokeStyle = '#347342'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(xx(x), yy(x), 8, 0, 2*Math.PI); ctx.stroke();
      ctx.fillStyle = '#176da4'; ctx.beginPath(); ctx.arc(xx(x), yy(field(x, parameters)), 4, 0, 2*Math.PI); ctx.fill();
    }
    for (const [key, input] of Object.entries(controls)) document.getElementById(input.id+'-value').textContent = parameters[key].toFixed(2);
    const error = losses(parameters);
    document.getElementById('pinn-equation-loss').textContent = error.equation.toFixed(5);
    document.getElementById('pinn-boundary-loss').textContent = error.boundary.toFixed(5);
    const equationPass = error.equation < 1e-12, boundaryPass = error.boundary < 1e-12;
    document.getElementById('pinn-feedback').textContent = equationPass && boundaryPass
      ? 'Both tests pass: the straight line u = x has the required endpoints.'
      : equationPass ? 'The equation passes: curvature is zero. But the endpoints are wrong; the equation has not selected the required slope and offset.'
      : boundaryPass ? 'The endpoints pass, but the curved field violates the steady diffusion equation.'
      : 'Both tests still need work: check the curvature and the endpoint values separately.';
    canvas.setAttribute('aria-label', `Trial field with a=${parameters.a}, b=${parameters.b}, c=${parameters.c}. Equation error ${error.equation.toFixed(5)}; boundary error ${error.boundary.toFixed(5)}.`);
  }
  for (const input of Object.values(controls)) input.addEventListener('input', draw);
  for (const [name, parameters] of Object.entries(examples)) {
    document.getElementById('pinn-'+name).addEventListener('click', () => {
      for (const [key, value] of Object.entries(parameters)) controls[key].value = value;
      draw();
    });
  }
  draw();
}
