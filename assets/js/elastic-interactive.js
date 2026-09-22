(() => {
  const laboratory = document.querySelector('[data-elastic-laboratory]');
  if (!laboratory || !window.Worker) return;
  const defaults = { meanComposition: 0.5, misfitPercent: 1, scaledShearModulus: 400,
    poissonRatio: 1 / 3, zenerRatio: 3 };
  const limits = {
    meanComposition: [0.05, 0.95], misfitPercent: [0, 5], scaledShearModulus: [0.01, 1000000],
    poissonRatio: [-0.9, 0.49], zenerRatio: [0.05, 10]
  };
  const canvas = laboratory.querySelector('canvas');
  const context = canvas.getContext('2d');
  const image = context.createImageData(128, 128);
  const controls = [...laboratory.querySelectorAll('[data-parameter]')];
  const runButton = laboratory.querySelector('[data-run]');
  const resetButton = laboratory.querySelector('[data-reset]');
  const status = laboratory.querySelector('[data-status]');
  let worker;
  let isRunning = false;
  let parameters = { ...defaults };
  let restoredDefaults = false;

  function readParameters() {
    const candidate = {};
    controls.forEach(control => { candidate[control.dataset.parameter] = Number(control.value); });
    const valid = Object.entries(limits).every(([name, [minimum, maximum]]) =>
      Number.isFinite(candidate[name]) && candidate[name] >= minimum && candidate[name] <= maximum);
    if (!valid) {
      parameters = { ...defaults };
      writeParameters(parameters);
      restoredDefaults = true;
      return parameters;
    }
    restoredDefaults = false;
    parameters = candidate;
    return parameters;
  }

  function writeParameters(values) {
    controls.forEach(control => { control.value = Number(values[control.dataset.parameter].toFixed(3)); });
  }

  function jet(value) {
    const x = Math.max(0, Math.min(1, value));
    return [
      Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * x - 3)))),
      Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * x - 2)))),
      Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * x - 1))))
    ];
  }

  function draw(field) {
    for (let index = 0; index < field.length; index += 1) {
      const [red, green, blue] = jet(field[index]);
      const pixel = 4 * index;
      image.data[pixel] = red;
      image.data[pixel + 1] = green;
      image.data[pixel + 2] = blue;
      image.data[pixel + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }

  function createWorker() {
    if (worker) worker.terminate();
    worker = new Worker('/assets/js/elastic-worker.js?v=3');
    worker.onmessage = event => {
      if (event.data.type === 'complete') {
        isRunning = false;
        runButton.textContent = 'Restart';
        status.textContent = 'Reached t = 1000. Change a parameter or restart the experiment.';
        worker.terminate();
        worker = null;
        return;
      }
      if (event.data.type !== 'state') return;
      draw(event.data.field);
      laboratory.querySelector('[data-time-live]').textContent = event.data.time.toFixed(1);
      laboratory.querySelector('[data-mean-live]').textContent = event.data.mean.toFixed(5);
      laboratory.querySelector('[data-range-live]').textContent =
        `${event.data.minimum.toFixed(3)} to ${event.data.maximum.toFixed(3)}`;
    };
    worker.onerror = () => {
      isRunning = false;
      runButton.textContent = 'Run';
      status.textContent = 'The browser solver stopped. Reset the experiment to restart it.';
    };
  }

  function start() {
    parameters = readParameters();
    createWorker();
    worker.postMessage({ type: 'start', parameters });
    isRunning = true;
    runButton.textContent = 'Pause';
    status.textContent = restoredDefaults
      ? 'Input outside the stable teaching range. All controls returned to their defaults.'
      : 'Running the coherent Cahn–Hilliard equation on a 256 × 256 periodic grid.';
  }

  runButton.addEventListener('click', () => {
    if (!worker) return start();
    isRunning = !isRunning;
    worker.postMessage({ type: isRunning ? 'resume' : 'pause', parameters });
    runButton.textContent = isRunning ? 'Pause' : 'Continue';
    status.textContent = isRunning ? 'Simulation running.' : 'Simulation paused.';
  });
  resetButton.addEventListener('click', () => {
    parameters = { ...defaults };
    writeParameters(parameters);
    start();
    status.textContent = 'Defaults restored and the simulation restarted.';
  });
  controls.forEach(control => control.addEventListener('change', start));
  writeParameters(defaults);
  start();
})();
