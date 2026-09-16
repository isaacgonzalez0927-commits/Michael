import * as THREE from 'three';

const WATER_VERT = `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vView;
  uniform float uTime;
  uniform vec3 uPlayer;
  void main() {
    vUv = uv;
    vec3 p = position;
    float d = length(vec2(p.x, p.z) - uPlayer.xz);
    float waves = sin(p.x * 0.22 + uTime * 1.3) * 0.04;
    waves += cos(p.z * 0.19 - uTime * 1.05) * 0.035;
    waves += sin(d * 0.72 - uTime * 5.2) * exp(-d * 0.045) * 0.22;
    p.y += waves;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vView = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATER_FRAG = `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vView;
  uniform float uTime;
  uniform vec3 uPlayer;
  uniform vec3 uColorDeep;
  uniform vec3 uColorHi;
  uniform vec3 uCeil;
  void main() {
    vec3 V = normalize(vView);
    float n = sin(vWorld.x * 0.31 + uTime) * 0.5 + cos(vWorld.z * 0.27 - uTime * 0.85) * 0.5;
    vec3 N = normalize(vec3(
      -cos(vWorld.x * 0.31 + uTime) * 0.18,
      1.0,
      sin(vWorld.z * 0.27 - uTime * 0.85) * 0.18
    ));
    float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
    vec3 col = mix(uColorDeep, uColorHi, 0.28 + n * 0.18);
    col = mix(col, uCeil, fresnel * 0.72);

    float gx = abs(sin(vWorld.x * 0.085));
    float gz = abs(sin(vWorld.z * 0.085));
    float tiles = smoothstep(0.92, 1.0, max(gx, gz));
    col += vec3(0.25, 0.85, 1.0) * tiles * 0.12;

    vec3 lightDir = normalize(vec3(0.15, 0.85, 0.35));
    float spec = pow(max(dot(reflect(-lightDir, N), V), 0.0), 48.0);
    col += vec3(0.85, 1.0, 1.0) * spec * 0.65;

    float d = length(vWorld.xz - uPlayer.xz);
    float wake = sin(d * 1.4 - uTime * 7.0) * exp(-d * 0.12);
    col += vec3(0.55, 0.95, 1.0) * max(wake, 0.0) * 0.22;

    float foam = smoothstep(0.62, 1.0, n) * 0.16;
    col += foam;
    float alpha = 0.58 + fresnel * 0.28;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createWater(size) {
  const geo = new THREE.PlaneGeometry(size, size, 48, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPlayer: { value: new THREE.Vector3() },
      uColorDeep: { value: new THREE.Color(0x052830) },
      uColorHi: { value: new THREE.Color(0x3ad6ea) },
      uCeil: { value: new THREE.Color(0x8af4ff) },
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
