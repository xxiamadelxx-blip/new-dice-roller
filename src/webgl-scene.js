import { DIE_TYPES } from './core.js';
import { getSkin, normalizeAppearance } from './scene.js';

const VERTEX_SHADER = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;

out vec3 v_normal;
out vec3 v_world;
out vec4 v_color;

void main() {
  v_normal = a_normal;
  v_world = a_position;
  v_color = a_color;
  gl_Position = u_projection * u_view * vec4(a_position, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_world;
in vec4 v_color;

uniform float u_time;

out vec4 out_color;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 primary_light = normalize(vec3(-0.55, 0.96, 0.62));
  vec3 fill_light = normalize(vec3(0.70, 0.40, -0.72));
  vec3 rim_light = normalize(vec3(0.72, 0.28, -0.65));
  float key = max(dot(normal, primary_light), 0.0);
  float fill = max(dot(normal, fill_light), 0.0);
  float diffuse = 0.28 + key * 0.68 + fill * 0.18;
  float rim = pow(1.0 - max(dot(normal, rim_light), 0.0), 3.0) * 0.16;
  float grain = sin(dot(v_world * vec3(1.15, 0.72, 1.38), vec3(12.9898, 78.233, 37.719)));
  float mineral = (grain * 0.5 + 0.5) * 0.055;
  float ember = (sin(u_time * 0.0017 + v_world.x * 0.7 + v_world.z * 0.35) + 1.0) * 0.024;
  float lampDistance = distance(v_world.xz, vec2(-3.0, -1.8));
  float lampGlow = max(0.0, 1.0 - lampDistance / 5.2) * 0.15;
  vec3 warmLight = vec3(1.0, 0.62, 0.30);
  vec3 coolFill = vec3(0.68, 0.76, 0.86);
  vec3 lightColor = mix(coolFill, warmLight, clamp(0.26 + key * 0.48 + lampGlow, 0.0, 0.92));
  vec3 half_vector = normalize(primary_light + vec3(0.0, 0.75, 0.55));
  float specular = pow(max(dot(normal, half_vector), 0.0), 28.0) * (0.16 + lampGlow * 0.44);
  out_color = vec4(v_color.rgb * (diffuse + rim + mineral + ember) * lightColor + specular * warmLight, v_color.a);
}
`;

const PHI = (1 + Math.sqrt(5)) / 2;

function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(value, amount) { return [value[0] * amount, value[1] * amount, value[2] * amount]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function length(value) { return Math.hypot(value[0], value[1], value[2]); }
function normalize(value) {
  const magnitude = length(value) || 1;
  return scale(value, 1 / magnitude);
}

function parseHex(input, fallback = '#ffffff') {
  const value = String(input || fallback).replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return [1, 1, 1];
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}

function tint(color, amount) {
  const factor = amount >= 0 ? 1 - amount : 1 + amount;
  return amount >= 0
    ? color.map((channel) => channel + (1 - channel) * amount)
    : color.map((channel) => channel * factor);
}

function mixColor(a, b, amount) {
  return a.map((channel, index) => channel + (b[index] - channel) * amount);
}

function rotatePoint(value, rotation) {
  let [x, y, z] = value;
  const [rx, ry, rz] = rotation;
  let cosine = Math.cos(rx);
  let sine = Math.sin(rx);
  [y, z] = [y * cosine - z * sine, y * sine + z * cosine];
  cosine = Math.cos(ry);
  sine = Math.sin(ry);
  [x, z] = [x * cosine + z * sine, -x * sine + z * cosine];
  cosine = Math.cos(rz);
  sine = Math.sin(rz);
  [x, y] = [x * cosine - y * sine, x * sine + y * cosine];
  return [x, y, z];
}

function transformPoint(value, center, size, rotation = [0, 0, 0]) {
  return add(center, rotatePoint(scale(value, size), rotation));
}

function makeMesh() {
  return { positions: [], normals: [], colors: [], indices: [] };
}

function pushVertex(mesh, position, normal, color) {
  mesh.positions.push(...position);
  mesh.normals.push(...normal);
  mesh.colors.push(color[0], color[1], color[2], 1);
  return mesh.positions.length / 3 - 1;
}

function pushTriangle(mesh, vertices, normal, color) {
  const start = vertices.map((vertex) => pushVertex(mesh, vertex, normal, color));
  mesh.indices.push(...start);
}

function pushQuad(mesh, vertices, normal, color) {
  const start = vertices.map((vertex) => pushVertex(mesh, vertex, normal, color));
  mesh.indices.push(start[0], start[1], start[2], start[0], start[2], start[3]);
}

function addBox(mesh, center, dimensions, color, rotation = [0, 0, 0]) {
  const [width, height, depth] = dimensions;
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const faces = [
    { normal: [0, 0, 1], points: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { normal: [0, 0, -1], points: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { normal: [1, 0, 0], points: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { normal: [-1, 0, 0], points: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { normal: [0, 1, 0], points: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { normal: [0, -1, 0], points: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];
  faces.forEach((face, index) => {
    const faceColor = tint(color, index === 4 ? 0.12 : index === 1 ? -0.14 : (index % 3) * 0.025);
    pushQuad(mesh, face.points.map((point) => transformPoint(point, center, 1, rotation)), rotatePoint(face.normal, rotation), faceColor);
  });
}

function addPrism(mesh, center, radii, height, sides, color, rotation = 0) {
  const [radiusX, radiusZ] = radii;
  const bottom = [];
  const top = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const point = [Math.cos(angle) * radiusX, 0, Math.sin(angle) * radiusZ];
    bottom.push(add(center, [point[0], -height / 2, point[2]]));
    top.push(add(center, [point[0], height / 2, point[2]]));
  }
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    const normal = normalize(cross(sub(top[next], top[index]), sub(bottom[index], top[index])));
    pushQuad(mesh, [bottom[index], bottom[next], top[next], top[index]], normal, tint(color, (index % 3 - 1) * 0.04));
  }
  const topNormal = [0, 1, 0];
  const bottomNormal = [0, -1, 0];
  for (let index = 1; index < sides - 1; index += 1) {
    pushTriangle(mesh, [top[0], top[index], top[index + 1]], topNormal, tint(color, 0.08));
    pushTriangle(mesh, [bottom[0], bottom[index + 1], bottom[index]], bottomNormal, tint(color, -0.10));
  }
}

function addFrustum(mesh, center, bottomRadii, topRadii, height, sides, color, rotation = 0) {
  const bottom = [];
  const top = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    bottom.push(add(center, [Math.cos(angle) * bottomRadii[0], -height / 2, Math.sin(angle) * bottomRadii[1]]));
    top.push(add(center, [Math.cos(angle) * topRadii[0], height / 2, Math.sin(angle) * topRadii[1]]));
  }
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    const normal = normalize(cross(sub(top[next], top[index]), sub(bottom[index], top[index])));
    pushQuad(mesh, [bottom[index], bottom[next], top[next], top[index]], normal, tint(color, (index % 3 - 1) * 0.04));
  }
}

function addRing(mesh, center, outerRadii, innerRadii, y, color, sides = 8, rotation = Math.PI / 8) {
  const outer = [];
  const inner = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    outer.push(add(center, [Math.cos(angle) * outerRadii[0], y, Math.sin(angle) * outerRadii[1]]));
    inner.push(add(center, [Math.cos(angle) * innerRadii[0], y + 0.01, Math.sin(angle) * innerRadii[1]]));
  }
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    pushQuad(mesh, [outer[index], outer[next], inner[next], inner[index]], [0, 1, 0], tint(color, (index % 2) * 0.04));
  }
}

function addWallRing(mesh, center, outerRadii, innerRadii, bottomY, topY, outerColor, innerColor, topColor, sides = 8, rotation = Math.PI / 8) {
  const outerBottom = [];
  const outerTop = [];
  const innerBottom = [];
  const innerTop = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    outerBottom.push(add(center, [cosine * outerRadii[0], bottomY, sine * outerRadii[1]]));
    outerTop.push(add(center, [cosine * outerRadii[0], topY, sine * outerRadii[1]]));
    innerBottom.push(add(center, [cosine * innerRadii[0], bottomY, sine * innerRadii[1]]));
    innerTop.push(add(center, [cosine * innerRadii[0], topY, sine * innerRadii[1]]));
  }
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    const outerFace = [outerBottom[index], outerBottom[next], outerTop[next], outerTop[index]];
    const innerFace = [innerTop[next], innerTop[index], innerBottom[index], innerBottom[next]];
    const lip = [outerTop[index], outerTop[next], innerTop[next], innerTop[index]];
    pushQuad(mesh, outerFace, normalize(cross(sub(outerFace[1], outerFace[0]), sub(outerFace[2], outerFace[0]))), tint(outerColor, (index % 3 - 1) * 0.035));
    pushQuad(mesh, innerFace, normalize(cross(sub(innerFace[1], innerFace[0]), sub(innerFace[2], innerFace[0]))), tint(innerColor, (index % 2) * 0.04));
    pushQuad(mesh, lip, [0, 1, 0], tint(topColor, (index % 2) * 0.045));
  }
}

function addTopSegment(mesh, start, end, y, width, color) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const magnitude = Math.hypot(dx, dz) || 1;
  const halfWidth = width / 2;
  const offset = [-dz / magnitude * halfWidth, dx / magnitude * halfWidth];
  const points = [
    [start[0] + offset[0], y, start[1] + offset[1]],
    [end[0] + offset[0], y, end[1] + offset[1]],
    [end[0] - offset[0], y, end[1] - offset[1]],
    [start[0] - offset[0], y, start[1] - offset[1]],
  ];
  pushQuad(mesh, points, [0, 1, 0], color);
}

function addTopArc(mesh, center, radii, startAngle, endAngle, y, width, color, segments = 16) {
  let previous = [
    center[0] + Math.cos(startAngle) * radii[0],
    center[1] + Math.sin(startAngle) * radii[1],
  ];
  for (let index = 1; index <= segments; index += 1) {
    const angle = startAngle + (endAngle - startAngle) * index / segments;
    const next = [
      center[0] + Math.cos(angle) * radii[0],
      center[1] + Math.sin(angle) * radii[1],
    ];
    addTopSegment(mesh, previous, next, y, width, color);
    previous = next;
  }
}

function addLeaf(mesh, center, lengthValue, width, angle, y, color) {
  const direction = [Math.cos(angle), Math.sin(angle)];
  const perpendicular = [-direction[1], direction[0]];
  const tip = [center[0] + direction[0] * lengthValue / 2, center[1] + direction[1] * lengthValue / 2];
  const base = [center[0] - direction[0] * lengthValue / 2, center[1] - direction[1] * lengthValue / 2];
  const left = [center[0] + perpendicular[0] * width / 2, center[1] + perpendicular[1] * width / 2];
  const right = [center[0] - perpendicular[0] * width / 2, center[1] - perpendicular[1] * width / 2];
  pushQuad(mesh, [
    [tip[0], y, tip[1]],
    [left[0], y, left[1]],
    [base[0], y, base[1]],
    [right[0], y, right[1]],
  ], [0, 1, 0], color);
  addTopSegment(mesh, base, tip, y + 0.006, Math.max(0.012, width * 0.08), tint(color, -0.18));
}

function addTopPolygon(mesh, points, y, color) {
  if (!Array.isArray(points) || points.length < 3) return;
  const center = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map((value) => value / points.length);
  const origin = [center[0], y, center[1]];
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    pushTriangle(mesh, [
      origin,
      [points[index][0], y, points[index][1]],
      [points[next][0], y, points[next][1]],
    ], [0, 1, 0], tint(color, (index % 3 - 1) * 0.035));
  }
}

function addButterfly(mesh, center, y, color) {
  const [cx, cz] = center;
  const bright = tint(color, 0.16);
  const shadow = tint(color, -0.22);
  const scaleValue = 1.18;
  const translate = (points, mirror = false) => points.map(([x, z]) => [cx + (mirror ? -x : x) * scaleValue, cz + z * scaleValue]);
  const upper = [
    [-0.06, 0.05], [-0.34, 0.62], [-0.96, 0.72], [-1.28, 0.38],
    [-1.10, 0.02], [-0.46, -0.08],
  ];
  const lower = [
    [-0.06, -0.02], [-0.46, -0.18], [-0.86, -0.58], [-0.62, -0.82],
    [-0.24, -0.44],
  ];
  addTopPolygon(mesh, translate(upper), y, bright);
  addTopPolygon(mesh, translate(upper, true), y, bright);
  addTopPolygon(mesh, translate(lower), y + 0.002, shadow);
  addTopPolygon(mesh, translate(lower, true), y + 0.002, shadow);

  const stroke = tint(color, -0.04);
  const line = (from, to, lineColor = stroke, width = 0.022) => addTopSegment(mesh, [cx + from[0] * scaleValue, cz + from[1] * scaleValue], [cx + to[0] * scaleValue, cz + to[1] * scaleValue], y + 0.009, width, lineColor);
  [[-0.06, 0.05], [-0.34, 0.62], [-0.96, 0.72], [-1.28, 0.38], [-1.10, 0.02], [-0.46, -0.08], [-0.06, 0.05]].forEach((point, index, points) => line(point, points[(index + 1) % points.length]));
  upper.forEach((point, index) => {
    if (index < 2 || index > 3) line([-0.06, 0.05], point, shadow, 0.014);
    const mirrored = [-point[0], point[1]];
    if (index < 2 || index > 3) line([0.06, 0.05], mirrored, shadow, 0.014);
  });
  [[-0.06, -0.02], [-0.46, -0.18], [-0.86, -0.58], [-0.62, -0.82], [-0.24, -0.44]].forEach((point, index, points) => line(point, points[(index + 1) % points.length], shadow, 0.016));
  lower.forEach((point, index, points) => line([-0.06, -0.02], point, shadow, index === points.length - 1 ? 0.014 : 0.012));
  lower.forEach((point, index, points) => line([0.06, -0.02], [-point[0], point[1]], shadow, index === points.length - 1 ? 0.014 : 0.012));

  addPrism(mesh, [cx, y + 0.018, cz - 0.07 * scaleValue], [0.10, 0.52], 0.055, 10, stroke, 0);
  addTopDot(mesh, [cx, cz + 0.26 * scaleValue], y + 0.055, 0.075, bright);
  addTopArc(mesh, [cx - 0.05 * scaleValue, cz + 0.37 * scaleValue], [0.36 * scaleValue, 0.23 * scaleValue], Math.PI * 1.08, Math.PI * 1.66, y + 0.012, 0.014, stroke, 10);
  addTopArc(mesh, [cx + 0.05 * scaleValue, cz + 0.37 * scaleValue], [0.36 * scaleValue, 0.23 * scaleValue], -Math.PI * 0.66, -Math.PI * 0.08, y + 0.012, 0.014, stroke, 10);
}

function addTopDot(mesh, center, y, radius, color) {
  addPrism(mesh, [center[0], y, center[1]], [radius, radius], 0.025, 12, color, 0);
}

function addOctagonFloor(mesh, center, radii, y, color, sides = 8, rotation = Math.PI / 8) {
  const ring = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    ring.push(add(center, [Math.cos(angle) * radii[0], y, Math.sin(angle) * radii[1]]));
  }
  const midpoint = add(center, [0, y + 0.005, 0]);
  for (let index = 0; index < sides; index += 1) {
    pushTriangle(mesh, [midpoint, ring[index], ring[(index + 1) % sides]], [0, 1, 0], tint(color, (index % 4 - 1) * 0.025));
  }
}

function tetrahedron() {
  return {
    vertices: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
    faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]],
  };
}

function octahedron() {
  return {
    vertices: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
    faces: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]],
  };
}

function icosahedron() {
  return {
    vertices: [
      [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
    ],
    faces: [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ],
  };
}

function dipyramid(sides = 5) {
  const vertices = [[0, 1.35, 0], [0, -1.35, 0]];
  for (let index = 0; index < sides; index += 1) {
    const angle = Math.PI / 2 + index * Math.PI * 2 / sides;
    vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
  }
  const faces = [];
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([0, 2 + index, 2 + next], [1, 2 + next, 2 + index]);
  }
  return { vertices, faces };
}

function dodecahedron() {
  const vertices = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
    [0, -1 / PHI, -PHI], [0, -1 / PHI, PHI], [0, 1 / PHI, -PHI], [0, 1 / PHI, PHI],
    [-1 / PHI, -PHI, 0], [-1 / PHI, PHI, 0], [1 / PHI, -PHI, 0], [1 / PHI, PHI, 0],
    [-PHI, 0, -1 / PHI], [PHI, 0, -1 / PHI], [-PHI, 0, 1 / PHI], [PHI, 0, 1 / PHI],
  ];
  const faces = [];
  const seen = new Set();
  for (let a = 0; a < vertices.length - 2; a += 1) {
    for (let b = a + 1; b < vertices.length - 1; b += 1) {
      for (let c = b + 1; c < vertices.length; c += 1) {
        const normal = cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a]));
        if (length(normal) < 0.01) continue;
        const distance = dot(normal, vertices[a]);
        const distances = vertices.map((vertex) => dot(normal, vertex) - distance);
        const coplanar = distances.map((value, index) => Math.abs(value) < 0.001 ? index : -1).filter((index) => index >= 0);
        if (coplanar.length !== 5) continue;
        const positive = distances.some((value) => value > 0.001);
        const negative = distances.some((value) => value < -0.001);
        if (positive && negative) continue;
        const key = coplanar.slice().sort((left, right) => left - right).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const centroid = coplanar.reduce((sum, index) => add(sum, vertices[index]), [0, 0, 0]).map((value) => value / coplanar.length);
        const faceNormal = normalize(positive ? scale(normal, -1) : normal);
        const basis = normalize(Math.abs(faceNormal[1]) < 0.9 ? cross(faceNormal, [0, 1, 0]) : cross(faceNormal, [1, 0, 0]));
        const tangent = normalize(cross(faceNormal, basis));
        coplanar.sort((left, right) => {
          const leftVector = sub(vertices[left], centroid);
          const rightVector = sub(vertices[right], centroid);
          return Math.atan2(dot(leftVector, tangent), dot(leftVector, basis)) - Math.atan2(dot(rightVector, tangent), dot(rightVector, basis));
        });
        faces.push(coplanar);
      }
    }
  }
  return { vertices, faces };
}

function addPolyhedron(mesh, shape, center, size, color, accent, rotation, squash = [1, 1, 1], family = 'obsidian') {
  shape.faces.forEach((face, faceIndex) => {
    const points = face.map((index) => {
      const vertex = shape.vertices[index];
      return transformPoint([vertex[0] * squash[0], vertex[1] * squash[1], vertex[2] * squash[2]], center, size, rotation);
    });
    const normal = normalize(cross(sub(points[1], points[0]), sub(points[2], points[0])));
    const highlight = faceIndex % 5 === 0 ? mixColor(color, accent, 0.22) : color;
    const shaded = tint(highlight, ((faceIndex % 4) - 1.5) * 0.045);
    for (let index = 1; index < points.length - 1; index += 1) {
      pushTriangle(mesh, [points[0], points[index], points[index + 1]], normal, shaded);
    }

    // A smaller raised facet gives mineral and glass finishes a deliberate cut
    // surface without importing a texture or a third-party model.
    const centroid = points.reduce((sum, point) => add(sum, point), [0, 0, 0]).map((value) => value / points.length);
    const insetScale = ['opal', 'bloodglass', 'quartz', 'prism'].includes(family) ? 0.82 : 0.86;
    const inset = points.map((point) => add(
      centroid,
      add(scale(sub(point, centroid), insetScale), scale(normal, 0.008)),
    ));
    const facetColor = mixColor(shaded, accent, family === 'obsidian' ? 0.13 : family === 'fluorite' || family === 'prism' ? 0.24 : 0.19);
    for (let index = 1; index < inset.length - 1; index += 1) {
      pushTriangle(mesh, [inset[0], inset[index], inset[index + 1]], normal, facetColor);
    }
  });
}

function dieShape(dieId) {
  const die = DIE_TYPES.find((item) => item.id === dieId) || DIE_TYPES[5];
  if (die.id === 'd4') return { shape: tetrahedron(), size: 0.7, squash: [1.0, 0.96, 1.0] };
  if (die.id === 'd6') return { shape: { vertices: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], faces: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [1, 5, 6, 2], [0, 3, 7, 4]] }, size: 0.62, squash: [1, 1, 1] };
  if (die.id === 'd8') return { shape: octahedron(), size: 0.76, squash: [1, 1, 1] };
  if (die.id === 'd10') return { shape: dipyramid(5), size: 0.64, squash: [1.02, 1.08, 1.02] };
  if (die.id === 'd12') return { shape: dodecahedron(), size: 0.42, squash: [1.06, 1.0, 1.06] };
  return { shape: icosahedron(), size: die.id === 'd100' ? 0.72 : 0.65, squash: die.id === 'd100' ? [1.06, 0.92, 1.06] : [1, 1, 1] };
}

function dieRestHeight(shape, size, squash) {
  const highestPoint = shape.vertices.reduce((highest, vertex) => Math.max(highest, vertex[1] * squash[1]), 0);
  return highestPoint * size;
}

function layoutDice(count) {
  const columns = count <= 4 ? count : Math.min(4, count);
  const rows = Math.ceil(count / columns);
  const positions = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    positions.push([
      (column - (Math.min(columns, count) - 1) / 2) * 1.35,
      0.53 + (rows - row - 1) * 0.04,
      (row - (rows - 1) / 2) * 1.02,
    ]);
  }
  return positions;
}

function addTableOrnament(mesh, tableSkin) {
  const accent = parseHex(tableSkin.accent);
  const mutedAccent = tint(accent, -0.28);
  const y = 0.025;
  addTopArc(mesh, [0, 0], [3.72, 2.18], 0.20, 1.32, y, 0.018, tint(mutedAccent, -0.10), 24);
  addTopArc(mesh, [0, 0], [3.72, 2.18], Math.PI - 1.32, Math.PI - 0.20, y, 0.018, tint(mutedAccent, -0.10), 24);
  addTopSegment(mesh, [-0.45, -0.82], [0, -1.02], y, 0.018, mutedAccent);
  addTopSegment(mesh, [0, -1.02], [0.45, -0.82], y, 0.018, mutedAccent);
  addTopDot(mesh, [0, 0], y + 0.004, 0.045, accent);
}

function addDeskProps(mesh, tableSkin) {
  const wood = parseHex(tableSkin.edge);
  const leather = parseHex('#241717');
  const brass = parseHex('#9c633b');
  const candle = parseHex('#d78c4f');
  const flame = parseHex('#ffd98d');

  // A small candle/lamp at the rear-left gives the desk the same warm pool of
  // light as the physical reference, while remaining fully procedural.
  addPrism(mesh, [-3.16, 0.08, -1.86], [0.62, 0.44], 0.12, 16, tint(brass, -0.16));
  addPrism(mesh, [-3.16, 0.56, -1.86], [0.34, 0.30], 0.88, 16, candle);
  addPrism(mesh, [-3.16, 1.05, -1.86], [0.12, 0.10], 0.28, 10, flame);
  addTopDot(mesh, [-3.16, -1.86], 1.22, 0.10, flame);

  // Two closed books in the background make the desk read as a physical
  // gaming table rather than a floating CAD demonstration.
  addBox(mesh, [2.98, 0.10, -2.34], [2.25, 0.16, 0.72], leather, [0.02, -0.04, -0.02]);
  addBox(mesh, [3.02, 0.24, -2.30], [2.06, 0.12, 0.64], wood, [0.02, -0.04, -0.02]);
  addBox(mesh, [3.08, 0.35, -2.25], [1.82, 0.08, 0.54], leather, [0.02, -0.04, -0.02]);
  addTopSegment(mesh, [2.35, -2.25], [3.80, -2.25], 0.405, 0.018, brass);
}

function addTable(mesh, tableSkin) {
  const surface = parseHex(tableSkin.surface);
  const edge = parseHex(tableSkin.edge);
  const accent = parseHex(tableSkin.accent);
  addBox(mesh, [0, -0.42, 0], [9.2, 0.62, 5.9], edge);
  addBox(mesh, [0, -0.08, 0], [8.85, 0.14, 5.56], surface);
  addRing(mesh, [0, 0.01, 0], [3.5, 2.0], [3.44, 1.94], 0.01, tint(accent, -0.25), 32, 0);
  addRing(mesh, [0, 0.01, 0], [1.2, 0.66], [1.16, 0.62], 0.015, tint(accent, -0.18), 24, 0);
  addTableOrnament(mesh, tableSkin);
  addDeskProps(mesh, tableSkin);
}

function addTrayOrnament(mesh, traySkin) {
  const accent = parseHex(traySkin.accent);
  const darkAccent = tint(accent, -0.26);
  const brightAccent = tint(accent, 0.12);
  const center = [0, 0.16];
  const y = 0.335;

  addRing(mesh, [center[0], 0, center[1]], [1.48, 0.84], [1.43, 0.79], y, darkAccent, 32, 0);
  addTopDot(mesh, center, y + 0.012, 0.055, brightAccent);

  if (traySkin.family === 'star') {
    const constellation = [
      [-1.05, 0.42], [-0.46, 0.72], [0.10, 0.45], [0.80, 0.68], [1.08, 0.12],
      [-0.75, -0.40], [-0.13, -0.62], [0.56, -0.46],
    ].map(([x, z]) => [x, z + center[1]]);
    [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [2, 6]].forEach(([from, to]) => {
      addTopSegment(mesh, constellation[from], constellation[to], y, 0.018, darkAccent);
    });
    constellation.forEach((point, index) => addTopDot(mesh, point, y + 0.012, index % 3 === 0 ? 0.052 : 0.032, brightAccent));
    return;
  }

  if (traySkin.family === 'forge') {
    addTopSegment(mesh, [0, center[1] - 0.72], [0, center[1] + 0.80], y, 0.032, darkAccent);
    addTopArc(mesh, center, [1.18, 0.58], 0.22, 1.36, y, 0.032, brightAccent, 16);
    addTopArc(mesh, center, [1.18, 0.58], Math.PI - 1.36, Math.PI - 0.22, y, 0.032, brightAccent, 16);
    addLeaf(mesh, [-0.38, center[1] + 0.30], 0.54, 0.18, -0.72, y, accent);
    addLeaf(mesh, [0.38, center[1] + 0.30], 0.54, 0.18, Math.PI + 0.72, y, accent);
    addLeaf(mesh, [-0.43, center[1] - 0.30], 0.48, 0.16, 0.72, y, darkAccent);
    addLeaf(mesh, [0.43, center[1] - 0.30], 0.48, 0.16, Math.PI - 0.72, y, darkAccent);
    return;
  }

  // The default tray owns a recognizable central butterfly emblem. It is
  // original procedural geometry, not a flattened background image.
  if (traySkin.family === 'butterfly' || traySkin.family === 'wood' || traySkin.family === 'moss') {
    addButterfly(mesh, center, y, brightAccent);
    return;
  }
}

function addTray(mesh, traySkin) {
  const floor = parseHex(traySkin.floor);
  const wall = parseHex(traySkin.wall);
  const rim = parseHex(traySkin.rim);
  const accent = parseHex(traySkin.accent);
  const center = [0, 0, 0.16];
  // The tray is a real raised container: an outer base, a hollow inner wall,
  // a soft floor and two separate wooden/metal lips. This keeps it visually
  // distinct from the desk underneath.
  addPrism(mesh, [0, 0.09, 0.16], [3.88, 2.48], 0.28, 8, tint(wall, -0.18), Math.PI / 8);
  addOctagonFloor(mesh, center, [3.24, 1.86], 0.245, floor);
  addWallRing(mesh, center, [3.88, 2.48], [3.22, 1.84], 0.22, 0.72, wall, tint(wall, -0.22), rim, 8, Math.PI / 8);
  addRing(mesh, center, [3.98, 2.56], [3.78, 2.36], 0.73, rim, 8, Math.PI / 8);
  addRing(mesh, center, [3.31, 1.93], [3.18, 1.80], 0.735, tint(rim, -0.16), 8, Math.PI / 8);
  addRing(mesh, center, [2.46, 1.36], [2.39, 1.29], 0.255, tint(accent, -0.12), 32, 0);
  [[-3.05, -1.58], [3.05, -1.58], [-3.05, 1.58], [3.05, 1.58]].forEach(([x, z]) => {
    addTopDot(mesh, [x, z + 0.16], 0.35, 0.07, accent);
  });
  [
    [-2.12, -1.10], [-1.42, -1.52], [-0.54, -1.66], [0.54, -1.66], [1.42, -1.52], [2.12, -1.10],
    [-2.30, 0.64], [2.30, 0.64], [-1.86, 1.18], [1.86, 1.18],
  ].forEach(([x, z], index) => addTopDot(mesh, [x, z + 0.16], 0.285, index % 3 === 0 ? 0.045 : 0.026, tint(accent, -0.08)));
  addTrayOrnament(mesh, traySkin);
}

function addTower(mesh, towerSkin) {
  const body = parseHex(towerSkin.body);
  const dark = parseHex(towerSkin.dark);
  const metal = parseHex(towerSkin.metal);
  const accent = parseHex(towerSkin.accent);
  const centerZ = -0.55;
  const frontZ = centerZ + 0.84;
  addPrism(mesh, [0, 0.22, centerZ], [1.50, 1.08], 0.32, 12, metal, Math.PI / 12);
  addRing(mesh, [0, 0, centerZ], [1.38, 0.98], [1.12, 0.76], 0.405, metal, 12, Math.PI / 12);
  addPrism(mesh, [0, 2.12, centerZ], [1.08, 0.82], 3.34, 12, body, Math.PI / 12);
  addRing(mesh, [0, 0, centerZ], [1.11, 0.85], [1.01, 0.75], 0.58, tint(metal, -0.10), 12, Math.PI / 12);
  addRing(mesh, [0, 0, centerZ], [1.11, 0.85], [1.01, 0.75], 3.68, tint(metal, -0.10), 12, Math.PI / 12);

  // A dark front channel makes the tower read as a functional chute instead
  // of a decorative rectangular block.
  addBox(mesh, [0, 2.15, frontZ + 0.035], [1.05, 1.82, 0.07], dark);
  addBox(mesh, [0, 2.15, frontZ + 0.082], [0.90, 1.60, 0.025], tint(dark, 0.12));
  addBox(mesh, [-0.92, 2.15, frontZ + 0.035], [0.12, 2.72, 0.12], metal);
  addBox(mesh, [0.92, 2.15, frontZ + 0.035], [0.12, 2.72, 0.12], metal);
  addBox(mesh, [-0.50, 2.15, frontZ + 0.085], [0.035, 2.30, 0.025], tint(metal, -0.16));
  addBox(mesh, [0.50, 2.15, frontZ + 0.085], [0.035, 2.30, 0.025], tint(metal, -0.16));

  addPrism(mesh, [0, 0.75, frontZ + 0.10], [0.80, 0.24], 0.42, 8, dark, Math.PI / 8);
  addBox(mesh, [0, 0.88, frontZ + 0.31], [1.34, 0.12, 0.28], metal, [0.10, 0, 0]);
  addBox(mesh, [0, 0.89, frontZ + 0.47], [0.98, 0.05, 0.16], accent, [0.10, 0, 0]);

  addFrustum(mesh, [0, 3.92, centerZ], [1.14, 0.88], [1.36, 1.04], 0.38, 12, metal, Math.PI / 12);
  addRing(mesh, [0, 0, centerZ], [1.35, 1.04], [1.10, 0.80], 4.13, accent, 12, Math.PI / 12);
  addRing(mesh, [0, 0, centerZ], [1.08, 0.80], [0.80, 0.56], 4.145, tint(dark, -0.12), 12, Math.PI / 12);
  addBox(mesh, [0, 4.18, centerZ], [2.54, 0.16, 1.80], metal);
  addBox(mesh, [0, 4.28, centerZ], [2.12, 0.08, 1.46], body);
  addBox(mesh, [-0.78, 1.15, frontZ + 0.10], [0.16, 0.12, 0.08], accent);
  addBox(mesh, [0.78, 1.15, frontZ + 0.10], [0.16, 0.12, 0.08], accent);
}

function buildMesh(state, time) {
  const mesh = makeMesh();
  const appearance = normalizeAppearance(state.appearance);
  const tableSkin = getSkin('table', appearance.table);
  const traySkin = getSkin('tray', appearance.tray);
  const towerSkin = getSkin('tower', appearance.tower);
  const diceSkin = getSkin('dice', appearance.dice);
  addTable(mesh, tableSkin);
  if (state.mode === 'tray') addTray(mesh, traySkin);
  if (state.mode === 'tower') addTower(mesh, towerSkin);

  const dieMaterial = parseHex(diceSkin.body);
  const dieAccent = parseHex(diceSkin.accent);
  const die = DIE_TYPES.find((item) => item.id === state.die) || DIE_TYPES[5];
  const positions = layoutDice(state.outcomes.length);
  const rolling = state.phase === 'rolling';
  positions.forEach((position, index) => {
    const progress = rolling ? Math.min(1, Math.max(0, (time - state.startedAt - index * 70) / 900)) : 1;
    const bounce = rolling ? Math.sin(progress * Math.PI) * 0.72 : 0;
    const spin = rolling ? (1 - progress) * (index % 2 ? -1 : 1) * 4.4 : (index % 2 ? -0.12 : 0.12);
    const { shape, size, squash } = dieShape(die.id);
    const floorY = state.mode === 'tray' ? 0.30 : state.mode === 'tower' ? 0.92 : 0.08;
    const rowOffset = position[1] - 0.53;
    const restY = floorY + dieRestHeight(shape, size, squash) + rowOffset;
    addPolyhedron(
      mesh,
      shape,
      [position[0], restY + bounce, position[2] + (state.mode === 'tower' ? 1.18 : state.mode === 'tray' ? 0.16 : 0)],
      size,
      dieMaterial,
      dieAccent,
      [spin * 0.42, spin, index * 0.13],
      squash,
      diceSkin.family,
    );
  });
  return mesh;
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, near * far * 2 * range, 0,
  ]);
}

function lookAt(eye, target, up) {
  const forward = normalize(sub(target, eye));
  const side = normalize(cross(forward, up));
  const vertical = cross(side, forward);
  return new Float32Array([
    side[0], vertical[0], -forward[0], 0,
    side[1], vertical[1], -forward[1], 0,
    side[2], vertical[2], -forward[2], 0,
    -dot(side, eye), -dot(vertical, eye), dot(forward, eye), 1,
  ]);
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'shader-compile-failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'program-link-failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function toUint16(values) {
  if (values.length > 65535) throw new Error('scene-mesh-too-large');
  return new Uint16Array(values);
}

export const WEBGL_PROFILE = 'adel-dice-webgl-v1';

export function createWebglScene(canvas, options = {}) {
  if (!canvas) throw new Error('webgl-canvas-missing');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('webgl2-unavailable');
  const program = createProgram(gl);
  const vao = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const normalLocation = gl.getAttribLocation(program, 'a_normal');
  const colorLocation = gl.getAttribLocation(program, 'a_color');
  const projectionLocation = gl.getUniformLocation(program, 'u_projection');
  const viewLocation = gl.getUniformLocation(program, 'u_view');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  let projection = perspective(Math.PI / 3.1, 1, 0.1, 50);
  let view = lookAt([6.8, 8.6, 7.4], [0, 0.42, 0.05], [0, 1, 0]);
  let animationFrame = 0;
  let disposed = false;
  let renderState = {
    mode: 'tray',
    appearance: {},
    die: 'd20',
    outcomes: [],
    phase: 'idle',
    startedAt: 0,
  };

  function updateCamera() {
    if (renderState.mode === 'tower') {
      view = lookAt([6.0, 6.5, 8.8], [0, 2.12, -0.15], [0, 1, 0]);
      return;
    }
    if (renderState.mode === 'table') {
      view = lookAt([7.8, 9.2, 8.4], [0, 0.25, -0.05], [0, 1, 0]);
      return;
    }
    // 3/4 isometric angle: the far rim, tray depth and the rear lamp remain
    // visible while the dice still occupy the visual center of the desk.
    view = lookAt([6.8, 8.6, 7.4], [0, 0.42, 0.05], [0, 1, 0]);
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.enableVertexAttribArray(normalLocation);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.useProgram(program);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    updateCamera();
    projection = perspective(renderState.mode === 'tower' ? Math.PI / 3.25 : Math.PI / 3.0, width / height, 0.1, 50);
  }

  function draw(time) {
    if (disposed) return;
    resize();
    // The authored CSS atmosphere remains visible behind the real WebGL
    // geometry; the canvas is still the only renderer for the scene objects.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const mesh = buildMesh(renderState, time);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.colors), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, toUint16(mesh.indices), gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(projectionLocation, false, projection);
    gl.uniformMatrix4fv(viewLocation, false, view);
    gl.uniform1f(timeLocation, time);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    if (renderState.phase === 'rolling') animationFrame = window.requestAnimationFrame(draw);
  }

  function render(nextState = {}) {
    renderState = {
      ...renderState,
      ...nextState,
      outcomes: Array.isArray(nextState.outcomes) ? nextState.outcomes.slice() : renderState.outcomes,
      startedAt: nextState.phase === 'rolling' ? performance.now() : renderState.startedAt,
    };
    window.cancelAnimationFrame(animationFrame);
    draw(performance.now());
  }

  function onContextLost(event) {
    event.preventDefault();
    options.onContextLost?.(new Error('webgl-context-lost'));
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  resize();
  render({ phase: 'idle' });

  return Object.freeze({
    profile: WEBGL_PROFILE,
    renderer: 'webgl2-canvas-v1',
    resize,
    render,
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(normalBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  });
}
