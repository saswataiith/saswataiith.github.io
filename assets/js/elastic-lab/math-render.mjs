// SPDX-License-Identifier: GPL-3.0-or-later
// Use the site's local MathJax TeX-to-SVG renderer for equations AND plot labels.
// Numerical routines never depend on MathJax.
const pending = new Set(),
  labelCache = new Map();
let queued = false,
  labelSerial = 0;
const symbols = {
  "ε⁰": "\\epsilon^0",
  εη: "\\epsilon_\\eta",
  εnn: "\\epsilon^0_{nn}",
  εss: "\\epsilon^0_{ss}",
  C11: "C_{11}",
  C12: "C_{12}",
  C44: "C_{44}",
  Bββ: "B_{\\beta\\beta}",
  Bγγ: "B_{\\gamma\\gamma}",
  Bβγ: "B_{\\beta\\gamma}",
  AZ: "A_Z",
  "B(n)": "B(\\mathbf n)",
  "Bpq(n)": "B_{pq}(\\mathbf n)",
  "Q⁻¹": "Q^{-1}",
  β: "\\beta",
  γ: "\\gamma",
  θ: "\\theta",
};
const token = new RegExp(
  Object.keys(symbols)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);
export const mathematicalText = (text) =>
  text.replace(token, (match) => "\\(" + symbols[match] + "\\)");
export function clearMath(element) {
  if (window.MathJax?.typesetClear) window.MathJax.typesetClear([element]);
}
export function renderMath(element) {
  pending.add(element);
  if (queued) return;
  queued = true;
  requestAnimationFrame(async () => {
    try {
      await window.MathJax?.startup?.promise;
      if (!window.MathJax?.tex2svg) return;
      const elements = [...pending];
      pending.clear();
      for (const element of elements) {
        // SVG text cannot be processed by ordinary HTML typesetting.
        for (const group of element.querySelectorAll("[data-tex]")) {
          const tex = group.dataset.tex;
          if (!labelCache.has(tex)) {
            const container = window.MathJax.tex2svg(tex, {
              display: false,
              fontCache: "none",
            });
            const svg = container.querySelector("svg");
            const box = svg.getAttribute("viewBox").split(/\s+/).map(Number);
            // MathJax's viewBox is in 1000 units/em. Keep the original text baseline.
            const scale = 0.014;
            svg.setAttribute("width", box[2] * scale);
            svg.setAttribute("height", box[3] * scale);
            svg.setAttribute("x", 0);
            svg.setAttribute("y", box[1] * scale);
            svg.style.overflow = "visible";
            svg.style.width = box[2] * scale + "px";
            svg.style.height = box[3] * scale + "px";
            labelCache.set(tex, svg.outerHTML);
          }
          let markup = labelCache.get(tex);
          const suffix = "-lab-" + ++labelSerial;
          const ids = [...markup.matchAll(/id="([^"]+)"/g)].map(
            (match) => match[1],
          );
          for (const id of ids)
            markup = markup
              .replaceAll('id="' + id + '"', 'id="' + id + suffix + '"')
              .replaceAll("#" + id + '"', "#" + id + suffix + '"');
          group.innerHTML = markup;
        }
      }
      await window.MathJax.typesetPromise(elements);
    } catch (error) {
      console.error("Laboratory mathematical typesetting:", error);
    } finally {
      queued = false;
      if (pending.size) renderMath([...pending][0]);
    }
  });
}
export function mathLabel(x, y, tex, fallback, more = "") {
  const safe = tex
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
  return `<g ${more} transform="translate(${x} ${y})" data-tex="${safe}" aria-label="${fallback}"><text>${fallback}</text></g>`;
}

export const texNumber = (value) =>
  String(value).replace(
    /e([+-]?\d+)/,
    (match, exponent) => String.raw`\times 10^{${Number(exponent)}}`,
  );
