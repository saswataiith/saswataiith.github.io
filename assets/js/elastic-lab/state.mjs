// SPDX-License-Identifier: GPL-3.0-or-later
import { validate, radians, roots } from "./math.mjs?v=20260924a";
export const element = (id) => document.getElementById(id);
export const value = (id) => Number(element(id).value);
export function stiffness(prefix) {
  return validate({
    c11: value(prefix + "c11"),
    c12: value(prefix + "c12"),
    c44: value(prefix + "c44"),
  });
}
export function setStiffness(prefix, c) {
  for (const key of ["c11", "c12", "c44"]) element(prefix + key).value = c[key];
}
export const eigen = (phase) => [
  value(phase),
  value(phase) * value("t" + phase),
  0,
];
export function read() {
  for (const input of document.querySelectorAll(
    "#elastic-lab input:not([type=checkbox])",
  ))
    if (
      input.value.trim() === "" ||
      input.validity.badInput ||
      input.validity.rangeUnderflow ||
      input.validity.rangeOverflow ||
      !Number.isFinite(Number(input.value))
    )
      throw Error("Enter finite values within the displayed input limits.");
  return {
    t: value("t"),
    epsilon: value("epsilon"),
    // The field shows θ to 4 decimals; while following, compute on the exact root.
    theta:
      element("follow-habit")?.checked && roots(value("t")).length
        ? roots(value("t"))[0]
        : radians(value("theta")),
    c: stiffness("c"),
    beta: eigen("beta"),
    gamma: eigen("gamma"),
  };
}
export function plateSettings() {
  const phase = element("plate-phase").value;
  return {
    n: value("grid-size"),
    count: value("angle-count"),
    cm: stiffness("m"),
    cp: stiffness(phase === "beta" ? "b" : "g"),
    eigen: eigen(phase),
    phase,
  };
}
