import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { nodeDragPayload } from '../../plugins/interaction/nodeDragPayload';
import { visibleHeightAtDistance } from '../../utils/CameraUtils';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class NodeDraggingFingering extends BaseFingering {
  private dragNode: Node | null = null;
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private lastFingerY?: number;
  private enableZAxis = false;

  start(finger: Finger): boolean {
    if (finger.buttons !== 1) return false;

    const result = this.raycaster.raycastNode();
    if (!result?.node) return false;

    const localPos = result.node.worldToLocal(result.point.clone());
    if (!result.node.isDraggable(localPos)) return false;

    this.dragNode = result.node;
    this.lastFingerY = finger.position.y;

    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.sg.renderer.camera.getWorldDirection(new THREE.Vector3()).negate(),
      result.point
    );

    this.dragOffset.subVectors(result.point, this.dragNode.position);

    this.dragNode.pulse(1.0);
    this.active = true;
    this.sg.events.emit('interaction:dragstart', nodeDragPayload(this.dragNode));
    return true;
  }

  update(finger: Finger): boolean {
    if (!this.active || !this.dragNode) return false;

    this.enableZAxis =
      this.sg.input.getState().keysPressed.has('Alt') ||
      this.sg.input.getFingerManager().getFinger(1) !== undefined;

    if (this.enableZAxis) {
      return this.updateZAxisDrag(finger);
    } else {
      return this.updatePlanarDrag(finger);
    }
  }

  stop(_finger: Finger): void {
    if (this.dragNode) {
      this.dragNode.pulse(0.5);
      this.emit('interaction:dragend', nodeDragPayload(this.dragNode));
    }
    this.active = false;
    this.dragNode = null;
    this.lastFingerY = undefined;
  }

  private updatePlanarDrag(finger: Finger): boolean {
    if (!finger.worldRay) return false;

    const intersection = new THREE.Vector3();
    if (!finger.worldRay.intersectPlane(this.dragPlane, intersection)) {
      return false;
    }

    const targetPos = intersection.sub(this.dragOffset);
    this.dragNode!.position.copy(targetPos);
    this.dragNode!.object?.position.copy(this.dragNode!.position);

    this.sg.events.emit('interaction:drag', nodeDragPayload(this.dragNode!));

    return true;
  }

  private updateZAxisDrag(finger: Finger): boolean {
    const dy = finger.position.y - (this.lastFingerY ?? finger.position.y);
    this.lastFingerY = finger.position.y;

    const camera = this.sg.renderer.camera;
    const dist = this.dragNode!.position.distanceTo(camera.position);

    let scaleFactor = dist * 0.002;
    if (camera instanceof THREE.PerspectiveCamera) {
      scaleFactor = visibleHeightAtDistance(camera.fov, dist) / window.innerHeight;
    }

    const cameraDir = camera.getWorldDirection(new THREE.Vector3());
    const delta = cameraDir.clone().multiplyScalar(-dy * scaleFactor * 100);

    this.dragNode!.position.add(delta);
    this.dragNode!.object?.position.copy(this.dragNode!.position);

    this.sg.events.emit('interaction:drag', nodeDragPayload(this.dragNode!));

    return true;
  }
}
