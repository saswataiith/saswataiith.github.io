// SPDX-License-Identifier: GPL-3.0-or-later
// I keep conversion, stability and reset controls local to each experiment.
import {
  moduli,
  elasticParameters,
  validate,
  zener,
} from "./math.mjs?v=20261006-independent-stiffness";
import { cartesian, fmt } from "./plots.mjs?v=20261007-independent-modules";
import { renderMath } from "./math-render.mjs?v=20260924c";
const element = (id) => document.getElementById(id);
const number = (id) => Number(element(id).value);
const panels = [...document.querySelectorAll("[data-conversion]")];

function readConstants(prefix) {
  const values = ["c11", "c12", "c44"].map((key) => {
    const input = element(prefix + key);
    if (input.value.trim() === "" || !Number.isFinite(Number(input.value)))
      throw Error("Enter three finite stiffness values.");
    return Number(input.value);
  });
  return { c11: values[0], c12: values[1], c44: values[2] };
}
function message(panel, text) {
  let target = panel.querySelector(".conversion-message");
  if (!target) {
    target = document.createElement("p");
    target.className = "conversion-message";
    panel.append(target);
  }
  target.textContent = text;
}
function sync(panel) {
  try {
    const prefix = panel.dataset.conversion,
      c = readConstants(prefix),
      p = elasticParameters(c);
    for (const [key, value] of [
      ["mu", p.mu],
      ["nu", p.nu],
      ["az", p.z],
    ]) {
      const input = element(prefix + key);
      if (!input.readOnly && document.activeElement !== input)
        input.value = Number(value.toPrecision(12));
    }
    const fixed = element(prefix + "nu").readOnly;
    message(
      panel,
      fixed && Math.abs(p.nu - number(prefix + "nu")) > 1e-8
        ? "Direct stiffnesses imply effective ν = " +
            fmt(p.nu) +
            ". The conversion inputs retain the fixed ν = 1/3."
        : "Equivalent parameters calculated from this module’s stiffnesses.",
    );
  } catch (error) {
    message(panel, error.message + " Conversion is unavailable for this set.");
  }
}
for (const panel of panels) {
  const prefix = panel.dataset.conversion,
    section = panel.closest("section");
  for (const key of ["mu", "nu", "az"])
    element(prefix + key).addEventListener("input", () => {
      try {
        const inputs = ["mu", "nu", "az"].map((name) => element(prefix + name));
        if (
          inputs.some(
            (input) =>
              input.value.trim() === "" ||
              !Number.isFinite(Number(input.value)),
          )
        )
          throw Error("Enter finite conversion parameters.");
        const mu = number(prefix + "mu"),
          nu = number(prefix + "nu"),
          az = number(prefix + "az");
        if (!(mu > 0 && az > 0 && nu < 0.5 && 1 + 3 * az + 4 * nu > 0))
          throw Error("Require μ > 0, AZ > 0, ν < 1/2 and 1 + 3AZ + 4ν > 0.");
        const c = validate(moduli(mu, nu, az));
        for (const name of ["c11", "c12", "c44"])
          element(prefix + name).value = Number(c[name].toPrecision(12));
        message(
          panel,
          "Converted stiffnesses satisfy the cubic stability conditions.",
        );
        section.dispatchEvent(new Event("lab:apply"));
      } catch (error) {
        message(
          panel,
          error.message + " Stiffnesses retain their last valid values.",
        );
      }
    });
  for (const key of ["c11", "c12", "c44"])
    element(prefix + key).addEventListener("input", () => sync(panel));
  section.addEventListener("lab:sync", () => sync(panel));
  sync(panel);
}

function stability() {
  try {
    const c = readConstants("zero-");
    const modes = [
      ["Uniform volume change", c.c11 + 2 * c.c12],
      ["Tetragonal distortion", c.c11 - c.c12],
      ["Principal-plane shear", c.c44],
    ];
    const stable = modes.every(([, v]) => v > 0);
    const rows = modes
      .map(
        ([name, v]) =>
          `<tr><td>${name}</td><td>${fmt(v)}</td><td>${v > 0 ? "positive" : v === 0 ? "zero: marginal" : "negative: unstable"}</td></tr>`,
      )
      .join("");
    element("stability-result").innerHTML =
      `<p><strong>${stable ? "Positive-definite cubic stiffness." : "This stiffness is not strictly positive definite."}</strong></p><table class="lab-table"><thead><tr><th>Mode</th><th>Stiffness eigenvalue (model units)</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table><p>Bulk modulus K = ${fmt((c.c11 + 2 * c.c12) / 3)}; Zener ratio AZ = ${c.c11 !== c.c12 ? fmt(zener(c)) : "undefined"}.</p>`;
    const amplitude = Array.from({ length: 101 }, (_, i) => (i - 50) * 0.0002);
    const coefficients = [
      1.5 * (c.c11 + 2 * c.c12),
      c.c11 - c.c12,
      0.5 * c.c44,
    ];
    const names = ["Volume", "Tetragonal", "Shear"];
    const markup = cartesian(
      coefficients.map((v, i) => ({
        name: names[i],
        points: amplitude.map((q) => ({ angle: q, value: v * q * q })),
      })),
      "Elastic energy density versus strain amplitude",
      null,
      { min: -0.01, max: 0.01, label: "strain amplitude q" },
    );
    element("stability-plot").innerHTML = markup;
    element("stability-error").textContent = "";
    renderMath(element("stability-plot"));
  } catch (error) {
    element("stability-error").textContent = error.message;
  }
}
element("stability").addEventListener("input", (event) => {
  if (!event.target.closest("[data-conversion]")) stability();
});
element("stability").addEventListener("lab:apply", stability);
element("stability-unstable").addEventListener("click", () => {
  for (const [key, value] of [
    ["c11", 1],
    ["c12", 2],
    ["c44", 1],
  ])
    element("zero-" + key).value = value;
  element("stability").dispatchEvent(new Event("lab:sync"));
  stability();
});
stability();

// I store each module's initial values after computing its equivalent parameters.
const defaults = new Map();
for (const id of [
  "stability",
  "habit",
  "eshelby",
  "kernel",
  "pairs",
  "contrast",
]) {
  const section = element(id);
  defaults.set(
    id,
    [...section.querySelectorAll("input,select")].map((input) => ({
      id: input.id,
      value: input.value,
      checked: input.checked,
    })),
  );
}
for (const button of document.querySelectorAll("[data-lab-try]"))
  button.addEventListener("click", () => {
    element(button.dataset.labTry).dispatchEvent(new Event("lab:apply"));
  });
for (const button of document.querySelectorAll("[data-lab-reset]"))
  button.addEventListener("click", () => {
    const id = button.dataset.labReset,
      section = element(id);
    for (const saved of defaults.get(id)) {
      const input = element(saved.id);
      input.value = saved.value;
      if (input.type === "checkbox") input.checked = saved.checked;
    }
    section.dispatchEvent(new Event("lab:sync"));
    section.dispatchEvent(new Event("lab:apply"));
  });
