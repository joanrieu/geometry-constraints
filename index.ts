type Vec2 = {
  readonly x: number;
  readonly y: number;
};

type Constraint = (point: Point) => number;
type Scores = Record<string, number>;

type Point = {
  name: string;
  constraint: Constraint;
  position: Vec2;
  score: number;
  scores: Scores;
  stable: boolean;
};

function roundCoordinate(coord: number) {
  const decimals = 2;
  const power = 10 ** decimals;
  return Math.round(coord * power) / power;
}

function seedScores(point: Point) {
  // can't keep previous scores in case there is a depencency
  // to a point that has moved (could be optimized by tracking deps)
  point.scores = {};

  const size = 100;
  for (let test = 0; test < 10000; ++test) {
    const a = Math.random() * 2 * Math.PI;
    const r = Math.random() ** 2;
    const x = roundCoordinate(point.position.x + Math.cos(a) * r * size);
    const y = roundCoordinate(point.position.y + Math.sin(a) * r * size);
    const pos = { x, y };
    const posId = JSON.stringify(pos);
    point.scores[posId] = NaN;
  }
}

function evaluateScores(point: Point) {
  for (const posId of Object.keys(point.scores)) {
    const position: Vec2 = JSON.parse(posId);
    const score = point.constraint({ ...point, position });
    point.scores[posId] = score;
  }
}

function findBestScore(scores: Scores): [Vec2, number] {
  const [posId, score] = Object.entries(scores).reduce((a, b) =>
    a[1] >= b[1] ? a : b
  );
  const pos: Vec2 = JSON.parse(posId);
  return [pos, score];
}

function updateWithBestScore(point: Point) {
  point.score = point.scores[JSON.stringify(point.position)];
  const [pos, score] = findBestScore(point.scores);
  point.stable = score <= point.score;
  if (point.stable) return;
  point.position = pos;
  point.score = score;
}

function getVector(a: Vec2, b: Vec2): Vec2 {
  return {
    x: b.x - a.x,
    y: b.y - a.y,
  };
}

function getNormSq({ x, y }: Vec2) {
  return x ** 2 + y ** 2;
}

function getNorm(v: Vec2) {
  return Math.sqrt(getNormSq(v));
}

function normalize(v: Vec2): Vec2 {
  const norm = getNorm(v);
  return {
    x: v.x / norm,
    y: v.y / norm,
  };
}

function getDistance(a: Vec2, b: Vec2) {
  return getNorm(getVector(a, b));
}

function dotProduct(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}

function crossProduct(a: Vec2, b: Vec2) {
  return a.x * b.y - a.y * b.x;
}

function addVectors(a: Vec2, b: Vec2): Vec2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

function getAngleOfVectors(a: Vec2, b: Vec2) {
  a = normalize(a);
  b = normalize(b);
  const cos = dotProduct(a, b);
  const sin = crossProduct(a, b);
  const angle = Math.atan2(sin, cos);
  return angle;
}

function getAngleOfPoints(a: Point, b: Point, c: Point) {
  return getAngleOfVectors(
    getVector(b.position, a.position),
    getVector(b.position, c.position)
  );
}

function isGreater(a: number, b: number) {
  return a - b;
}

function isLowest(x: number) {
  return -x;
}

function isLowestAbs(x: number) {
  return isLowest(Math.abs(x));
}

function isHighest(x: number) {
  return x;
}

function isHighestAbs(x: number) {
  return isHighest(Math.abs(x));
}

function isEqual(a: number, b: number) {
  return isLowestAbs(a - b);
}

function isOnCircle(point: Point, center: Point, radius: number) {
  return isEqual(radius, getNorm(getVector(point.position, center.position)));
}

function isAtPosition(point: Point, x: number, y: number) {
  return -getDistance(point.position, { x, y });
}

function isTranslationOfPointByVector(
  point: Point,
  origin: Point,
  vector: Vec2
) {
  return -getDistance(point.position, addVectors(origin.position, vector));
}

function isTranslationOfPointBySegment(
  point: Point,
  origin: Point,
  a: Point,
  b: Point
) {
  return isTranslationOfPointByVector(
    point,
    origin,
    getVector(a.position, b.position)
  );
}

function isAtMiddleOfPoints(point: Point, ...points: Point[]) {
  const distances = points.map((point2) =>
    getDistance(point.position, point2.position)
  );
  const max = Math.max(...distances);
  return isLowest(max);
}

function isCloserToAPointThanAnother(
  point: Point,
  closer: Point,
  farther: Point
) {
  return isGreater(
    getDistance(point.position, farther.position),
    getDistance(point.position, closer.position)
  );
}

function isAlignedWithPoints(point: Point, a: Point, b: Point) {
  return isLowestAbs(
    crossProduct(
      normalize(getVector(a.position, b.position)),
      getVector(a.position, point.position)
    )
  );
}

function isAtAngle(angle: number, a: Point, b: Point, c: Point) {
  return isEqual(getAngleOfPoints(a, b, c), angle);
}

const points: Point[] = [];

function getPoint(name: string) {
  const point = points.find((point) => point.name === name);
  if (!point) throw new Error("no point named " + name);
  return point;
}

function newName() {
  return "P" + points.length;
}

function newPoint({
  name = newName(),
  constraint,
}: {
  name?: string;
  constraint: Constraint;
}): Point {
  return {
    name,
    constraint,
    position: { x: 0, y: 0 },
    score: -Infinity,
    scores: {},
    stable: false,
  };
}

const addPoint: typeof newPoint = (opts) => {
  const point = newPoint(opts);
  points.push(point);
  return point;
};

const plankLength = 90;
const largePlankWidth = 6.2;
const plankAngle = Math.PI / 4;
const topWidth = 40;
const topHeight = 2;
const tableTopWidth = 45;

addPoint({
  name: "A1",
  constraint: (point) => isAtPosition(point, -plankLength / 2, 0),
});

addPoint({
  name: "A2",
  constraint: (point) => isAtPosition(point, plankLength / 2, 0),
});

addPoint({
  name: "A3",
  constraint: (point) =>
    isOnCircle(point, getPoint("A2"), largePlankWidth) +
    isEqual(
      getAngleOfPoints(getPoint("A1"), getPoint("A2"), point),
      -Math.PI / 2
    ),
});

addPoint({
  name: "A4",
  constraint: (point) =>
    isOnCircle(point, getPoint("A3"), plankLength) +
    isTranslationOfPointBySegment(
      point,
      getPoint("A1"),
      getPoint("A2"),
      getPoint("A3")
    ),
});

addPoint({
  name: "P",
  constraint: (point) =>
    isAtMiddleOfPoints(point, getPoint("A1"), getPoint("A2")),
});

addPoint({
  name: "B3",
  constraint: (point) =>
    isAtAngle(plankAngle, getPoint("A2"), getPoint("P"), point) +
    isOnCircle(
      point,
      getPoint("P"),
      getDistance(getPoint("P").position, getPoint("A2").position)
    ),
});

addPoint({
  name: "B2",
  constraint: (point) =>
    isAtAngle(Math.PI / 2, getPoint("P"), getPoint("B3"), point) +
    isOnCircle(point, getPoint("B3"), 3.8),
});

addPoint({
  name: "B4",
  constraint: (point) =>
    isAtAngle(Math.PI / 2, point, getPoint("B3"), getPoint("B2")) +
    isOnCircle(point, getPoint("B3"), plankLength),
});

addPoint({
  name: "B1",
  constraint: (point) =>
    isTranslationOfPointBySegment(
      point,
      getPoint("B4"),
      getPoint("B3"),
      getPoint("B2")
    ),
});

addPoint({
  name: "C1",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("B3"), getPoint("B4")) +
    isAlignedWithPoints(point, getPoint("A4"), getPoint("B1")),
});

addPoint({
  name: "C2",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A2"), getPoint("B3")) +
    isAlignedWithPoints(point, getPoint("A3"), getPoint("A4")),
});

addPoint({
  name: "C3",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A2"), getPoint("B3")) +
    isAlignedWithPoints(point, getPoint("B1"), getPoint("B2")),
});

addPoint({
  name: "C4",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A1"), getPoint("A2")) +
    isAlignedWithPoints(point, getPoint("A4"), getPoint("B1")),
});

addPoint({
  name: "P2",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A3"), getPoint("A4")) +
    isAlignedWithPoints(point, getPoint("B1"), getPoint("B2")),
});

addPoint({
  name: "M",
  constraint: (point) =>
    isAtMiddleOfPoints(point, getPoint("A2"), getPoint("B3")),
});

addPoint({
  name: "T1",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A2"), getPoint("B3")) +
    isOnCircle(point, getPoint("M"), topWidth / 2) +
    isCloserToAPointThanAnother(point, getPoint("C2"), getPoint("C3")),
});

addPoint({
  name: "T4",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("A2"), getPoint("B3")) +
    isOnCircle(point, getPoint("M"), topWidth / 2) +
    isCloserToAPointThanAnother(point, getPoint("C3"), getPoint("C2")),
});

addPoint({
  name: "T2",
  constraint: (point) =>
    isOnCircle(point, getPoint("T1"), topHeight) +
    isAtAngle(Math.PI / 2, point, getPoint("T1"), getPoint("M")),
});

addPoint({
  name: "T3",
  constraint: (point) =>
    isTranslationOfPointBySegment(
      point,
      getPoint("T4"),
      getPoint("T1"),
      getPoint("T2")
    ),
});

addPoint({
  name: "M2",
  constraint: (point) =>
    isAtMiddleOfPoints(point, getPoint("T2"), getPoint("T3")),
});

addPoint({
  name: "TT1",
  constraint: (point) =>
    isAlignedWithPoints(point, getPoint("T2"), getPoint("T3")) +
    isOnCircle(point, getPoint("M"), tableTopWidth / 2) +
    isCloserToAPointThanAnother(point, getPoint("T2"), getPoint("T3")),
});

addPoint({
  name: "TT2",
  constraint: (point) =>
    isTranslationOfPointBySegment(
      point,
      getPoint("TT1"),
      getPoint("T1"),
      getPoint("T2")
    ),
});

addPoint({
  name: "TT4",
  constraint: (point) =>
    isTranslationOfPointBySegment(
      point,
      getPoint("M2"),
      getPoint("TT1"),
      getPoint("M2")
    ),
});

addPoint({
  name: "TT3",
  constraint: (point) =>
    isTranslationOfPointBySegment(
      point,
      getPoint("TT4"),
      getPoint("TT1"),
      getPoint("TT2")
    ),
});

const lines: [Point, Point][] = [];
const segments: [Point, Point][] = [];
const polygons: Point[][] = [];

function addLine(a: string, b: string) {
  lines.push([getPoint(a), getPoint(b)]);
}

addLine("A4", "B1");

function addSegment(a: string, b: string) {
  segments.push([getPoint(a), getPoint(b)]);
}

function addPolygon(...pointNames: string[]) {
  pointNames.forEach((a, i) => {
    const b = pointNames[(i + 1) % pointNames.length];
    addSegment(a, b);
  });
  polygons.push(pointNames.map(getPoint));
}

addPolygon("A1", "A2", "A3", "A4");
addPolygon("B1", "B2", "B3", "B4");
addPolygon("T1", "T2", "T3", "T4");
addPolygon("TT1", "TT2", "TT3", "TT4");

const measures: ([Point, Point] | [Point, Point, string] | null)[] = [
  ["A2", "B3", "top plank footprint"],
  ["A4", "B1", "floor footprint"],
  ["P", "P2", "middle overlap height"],
  null,
  ["A3", "C2", "large plank top cut"],
  ["A1", "C4", "large plank bottom cut"],
  null,
  ["B2", "C3", "small plank top cut"],
  ["B4", "C1", "small plank bottom cut"],
].map((m) => m && [getPoint(m[0]), getPoint(m[1]), m[2]]);

const unit = "cm";

document.body.style.fontFamily = "sans-serif";
document.body.style.fontSize = "12px";

const canvas = document.createElement("canvas");
canvas.style.width = "100vw";
canvas.style.height = "100vh";
document.body.style.overflow = "hidden";
document.body.append(canvas);

const ctx = canvas.getContext("2d")!;
const transform = ctx.getTransform();
transform.scaleSelf(1, -1);

function updateCanvasSize() {
  canvas.width = document.body.clientWidth * devicePixelRatio;
  canvas.height = document.body.clientHeight * devicePixelRatio;
}

updateCanvasSize();
window.addEventListener("resize", updateCanvasSize);

let mousedown = false;
canvas.addEventListener("mousedown", () => (mousedown = true));
canvas.addEventListener("mousemove", ({ movementX, movementY }) => {
  if (!mousedown) return;
  const inverse = transform.inverse();
  const { x: x0, y: y0 } = inverse.transformPoint(new DOMPoint());
  const { x, y } = inverse.transformPoint(new DOMPoint(movementX, movementY));
  transform.translateSelf(x - x0, y - y0);
});
canvas.addEventListener("mouseup", () => (mousedown = false));
canvas.addEventListener("wheel", ({ deltaY, clientX, clientY }) => {
  const origin = transform
    .inverse()
    .transformPoint(
      new DOMPoint(
        clientX - canvas.clientWidth / 2,
        clientY - canvas.clientHeight / 2
      )
    );
  const scale = deltaY > 0 ? 0.99 ** deltaY : deltaY < 0 ? 1.01 ** -deltaY : 1;
  transform.scaleSelf(scale, scale, undefined, origin.x, origin.y);
});

const toolBar = document.createElement("div");
toolBar.style.position = "absolute";
toolBar.style.top = "0";
toolBar.style.left = "0";
toolBar.style.padding = "8px";
toolBar.style.display = "flex";
toolBar.style.gap = "8px";
document.body.append(toolBar);

function createToggle(name: string, enabled = true) {
  const label = document.createElement("label");
  label.style.display = "flex";
  toolBar.append(label);

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = enabled;
  toggle.style.margin = "0 8px";

  label.append(toggle);
  label.append(name);

  return toggle;
}

const pointToggle = createToggle("Points");
const lineToggle = createToggle("Lines");
const segmentToggle = createToggle("Segments");
const polygonToggle = createToggle("Polygons");
const heatmapToggle = createToggle("Heatmap", false);
const measureToggle = createToggle("Measures");

function addRotationButton(angle: number) {
  const button = document.createElement("button");
  button.innerText = (angle > 0 ? "+" : "") + angle + "°";
  button.onclick = () => {
    transform.preMultiplySelf(
      new DOMMatrix().rotateSelf(0, 0, angle).inverse()
    );
  };
  toolBar.append(button);
}

addRotationButton(90);
addRotationButton(10);
addRotationButton(1);
addRotationButton(-1);
addRotationButton(-10);
addRotationButton(-90);

const measureBox = document.createElement("div");
measureBox.style.position = "absolute";
measureBox.style.bottom = "0";
measureBox.style.left = "0";
measureBox.style.padding = "8px";
document.body.append(measureBox);

function update() {
  if (points.every((p) => p.stable)) return;
  for (const point of points) {
    seedScores(point);
    evaluateScores(point);
    updateWithBestScore(point);
  }
}

function draw() {
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(devicePixelRatio, devicePixelRatio);

  heatmapToggle.checked && drawHeatmap();
  lineToggle.checked && drawLines();
  polygonToggle.checked && drawPolygons();
  segmentToggle.checked && drawSegments();
  pointToggle.checked && drawPoints();
  pointToggle.checked && drawLabels();
  /* check done inside */ drawMeasures();
}

function drawLines() {
  ctx.save();
  ctx.strokeStyle = "grey";
  ctx.lineWidth = 2;

  for (const [a, b] of lines) {
    const direction = getVector(a.position, b.position);
    const scaler = 1e4;
    const p1 = transform.transformPoint({
      x: a.position.x - direction.x * scaler,
      y: a.position.y - direction.y * scaler,
    });
    const p2 = transform.transformPoint({
      x: a.position.x + direction.x * scaler,
      y: a.position.y + direction.y * scaler,
    });

    ctx.save();
    ctx.globalAlpha = a.stable && b.stable ? 1 : 0.5;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawPolygons() {
  ctx.save();
  ctx.fillStyle = "hsla(0deg, 0%, 50%, 30%)";

  for (const polygon of polygons) {
    ctx.save();
    ctx.globalAlpha = polygon.every((p) => p.stable) ? 1 : 0.5;

    ctx.beginPath();
    const [firstPoint, ...nextPoints] = polygon;
    const p1 = transform.transformPoint(firstPoint.position);
    ctx.moveTo(p1.x, p1.y);
    for (const point of nextPoints) {
      const pn = transform.transformPoint(point.position);
      ctx.lineTo(pn.x, pn.y);
    }
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

function drawSegments() {
  ctx.save();
  ctx.strokeStyle = "grey";

  for (const segment of segments) {
    const a = transform.transformPoint(segment[0].position);
    const b = transform.transformPoint(segment[1].position);

    ctx.save();
    ctx.globalAlpha = segment.every((p) => p.stable) ? 1 : 0.5;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawPoints() {
  const radius = 4;

  for (const point of points) {
    const { x, y } = transform.transformPoint(point.position);

    ctx.save();
    ctx.globalAlpha = point.stable ? 1 : 0.2;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.fillStyle = point.stable ? "black" : "orange";
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI, Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.restore();
  }
}

function drawLabels() {
  for (const point of points) {
    let { x, y } = transform.transformPoint(point.position);
    x += 6;
    y += 2;

    ctx.save();
    ctx.globalAlpha = point.stable ? 1 : 0.2;
    ctx.textBaseline = "top";

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.fillStyle = "white";
    ctx.strokeText(point.name, x, y);
    ctx.fillText(point.name, x, y);

    ctx.restore();
  }
}

function drawMeasures() {
  let text = "";

  if (measureToggle.checked) {
    for (const measure of measures) {
      if (measure) {
        const [a, b, name] = measure;

        text +=
          (name ?? "[ " + a.name + " ; " + b.name + " ]") +
          " = " +
          getDistance(a.position, b.position).toFixed(2) +
          " " +
          unit;
      }

      text += "\n";
    }
  }

  measureBox.innerText = text;
}

const heatmapHueCache: Record<string, number> = {};

function drawHeatmap() {
  for (const point of points) {
    ctx.save();
    const size = 10;
    const hue = (heatmapHueCache[point.name] =
      heatmapHueCache[point.name] ?? Math.random() * 360);

    const scores = Object.entries(point.scores);
    scores.sort((a, b) => a[1] - b[1]);
    scores.splice(0, scores.length * 0.9);

    for (const [posId] of scores) {
      const pos: Vec2 = JSON.parse(posId);
      const { x, y } = transform.transformPoint(pos);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, "hsla(" + hue + "deg, 50%, 70%, 20%)");
      gradient.addColorStop(1, "hsla(" + hue + "deg, 50%, 70%, 0%)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, -Math.PI, Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

requestAnimationFrame(function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
});
