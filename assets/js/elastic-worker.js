const size = 256;
const displaySize = 128;
const pointCount = size * size;
const timeStep = 0.2;
let composition;
let waveNumberSquared;
let denominator;
let currentStep = 0;
let running = false;

function transform1D(real, imaginary, inverse) {
  const length = real.length;
  for (let index = 1, swap = 0; index < length; index += 1) {
    let bit = length >> 1;
    while (swap & bit) {
      swap ^= bit;
      bit >>= 1;
    }
    swap ^= bit;
    if (index < swap) {
      [real[index], real[swap]] = [real[swap], real[index]];
      [imaginary[index], imaginary[swap]] = [imaginary[swap], imaginary[index]];
    }
  }
  for (let block = 2; block <= length; block <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / block;
    const baseReal = Math.cos(angle);
    const baseImaginary = Math.sin(angle);
    for (let start = 0; start < length; start += block) {
      let factorReal = 1;
      let factorImaginary = 0;
      for (let offset = 0; offset < block / 2; offset += 1) {
        const even = start + offset;
        const odd = even + block / 2;
        const oddReal = real[odd] * factorReal - imaginary[odd] * factorImaginary;
        const oddImaginary = real[odd] * factorImaginary + imaginary[odd] * factorReal;
        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;
        const nextReal = factorReal * baseReal - factorImaginary * baseImaginary;
        factorImaginary = factorReal * baseImaginary + factorImaginary * baseReal;
        factorReal = nextReal;
      }
    }
  }
  if (inverse) {
    for (let index = 0; index < length; index += 1) {
      real[index] /= length;
      imaginary[index] /= length;
    }
  }
}

function transform2D(real, imaginary, inverse = false) {
  const lineReal = new Float64Array(size);
  const lineImaginary = new Float64Array(size);
  for (let row = 0; row < size; row += 1) {
    const start = row * size;
    for (let column = 0; column < size; column += 1) {
      lineReal[column] = real[start + column];
      lineImaginary[column] = imaginary[start + column];
    }
    transform1D(lineReal, lineImaginary, inverse);
    for (let column = 0; column < size; column += 1) {
      real[start + column] = lineReal[column];
      imaginary[start + column] = lineImaginary[column];
    }
  }
  for (let column = 0; column < size; column += 1) {
    for (let row = 0; row < size; row += 1) {
      const index = row * size + column;
      lineReal[row] = real[index];
      lineImaginary[row] = imaginary[index];
    }
    transform1D(lineReal, lineImaginary, inverse);
    for (let row = 0; row < size; row += 1) {
      const index = row * size + column;
      real[index] = lineReal[row];
      imaginary[index] = lineImaginary[row];
    }
  }
}

function prepare(parameters) {
  const { meanComposition, misfitPercent, scaledShearModulus, poissonRatio, zenerRatio } = parameters;
  const eigenstrain = misfitPercent / 100;
  const elasticScale = scaledShearModulus;
  // Parameterization used in PhaseField_Examples_Spectral.ipynb.
  const poissonCorrection = (1 - 4 * poissonRatio) / (1 - 2 * poissonRatio);
  const c44 = elasticScale * 2 * zenerRatio / (1 + zenerRatio);
  const c11 = elasticScale * (2 * (2 + zenerRatio) / (1 + zenerRatio) - poissonCorrection);
  const c12 = elasticScale * (2 * zenerRatio / (1 + zenerRatio) - poissonCorrection);
  const stress = (c11 + c12) * eigenstrain;
  waveNumberSquared = new Float64Array(pointCount);
  const elasticKernel = new Float64Array(pointCount);
  denominator = new Float64Array(pointCount);
  composition = new Float64Array(pointCount);
  for (let row = 0; row < size; row += 1) {
    const integerX = row <= size / 2 ? row : row - size;
    const kx = 2 * Math.PI * integerX / size;
    for (let column = 0; column < size; column += 1) {
      const integerY = column <= size / 2 ? column : column - size;
      const ky = 2 * Math.PI * integerY / size;
      const index = row * size + column;
      const k2 = kx * kx + ky * ky;
      waveNumberSquared[index] = k2;
      let kernelValue = 0;
      if (k2 > 0) {
        const nx = kx / Math.sqrt(k2);
        const ny = ky / Math.sqrt(k2);
        const q11 = c11 * nx * nx + c44 * ny * ny;
        const q22 = c44 * nx * nx + c11 * ny * ny;
        const q12 = (c12 + c44) * nx * ny;
        const determinant = q11 * q22 - q12 * q12;
        kernelValue = 2 * (c11 + c12) * eigenstrain * eigenstrain
          - stress * stress * (q22 * nx * nx - 2 * q12 * nx * ny + q11 * ny * ny) / determinant;
      }
      elasticKernel[index] = kernelValue;
      const hash = Math.sin((row + 1) * 12.9898 + (column + 1) * 78.233) * 43758.5453;
      composition[index] = meanComposition + 0.02 * (hash - Math.floor(hash) - 0.5);
    }
  }
  // On an even grid, symmetrize the Nyquist partners so that the discrete
  // operator maps a real composition field back to a real field.
  for (let row = 0; row < size; row += 1) {
    const partnerRow = (size - row) % size;
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const partner = partnerRow * size + (size - column) % size;
      const kernelValue = 0.5 * (elasticKernel[index] + elasticKernel[partner]);
      denominator[index] = 1 + timeStep * waveNumberSquared[index]
        * (waveNumberSquared[index] + kernelValue);
    }
  }
  let mean = composition.reduce((sum, value) => sum + value, 0) / pointCount;
  for (let index = 0; index < pointCount; index += 1) composition[index] += meanComposition - mean;
  currentStep = 0;
  sendState(parameters);
}

function advance() {
  const fieldReal = new Float64Array(composition);
  const fieldImaginary = new Float64Array(pointCount);
  const chemicalReal = new Float64Array(pointCount);
  const chemicalImaginary = new Float64Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    const value = composition[index];
    chemicalReal[index] = 2 * value * (1 - value) * (1 - 2 * value);
  }
  transform2D(fieldReal, fieldImaginary);
  transform2D(chemicalReal, chemicalImaginary);
  for (let index = 0; index < pointCount; index += 1) {
    const factor = timeStep * waveNumberSquared[index];
    fieldReal[index] = (fieldReal[index] - factor * chemicalReal[index]) / denominator[index];
    fieldImaginary[index] = (fieldImaginary[index] - factor * chemicalImaginary[index]) / denominator[index];
  }
  transform2D(fieldReal, fieldImaginary, true);
  composition = fieldReal;
  currentStep += 1;
}

function sendState(parameters) {
  let sum = 0;
  let minimum = Infinity;
  let maximum = -Infinity;
  const display = new Float32Array(displaySize * displaySize);
  for (let index = 0; index < pointCount; index += 1) {
    const value = composition[index];
    sum += value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  // Average each 2 x 2 block for the compact browser display. The solver
  // itself always evolves all 256 x 256 degrees of freedom.
  for (let row = 0; row < displaySize; row += 1) {
    for (let column = 0; column < displaySize; column += 1) {
      const sourceRow = 2 * row;
      const sourceColumn = 2 * column;
      display[row * displaySize + column] = 0.25 * (
        composition[sourceRow * size + sourceColumn]
        + composition[(sourceRow + 1) * size + sourceColumn]
        + composition[sourceRow * size + sourceColumn + 1]
        + composition[(sourceRow + 1) * size + sourceColumn + 1]);
    }
  }
  postMessage({ type: 'state', field: display, time: currentStep * timeStep,
    mean: sum / pointCount, minimum, maximum, parameters }, [display.buffer]);
}

function iterate(parameters) {
  if (!running) return;
  for (let iteration = 0; iteration < 3 && currentStep < 5000; iteration += 1) advance();
  sendState(parameters);
  if (currentStep >= 5000) {
    running = false;
    postMessage({ type: 'complete' });
    return;
  }
  setTimeout(() => iterate(parameters), 30);
}

onmessage = event => {
  if (event.data.type === 'start') {
    running = false;
    prepare(event.data.parameters);
    running = true;
    iterate(event.data.parameters);
  } else if (event.data.type === 'pause') {
    running = false;
  } else if (event.data.type === 'resume' && !running) {
    running = true;
    iterate(event.data.parameters);
  }
};
