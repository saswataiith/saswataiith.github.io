// SPDX-License-Identifier: GPL-3.0-or-later
import { minima } from "./math.mjs";
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
const text = (x, y, s, more = "") =>
  `<text x="${x}" y="${y}" ${more}>${s}</text>`;
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
  for (let tick = 0; tick <= 4; tick++) {
    const a = (tick * Math.PI) / 4,
      v = ymin + ((ymax - ymin) * tick) / 4;
    body +=
      text(X(a) - 9, 290, String(tick * 45)) +
      text(4, Y(v) + 4, fmt(v)) +
      line(58, Y(v), 400, Y(v), 'class="gridline"');
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
export function mohr(t, angle) {
  const cx = 225,
    cy = 165,
    scale = 105,
    mid = (1 + t) / 2,
    r = (1 - t) / 2,
    x = mid + r * Math.cos(2 * angle),
    shear = -r * Math.sin(2 * angle);
  let b =
    text(15, 22, "Mohr circle: ε / εη") +
    line(65, cy, 410, cy) +
    line(cx, 45, cx, 290) +
    text(320, 185, "εnn / εη") +
    text(235, 48, "εnq / εη");
  b += `<circle cx="${cx + scale * mid}" cy="${cy}" r="${scale * r}" fill="none" stroke="#226d9b" stroke-width="3"/>`;
  b +=
    line(
      cx + scale * mid,
      cy,
      cx + scale * x,
      cy - scale * shear,
      'stroke="#bd4d25"',
    ) +
    `<circle cx="${cx + scale * x}" cy="${cy - scale * shear}" r="6" fill="#bd4d25"/>`;
  for (const v of [-1, 0, 1]) b += text(cx + scale * v - 4, cy + 18, String(v));
  if (t <= 0)
    for (const s of [1, -1])
      b += `<circle cx="${cx}" cy="${cy + s * scale * Math.sqrt(-t)}" r="4" fill="#267c70"/>`;
  b += text(
    25,
    318,
    `θ = ${((angle * 180) / Math.PI).toFixed(1)}°; circle rotation = 2θ`,
  );
  return svg("Mohr circle of eigenstrain", b);
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
    b += `<g transform="translate(220 170) rotate(${(-angle * 180) / Math.PI})"><ellipse rx="125" ry="22" fill="#b4e2cf" stroke="#267c70" stroke-width="2"/><line x1="-140" y1="0" x2="140" y2="0" stroke="#267c70"/><line x1="0" y1="0" x2="0" y2="-95" stroke="#bd4d25" stroke-width="3"/><path d="M -5 -84 L 0 -95 L 5 -84" fill="none" stroke="#bd4d25"/></g>`;
    b += text(20, 294, "Green: line tangent s. Orange: normal m.");
  }
  b += text(
    20,
    320,
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
