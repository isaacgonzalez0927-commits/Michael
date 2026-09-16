import * as THREE from 'three';
import { createBucketMesh } from '../render/meshes.js';
import { labelTexture } from '../render/textures.js';

let bucketLabel = null;
const _pull = new THREE.Vector3();

export class FoodPickup {
  constructor(scene, position) {
    if (!bucketLabel) {
      bucketLabel = labelTexture(THREE, 'YARDBIRD', '#fff4c4', '#8b1d1d');
    }
    this.scene = scene;
    this.root = createBucketMesh(bucketLabel);
    this.root.position.copy(position);
    this.root.position.y = 0.95;
    this.root.scale.setScalar(1.85);
    scene.add(this.root);
    this.alive = true;
    this.radius = 2.4;
    this.spin = 1.4 + Math.random() * 0.8;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffc14a,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.y = 0.35;
    this.root.add(glow);
    this.glow = glow;
  }

  get position() {
    return this.root.position;
  }

  update(dt, time, playerPos) {
    this.root.rotation.y += this.spin * dt;
    this.root.position.y = 0.95 + Math.sin(time * 3.4 + this.root.position.x) * 0.22;
    this.glow.scale.setScalar(1.1 + Math.sin(time * 5) * 0.18);
    if (playerPos) {
      _pull.copy(playerPos).sub(this.root.position);
      _pull.y = 0;
      const d = _pull.length();
      if (d < 16 && d > 0.05) {
        _pull.multiplyScalar((dt * 22) / d);
        this.root.position.add(_pull);
      }
    }
  }

  collect() {
    this.alive = false;
    this.scene.remove(this.root);
  }
}
