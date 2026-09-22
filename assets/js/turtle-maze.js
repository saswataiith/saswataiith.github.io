import { explore, trace } from "./turtle-path.mjs";
const canvas = document.getElementById("turtle-canvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const button = (id) => document.getElementById("turtle-" + id);
  const play = button("play"),
    status = button("status"),
    periodic = button("periodic"),
    phase = button("phase");
  const ox = 40,
    oy = 40,
    width = 640;
  const map = document.createElement("canvas");
  map.width = 640;
  map.height = 640;
  const mapContext = map.getContext("2d");
  function paintMap() {
    if (!data) return;
    const scale = width / data.size;
    mapContext.clearRect(0, 0, width, width);
    if (background.complete && background.naturalWidth)
      mapContext.drawImage(background, 0, 0, width, width);
    mapContext.fillStyle = "rgba(255,255,255,.58)";
    for (let index = 0; index < data.mask.length; index++)
      if (data.mask[index] !== Number(phase.value)) {
        const [x, y] = point(index);
        mapContext.fillRect(x * scale, y * scale, scale, scale);
      }
  }
  let data,
    route = [],
    search,
    start,
    progress = 0,
    playing = false,
    frame = 0,
    last = 0,
    region = 0;
  const turtle = new Image();
  turtle.src = "/assets/images/kturtle/turtle.svg";
  const background = new Image();
  background.src = "/assets/examples/bicontinuity/composition-0.5.png";
  const point = (id) => [id % data.size, Math.floor(id / data.size)];
  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    play.textContent = "Follow the turtle";
  }
  function draw() {
    if (!data || !route.length) return;
    const scale = width / data.size;
    ctx.fillStyle = "#f3f5eb";
    ctx.fillRect(0, 0, 720, 720);
    ctx.drawImage(map, ox, oy);
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#234444";
    ctx.fillText(
      periodic.checked
        ? "Opposite edges join · mean c = 0.5"
        : "Closed edges · mean c = 0.5",
      360,
      24,
    );
    ctx.fillText("Click a destination inside the selected phase", 360, 710);
    const index = Math.floor(progress),
      fraction = progress - index;
    ctx.strokeStyle = "#fff9c4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let iterator = 0; iterator <= index; iterator++) {
      const [x, y] = point(route[iterator]);
      const prev = point(route[Math.max(0, iterator - 1)]);
      if (iterator === 0 || Math.abs(x - prev[0]) + Math.abs(y - prev[1]) > 1)
        ctx.moveTo(ox + (x + 0.5) * scale, oy + (y + 0.5) * scale);
      else ctx.lineTo(ox + (x + 0.5) * scale, oy + (y + 0.5) * scale);
    }
    ctx.stroke();
    for (const [id, label] of [
      [start, "START"],
      [route[route.length - 1], "END"],
    ]) {
      const [x, y] = point(id);
      const px = ox + (x + 0.5) * scale,
        py = oy + (y + 0.5) * scale;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = "bold 12px sans-serif";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.strokeText(
        label,
        Math.max(63, Math.min(657, px)),
        Math.max(55, py - 12),
      );
      ctx.fillStyle = "#173d40";
      ctx.fillText(
        label,
        Math.max(63, Math.min(657, px)),
        Math.max(55, py - 12),
      );
    }
    const a = point(route[index]),
      b = point(route[Math.min(index + 1, route.length - 1)]);
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    if (Math.abs(dx) > 1) dx = -Math.sign(dx);
    if (Math.abs(dy) > 1) dy = -Math.sign(dy);
    const x = (a[0] + 0.5 + fraction * dx + data.size) % data.size,
      y = (a[1] + 0.5 + fraction * dy + data.size) % data.size;
    canvas.setAttribute(
      "aria-label",
      `Spinodal path, ${phase.value === "0" ? "low" : "high"} composition phase: step ${index} of ${route.length - 1}.`,
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, width, width);
    ctx.clip();
    for (const shiftX of [-width, 0, width])
      for (const shiftY of [-width, 0, width]) {
        ctx.save();
        ctx.translate(ox + x * scale + shiftX, oy + y * scale + shiftY);
        ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
        ctx.shadowColor = "white";
        ctx.shadowBlur = 4;
        if (turtle.complete && turtle.naturalWidth)
          ctx.drawImage(turtle, -13, -13, 26, 26);
        ctx.restore();
      }
    ctx.restore();
  }
  function chooseRegion() {
    if (!data) return;
    stop();
    progress = 0;
    paintMap();
    const candidates = [];
    for (let index = 0; index < data.mask.length; index++)
      if (data.mask[index] === Number(phase.value)) candidates.push(index);
    start =
      candidates[Math.floor(candidates.length * ((0.37 + region * 0.237) % 1))];
    search = explore(
      data.mask,
      data.size,
      Number(phase.value),
      start,
      periodic.checked,
    );
    route = trace(search.parent, search.farthest);
    status.textContent = `This starting point reaches ${search.count.toLocaleString()} pixels in the selected phase. Follow the route, or click a destination.`;
    draw();
  }
  function advance(amount) {
    progress = Math.min(route.length - 1, progress + amount);
    if (progress === route.length - 1) {
      stop();
      status.textContent =
        "Destination reached without crossing the other phase. Now test another point or the other phase.";
    }
    draw();
  }
  function tick(now) {
    if (!playing) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    advance(dt * 35);
    if (playing) frame = requestAnimationFrame(tick);
  }
  play.onclick = () => {
    if (!route.length) return;
    if (playing) {
      stop();
      return;
    }
    if (progress >= route.length - 1) progress = 0;
    playing = true;
    play.textContent = "Pause turtle";
    status.textContent =
      "Following connected pixels. At a periodic edge, the route continues from the matching opposite edge.";
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  button("step").onclick = () => {
    stop();
    if (route.length) advance(1);
  };
  button("reset").onclick = () => {
    stop();
    progress = 0;
    status.textContent =
      "Back at the start. Follow the route or choose another destination.";
    draw();
  };
  button("new").onclick = () => {
    region++;
    chooseRegion();
  };
  periodic.onchange = phase.onchange = () => {
    region = 0;
    chooseRegion();
  };
  canvas.onclick = (event) => {
    if (!data) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
        (((720 * (event.clientX - rect.left)) / rect.width - ox) / width) *
          data.size,
      ),
      y = Math.floor(
        (((720 * (event.clientY - rect.top)) / rect.height - oy) / width) *
          data.size,
      );
    if (x < 0 || y < 0 || x >= data.size || y >= data.size) return;
    const target = y * data.size + x;
    stop();
    if (data.mask[target] !== Number(phase.value)) {
      status.textContent =
        "That point is in the other phase. Change the selected phase to explore it.";
      return;
    }
    const next = trace(search.parent, target);
    if (!next.length) {
      status.textContent =
        "No path from this start: that point belongs to a disconnected region under the selected boundary conditions.";
      return;
    }
    route = next;
    progress = 0;
    status.textContent = `A path exists: ${route.length - 1} pixel steps. Follow the turtle.`;
    draw();
  };
  turtle.onload = draw;
  background.onload = () => {
    paintMap();
    draw();
  };
  fetch("/assets/examples/bicontinuity/turtle-field.json")
    .then((response) => {
      if (!response.ok) throw Error("field");
      return response.json();
    })
    .then((result) => {
      data = result;
      chooseRegion();
    })
    .catch(() => {
      status.textContent =
        "The spinodal data could not be loaded. Please reload the page.";
    });
}
