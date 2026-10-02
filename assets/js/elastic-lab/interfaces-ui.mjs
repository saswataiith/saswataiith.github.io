// SPDX-License-Identifier: GPL-3.0-or-later
import {
  kinds,
  interpolation,
  derivative,
  secondDerivative,
  spatialProfile,
  samples,
} from "./interfaces.mjs?v=20261002a";
import { clearMath, renderMath } from "./math-render.mjs?v=20260924c";

const $ = (id) => document.getElementById(id),
  colors = {
    linear: "#226d9b",
    cubic: "#267c70",
    quintic: "#bd4d25",
    tanh: "#796411",
  },
  names = {
    linear: "linear",
    cubic: "cubic smoothstep",
    quintic: "quintic smootherstep",
    tanh: "normalized tanh",
  };

function path(points, x, y) {
  return points
    .map((point, iterator) =>
      `${iterator ? "L" : "M"}${x(point).toFixed(2)},${y(point).toFixed(2)}`,
    )
    .join(" ");
}

function axes(title, yLabel, body, ymax) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return `<svg viewBox="0 0 520 350" role="img" aria-label="${title}">
    <rect width="520" height="350" fill="#fff"/>
    <text x="25" y="27" font-size="15" font-weight="600">${title}</text>
    ${ticks.map((v) => `<line class="gridline" x1="58" x2="498" y1="${305 - 250 * v}" y2="${305 - 250 * v}"/><text x="48" y="${309 - 250 * v}" text-anchor="end">${(v * ymax).toFixed(ymax > 1 ? 1 : 2)}</text>`).join("")}
    ${ticks.map((v) => `<line class="gridline" y1="55" y2="305" x1="${58 + 440 * v}" x2="${58 + 440 * v}"/><text x="${58 + 440 * v}" y="325" text-anchor="middle">${v}</text>`).join("")}
    <line x1="58" x2="498" y1="305" y2="305" stroke="#17313a"/>
    <line x1="58" x2="58" y1="55" y2="305" stroke="#17313a"/>
    <text x="278" y="344" text-anchor="middle">η</text>
    <text x="15" y="180" text-anchor="middle" transform="rotate(-90 15 180)">${yLabel}</text>
    ${body}
  </svg>`;
}

function drawInterpolation() {
  const selected = $("interface-kind").value,
    beta = Number($("interface-beta").value),
    eta = Number($("interface-eta").value),
    all = Object.fromEntries(kinds.map((kind) => [kind, samples(kind, beta)])),
    maxSlope = Math.max(...kinds.flatMap((kind) => all[kind].map((p) => p.slope))),
    curveBody = kinds
      .map((kind) => {
        const opacity = kind === selected ? 1 : 0.42;
        return `<path d="${path(all[kind], (p) => 58 + 440 * p.eta, (p) => 305 - 250 * p.value)}" fill="none" stroke="${colors[kind]}" stroke-width="${kind === selected ? 4 : 2}" opacity="${opacity}"/>`;
      })
      .join("") + `<line x1="${58 + 440 * eta}" x2="${58 + 440 * eta}" y1="55" y2="305" stroke="#17313a" stroke-dasharray="6 4"/>`,
    slopeBody = kinds
      .map((kind) => {
        const opacity = kind === selected ? 1 : 0.42;
        return `<path d="${path(all[kind], (p) => 58 + 440 * p.eta, (p) => 305 - (250 * p.slope) / maxSlope)}" fill="none" stroke="${colors[kind]}" stroke-width="${kind === selected ? 4 : 2}" opacity="${opacity}"/>`;
      })
      .join("") + `<line x1="${58 + 440 * eta}" x2="${58 + 440 * eta}" y1="55" y2="305" stroke="#17313a" stroke-dasharray="6 4"/>`;
  $("interface-h-plot").innerHTML = axes(
    "Property interpolation",
    "h(η)",
    curveBody,
    1,
  );
  $("interface-dh-plot").innerHTML = axes(
    "Where the elastic driving force acts",
    "h′(η)",
    slopeBody,
    maxSlope,
  );
  const output = $("interface-readout");
  clearMath(output);
  output.innerHTML = `<strong>${names[selected]}</strong> at \(\eta=${eta.toFixed(2)}\):
    \(h=${interpolation(selected, eta, beta).toFixed(5)}\),
    \(h'=${derivative(selected, eta, beta).toFixed(5)}\),
    \(h''=${secondDerivative(selected, eta, beta).toFixed(5)}\).
    The dashed line marks the selected order-parameter value.`;
  renderMath(output);
  $("interface-beta-wrap").hidden = selected !== "tanh";
}

function drawDiffuseProfile() {
  const width = Number($("interface-width").value),
    n = 241,
    points = Array.from({ length: n }, (unused, iterator) => {
      const distance = -1.2 + (2.4 * iterator) / (n - 1);
      return { distance, value: spatialProfile(distance, width) };
    }),
    curve = path(
      points,
      (p) => 58 + ((p.distance + 1.2) / 2.4) * 440,
      (p) => 305 - 250 * p.value,
    );
  $("interface-profile-plot").innerHTML = `<svg viewBox="0 0 520 350" role="img" aria-label="Sharp indicator and diffuse tanh profile">
    <rect width="520" height="350" fill="#fff"/>
    <text x="25" y="27" font-size="15" font-weight="600">Sharp indicator → diffuse regularization</text>
    <line class="gridline" x1="58" x2="498" y1="305" y2="305"/><line class="gridline" x1="58" x2="498" y1="180" y2="180"/><line class="gridline" x1="58" x2="498" y1="55" y2="55"/>
    <line x1="58" x2="278" y1="55" y2="55" stroke="#60717a" stroke-width="2"/><line x1="278" x2="278" y1="55" y2="305" stroke="#60717a" stroke-width="2"/><line x1="278" x2="498" y1="305" y2="305" stroke="#60717a" stroke-width="2"/>
    <path d="${curve}" fill="none" stroke="#bd4d25" stroke-width="4"/>
    <line x1="278" x2="278" y1="48" y2="312" stroke="#17313a" stroke-dasharray="6 4"/>
    <text x="48" y="59" text-anchor="end">1</text><text x="48" y="184" text-anchor="end">0.5</text><text x="48" y="309" text-anchor="end">0</text>
    <text x="58" y="326">−1.2</text><text x="278" y="326" text-anchor="middle">0</text><text x="498" y="326" text-anchor="end">1.2</text>
    <text x="278" y="344" text-anchor="middle">signed distance d</text>
    <text x="82" y="78" fill="#60717a">sharp χΩ</text><text x="352" y="128" fill="#bd4d25">tanh h(d)</text>
  </svg>`;
  $("interface-width-value").textContent = width.toFixed(2);
}

for (const id of ["interface-kind", "interface-beta", "interface-eta"])
  $(id)?.addEventListener("input", drawInterpolation);
$("interface-width")?.addEventListener("input", drawDiffuseProfile);
if ($("interface-h-plot")) {
  drawInterpolation();
  drawDiffuseProfile();
}
