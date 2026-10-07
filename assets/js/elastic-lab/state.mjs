// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
import { validate, radians, roots } from "./math.mjs?v=20260924c";
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
// I validate only the module being calculated, so another module cannot block it.
export function read(module = "habit") {
  const section = element(module);
  for (const input of section.querySelectorAll("input:not([type=checkbox])")) {
    if (
      input.value.trim() === "" ||
      input.validity.badInput ||
      input.validity.rangeUnderflow ||
      input.validity.rangeOverflow ||
      !Number.isFinite(Number(input.value))
    )
      throw Error("Enter finite values within this module's displayed limits.");
  }
  if (module === "kernel")
    return {
      t: value("kernel-t"),
      epsilon: value("kernel-epsilon"),
      c: stiffness("c"),
    };
  if (module === "pairs")
    return {
      c: stiffness("pair-"),
      beta: eigen("beta"),
      gamma: eigen("gamma"),
    };
  return {
    t: value("t"),
    epsilon: value("epsilon"),
    c: stiffness("habit-"),
    theta:
      element("follow-habit")?.checked && roots(value("t")).length
        ? roots(value("t"))[0]
        : radians(value("theta")),
  };
}
export function plateSettings() {
  for (const input of element("contrast").querySelectorAll("input")) {
    if (
      input.value.trim() === "" ||
      !Number.isFinite(Number(input.value)) ||
      input.validity.rangeUnderflow ||
      input.validity.rangeOverflow
    )
      throw Error("Enter finite values within Module V's limits.");
  }
  const phase = element("plate-phase").value;
  return {
    n: value("grid-size"),
    count: value("angle-count"),
    cm: stiffness("m"),
    cp: stiffness(phase === "beta" ? "b" : "g"),
    eigen: [
      value("plate-" + phase),
      value("plate-" + phase) * value("plate-t" + phase),
      0,
    ],
    phase,
  };
}
