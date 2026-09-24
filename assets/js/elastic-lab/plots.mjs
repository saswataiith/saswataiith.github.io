// SPDX-License-Identifier: GPL-3.0-or-later
import { minima, mohrState } from "./math.mjs?v=20260924a";
import { mathLabel } from "./math-render.mjs?v=20260924a";
export const colors = ["#226d9b", "#bd4d25", "#796411"];
export const fmt = (x) =>
  Math.abs(x) < 1e-12
    ? "0"
    : Math.abs(x) < 0.001 || Math.abs(x) >= 10000
      ? x.toExponential(2)
      : Number(x.toPrecision(4)).toString();
export function svg(title, body) {
  return `<svg viewBox="0 0 440 340" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;
}
const plotTex = {
  "B(n)": String.raw`B(\mathbf n)`,
  Bββ: String.raw`B_{\beta\beta}`,
  Bγγ: String.raw`B_{\gamma\gamma}`,
  Bβγ: String.raw`B_{\beta\gamma}`,
  Eint: String.raw`E_{\rm int}`,
  Eel: String.raw`E_{\rm el}`,
  "εnn / εη": String.raw`\epsilon^0_{nn}/\epsilon_\eta`,
  "[10]": "[10]",
  "[01]": "[01]",
  "[11]": "[11]",
  "[1̄1]": String.raw`[\bar1 1]`,
};
const text = (x, y, s, more = "") =>
  plotTex[s]
    ? mathLabel(x, y, plotTex[s], s, more.replace("fill=", "color="))
    : `<text x="${x}" y="${y}" ${more}>${s}</text>`;
const line = (x1, y1, x2, y2, more = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${more}/>`;
export function cartesian(series, title, selected = null) {
  const vals = series.flatMap((s) => s.points.map((p) => p.value)),
    lo = Math.min(...vals),
    hi = Math.max(...vals),
    pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.04, 1e-12),
    ymin = lo - pad,
    ymax = hi + pad;
  const X = (a) => 58 + (a / Math.PI) * 340,
    Y = (v) => 270 - ((v - ymin) / (ymax - ymin)) * 215;
  let body =
    text(20, 24, title) + line(58, 55, 58, 270) + line(58, 270, 400, 270);
  for (let tick = 0; tick <= 4; tick++)
    body += text(X((tick * Math.PI) / 4) - 9, 290, String(tick * 45));
  // Round-number value ticks: 1, 2 or 5 times a power of ten.
  const raw = (ymax - ymin) / 4,
    power = 10 ** Math.floor(Math.log10(raw)),
    step = [1, 2, 5, 10].map((m) => m * power).find((m) => m >= raw);
  for (let v = Math.ceil(ymin / step) * step; v <= ymax; v += step) {
    const clean = Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12));
    body +=
      text(4, Y(clean) + 4, fmt(clean)) +
      line(58, Y(clean), 400, Y(clean), 'class="gridline"');
  }
  if (ymin <= 0 && ymax >= 0)
    body += line(58, Y(0), 400, Y(0), 'class="zero-line"');
  series.forEach((s, i) => {
    body += `<polyline fill="none" stroke="${colors[i]}" stroke-width="2.5" points="${s.points.map((p) => `${X(p.angle)},${Y(p.value)}`).join(" ")}"/>`;
    const m = minima(s.points);
    for (const p of m.local)
      body += `<circle cx="${X(p.angle)}" cy="${Y(p.value)}" r="${m.global.includes(p) ? 5 : 3}" fill="${colors[i]}"/>`;
    body += text(65 + i * 120, 325, s.name, `fill="${colors[i]}"`);
  });
  if (selected)
    body += `<circle cx="${X(selected.angle)}" cy="${Y(selected.value)}" r="6" fill="#142c35"/>`;
  body += text(285, 307, "angle (degrees)");
  return svg(title, body);
}
export function polar(series, title) {
  const vals = series.flatMap((s) => s.points.map((p) => p.value)),
    lo = Math.min(0, ...vals),
    hi = Math.max(...vals),
    span = Math.max(hi - lo, 1e-12),
    R = (v) => 20 + (100 * (v - lo)) / span,
    cx = 220,
    cy = 165;
  let b = text(14, 22, title);
  for (const [a, label] of [
    [0, "[10]"],
    [Math.PI / 2, "[01]"],
    [Math.PI / 4, "[11]"],
    [(3 * Math.PI) / 4, "[1̄1]"],
  ]) {
    b += line(
      cx - 125 * Math.cos(a),
      cy + 125 * Math.sin(a),
      cx + 125 * Math.cos(a),
      cy - 125 * Math.sin(a),
      'class="gridline"',
    );
    b += text(cx + 132 * Math.cos(a) - 14, cy - 132 * Math.sin(a), label);
  }
  for (const v of [lo, (lo + hi) / 2, hi])
    b +=
      `<circle cx="${cx}" cy="${cy}" r="${R(v)}" fill="none" class="gridline"/>` +
      text(cx + 4, cy - R(v), fmt(v));
  if (lo < 0)
    b += `<circle cx="${cx}" cy="${cy}" r="${R(0)}" fill="none" class="zero-line"/>`;
  series.forEach((s, i) => {
    const pts = [
      ...s.points,
      ...s.points.map((p) => ({ angle: p.angle + Math.PI, value: p.value })),
      s.points[0],
    ];
    b += `<polyline fill="none" stroke="${colors[i]}" stroke-width="2.5" points="${pts.map((p) => `${cx + R(p.value) * Math.cos(p.angle)},${cy - R(p.value) * Math.sin(p.angle)}`).join(" ")}"/>`;
    for (const p of minima(s.points).local)
      b += `<circle cx="${cx + R(p.value) * Math.cos(p.angle)}" cy="${cy - R(p.value) * Math.sin(p.angle)}" r="${minima(s.points).global.includes(p) ? 5 : 3}" fill="${colors[i]}"/>`;
    b += text(40 + i * 130, 310, s.name, `fill="${colors[i]}"`);
  });
  b += text(20, 334, "Offset radial scale; labels give signed values.");
  return svg(title, b);
}
export function mohr(t, angle, stage = 4) {
  const { centre, radius, normal, shear } = mohrState(t, angle);
  const cx = 220,
    cy = 164,
    scale = 102,
    X = (v) => cx + scale * v,
    Y = (v) => cy - scale * v;
  const point = (x, y, color, size = 4) =>
    `<circle cx="${X(x)}" cy="${Y(y)}" r="${size}" fill="${color}"/>`;
  let b =
    text(14, 22, "Mohr’s circle of eigenstrain") +
    line(85, cy, 398, cy) +
    line(cx, 47, cx, 283);
  b +=
    mathLabel(
      350,
      cy + 40,
      String.raw`\epsilon^0_{nn}/\epsilon_\eta`,
      "normal strain",
    ) +
    mathLabel(
      230,
      48,
      String.raw`\epsilon^0_{nq}/\epsilon_\eta`,
      "tensor shear",
    );
  for (const value of [-1, 0, 1])
    b += text(X(value) - 8, cy + 19, String(value));
  b += line(X(t), cy, X(1), cy, 'stroke="#226d9b" stroke-width="3"');
  b += point(t, 0, "#226d9b") + point(1, 0, "#226d9b");
  b += mathLabel(
    X(t) - 42,
    cy - 9,
    String.raw`\epsilon_2/\epsilon_\eta`,
    "second principal strain",
  );
  if (t !== 1)
    b += mathLabel(
      X(1) + 6,
      cy - 9,
      String.raw`\epsilon_1/\epsilon_\eta`,
      "first principal strain",
    );
  if (stage >= 2) {
    b += `<circle cx="${X(centre)}" cy="${cy}" r="${scale * radius}" fill="none" stroke="#226d9b" stroke-width="2.5"/>`;
    // Small circles leave no room for c and R; the caption below gives both.
    const roomy = scale * radius > 45;
    b +=
      point(centre, 0, "#183b40", 3) +
      (roomy ? mathLabel(X(centre) - 16, cy - 8, "c", "centre") : "");
    b +=
      line(X(centre), cy, X(centre), Y(radius), 'stroke-dasharray="4 3"') +
      (roomy ? mathLabel(X(centre) + 7, Y(radius / 2), "R", "radius") : "");
  }
  if (stage >= 3) {
    b += line(
      X(centre),
      cy,
      X(normal),
      Y(shear),
      'stroke="#bd4d25" stroke-width="2"',
    );
    b +=
      line(X(normal), Y(shear), X(normal), cy, 'stroke-dasharray="3 3"') +
      point(normal, shear, "#bd4d25", 6);
    b += mathLabel(
      X(normal) + 8,
      Y(shear) + (Math.abs(shear) < 0.12 ? 42 : -7),
      "P(\\theta)",
      "rotated strain point",
    );
    // Physical +theta maps to -2theta in the (normal strain, tensor shear) plane.
    const samples = Array.from({ length: 31 }, (value, iterator) => {
      const phi = (-2 * angle * iterator) / 30;
      return `${X(centre) + 23 * Math.cos(phi)},${cy - 23 * Math.sin(phi)}`;
    });
    b += `<polyline points="${samples.join(" ")}" fill="none" stroke="#bd4d25"/>`;
  }
  if (stage >= 4 && t <= 0) {
    const rootShear = Math.sqrt(-t);
    b += point(0, rootShear, "#267c70", 5);
    if (t < 0) b += point(0, -rootShear, "#267c70", 5);
  }
  b += text(
    15,
    305,
    stage === 1
      ? "1. Principal strains define the diameter."
      : stage === 2
        ? "2. The midpoint and half-difference give c and R."
        : stage === 3
          ? "3. Rotate the radius by −2θ to locate P."
          : t > 0
            ? "4. No intersection with zero normal strain."
            : t === 0
              ? "4. Tangency: the y direction has zero extension."
              : "4. Green intersections give zero-extension directions.",
  );
  b += mathLabel(
    15,
    332,
    `c=${centre.toFixed(3)},\\quad R=${radius.toFixed(3)},\\quad \\theta=${((angle * 180) / Math.PI).toFixed(1)}^\\circ`,
    "centre, radius and angle",
  );
  return svg("Construct Mohr circle of strain", b);
}
export function sketch(
  angle,
  {
    t = -0.5,
    pair = false,
    phase = "β",
    compatible = true,
    distance = 0.32,
  } = {},
) {
  let b =
    text(
      15,
      24,
      pair
        ? "Particle separation direction"
        : "Prescribed plate and crystal axes",
    ) +
    line(220, 170, 380, 170, 'class="gridline"') +
    line(220, 170, 220, 38, 'class="gridline"') +
    text(382, 176, "[10]") +
    text(225, 42, "[01]");
  if (pair) {
    const dx = ((distance * 330) / 2) * Math.cos(angle),
      dy = ((-distance * 330) / 2) * Math.sin(angle);
    b += line(
      220 - dx,
      170 - dy,
      220 + dx,
      170 + dy,
      'stroke="#60717a" stroke-dasharray="5 4"',
    );
    b += `<circle cx="${220 - dx}" cy="${170 - dy}" r="22" fill="#b4e2cf"/><circle cx="${220 + dx}" cy="${170 + dy}" r="22" fill="#d7b9de"/>`;
    b +=
      text(212 - dx, 175 - dy, phase[0]) + text(212 + dx, 175 + dy, phase[1]);
  } else {
    b += `<g transform="translate(220 170) rotate(${(-angle * 180) / Math.PI})"><ellipse rx="100" ry="18" fill="#b4e2cf" stroke="#267c70" stroke-width="2"/><line x1="-112" y1="0" x2="112" y2="0" stroke="#267c70" stroke-width="2"/><line x1="0" y1="0" x2="0" y2="-80" stroke="#bd4d25" stroke-width="3"/><path d="M -5 -69 L 0 -80 L 5 -69" fill="none" stroke="#bd4d25" stroke-width="2"/></g>`;
    b += text(20, 304, "Green: line tangent s. Orange: normal m.");
  }
  b += text(
    20,
    326,
    `Angle from [10]: ${((angle * 180) / Math.PI).toFixed(1)}°`,
  );
  return svg(pair ? "Two-particle orientation" : "Thin plate orientation", b);
}
export function strainShape(t) {
  return svg(
    "Eigenstrain shape change",
    text(15, 24, "Reference circle → transformed shape") +
      `<circle cx="220" cy="165" r="80" fill="none" stroke="#60717a" stroke-dasharray="5 4"/><ellipse cx="220" cy="165" rx="104" ry="${80 * (1 + 0.3 * t)}" fill="#b4e2cf88" stroke="#267c70" stroke-width="3"/>` +
      line(95, 165, 350, 165, 'class="gridline"') +
      line(220, 45, 220, 280, 'class="gridline"') +
      text(350, 180, "x") +
      text(228, 46, "y") +
      text(20, 312, "Shape exaggeration: εη = 0.3 for this sketch only."),
  );
}
