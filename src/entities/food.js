import * as THREE from 'three';
import { createBucketMesh } from '../render/meshes.js';
import { labelTexture } from '../render/textures.js';

let bucketLabel = null;

export class FoodPickup {
  constructor(scene, position) {
    if (!bucketLabel) {
      bucketLabel = labelTexture(THREE, 'YARDBIRD', '#fff4c4', '#8b1d1d');
    }
    this.scene = scene;
    this.root = createBucketMesh(bucketLabel);
    this.root.position.copy(position);
    this.root.position.y = 0.9;
    scene.add(this.root);
    this.alive = true;
    this.radius = 2.2;
    this.spin = (Math.random() * 2 - 1) * 1.6;
  }

  get position() {
    return this.root.position;
  }

  update(dt, time) {
    this.root.rotation.y += this.spin * dt;
    this.root.position.y = 0.9 + Math.sin(time * 3 + this.root.position.x) * 0.18;
  }

  collect() {
    this.alive = false;
    this.scene.remove(this.root);
  }
}
