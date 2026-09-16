import * as THREE from 'three';

const WATER_VERT = `
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec3 uPlayer;
  void main() {
    vUv = uv;
    vec3 p = position;
    float d = length(vec2(p.x, p.z) - uPlayer.xz);
    float waves = sin(p.x * 0.18 + uTime * 1.4) * 0.05;
    waves += cos(p.z * 0.16 - uTime * 1.1) * 0.04;
    waves += sin(d * 0.55 - uTime * 4.5) * exp(-d * 0.035) * 0.28;
    p.y += waves;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATER_FRAG = `
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorHi;
  void main() {
    float n = sin(vWorld.x * 0.35 + uTime) * 0.5 + cos(vWorld.z * 0.28 - uTime * 0.8) * 0.5;
    vec3 col = mix(uColorDeep, uColorHi, 0.35 + n * 0.2);
    float grid = abs(sin(vWorld.x * 0.25)) * abs(sin(vWorld.z * 0.25));
    col += vec3(0.05, 0.12, 0.14) * grid;
    float foam = smoothstep(0.75, 1.0, n);
    col += foam * 0.15;
    gl_FragColor = vec4(col, 0.62);
  }
`;

export function createWater(size) {
  const geo = new THREE.PlaneGeometry(size, size, 96, 96);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPlayer: { value: new THREE.Vector3() },
      uColorDeep: { value: new THREE.Color(0x08323c) },
      uColorHi: { value: new THREE.Color(0x4ef0ff) },
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.42;
  mesh.renderOrder = 1;
  return mesh;
}
