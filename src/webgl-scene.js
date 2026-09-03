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
  vec3 primary_light = normalize(vec3(-0.45, 0.88, 0.72));
  vec3 rim_light = normalize(vec3(0.72, 0.28, -0.65));
  float diffuse = 0.34 + max(dot(normal, primary_light), 0.0) * 0.64;
  float rim = pow(1.0 - max(dot(normal, rim_light), 0.0), 3.0) * 0.14;
  float ember = (sin(u_time * 0.0014 + v_world.x * 0.7 + v_world.z * 0.35) + 1.0) * 0.018;
  out_color = vec4(v_color.rgb * (diffuse + rim + ember), v_color.a);
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
    pushQuad(mesh, face.points.map((point) => transformPoint(point, center, 1, rotation)), face.normal, faceColor);
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

function addPolyhedron(mesh, shape, center, size, color, accent, rotation, squash = [1, 1, 1]) {
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

function addTable(mesh, tableSkin) {
  const surface = parseHex(tableSkin.surface);
  const edge = parseHex(tableSkin.edge);
  const accent = parseHex(tableSkin.accent);
  addBox(mesh, [0, -0.42, 0], [9.2, 0.62, 5.9], edge);
  addBox(mesh, [0, -0.08, 0], [8.85, 0.14, 5.56], surface);
  addRing(mesh, [0, 0.01, 0], [3.5, 2.0], [3.44, 1.94], 0.01, tint(accent, -0.25), 32, 0);
  addRing(mesh, [0, 0.01, 0], [1.2, 0.66], [1.16, 0.62], 0.015, tint(accent, -0.18), 24, 0);
}

function addTray(mesh, traySkin) {
  const floor = parseHex(traySkin.floor);
  const wall = parseHex(traySkin.wall);
  const rim = parseHex(traySkin.rim);
  const accent = parseHex(traySkin.accent);
  addPrism(mesh, [0, 0.08, 0.16], [3.72, 2.34], 0.24, 8, wall, Math.PI / 8);
  addOctagonFloor(mesh, [0, 0, 0.16], [3.28, 1.90], 0.23, floor);
  addRing(mesh, [0, 0, 0.16], [3.75, 2.37], [3.29, 1.91], 0.27, rim);
  addRing(mesh, [0, 0, 0.16], [2.3, 1.28], [2.22, 1.20], 0.25, tint(accent, -0.12), 24, 0);
}

function addTower(mesh, towerSkin) {
  const body = parseHex(towerSkin.body);
  const dark = parseHex(towerSkin.dark);
  const metal = parseHex(towerSkin.metal);
  const accent = parseHex(towerSkin.accent);
  addBox(mesh, [0, 0.22, -0.55], [2.65, 0.42, 1.78], metal);
  addBox(mesh, [0, 0.47, -0.55], [2.35, 0.26, 1.52], body);
  addBox(mesh, [0, 2.28, -0.55], [1.92, 3.32, 1.32], body);
  addBox(mesh, [-0.98, 2.28, 0.08], [0.16, 3.22, 0.15], metal);
  addBox(mesh, [0.98, 2.28, 0.08], [0.16, 3.22, 0.15], metal);
  addBox(mesh, [0, 2.28, 0.105], [1.52, 1.34, 0.08], dark);
  addFrustum(mesh, [0, 3.84, -0.55], [1.18, 0.88], [1.48, 1.08], 0.42, 8, metal, Math.PI / 8);
  addBox(mesh, [0, 4.08, -0.55], [2.86, 0.28, 1.84], metal);
  addBox(mesh, [0, 4.21, -0.55], [2.45, 0.12, 1.52], body);
  addBox(mesh, [0.84, 1.26, 0.15], [0.74, 0.54, 0.12], dark);
  addBox(mesh, [0.84, 1.26, 0.23], [0.55, 0.30, 0.06], accent);
  addBox(mesh, [-0.84, 1.35, 0.16], [0.08, 0.55, 0.08], accent);
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
    addPolyhedron(
      mesh,
      shape,
      [position[0], position[1] + bounce, position[2] + (state.mode === 'tower' ? 1.18 : 0)],
      size,
      dieMaterial,
      dieAccent,
      [spin * 0.42, spin, index * 0.13],
      squash,
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
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, preserveDrawingBuffer: true });
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
  const view = lookAt([0, 5.3, 8.6], [0, 1.25, 0], [0, 1, 0]);
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
    projection = perspective(Math.PI / 3.1, width / height, 0.1, 50);
  }

  function draw(time) {
    if (disposed) return;
    resize();
    const tableSkin = getSkin('table', normalizeAppearance(renderState.appearance).table);
    const background = parseHex(tableSkin.background);
    gl.clearColor(background[0], background[1], background[2], 1);
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
