(() => {
  const slider = document.getElementById('misfit-t');
  if (!slider) return;
  const render = () => {
    const t = Number(slider.value), a = (1 + 3*t)/4, b = Math.sqrt(3)*(1-t)/4, d = (3+t)/4;
    const tensors = [[1,0,0,t],[a,b,b,d],[a,-b,-b,d]];
    const fmt = x => (Math.abs(x) < 0.0005 ? 0 : x).toFixed(3);
    document.getElementById('misfit-value').textContent = t.toFixed(2);
    document.getElementById('variant-tensors').innerHTML = tensors.map((m,i) => `<article class="resource-card"><h3>Variant ${i+1}</h3><table class="tensor-matrix" aria-label="Eigenstrain tensor for variant ${i+1}; rows and columns are x, y"><tbody><tr><td>${fmt(m[0])}</td><td>${fmt(m[1])}</td></tr><tr><td>${fmt(m[2])}</td><td>${fmt(m[3])}</td></tr></tbody></table></article>`).join('');
    document.getElementById('misfit-description').textContent = t === 1 ? 't = 1: isotropic dilatational misfit. All three variant tensors coincide.' : t === -1 ? 't = −1: traceless deviatoric misfit. The two principal strains are equal and opposite.' : t === 0 ? 't = 0: one principal eigenstrain is zero; the other is 1.' : `Trace = ${(1+t).toFixed(2)}. ${t < 0 ? 'The principal eigenstrains have opposite signs.' : 'Both principal eigenstrains are positive, with unequal magnitudes.'}`;
  };
  slider.addEventListener('input', render); render();
})();
