import * as THREE from 'three';

/** The colour and width of the temporary line that follows a connection drag. */
const TEMP_COLOR = 0x8b5cf6;
const TEMP_WIDTH = 2;

/**
 * The temporary line that follows a connection drag: a zero-length line from the source node to
 * the pointer, its free end moved on every frame. The gesture that owns it decides where the
 * pointer is; this owns the line.
 */
export class TempConnectionLine {
  readonly line: THREE.Line;
  readonly material: THREE.LineBasicMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly scene: THREE.Object3D;

  constructor(scene: THREE.Object3D, start: THREE.Vector3) {
    this.scene = scene;
    this.material = new THREE.LineBasicMaterial({ color: TEMP_COLOR, linewidth: TEMP_WIDTH });
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([start.x, start.y, start.z, start.x, start.y, start.z]),
        3
      )
    );
    this.line = new THREE.Line(this.geometry, this.material);
    this.scene.add(this.line);
  }

  /** Move the free end of the line. */
  moveTo(point: THREE.Vector3): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(1, point.x, point.y, point.z);
    positions.needsUpdate = true;
  }

  /** Take the line out of the scene and release what it holds. */
  dispose(): void {
    this.scene.remove(this.line);
    this.geometry.dispose();
    this.material.dispose();
  }
}
