import { faceNumbers } from "./dice.js";
import { announceWebGlBoot, announceWebGlError, announceWebGlReady, announceWebGlRolling } from "./qa.js";

const TAU = Math.PI * 2;
const UP = [0, 1, 0];

export const DICE_SKINS = Object.freeze({
  obsidian: { label: "Black Obsidian", short: "Обсидиан", body: [0.075, 0.09, 0.14], ink: "#b7eaff", accent: "#3ec5ef", glow: "#0f9dca" },
  lapis: { label: "Lapis Lazuli", short: "Лазурит", body: [0.055, 0.12, 0.34], ink: "#f0d59b", accent: "#6ca9ff", glow: "#2855d0" },
  rose: { label: "Rose Quartz", short: "Розовый кварц", body: [0.46, 0.25, 0.38], ink: "#ffe5d1", accent: "#ef9ec1", glow: "#b55786" },
  bloodstone: { label: "Bloodstone", short: "Кровавик", body: [0.29, 0.075, 0.065], ink: "#f3d29b", accent: "#e47255", glow: "#9d2922" },
  opalite: { label: "Opalite", short: "Опалит", body: [0.35, 0.56, 0.62], ink: "#fff8d6", accent: "#b8f6ef", glow: "#55c1c3" },
  dragon: { label: "Dragon Vein", short: "Драконья жила", body: [0.16, 0.13, 0.23], ink: "#f2c36e", accent: "#bc78ed", glow: "#6c37ae" }
});

export const TRAY_SKINS = Object.freeze({
  leather: { label: "Black Leather", short: "Чёрная кожа", floor: [0.065, 0.075, 0.09], rim: [0.14, 0.16, 0.19], trim: [0.57, 0.40, 0.20] },
  oak: { label: "Arcane Oak", short: "Резной дуб", floor: [0.24, 0.105, 0.055], rim: [0.48, 0.23, 0.10], trim: [0.86, 0.62, 0.29] },
  ivory: { label: "Dragon Ivory", short: "Кость дракона", floor: [0.48, 0.37, 0.23], rim: [0.74, 0.59, 0.37], trim: [0.96, 0.78, 0.42] }
});

export const TOWER_SKINS = Object.freeze({
  runes: { label: "Runes of the North", short: "Северные руны", body: [0.20, 0.09, 0.045], trim: [0.80, 0.54, 0.23], dark: [0.055, 0.045, 0.05] },
  ember: { label: "Emberwood", short: "Жареное дерево", body: [0.25, 0.045, 0.025], trim: [0.94, 0.31, 0.12], dark: [0.08, 0.022, 0.015] },
  void: { label: "Void Brass", short: "Пустотная латунь", body: [0.055, 0.08, 0.12], trim: [0.38, 0.67, 0.74], dark: [0.025, 0.035, 0.065] }
});

export const ENVIRONMENTS = Object.freeze({
  cartographer: { label: "Cartographer's Map", short: "Карта картографа", body: "cartographer" },
  mountain: { label: "Mountain Gate", short: "Горный перевал", body: "mountain" },
  candlelit: { label: "Candlelit Table", short: "Стол при свечах", body: "candlelit" }
});

function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function length(a) { return Math.hypot(a[0], a[1], a[2]); }
function normalize(a) { const len = length(a) || 1; return scale(a, 1 / len); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function quatNormalize(q) {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function quatMultiply(a, b) {
  return quatNormalize([
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ]);
}

function quatFromAxisAngle(axis, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

function quatFromTo(from, to) {
  const a = normalize(from);
  const b = normalize(to);
  const cosine = dot(a, b);
  if (cosine < -0.9999) {
    const axis = Math.abs(a[0]) < 0.9 ? normalize(cross(a, [1, 0, 0])) : normalize(cross(a, [0, 1, 0]));
    return quatFromAxisAngle(axis, Math.PI);
  }
  return quatNormalize([...cross(a, b), 1 + cosine]);
}

function quatSlerp(a, b, t) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cosine = ax * bx + ay * by + az * bz + aw * bw;
  if (cosine < 0) { cosine = -cosine; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  if (cosine > 0.9995) return quatNormalize([lerp(ax, bx, t), lerp(ay, by, t), lerp(az, bz, t), lerp(aw, bw, t)]);
  const angle = Math.acos(clamp(cosine, -1, 1));
  const sinAngle = Math.sin(angle);
  const aWeight = Math.sin((1 - t) * angle) / sinAngle;
  const bWeight = Math.sin(t * angle) / sinAngle;
  return [ax * aWeight + bx * bWeight, ay * aWeight + by * bWeight, az * aWeight + bz * bWeight, aw * aWeight + bw * bWeight];
}

function quatToMat4(q) {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return [
    1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
    2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
    2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
    0, 0, 0, 1
  ];
}

function mat4Multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

function lookAt(eye, target, up) {
  const z = normalize(sub(eye, target));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
}

function modelMatrix(position, rotation, size = 1) {
  const matrix = quatToMat4(rotation);
  matrix[0] *= size; matrix[1] *= size; matrix[2] *= size;
  matrix[4] *= size; matrix[5] *= size; matrix[6] *= size;
  matrix[8] *= size; matrix[9] *= size; matrix[10] *= size;
  matrix[12] = position[0]; matrix[13] = position[1]; matrix[14] = position[2];
  return matrix;
}

function convexHullTriangles(vertices) {
  const result = [];
  for (let i = 0; i < vertices.length - 2; i += 1) {
    for (let j = i + 1; j < vertices.length - 1; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if (length(normal) < 0.0001) continue;
        let positive = false, negative = false;
        for (let p = 0; p < vertices.length; p += 1) {
          if (p === i || p === j || p === k) continue;
          const distance = dot(normal, sub(vertices[p], vertices[i]));
          if (distance > 0.0001) positive = true;
          if (distance < -0.0001) negative = true;
        }
        if (positive && negative) continue;
        const face = [i, j, k];
        const center = scale(add(add(vertices[i], vertices[j]), vertices[k]), 1 / 3);
        if (dot(normal, center) < 0) face.reverse();
        result.push(face);
      }
    }
  }
  return result;
}

function icosahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  const vertices = raw.map(normalize);
  return { vertices, faces: convexHullTriangles(vertices) };
}

function tetrahedron() {
  const vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map(normalize);
  return { vertices, faces: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]] };
}

function cube() {
  const vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => scale(v, 0.86));
  return { vertices, faces: [[7, 6, 2, 3], [4, 0, 1, 5], [5, 1, 2, 6], [4, 5, 6, 7], [0, 4, 7, 3], [0, 3, 2, 1]] };
}

function octahedron() {
  const vertices = [[0, 1.25, 0], [1.25, 0, 0], [0, 0, 1.25], [-1.25, 0, 0], [0, 0, -1.25], [0, -1.25, 0]];
  return { vertices, faces: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]] };
}

function decahedron() {
  const vertices = [[0, 1.22, 0], [0, -1.22, 0]];
  const ring = 5;
  for (let i = 0; i < ring; i += 1) {
    const angle = i * TAU / ring + Math.PI / 2;
    vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
  }
  const faces = [];
  for (let i = 0; i < ring; i += 1) {
    const next = (i + 1) % ring;
    faces.push([0, 2 + i, 2 + next]);
    faces.push([1, 2 + next, 2 + i]);
  }
  return { vertices, faces };
}

function dodecahedron() {
  const ico = icosahedron();
  const vertices = ico.faces.map(face => normalize(scale(face.reduce((sum, index) => add(sum, ico.vertices[index]), [0, 0, 0]), 1 / 3)));
  const faces = ico.vertices.map(vertex => {
    const adjacent = ico.faces.map((face, faceIndex) => face.includes(ico.vertices.indexOf(vertex)) ? faceIndex : -1).filter(index => index >= 0);
    const axis = normalize(vertex);
    const reference = Math.abs(axis[1]) < 0.9 ? normalize(cross(axis, UP)) : normalize(cross(axis, [1, 0, 0]));
    const tangent = normalize(cross(reference, axis));
    return adjacent.sort((a, b) => {
      const va = sub(vertices[a], scale(axis, dot(vertices[a], axis)));
      const vb = sub(vertices[b], scale(axis, dot(vertices[b], axis)));
      return Math.atan2(dot(va, reference), dot(va, tangent)) - Math.atan2(dot(vb, reference), dot(vb, tangent));
    });
  });
  return { vertices, faces };
}

function d100() {
  const segments = 10;
  const rings = 9;
  const vertices = [[0, 1.1, 0]];
  for (let ring = 0; ring < rings; ring += 1) {
    const theta = ((ring + 1) / (rings + 1)) * Math.PI;
    for (let segment = 0; segment < segments; segment += 1) {
      const phi = (segment / segments) * TAU;
      vertices.push([Math.sin(theta) * Math.cos(phi) * 1.06, Math.cos(theta) * 1.1, Math.sin(theta) * Math.sin(phi) * 1.06]);
    }
  }
  const bottom = vertices.length;
  vertices.push([0, -1.1, 0]);
  const faces = [];
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    faces.push([0, 1 + next, 1 + segment]);
  }
  for (let ring = 0; ring < rings - 1; ring += 1) {
    const start = 1 + ring * segments;
    const nextStart = start + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      faces.push([start + segment, nextStart + segment, nextStart + next, start + next]);
    }
  }
  const last = 1 + (rings - 1) * segments;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    faces.push([bottom, last + segment, last + next]);
  }
  return { vertices, faces };
}

function geometryForSides(sides) {
  if (sides === 4) return tetrahedron();
  if (sides === 6) return cube();
  if (sides === 8) return octahedron();
  if (sides === 10) return decahedron();
  if (sides === 12) return dodecahedron();
  if (sides === 20) return icosahedron();
  if (sides === 100) return d100();
  throw new RangeError(`Unsupported die: d${sides}`);
}

function meshFromFaces(vertices, faces, numberList = []) {
  const positions = [], normals = [], uvs = [], faceNormals = [];
  faces.forEach((originalFace, faceIndex) => {
    let face = [...originalFace];
    const a = vertices[face[0]], b = vertices[face[1]], c = vertices[face[2]];
    let normal = normalize(cross(sub(b, a), sub(c, a)));
    const center = face.reduce((sum, index) => add(sum, vertices[index]), [0, 0, 0]);
    const centerScaled = scale(center, 1 / face.length);
    if (dot(normal, centerScaled) < 0) {
      face.reverse();
      normal = scale(normal, -1);
    }
    faceNormals.push(normal);
    let tangent = normalize(sub(vertices[face[0]], centerScaled));
    if (length(tangent) < 0.01) tangent = normalize(cross(normal, [0, 1, 0]));
    const bitangent = normalize(cross(normal, tangent));
    const extents = face.map(index => {
      const relative = sub(vertices[index], centerScaled);
      return Math.max(Math.abs(dot(relative, tangent)), Math.abs(dot(relative, bitangent)));
    });
    const extent = Math.max(0.5, ...extents);
    const tile = Math.max(0, (numberList[faceIndex] || faceIndex + 1) - 1);
    const tileX = tile % 10;
    const tileY = Math.floor(tile / 10);
    const localUvs = face.map(index => {
      const relative = sub(vertices[index], centerScaled);
      const u = clamp(0.5 + dot(relative, tangent) / (extent * 2.05), 0.08, 0.92);
      const v = clamp(0.5 + dot(relative, bitangent) / (extent * 2.05), 0.08, 0.92);
      return [(tileX + u) / 10, 1 - (tileY + v) / 10];
    });
    for (let i = 1; i < face.length - 1; i += 1) {
      [0, i, i + 1].forEach(vertexIndex => {
        const vertex = vertices[face[vertexIndex]];
        positions.push(vertex[0], vertex[1], vertex[2]);
        normals.push(normal[0], normal[1], normal[2]);
        uvs.push(localUvs[vertexIndex][0], localUvs[vertexIndex][1]);
      });
    }
  });
  return { positions, normals, uvs, faceNormals };
}

function solidMesh(vertices, faces) {
  const mesh = meshFromFaces(vertices, faces, []);
  return { ...mesh, positions: mesh.positions, normals: mesh.normals, uvs: mesh.uvs };
}

function prismPolygon(radius, bottomY, topY, segments, center = [0, 0, 0]) {
  const vertices = [];
  for (const y of [bottomY, topY]) {
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * TAU + Math.PI / segments;
      vertices.push([center[0] + Math.cos(angle) * radius, y, center[2] + Math.sin(angle) * radius]);
    }
  }
  const faces = [Array.from({ length: segments }, (_, i) => i), Array.from({ length: segments }, (_, i) => segments + i).reverse()];
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    faces.push([i, next, segments + next, segments + i]);
  }
  return solidMesh(vertices, faces);
}

function ringMesh(innerRadius, outerRadius, bottomY, topY, segments, center = [0, 0, 0]) {
  const vertices = [];
  for (const y of [bottomY, topY]) {
    for (const radius of [innerRadius, outerRadius]) {
      for (let i = 0; i < segments; i += 1) {
        const angle = (i / segments) * TAU + Math.PI / segments;
        vertices.push([center[0] + Math.cos(angle) * radius, y, center[2] + Math.sin(angle) * radius]);
      }
    }
  }
  const faces = [];
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    faces.push([i, next, 2 * segments + next, 2 * segments + i]);
    faces.push([segments + i, 3 * segments + i, 3 * segments + next, segments + next]);
    faces.push([2 * segments + i, 2 * segments + next, 3 * segments + next, 3 * segments + i]);
    faces.push([i, segments + i, segments + next, next]);
  }
  return solidMesh(vertices, faces);
}

function boxMesh(center, size) {
  const [sx, sy, sz] = size.map(value => value / 2);
  const [cx, cy, cz] = center;
  return solidMesh([
    [cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy + sy, cz - sz], [cx - sx, cy + sy, cz - sz],
    [cx - sx, cy - sy, cz + sz], [cx + sx, cy - sy, cz + sz], [cx + sx, cy + sy, cz + sz], [cx - sx, cy + sy, cz + sz]
  ], [[7, 6, 2, 3], [4, 0, 1, 5], [5, 1, 2, 6], [4, 5, 6, 7], [0, 4, 7, 3], [0, 3, 2, 1]]);
}

function createAtlas(gl, ink) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 1280;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 64px Georgia, serif";
  for (let number = 1; number <= 100; number += 1) {
    const column = (number - 1) % 10;
    const row = Math.floor((number - 1) / 10);
    const x = column * 128 + 64;
    const y = row * 128 + 64;
    context.shadowColor = "rgba(0, 0, 0, .85)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 3;
    context.fillStyle = "rgba(0, 0, 0, .7)";
    context.fillText(String(number), x + 2, y + 2);
    context.shadowColor = "transparent";
    context.fillStyle = ink;
    context.fillText(String(number), x, y);
  }
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  return texture;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform mat3 uNormalMatrix;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vec4 worldPosition = uModel * vec4(aPosition, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(uNormalMatrix * aNormal);
      vUv = aUv;
      gl_Position = uProjection * uView * worldPosition;
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec3 uBody;
    uniform sampler2D uAtlas;
    uniform float uUseTexture;
    uniform vec3 uCameraPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDirection = normalize(vec3(-0.42, 0.86, 0.32));
      vec3 fillDirection = normalize(vec3(0.7, 0.24, -0.45));
      float light = max(dot(normal, lightDirection), 0.0);
      float fill = max(dot(normal, fillDirection), 0.0);
      vec3 base = uBody * (0.46 + light * 0.54 + fill * 0.18);
      if (uUseTexture > 0.5) {
        vec4 glyph = texture2D(uAtlas, vUv);
        base = mix(base, glyph.rgb, glyph.a * 0.98);
      }
      vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
      float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 34.0);
      float edge = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
      base += vec3(specular * 0.28 + edge * 0.07);
      gl_FragColor = vec4(base, 1.0);
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
  return program;
}

function randomQuaternion() {
  const axis = normalize([Math.sin(Math.random() * TAU), Math.cos(Math.random() * TAU), Math.sin(Math.random() * TAU)]);
  return quatFromAxisAngle(axis, Math.random() * TAU);
}

function scaleForSides(sides) {
  if (sides === 4) return 0.82;
  if (sides === 6) return 0.76;
  if (sides === 8) return 0.82;
  if (sides === 10) return 0.82;
  if (sides === 12) return 0.84;
  if (sides === 20) return 0.9;
  return 0.92;
}

function createDieObject(gl, sides, value, skin) {
  const geometry = geometryForSides(sides);
  const numbers = faceNumbers(sides, value);
  const mesh = meshFromFaces(geometry.vertices, geometry.faces, numbers);
  const buffers = {
    position: gl.createBuffer(),
    normal: gl.createBuffer(),
    uv: gl.createBuffer()
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
  const target = quatFromTo(mesh.faceNormals[0], UP);
  return {
    sides,
    value,
    mesh,
    buffers,
    vertexCount: mesh.positions.length / 3,
    targetRotation: quatMultiply(target, quatFromAxisAngle(UP, -0.32)),
    rotation: randomQuaternion(),
    position: [0, 0.65, 0],
    settledPosition: [0, 0.62, 0],
    size: scaleForSides(sides),
    body: skin.body
  };
}

function makeSceneMeshes(gl) {
  const floor = boxMesh([0, -0.22, 0.35], [13, 0.35, 10]);
  const trayFloor = prismPolygon(3.55, -0.02, 0.08, 8, [0.3, 0, 0.4]);
  const trayRim = ringMesh(3.55, 3.95, 0.06, 0.54, 8, [0.3, 0, 0.4]);
  const sigilOuter = ringMesh(2.25, 2.31, 0.085, 0.11, 32, [0.3, 0, 0.4]);
  const sigilInner = ringMesh(1.1, 1.15, 0.09, 0.12, 24, [0.3, 0, 0.4]);
  const tower = prismPolygon(0.78, 0.55, 3.55, 12, [-3.15, 0, -0.78]);
  const towerTop = ringMesh(0.78, 1.02, 3.45, 3.7, 12, [-3.15, 0, -0.78]);
  const towerBottom = ringMesh(0.78, 1.04, 0.43, 0.72, 12, [-3.15, 0, -0.78]);
  const towerNeck = ringMesh(0.64, 0.86, 2.8, 2.96, 12, [-3.15, 0, -0.78]);
  const towerOpening = prismPolygon(0.56, 3.54, 3.57, 12, [-3.15, 0, -0.78]);
  return { floor, trayFloor, trayRim, sigilOuter, sigilInner, tower, towerTop, towerBottom, towerNeck, towerOpening };
}

function uploadSolidMesh(gl, mesh) {
  const buffers = { position: gl.createBuffer(), normal: gl.createBuffer(), uv: gl.createBuffer() };
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
  return { ...mesh, buffers, vertexCount: mesh.positions.length / 3 };
}

function colorFromHex(hex) {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255];
}

export class DiceRenderer {
  constructor(canvas, { onSettled } = {}) {
    this.canvas = canvas;
    this.onSettled = onSettled;
    this.gl = null;
    this.program = null;
    this.sceneMeshes = null;
    this.uploadedSceneMeshes = null;
    this.dice = [];
    this.animation = null;
    this.frameId = 0;
    this.drag = null;
    this.orbit = 0;
    this.sides = 20;
    this.values = [20];
    this.diceSkinKey = "obsidian";
    this.traySkinKey = "leather";
    this.towerSkinKey = "runes";
    this.environmentKey = "cartographer";
    announceWebGlBoot();
    try {
      this.gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      if (!this.gl) throw new Error("WebGL context unavailable");
      this.program = createProgram(this.gl);
      this.locations = {
        position: this.gl.getAttribLocation(this.program, "aPosition"),
        normal: this.gl.getAttribLocation(this.program, "aNormal"),
        uv: this.gl.getAttribLocation(this.program, "aUv"),
        projection: this.gl.getUniformLocation(this.program, "uProjection"),
        view: this.gl.getUniformLocation(this.program, "uView"),
        model: this.gl.getUniformLocation(this.program, "uModel"),
        normalMatrix: this.gl.getUniformLocation(this.program, "uNormalMatrix"),
        body: this.gl.getUniformLocation(this.program, "uBody"),
        atlas: this.gl.getUniformLocation(this.program, "uAtlas"),
        useTexture: this.gl.getUniformLocation(this.program, "uUseTexture"),
        camera: this.gl.getUniformLocation(this.program, "uCameraPosition")
      };
      this.sceneMeshes = makeSceneMeshes(this.gl);
      this.uploadedSceneMeshes = Object.fromEntries(Object.entries(this.sceneMeshes).map(([key, mesh]) => [key, uploadSolidMesh(this.gl, mesh)]));
      this.atlas = createAtlas(this.gl, DICE_SKINS[this.diceSkinKey].ink);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);
      this.resize();
      window.addEventListener("resize", () => this.resize(), { passive: true });
      canvas.addEventListener("pointerdown", event => this.beginDrag(event));
      canvas.addEventListener("pointermove", event => this.moveDrag(event));
      canvas.addEventListener("pointerup", () => this.endDrag());
      canvas.addEventListener("pointercancel", () => this.endDrag());
      this.setDice(this.sides, this.values);
      announceWebGlReady(++this.frameId);
      this.raf = requestAnimationFrame(time => this.render(time));
    } catch (error) {
      announceWebGlError();
      throw error;
    }
  }

  resize() {
    if (!this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  setAppearance({ diceSkin, traySkin, towerSkin, environment } = {}) {
    if (diceSkin && DICE_SKINS[diceSkin]) {
      this.diceSkinKey = diceSkin;
      this.gl.deleteTexture(this.atlas);
      this.atlas = createAtlas(this.gl, DICE_SKINS[diceSkin].ink);
      this.dice.forEach(die => { die.body = DICE_SKINS[diceSkin].body; });
    }
    if (traySkin && TRAY_SKINS[traySkin]) this.traySkinKey = traySkin;
    if (towerSkin && TOWER_SKINS[towerSkin]) this.towerSkinKey = towerSkin;
    if (environment && ENVIRONMENTS[environment]) this.environmentKey = environment;
  }

  setDice(sides, values) {
    this.sides = sides;
    this.values = [...values];
    this.dice.forEach(die => Object.values(die.buffers).forEach(buffer => this.gl.deleteBuffer(buffer)));
    const skin = DICE_SKINS[this.diceSkinKey];
    this.dice = values.map(value => createDieObject(this.gl, sides, value, skin));
    this.layoutDice();
  }

  layoutDice() {
    const count = this.dice.length;
    const columns = count <= 3 ? count : Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    this.dice.forEach((die, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 0.3 + (column - (columns - 1) / 2) * 1.45;
      const z = 0.75 + (row - (rows - 1) / 2) * 1.18;
      die.settledPosition = [x, 0.62 + (index % 2) * 0.035, z];
      die.position = [...die.settledPosition];
    });
  }

  startRoll(values, sides = this.sides) {
    this.setDice(sides, values);
    const now = performance.now();
    this.animation = { start: now, duration: values.length > 3 ? 1450 : 1250, settled: false };
    this.dice.forEach((die, index) => {
      die.rotation = randomQuaternion();
      die.startRotation = die.rotation;
      die.startPosition = [die.settledPosition[0] + (index % 2 ? 0.45 : -0.45), 1.65 + (index % 3) * 0.22, die.settledPosition[2] - 0.8];
      die.position = [...die.startPosition];
    });
    announceWebGlRolling();
  }

  beginDrag(event) {
    if (this.animation) return;
    this.drag = { x: event.clientX, orbit: this.orbit };
    this.canvas.setPointerCapture?.(event.pointerId);
  }

  moveDrag(event) {
    if (!this.drag) return;
    this.orbit = this.drag.orbit + (event.clientX - this.drag.x) * 0.005;
  }

  endDrag() { this.drag = null; }

  drawMesh(mesh, model, body, useTexture = false) {
    const gl = this.gl;
    const loc = this.locations;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.position);
    gl.enableVertexAttribArray(loc.position);
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.normal);
    gl.enableVertexAttribArray(loc.normal);
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.uv);
    gl.enableVertexAttribArray(loc.uv);
    gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(loc.model, false, model);
    gl.uniformMatrix3fv(loc.normalMatrix, false, new Float32Array([model[0], model[1], model[2], model[4], model[5], model[6], model[8], model[9], model[10]]));
    gl.uniform3fv(loc.body, body);
    gl.uniform1f(loc.useTexture, useTexture ? 1 : 0);
    if (useTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.uniform1i(loc.atlas, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  render(now) {
    if (!this.gl) return;
    const gl = this.gl;
    this.resize();
    const aspect = this.canvas.width / this.canvas.height;
    const projection = perspective(aspect < 0.8 ? 0.9 : 0.76, aspect, 0.1, 60);
    const cameraPosition = [Math.sin(this.orbit) * 0.9, aspect < 0.8 ? 7.2 : 6.5, aspect < 0.8 ? 11.4 : 9.6];
    const view = lookAt(cameraPosition, [0, 0.95, 0.55], UP);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.locations.projection, false, projection);
    gl.uniformMatrix4fv(this.locations.view, false, view);
    gl.uniform3fv(this.locations.camera, cameraPosition);
    const palette = this.environmentKey === "candlelit" ? [0.055, 0.028, 0.018] : this.environmentKey === "mountain" ? [0.035, 0.07, 0.085] : [0.018, 0.055, 0.075];
    gl.clearColor(palette[0], palette[1], palette[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const tray = TRAY_SKINS[this.traySkinKey];
    const tower = TOWER_SKINS[this.towerSkinKey];
    const scene = this.uploadedSceneMeshes;
    this.drawMesh(scene.floor, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), palette, false);
    this.drawMesh(scene.tower, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tower.body, false);
    this.drawMesh(scene.towerNeck, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tower.trim, false);
    this.drawMesh(scene.towerTop, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tower.trim, false);
    this.drawMesh(scene.towerBottom, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tower.trim, false);
    this.drawMesh(scene.towerOpening, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tower.dark, false);
    this.drawMesh(scene.trayFloor, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tray.floor, false);
    this.drawMesh(scene.trayRim, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tray.rim, false);
    this.drawMesh(scene.sigilOuter, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tray.trim, false);
    this.drawMesh(scene.sigilInner, modelMatrix([0, 0, 0], [0, 0, 0, 1], 1), tray.trim, false);

    if (this.animation) {
      const progress = clamp((now - this.animation.start) / this.animation.duration, 0, 1);
      const bounce = Math.sin(progress * Math.PI * 3.2) * Math.pow(1 - progress, 1.2);
      const settle = clamp((progress - 0.42) / 0.58, 0, 1);
      const settleEase = settle * settle * (3 - 2 * settle);
      this.dice.forEach((die, index) => {
        die.position = [
          lerp(die.startPosition[0], die.settledPosition[0], settleEase) + Math.sin(progress * TAU * 2 + index) * 0.12 * (1 - settleEase),
          lerp(die.startPosition[1], die.settledPosition[1], settleEase) + Math.abs(bounce) * 1.05,
          lerp(die.startPosition[2], die.settledPosition[2], settleEase) + Math.cos(progress * TAU * 1.5 + index) * 0.1 * (1 - settleEase)
        ];
        die.rotation = quatSlerp(die.startRotation, die.targetRotation, settleEase);
        this.drawMesh(die, modelMatrix(die.position, die.rotation, die.size), die.body, true);
      });
      if (progress >= 1 && !this.animation.settled) {
        this.animation.settled = true;
        this.animation = null;
        this.frameId += 1;
        announceWebGlReady(this.frameId);
        this.onSettled?.(this.frameId);
      }
    } else {
      this.dice.forEach(die => this.drawMesh(die, modelMatrix(die.position, die.targetRotation, die.size), die.body, true));
    }
    this.raf = requestAnimationFrame(time => this.render(time));
  }
}
