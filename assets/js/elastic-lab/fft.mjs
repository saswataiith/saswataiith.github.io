// SPDX-License-Identifier: GPL-3.0-or-later
// Radix-2 FFT: forward unnormalised; inverse divided by number of samples.
function fft(real, imag, inverse) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const phase = ((inverse ? 2 : -2) * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let j = 0; j < size / 2; j++) {
        const c = Math.cos(phase * j),
          s = Math.sin(phase * j),
          a = start + j,
          b = a + size / 2,
          tr = c * real[b] - s * imag[b],
          ti = s * real[b] + c * imag[b];
        real[b] = real[a] - tr;
        imag[b] = imag[a] - ti;
        real[a] += tr;
        imag[a] += ti;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
}
export function transform(real, imag, n, inverse = false) {
  const r = new Float64Array(n),
    s = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      r[x] = real[y * n + x];
      s[x] = imag[y * n + x];
    }
    fft(r, s, inverse);
    for (let x = 0; x < n; x++) {
      real[y * n + x] = r[x];
      imag[y * n + x] = s[x];
    }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      r[y] = real[y * n + x];
      s[y] = imag[y * n + x];
    }
    fft(r, s, inverse);
    for (let y = 0; y < n; y++) {
      real[y * n + x] = r[y];
      imag[y * n + x] = s[y];
    }
  }
  return { real, imag };
}
export const spectrum = (field, n) =>
  transform(Float64Array.from(field), new Float64Array(field.length), n);
export function derivative(field, n, axis) {
  const { real, imag } = spectrum(field, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const j = axis === 0 ? x : y,
        k = j === n / 2 ? 0 : 2 * Math.PI * (j < n / 2 ? j : j - n),
        i = y * n + x,
        r = real[i];
      real[i] = -k * imag[i];
      imag[i] = k * r;
    }
  return transform(real, imag, n, true).real;
}
export function inverseAcoustic(vector, n, c) {
  const size = n * n,
    u = spectrum(vector.slice(0, size), n),
    v = spectrum(vector.slice(size), n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const kx = x === n / 2 ? 0 : 2 * Math.PI * (x < n / 2 ? x : x - n),
        ky = y === n / 2 ? 0 : 2 * Math.PI * (y < n / 2 ? y : y - n),
        i = y * n + x;
      const a = c.c11 * kx * kx + c.c44 * ky * ky,
        d = c.c44 * kx * kx + c.c11 * ky * ky,
        b = (c.c12 + c.c44) * kx * ky,
        det = a * d - b * b;
      for (const part of ["real", "imag"]) {
        const p = u[part][i],
          q = v[part][i];
        u[part][i] = det ? (d * p - b * q) / det : 0;
        v[part][i] = det ? (a * q - b * p) / det : 0;
      }
    }
  transform(u.real, u.imag, n, true);
  transform(v.real, v.imag, n, true);
  const out = new Float64Array(2 * size);
  out.set(u.real);
  out.set(v.real, size);
  return out;
}
