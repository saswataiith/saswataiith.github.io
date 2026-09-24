// SPDX-License-Identifier: GPL-3.0-or-later
// Module II: Eshelby's inclusion and the interface jump conditions.
import {
  interior,
  boundaryPoint,
  interfaceJump,
  kernelB,
  fieldSolve,
  sample,
  frame,
  contract4,
} from "./eshelby.mjs?v=20260924c";
import { roots } from "./math.mjs?v=20260924c";
import { fmt } from "./plots.mjs?v=20260924c";
import {
  clearMath,
  renderMath,
  texNumber,
} from "./math-render.mjs?v=20260924c";

const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value);
const O = "#bd4d25",
  G = "#267c70",
  B = "#226d9b",
  Y = "#796411",
  T = "#17313a",
  GR = "#879b96";
const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;
const setHTML = (id, html) => {
  const el = $(id);
  clearMath(el);
  el.innerHTML = html;
  renderMath(el);
};
const svg = (label, body, h = 340) =>
  `<svg viewBox="0 0 440 ${h}" role="img" aria-label="${label}" style="font-family:'DM Sans',system-ui,sans-serif">${body}</svg>`;
const text = (x, y, s, more = "") =>
  `<text x="${x}" y="${y}" font-size="12" fill="${T}" ${more}>${s}</text>`;
const sub = (s) =>
  s.replace(/_([a-z]+)/g, '<tspan baseline-shift="sub" font-size="75%">$1</tspan>');

function state() {
  const inputs = ["es-eps", "es-t", "es-c11", "es-c12", "es-c44", "es-ratio", "es-phi", "es-psi"];
  for (const id of inputs) {
    const el = $(id);
    if (el.value.trim() === "" || !Number.isFinite(Number(el.value)) || el.validity.rangeUnderflow || el.validity.rangeOverflow)
      throw Error("Enter finite values within the displayed limits.");
  }
  const c = { c11: num("es-c11"), c12: num("es-c12"), c44: num("es-c44") };
  if (!(c.c44 > 0 && c.c11 - c.c12 > 0 && c.c11 + c.c12 > 0))
    throw Error("Require C44 > 0, C11 − C12 > 0 and C11 + C12 > 0.");
  const eps = num("es-eps"),
    t = num("es-t");
  return {
    c,
    e0: [
      [eps, 0],
      [0, eps * t],
    ],
    eps,
    t,
    ratio: 10 ** num("es-ratio"),
    phi: rad(num("es-phi")),
    psi: rad(num("es-psi")),
  };
}

// ---------- shape panel ----------
function shapePanel(s, inside, point) {
  const cx = 220,
    cy = 165,
    A = 105,
    Bb = A * s.ratio,
    maxe = Math.max(Math.abs(s.eps), Math.abs(s.eps * s.t), 1e-12),
    k = 0.22 / maxe;
  const ring = (M) => {
    const pts = [];
    for (let q = 0; q <= 120; q++) {
      const p = boundaryPoint(A, Bb, s.phi, (2 * Math.PI * q) / 120),
        x = p.x + k * (M[0][0] * p.x + M[0][1] * p.y),
        y = p.y + k * (M[1][0] * p.x + M[1][1] * p.y);
      pts.push(`${(cx + x).toFixed(1)},${(cy - y).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const zero = [
    [0, 0],
    [0, 0],
  ];
  const p = boundaryPoint(A, Bb, s.phi, s.psi),
    px = cx + p.x,
    py = cy - p.y;
  let b =
    `<defs><marker id="esa-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${O}"/></marker><marker id="esa-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${G}"/></marker></defs>` +
    text(14, 22, "Inclusion shapes (strain exaggerated ×" + Math.round(k) + ")", 'font-weight="600"') +
    `<line x1="${cx}" y1="${cy}" x2="${cx + 190}" y2="${cy}" stroke="#dce4e1"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 140}" stroke="#dce4e1"/>` +
    text(cx + 175, cy + 16, "[10]") +
    text(cx + 6, cy - 128, "[01]") +
    `<polygon points="${ring(zero)}" fill="none" stroke="${GR}" stroke-dasharray="4 3"/>` +
    `<polygon points="${ring(s.e0)}" fill="none" stroke="${O}" stroke-width="1.8" stroke-dasharray="7 5"/>` +
    `<polygon points="${ring(inside.gradient)}" fill="#b4e2cf" fill-opacity="0.75" stroke="${G}" stroke-width="2"/>`;
  b +=
    `<line x1="${px}" y1="${py}" x2="${px + 42 * p.m[0]}" y2="${py - 42 * p.m[1]}" stroke="${O}" stroke-width="2.4" marker-end="url(#esa-o)"/>` +
    `<line x1="${px - 30 * p.s[0]}" y1="${py + 30 * p.s[1]}" x2="${px + 30 * p.s[0]}" y2="${py - 30 * p.s[1]}" stroke="${G}" stroke-width="2.4" marker-end="url(#esa-g)"/>` +
    `<circle cx="${px}" cy="${py}" r="5" fill="${T}"/>` +
    text(px + 46 * p.m[0] - 4, py - 46 * p.m[1] + 4, "m", `fill="${O}" font-style="italic" font-weight="700"`) +
    text(px + 36 * p.s[0] - 4, py - 36 * p.s[1] + 4, "s", `fill="${G}" font-style="italic" font-weight="700"`);
  b +=
    text(14, 306, `<tspan fill="${GR}">- - hole (original shape)</tspan>   <tspan fill="${O}">— — free: ε⁰</tspan>   <tspan fill="${G}">■ constrained: ∇u = D</tspan>`) +
    text(14, 326, "Click the outline to choose the interface point.", `fill="${GR}"`);
  return svg("Hole, free and constrained inclusion shapes with the selected interface point", b);
}

// ---------- generic xy plot ----------
function xyPlot({ title, series, xlabel, xmin, xmax, xticks, marker, vlines = [], note = "" }) {
  const vals = series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
  let lo = Math.min(0, ...vals),
    hi = Math.max(...vals);
  if (hi - lo < 1e-14) hi = lo + 1e-14;
  const pad = (hi - lo) * 0.08;
  lo -= lo < 0 ? pad : 0;
  hi += pad;
  const X = (x) => 62 + ((x - xmin) / (xmax - xmin)) * 350,
    Yf = (y) => 270 - ((y - lo) / (hi - lo)) * 220;
  let b = text(14, 22, title, 'font-weight="600"');
  b += `<line x1="62" y1="50" x2="62" y2="270" stroke="${GR}"/><line x1="62" y1="270" x2="412" y2="270" stroke="${GR}"/>`;
  const raw = (hi - lo) / 4,
    pow = 10 ** Math.floor(Math.log10(raw)),
    step = [1, 2, 5, 10].map((m) => m * pow).find((m) => m >= raw);
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-15; v += step) {
    const cv = Math.abs(v) < step * 1e-9 ? 0 : v;
    b += `<line x1="62" y1="${Yf(cv)}" x2="412" y2="${Yf(cv)}" stroke="#dce4e1"/>` + text(4, Yf(cv) + 4, fmt(cv), 'font-size="11"');
  }
  for (const [x, lab] of xticks) b += text(X(x) - 10, 288, lab, 'font-size="11"');
  b += text(412, 306, xlabel, 'font-size="11.5" text-anchor="end"');
  for (const v of vlines)
    b += `<line x1="${X(v.x)}" y1="50" x2="${X(v.x)}" y2="270" stroke="${v.color}" stroke-dasharray="4 3"/>` + text(X(v.x) + 3, 60, v.label, `font-size="10.5" fill="${v.color}"`);
  series.forEach((s) => {
    b += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2.4}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""} points="${s.points.filter((p) => Number.isFinite(p[1])).map((p) => `${X(p[0]).toFixed(1)},${Yf(p[1]).toFixed(1)}`).join(" ")}"/>`;
  });
  if (marker) b += `<circle cx="${X(marker[0])}" cy="${Yf(marker[1])}" r="5.5" fill="${T}"/>`;
  series
    .filter((s) => s.name)
    .forEach((s, i) => (b += text(14 + i * 142, 326, s.name, `font-size="11.5" fill="${s.color}"`)));
  if (note) b += text(250, 326, note, 'font-size="11" fill="' + GR + '"');
  return svg(title, b);
}

// ---------- field map ----------
let fieldCache = null,
  fieldKey = "",
  fieldTimer = null;
const COMPONENTS = {
  sxx: ["σ_xx", "stress"],
  syy: ["σ_yy", "stress"],
  sxy: ["σ_xy", "stress"],
  exx: ["ε_xx", "strain"],
  eyy: ["ε_yy", "strain"],
  exy: ["ε_xy", "strain"],
};
function colour(v, scale) {
  const u = Math.max(-1, Math.min(1, v / scale));
  const mix = (a, b, f) => Math.round(a + (b - a) * f);
  return u >= 0
    ? [mix(255, 189, u), mix(255, 77, u), mix(255, 37, u)]
    : [mix(255, 34, -u), mix(255, 109, -u), mix(255, 155, -u)];
}
function drawMap(F, s) {
  const canvas = $("es-map"),
    ctx = canvas.getContext("2d"),
    comp = $("es-comp").value,
    f = F[comp],
    n = F.n;
  let scale = 0;
  for (let i = 0; i < f.length; i++) scale = Math.max(scale, Math.abs(f[i]));
  scale = scale || 1e-12;
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const [r, g, b] = colour(f[y * n + x], scale),
        j = ((n - 1 - y) * n + x) * 4;
      img.data.set([r, g, b, 255], j);
    }
  const off = document.createElement("canvas");
  off.width = off.height = n;
  off.getContext("2d").putImageData(img, 0, 0);
  const W = canvas.width;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, W, W);
  // ellipse outline and the normal line through the chosen point
  const P = (x, y) => [(x + 0.5) * W, (0.5 - y) * W];
  ctx.strokeStyle = T;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let q = 0; q <= 120; q++) {
    const p = boundaryPoint(F.a, F.b, F.phi, (2 * Math.PI * q) / 120),
      [u, v] = P(p.x, p.y);
    q ? ctx.lineTo(u, v) : ctx.moveTo(u, v);
  }
  ctx.stroke();
  const p = boundaryPoint(F.a, F.b, F.phi, s.psi),
    L = 0.1,
    [u0, v0] = P(p.x - L * p.m[0], p.y - L * p.m[1]),
    [u1, v1] = P(p.x + L * p.m[0], p.y + L * p.m[1]);
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(u0, v0);
  ctx.lineTo(u1, v1);
  ctx.stroke();
  ctx.setLineDash([]);
  const [label, kind] = COMPONENTS[comp];
  setHTML(
    "es-map-legend",
    `<span class="es-bar"></span> ${label.replace("_", "<sub>").concat("</sub>")} from −${fmt(scale)} (blue) to +${fmt(scale)} (orange). Periodic cell; inclusion area fraction ${(100 * F.fraction).toFixed(1)}%. Dashed: the ${kind} profile line below, along m.`,
  );
}
function profile(F, s, inside, J) {
  const p = boundaryPoint(F.a, F.b, F.phi, s.psi),
    L = 0.1,
    N = 161,
    rows = { strain: { ss: [], sm: [], mm: [] }, stress: { ss: [], sm: [], mm: [] } };
  for (let q = 0; q < N; q++) {
    const d = -L + (2 * L * q) / (N - 1),
      x = p.x + d * p.m[0],
      y = p.y + d * p.m[1],
      e = [
        [sample(F.exx, F.n, x, y), sample(F.exy, F.n, x, y)],
        [sample(F.exy, F.n, x, y), sample(F.eyy, F.n, x, y)],
      ],
      sg = [
        [sample(F.sxx, F.n, x, y), sample(F.sxy, F.n, x, y)],
        [sample(F.sxy, F.n, x, y), sample(F.syy, F.n, x, y)],
      ],
      fe = frame(e, p.s, p.m),
      fs = frame(sg, p.s, p.m);
    for (const k of ["ss", "sm", "mm"]) {
      rows.strain[k].push([d / F.a, fe[k]]);
      rows.stress[k].push([d / F.a, fs[k]]);
    }
  }
  // Exact values just inside / outside the chosen point for the same shape.
  const Jf = interfaceJump(s.c, s.e0, interior(s.c, s.e0, F.a, F.b, F.phi), p);
  const mk = (kind) => {
    const colours = { ss: O, sm: Y, mm: B },
      series = [];
    for (const k of ["ss", "sm", "mm"]) {
      const cont =
        (kind === "strain" && k === "ss") || (kind === "stress" && k !== "ss");
      series.push({
        name: sub(`${kind === "strain" ? "ε" : "σ"}_${k}`) + (cont ? " continuous" : " jumps"),
        color: colours[k],
        points: rows[kind][k],
      });
      series.push({
        name: "",
        color: colours[k],
        dash: "2 3",
        width: 1.6,
        points: [
          [-L / F.a, Jf[kind].inside[k]],
          [0, Jf[kind].inside[k]],
          [0, Jf[kind].outside[k]],
          [L / F.a, Jf[kind].outside[k]],
        ],
      });
    }
    return series;
  };
  const draw = (id, kind) =>
    ($(id).innerHTML = xyPlot({
      title: `${kind === "strain" ? "Total strain" : "Stress"} across the interface, (s, m) frame`,
      series: mk(kind),
      xlabel: "distance along m, in units of a (inside < 0)",
      xmin: -L / F.a,
      xmax: L / F.a,
      xticks: [
        [-L / F.a, (-L / F.a).toFixed(2)],
        [0, "0"],
        [L / F.a, (L / F.a).toFixed(2)],
      ],
      vlines: [{ x: 0, color: T, label: "interface" }],
    }));
  draw("es-profile-strain", "strain");
  draw("es-profile-stress", "stress");
}
function scheduleField(s, inside, J) {
  const ratio = Math.max(s.ratio, 0.08),
    key = JSON.stringify([s.c, s.e0, ratio.toFixed(4), s.phi.toFixed(4)]);
  clearTimeout(fieldTimer);
  const run = () => {
    if (key !== fieldKey) {
      fieldCache = fieldSolve(s.c, s.e0, { n: 256, a: 0.16, ratio, phi: s.phi });
      fieldKey = key;
    }
    drawMap(fieldCache, s);
    profile(fieldCache, s, inside, J);
    $("es-field-note").textContent =
      s.ratio < 0.08
        ? "The field map uses b/a = 0.08, the thinnest plate the 256 × 256 grid resolves; the table and curves above use the exact b/a."
        : "";
  };
  if (key === fieldKey) run();
  else {
    $("es-field-note").textContent = "Solving the field…";
    fieldTimer = setTimeout(run, 180);
  }
}

// ---------- jump table ----------
function jumpTable(J) {
  const cell = (v) => fmt(v);
  const law = {
    strain: { ss: ["continuous", "Hadamard"], sm: ["jumps", "set by g"], mm: ["jumps", "set by g"] },
    stress: { ss: ["jumps", "remnant"], sm: ["continuous", "traction"], mm: ["continuous", "traction"] },
    eigen: { ss: ["jumps", "prescribed"], sm: ["jumps", "prescribed"], mm: ["jumps", "prescribed"] },
  };
  let h =
    '<table class="lab-table es-table"><thead><tr><th>quantity</th><th>inside</th><th>outside</th><th>jump ⟦·⟧ = in − out</th><th>rule</th></tr></thead><tbody>';
  for (const [kind, sym] of [
    ["eigen", "ε⁰"],
    ["strain", "ε"],
    ["stress", "σ"],
  ])
    for (const k of ["ss", "sm", "mm"]) {
      const a = J[kind].inside[k],
        b = J[kind].outside[k],
        [state, why] = law[kind][k],
        cls = kind === "eigen" ? "" : state === "continuous" ? "es-cont" : "es-jump";
      h += `<tr class="${cls}"><td>\\(${sym === "ε⁰" ? "\\epsilon^0" : sym === "ε" ? "\\epsilon" : "\\sigma"}_{${k}}\\)</td><td>${cell(a)}</td><td>${cell(b)}</td><td><strong>${cell(a - b)}</strong></td><td>${state} (${why})</td></tr>`;
    }
  return h + "</tbody></table>";
}

// ---------- main render ----------
function sweepAspect(s) {
  const pts = [];
  for (let q = 0; q <= 40; q++) {
    const r = -2 + q / 20;
    pts.push([r, interior(s.c, s.e0, 1, 10 ** r, s.phi, 2048).energy]);
  }
  return pts;
}
function sweepOrientation(s) {
  const pts = [],
    thin = [];
  for (let q = 0; q <= 90; q++) {
    const ph = (q * Math.PI) / 90;
    pts.push([deg(ph), interior(s.c, s.e0, 1, s.ratio, ph, 2048).energy]);
    thin.push([deg(ph), 0.5 * kernelB(s.c, s.e0, [-Math.sin(ph), Math.cos(ph)])]);
  }
  return { pts, thin };
}
let lastSweep = "",
  sweeps = null;
function render() {
  let s;
  try {
    s = state();
    $("es-error").textContent = "";
  } catch (err) {
    $("es-error").textContent = err.message + " Plots keep the last valid state.";
    return;
  }
  $("es-ratio-out").textContent = s.ratio.toFixed(3);
  const inside = interior(s.c, s.e0, 1, s.ratio, s.phi),
    point = boundaryPoint(1, s.ratio, s.phi, s.psi),
    J = interfaceJump(s.c, s.e0, inside, point),
    m0 = [-Math.sin(s.phi), Math.cos(s.phi)],
    thinW = 0.5 * kernelB(s.c, s.e0, m0),
    angle = (v) => ((deg(Math.atan2(v[1], v[0])) % 180) + 180) % 180;
  $("es-shape").innerHTML = shapePanel(s, inside, point);
  setHTML("es-jumps", jumpTable(J));
  const traction = Math.max(
      Math.abs(J.stress.inside.sm - J.stress.outside.sm),
      Math.abs(J.stress.inside.mm - J.stress.outside.mm),
    ),
    hadamard = Math.abs(J.strain.inside.ss - J.strain.outside.ss),
    scale = Math.max(Math.abs(s.eps), 1e-30);
  setHTML(
    "es-summary",
    String.raw`<strong>Interior (uniform):</strong> \(\epsilon^c_{xx}=${texNumber(fmt(inside.strain[0][0]))}\), \(\epsilon^c_{yy}=${texNumber(fmt(inside.strain[1][1]))}\), \(\epsilon^c_{xy}=${texNumber(fmt(inside.strain[0][1]))}\); lattice rotation \(\omega=${texNumber(fmt(inside.rotation))}\) rad. <strong>Energy</strong> per unit inclusion area \(w=${texNumber(fmt(inside.energy))}\); thin-plate limit \(\tfrac12B(\mathbf m)=${texNumber(fmt(thinW))}\) for this orientation. <strong>Chosen point:</strong> normal \(\mathbf m\) at ${angle(point.m).toFixed(1)}°, tangent \(\mathbf s\) at ${angle(point.s).toFixed(1)}°. <strong>Checks:</strong> \(|[\![\epsilon_{ss}]\!]|=${texNumber((hadamard / scale).toExponential(1))}\,\epsilon_\eta\), \(|[\![\sigma]\!]\mathbf m|=${texNumber((traction / scale).toExponential(1))}\,\epsilon_\eta\).`,
  );
  const key = JSON.stringify([s.c, s.e0, s.ratio.toFixed(4), s.phi.toFixed(4)]);
  if (key !== lastSweep) {
    sweeps = { aspect: sweepAspect(s), orient: sweepOrientation(s) };
    lastSweep = key;
  }
  const hab = s.t <= 0 ? roots(s.t).map(deg) : [];
  $("es-aspect").innerHTML = xyPlot({
    title: "Energy per area vs aspect ratio (fixed orientation)",
    series: [
      { name: "w(b/a)", color: B, points: sweeps.aspect },
      { name: "½B(m) thin limit", color: O, dash: "6 4", points: [[-2, thinW], [0, thinW]] },
    ],
    xlabel: "log₁₀(b/a): thin plate ← → circle",
    xmin: -2,
    xmax: 0,
    xticks: [[-2, "0.01"], [-1, "0.1"], [0, "1"]],
    marker: [Math.log10(s.ratio), inside.energy],
  });
  $("es-orient").innerHTML = xyPlot({
    title: "Energy per area vs orientation of the long axis",
    series: [
      { name: `w(φ) at b/a = ${s.ratio.toFixed(2)}`, color: B, points: sweeps.orient.pts },
      { name: "½B thin limit", color: O, dash: "6 4", points: sweeps.orient.thin },
    ],
    xlabel: "long-axis angle φ (degrees)",
    xmin: 0,
    xmax: 180,
    xticks: [[0, "0"], [45, "45"], [90, "90"], [135, "135"], [180, "180"]],
    marker: [deg(s.phi), inside.energy],
    vlines: hab.map((h) => ({ x: h, color: G, label: "habit" })),
  });
  // Why text
  const jumps = ["sm", "mm"].map((k) => fmt(J.strain.inside[k] - J.strain.outside[k])),
    remn = fmt(J.stress.inside.ss - J.stress.outside.ss);
  setHTML(
    "es-why",
    String.raw`At the chosen point the normal is \(\mathbf m\). Welding keeps \(\epsilon_{ss}\) continuous; force balance keeps \(\sigma_{sm}\) and \(\sigma_{mm}\) continuous. What is left free jumps: \(\epsilon_{sm}\) by ${jumps[0]}, \(\epsilon_{mm}\) by ${jumps[1]}, and \(\sigma_{ss}\) by ${remn}. These jumps depend only on \(\mathbf m\), \(\epsilon^0\) and C, through \(\mathbf g=Q(\mathbf m)^{-1}\sigma^0\mathbf m\); the shape of the inclusion only sets the uniform interior field. The outside field is the inside field minus the jump. As \(b/a\to0\) the flat faces meet an unstrained matrix, so the interior field itself becomes the jump and \(w\) approaches \(\tfrac12B(\mathbf m)=${fmt(thinW)}\).${hab.length ? ` For this eigenstrain the habit lines are at ${hab.map((h) => h.toFixed(1) + "°").join(" and ")}; a thin plate along them has \(\epsilon^0_{ss}=0\) and no remnant stress.` : " For \\(t&gt;0\\) there is no habit line; every orientation keeps some remnant stress."}`,
  );
  scheduleField(s, inside, J);
}

function setRatio(r) {
  $("es-ratio").value = Math.log10(r).toFixed(2);
}
for (const id of ["es-eps", "es-t", "es-c11", "es-c12", "es-c44", "es-ratio", "es-phi", "es-psi"])
  $(id).addEventListener("input", render);
$("es-comp").addEventListener("change", () => fieldCache && render());
for (const button of document.querySelectorAll("[data-es]"))
  button.addEventListener("click", () => {
    const k = button.dataset.es;
    if (k === "circle") setRatio(1);
    if (k === "plate") setRatio(0.01);
    if (k === "habit") {
      const r = roots(num("es-t"));
      if (r.length) $("es-phi").value = deg(r[0]).toFixed(1);
    }
    if (k === "worst" && sweeps) {
      const w = sweeps.orient.pts.reduce((a, b) => (b[1] > a[1] ? b : a));
      $("es-phi").value = w[0].toFixed(1);
    }
    if (k === "copy") {
      $("es-eps").value = $("epsilon").value;
      $("es-t").value = $("t").value;
    }
    if (k === "iso") {
      const c11 = num("es-c11"),
        c12 = num("es-c12");
      $("es-c44").value = ((c11 - c12) / 2).toString();
    }
    if (k === "aniso") {
      $("es-c11").value = 3;
      $("es-c12").value = 1;
      $("es-c44").value = 3;
    }
    render();
  });
$("es-shape").addEventListener("click", (event) => {
  const svgEl = $("es-shape").querySelector("svg");
  if (!svgEl) return;
  const r = svgEl.getBoundingClientRect(),
    x = ((event.clientX - r.left) / r.width) * 440 - 220,
    y = 165 - ((event.clientY - r.top) / r.height) * 340,
    phi = rad(num("es-phi")),
    ratio = 10 ** num("es-ratio"),
    lx = x * Math.cos(phi) + y * Math.sin(phi),
    ly = -x * Math.sin(phi) + y * Math.cos(phi);
  let psi = deg(Math.atan2(ly / (105 * ratio), lx / 105));
  if (psi < 0) psi += 360;
  $("es-psi").value = Math.round(psi);
  render();
});
render();
