import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DreamShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uBlur: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    uniform float uBlur;
    varying vec2 vUv;

    vec3 sampleBlur(vec2 uv) {
      vec3 c = vec3(0.0);
      float t = 0.0;
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          float w = 1.0 - abs(float(x)) * 0.18 - abs(float(y)) * 0.18;
          vec2 o = vec2(float(x), float(y)) * 0.0028 * uBlur;
          c += texture2D(tDiffuse, uv + o).rgb * w;
          t += w;
        }
      }
      return c / t;
    }

    void main() {
      vec2 uv = vUv;
      float amt = uAmount;
      uv.x += sin(uv.y * 18.0 + uTime * 1.6) * 0.012 * amt;
      uv.y += cos(uv.x * 14.0 - uTime * 1.1) * 0.01 * amt;
      float aberr = 0.006 * amt;
      vec3 col;
      if (uBlur > 0.15) {
        col = sampleBlur(uv);
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      float r = texture2D(tDiffuse, uv + vec2(aberr, 0.0)).r;
      float b = texture2D(tDiffuse, uv - vec2(aberr, 0.0)).b;
      col.r = mix(col.r, r, amt);
      col.b = mix(col.b, b, amt);
      vec3 tint = mix(vec3(1.0), vec3(1.15, 0.72, 1.25), amt);
      col *= tint;
      float vig = smoothstep(0.95, 0.35, length(vUv - 0.5));
      col *= mix(1.0, vig, 0.35 + amt * 0.4);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.85, 0.42);
    this.dream = new ShaderPass(DreamShader);
    this.output = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.dream);
    this.composer.addPass(this.output);
    this.time = 0;
  }

  setScene(scene, camera) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
  }

  setDream(amount, blur = amount) {
    this.dream.uniforms.uAmount.value = amount;
    this.dream.uniforms.uBlur.value = blur;
    this.bloom.strength = 0.35 + amount * 1.1;
  }

  setBloom(strength, threshold) {
    this.bloom.strength = strength;
    if (threshold != null) this.bloom.threshold = threshold;
  }

  resize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render(dt) {
    this.time += dt;
    this.dream.uniforms.uTime.value = this.time;
    this.composer.render();
  }
}
