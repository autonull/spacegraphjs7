import * as THREE from 'three';
import { TempConnectionLine } from '../../plugins/interaction/TempConnectionLine';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class WiringFingering extends BaseFingering {
  private isConnecting = false;
  private tempLine: TempConnectionLine | null = null;

  start(finger: Finger): boolean {
    if (finger.buttons !== 1) return false;

    const result = this.raycaster.raycastNode();
    if (!result?.node) return false;

    const node = result.node;
    if (!node) return false;

    this.isConnecting = true;
    this.active = true;

    this.tempLine = new TempConnectionLine(this.sg.renderer.scene, node.position);

    return true;
  }

  update(finger: Finger): boolean {
    if (!this.isConnecting || !this.tempLine) return false;

    const ndc = finger.ndc;
    const vector = new THREE.Vector3(ndc.x, ndc.y, 0.5);
    vector.unproject(this.sg.renderer.camera);

    this.tempLine.moveTo(vector);

    return true;
  }

  stop(_finger: Finger): void {
    this.tempLine?.dispose();
    this.tempLine = null;

    this.isConnecting = false;
    this.active = false;
  }

  defer(_finger: Finger): boolean {
    return !this.isConnecting;
  }
}
