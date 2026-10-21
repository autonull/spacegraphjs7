import type * as THREE from 'three';

export interface Finger {
  pointerId: number;
  position: { x: number; y: number };
  ndc: { x: number; y: number };
  buttons: number;
  state: 'down' | 'move' | 'up';
  target: unknown;
  worldRay?: THREE.Ray;
}

export abstract class Fingering {
  /**
   * Whether the gesture belongs to this fingering alone. A fingering that claims it keeps the
   * generic interaction from acting on the same press: a resize handle is not also a node drag.
   * The camera's gestures do not claim it; they use buttons the nodes do not.
   */
  readonly claimsGesture?: boolean;

  abstract start(finger: Finger): boolean;

  abstract update(finger: Finger): boolean;

  abstract stop(finger: Finger): void;

  defer(_finger: Finger): boolean {
    return true;
  }

  startMultiTouch?(finger1: Finger, finger2: Finger): boolean;

  updateMultiTouch?(finger1: Finger, finger2: Finger): boolean;

  stopMultiTouch?(): void;

  onDragStart?(finger: Finger): void;

  onDragging?(finger: Finger): void;

  onDragStop?(finger: Finger): void;
}

export class FingerManager {
  private activeFingering: Fingering | null = null;
  readonly fingers = new Map<number, Finger>();

  /**
   * Offer the gesture to a fingering. The gesture changes hands only when the fingering that is
   * offered it actually starts: a fingering that refuses the gesture leaves it with whoever had it.
   * A fingering that owns the gesture may hold on to it (`defer` returns false).
   */
  test(next: Fingering, finger: Finger): boolean {
    const previous = this.activeFingering;

    if (previous && !previous.defer(finger)) return false;
    if (!next.start(finger)) return false;

    previous?.stop(finger);
    this.activeFingering = next;
    return true;
  }

  update(finger: Finger): void {
    this.activeFingering?.update(finger);
  }

  end(finger: Finger): void {
    this.activeFingering?.stop(finger);
    this.activeFingering = null;
  }

  isActive(): boolean {
    return this.activeFingering !== null;
  }

  getActive(): Fingering | null {
    return this.activeFingering;
  }

  getFinger(pointerId: number): Finger | undefined {
    return this.fingers.get(pointerId);
  }

  setFinger(pointerId: number, finger: Finger): void {
    this.fingers.set(pointerId, finger);
  }

  deleteFinger(pointerId: number): void {
    this.fingers.delete(pointerId);
  }
}
