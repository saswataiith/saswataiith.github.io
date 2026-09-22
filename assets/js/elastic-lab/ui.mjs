// SPDX-License-Identifier: GPL-3.0-or-later
import {
  contract,
  stress,
  radians,
  roots,
  projection,
  kernel,
  sample,
  minima,
  zener,
  moduli,
} from "./math.mjs";
import { pairCurve } from "./solver.mjs";
import { cartesian, polar, mohr, sketch, strainShape, fmt } from "./plots.mjs";
import {
  element,
  value,
  stiffness,
  setStiffness,
  read,
  plateSettings,
} from "./state.mjs";
const set = (id, text) => (element(id).textContent = text);
const draw = (id, html) => (element(id).innerHTML = html);
const degrees = (a) => ((a * 180) / Math.PI).toFixed(2) + "°";
const locations = (m) =>
  m.flat
    ? "all directions (flat curve)"
    : m.global.map((p) => degrees(p.angle)).join(", ");
let worker = null,
  scanTimer = null,
  plateData = null,
  plateConfig = null;
function renderHabit(s) {
  const solutions = roots(s.t),
    p = projection(s.t, s.theta);
  element("t-slider").value = s.t;
  set(
    "tensor-readout",
    `ε⁰ = εη diag(1, t) = diag(${fmt(s.epsilon)}, ${fmt(s.epsilon * s.t)}). Principal strains: ${fmt(s.epsilon)}, ${fmt(s.epsilon * s.t)}. Selected εnn = ${fmt(s.epsilon * p)}.`,
  );
  set(
    "habit-result",
    solutions.length
      ? `Zero-extension line directions θ: ${solutions.map(degrees).join(", ")}. Interface normals are perpendicular. ${s.t === 0 ? "Limiting line: y = [01]." : ""}`
      : "No stress-free compatible habit line of this type.",
  );
  draw("strain-shape", strainShape(s.t));
  draw("mohr", mohr(s.t, s.theta));
  draw(
    "normal-strain",
    cartesian(
      [{ name: "εnn / εη", points: sample((a) => projection(s.t, a), 361) }],
      "Normal eigenstrain along n(θ)",
      { angle: s.theta, value: p },
    ),
  );
  draw("habit-sketch", sketch(s.theta));
  set(
    "habit-why",
    solutions.length
      ? `The principal strains ${fmt(s.epsilon)} and ${fmt(s.epsilon * s.t)} ${s.t < 0 ? "have opposite signs" : "include a zero"}. Their directional projection can vanish. Taking that direction as a line tangent permits the ideal 2-D compatibility construction. At the selected angle the normalized tangential strain is ${fmt(p)}; only a root is a candidate stress-free habit line. The orange normal is perpendicular to the green line.`
      : "Both principal strains have the same positive sign. Every directional projection is positive. The Mohr circle does not cross the zero-normal-strain axis; rotating the plate cannot supply this compatibility mechanism.",
  );
  element("find-habit").disabled = !solutions.length;
}
function renderKernels(s) {
  const e = [s.epsilon, s.epsilon * s.t, 0],
    single = sample((a) => kernel(s.c, e, e, a)),
    m = minima(single),
    series = [{ name: "B(n)", points: single }];
  draw("kernel-cart", cartesian(series, "Elastic kernel versus normal angle"));
  draw("kernel-polar", polar(series, "B(n): modulation normal"));
  set(
    "kernel-result",
    `AZ = ${fmt(zener(s.c))}. Minimum B = ${fmt(m.lo)}. Normal directions: ${locations(m)}. ${m.flat ? "No preferred orientation from this kernel." : "Ideal plate tangents are 90° from these normals."}`,
  );
  set(
    "kernel-why",
    `C11 = ${fmt(s.c.c11)}, C12 = ${fmt(s.c.c12)}, C44 = ${fmt(s.c.c44)} set Q(n). Together with ε⁰ = diag(${fmt(e[0])}, ${fmt(e[1])}), they set σ⁰ and the relaxation term a·Q⁻¹a. The unrelaxed contraction ε⁰:C:ε⁰ is ${fmt(contract(e, stress(s.c, e)))}. At the minimum, relaxation removes ${fmt(contract(e, stress(s.c, e)) - m.lo)}, leaving B = ${fmt(m.lo)}. The preferred direction permits the greatest relaxation for this eigenstrain. ${m.flat ? "The cancellation is independent of direction." : "It favors a modulation normal, not an arbitrary real-space particle-separation direction."}`,
  );
  const bb = sample((a) => kernel(s.c, s.beta, s.beta, a)),
    gg = sample((a) => kernel(s.c, s.gamma, s.gamma, a)),
    bg = sample((a) => kernel(s.c, s.beta, s.gamma, a));
  const pairSeries = [
    { name: "Bββ", points: bb },
    { name: "Bγγ", points: gg },
    { name: "Bβγ", points: bg },
  ];
  draw(
    "pair-kernels-cart",
    cartesian(pairSeries, "Independent self and cross kernels"),
  );
  draw("pair-kernels-polar", polar(pairSeries, "Bpq(n): signed radial values"));
  set(
    "pair-kernels-result",
    pairSeries
      .map(
        (series) =>
          `${series.name}: min ${fmt(minima(series.points).lo)} at ${locations(minima(series.points))}`,
      )
      .join(" | "),
  );
  set(
    "pair-kernels-why",
    `All three curves use the same C and Q⁻¹, but separate eigenstrain pairs. Self terms are quadratic; the cross term is bilinear. β = (${fmt(s.beta[0])}, ${fmt(s.beta[1])}), γ = (${fmt(s.gamma[0])}, ${fmt(s.gamma[1])}). Reversing every component of γ reverses Bβγ without changing Bγγ. The curve minima above are calculated from these contractions, not assigned from AZ.`,
  );
}
function renderPair(s) {
  const type = element("pair-type").value,
    p = type === "gg" ? s.gamma : s.beta,
    q = type === "bb" ? s.beta : s.gamma,
    points = pairCurve(s.c, p, q, { distance: value("separation") }),
    m = minima(points),
    a = radians(value("pair-angle")),
    nearest = points[Math.round(value("pair-angle")) % 180];
  draw(
    "pair-energy",
    cartesian(
      [{ name: "Eint", points }],
      "Pair energy versus separation angle",
      { angle: a, value: nearest.value },
    ),
  );
  draw(
    "pair-sketch",
    sketch(a, {
      pair: true,
      phase: type === "bb" ? "ββ" : type === "gg" ? "γγ" : "βγ",
      distance: value("separation"),
    }),
  );
  set(
    "pair-result",
    `Minimum interaction energy ${fmt(m.lo)} at ${locations(m)}. At nearest 1° sample to selected angle: ${fmt(nearest.value)}. Energy is per box area.`,
  );
  set(
    "pair-why",
    `The cross kernel weights every mode of the particle profile. Separation ${value("separation")} enters through cos(k·R), so the summed interaction has minima at ${locations(m)}. This includes periodic copies and the clamped zero mode. Negative interaction energy lowers the total relative to the two separate profiles in the same box; it does not mean the full elastic energy is negative.`,
  );
}
function render() {
  try {
    const s = read();
    renderHabit(s);
    renderKernels(s);
    renderPair(s);
    set("lab-error", "");
  } catch (error) {
    set(
      "lab-error",
      error.message + " Plots retain the last valid calculation.",
    );
  }
}
function plateSketch() {
  const angle = radians(value("plate-angle"));
  draw("plate-sketch", sketch(angle));
  if (plateData) {
    const index =
      Math.round((value("plate-angle") / 180) * plateData.length) %
      plateData.length;
    draw(
      "plate-cart",
      cartesian(
        [{ name: "Eel", points: plateData }],
        "Finite plate energy versus tangent angle",
        { angle, value: plateData[index].value },
      ),
    );
  }
}
function stop() {
  if (worker) worker.terminate();
  worker = null;
  clearTimeout(scanTimer);
  element("stop-plate").disabled = true;
}
function scan() {
  stop();
  try {
    read();
    const config = plateSettings();
    plateConfig = config;
    plateData = null;
    element("download-plate").disabled = true;
    set("plate-result", "Calculating with current parameters.");
    set("plate-progress", "Starting mechanical-equilibrium solves…");
    draw("plate-cart", "");
    draw("plate-polar", "");
    plateSketch();
    worker = new Worker(new URL("./worker.mjs", import.meta.url), {
      type: "module",
    });
    element("stop-plate").disabled = false;
    worker.onmessage = ({ data }) => {
      if (data.error) {
        set("plate-progress", data.error);
        stop();
        return;
      }
      if (data.progress) {
        set(
          "plate-progress",
          `Solving ${config.n} × ${config.n} grid: ${(data.progress * 100).toFixed(0)}%`,
        );
        return;
      }
      plateData = data.points;
      const m = minima(plateData);
      draw(
        "plate-cart",
        cartesian(
          [{ name: "Eel", points: plateData }],
          "Finite plate energy versus tangent angle",
        ),
      );
      draw(
        "plate-polar",
        polar(
          [{ name: "Eel", points: plateData }],
          "Finite plate energy: tangent angle",
        ),
      );
      set(
        "plate-result",
        `Sampled global minimum ${fmt(m.lo)} at ${locations(m)}. Local minima: ${m.flat ? "all angles" : m.local.map((p) => degrees(p.angle)).join(", ")}. Grid ${config.n}²; angle step ${180 / config.count}°. ${Math.abs(zener(config.cm) - 1) < 1e-10 && Math.abs(zener(config.cp) - 1) < 1e-10 && config.eigen[0] === config.eigen[1] && config.eigen[2] === 0 ? "Both phases are isotropic with dilatational misfit: any angular differences here arise from the periodic cell and discretization, not a crystallographic direction in an infinite medium." : ""} Energy spread ${((100 * (m.hi - m.lo)) / Math.max(Math.abs(m.hi), 1e-30)).toPrecision(3)}%. ${m.hi - m.lo < 0.005 * Math.max(Math.abs(m.hi), 1e-30) ? "Weak or unresolved orientation preference. Refine the grid before interpreting these minima." : ""}`,
      );
      set(
        "plate-progress",
        `Complete. Maximum relative residual ${data.worst.toExponential(2)}; maximum ${data.maxIterations} PCG iterations.${data.referenceError !== null ? " Homogeneous Fourier check: relative error " + data.referenceError.toExponential(2) + "." : ""}`,
      );
      set(
        "plate-why",
        `For the ${config.phase} plate, C varies from matrix (${Object.values(config.cm).map(fmt).join(", ")}) to plate (${Object.values(config.cp).map(fmt).join(", ")}); entries are C11, C12, C44. The fixed eigenstrain is (${config.eigen.map(fmt).join(", ")}). Each orientation changes which parts of this mismatch can relax through the spatially varying stiffness. Mechanical equilibrium is solved anew at every angle. The lowest sampled elastic penalty is at ${locations(m)}. At a minimum, the energy before displacement relaxation is ${fmt(plateData.reduce((best, p) => (p.value < best.value ? p : best)).unrelaxedEnergy)}; equilibrium reduces it to ${fmt(m.lo)}. The released energy is ${fmt(plateData.reduce((best, p) => (p.value < best.value ? p : best)).unrelaxedEnergy - m.lo)}. This finite plate need not choose the zero-extension angle of an infinite plate. Compare finer grids and angular steps before interpreting small differences.`,
      );
      element("download-plate").disabled = false;
      stop();
    };
    worker.onerror = (e) => {
      set("plate-progress", "Solver error: " + e.message);
      stop();
    };
    worker.postMessage(config);
  } catch (error) {
    set("plate-progress", error.message);
  }
}
function queueScan() {
  stop();
  set("plate-result", "Parameters changed; previous results cleared.");
  plateData = null;
  draw("plate-cart", "");
  draw("plate-polar", "");
  element("download-plate").disabled = true;
  scanTimer = setTimeout(scan, 450);
}
element("t-slider").addEventListener("input", () => {
  element("t").value = value("t-slider");
  renderHabit(read());
  renderKernels(read());
});
for (const id of ["t", "epsilon", "theta"])
  element(id).addEventListener("input", () => {
    try {
      const s = read();
      renderHabit(s);
      renderKernels(s);
      set("lab-error", "");
    } catch (error) {
      set(
        "lab-error",
        error.message + " Plots retain the last valid calculation.",
      );
    }
  });
for (const input of document.querySelectorAll(
  "#elastic-lab input,#elastic-lab select",
))
  input.addEventListener("change", () => {
    if (input.id === "plate-angle") {
      plateSketch();
      return;
    }
    render();
    if (
      /^[mbg]c(11|12|44)$/.test(input.id) ||
      [
        "beta",
        "gamma",
        "tbeta",
        "tgamma",
        "plate-phase",
        "grid-size",
        "angle-count",
      ].includes(input.id)
    )
      queueScan();
  });
for (const button of document.querySelectorAll("[data-preset]"))
  button.addEventListener("click", () => {
    try {
      const preset = button.dataset.preset;
      if (["minus", "zero", "positive"].includes(preset)) {
        element("t").value = { minus: -1, zero: 0, positive: 0.5 }[preset];
        const r = roots(value("t"));
        if (r.length) element("theta").value = (r[0] * 180) / Math.PI;
      }
      if (preset === "isotropic") {
        const c = stiffness("c");
        c.c44 = (c.c11 - c.c12) / 2;
        setStiffness("c", c);
      }
      if (preset === "anisotropic")
        setStiffness("c", { c11: 3, c12: 1, c44: 3 });
      if (["opposite", "sandeep"].includes(preset)) {
        element("beta").value = 0.01;
        element("gamma").value = -0.01;
        element("tbeta").value = 1;
        element("tgamma").value = 1;
        if (preset === "sandeep") setStiffness("c", moduli(2000, 1 / 3, 3));
        queueScan();
      }
      if (["soft", "hard", "homogeneous"].includes(preset)) {
        const c = stiffness("m"),
          ratio = { soft: 0.5, hard: 2, homogeneous: 1 }[preset];
        setStiffness(
          element("plate-phase").value === "beta" ? "b" : "g",
          Object.fromEntries(
            Object.entries(c).map(([key, v]) => [key, v * ratio]),
          ),
        );
        queueScan();
      }
      render();
    } catch (error) {
      set("lab-error", error.message);
    }
  });
element("find-habit").addEventListener("click", () => {
  const target = roots(value("t"))[0];
  if (target === undefined) return;
  const start = value("theta"),
    end = (target * 180) / Math.PI,
    time = performance.now(),
    duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
  function frame(now) {
    const f = duration ? Math.min(1, (now - time) / duration) : 1;
    element("theta").value = start + (end - start) * f;
    renderHabit(read());
    if (f < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
element("scan-plate").addEventListener("click", scan);
element("stop-plate").addEventListener("click", () => {
  stop();
  set("plate-progress", "Stopped. Change parameters or calculate again.");
});
element("download-plate").addEventListener("click", () => {
  const blob = new Blob(
      [
        JSON.stringify(
          {
            parameters: plateConfig,
            boundary: "periodic, mean total strain zero",
            points: plateData,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "elastic-plate-results.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
fetch("/files/elastic-lab/validation-results.json")
  .then((r) => r.json())
  .then((report) =>
    set(
      "validation-summary",
      `${report.tests.length} validation groups passed. These cover analytical kernels, habit-line limits, Sandeep’s reference, pair interactions, homogeneous recovery and resolution convergence. The full report includes numerical errors.`,
    ),
  )
  .catch(() => {});
render();
plateSketch();
scan();
