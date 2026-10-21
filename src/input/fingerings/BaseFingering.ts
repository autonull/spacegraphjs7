import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Finger, Fingering } from '../Fingering';

export abstract class BaseFingering implements Fingering {
  protected sg: SpaceGraph;
  protected raycaster: InteractionRaycaster;
  protected active = false;

  constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
    this.sg = sg;
    this.raycaster = raycaster;
  }

  abstract start(finger: Finger): boolean;

  abstract update(finger: Finger): boolean;

  abstract stop(finger: Finger): void;

  /** The node under the finger. The ray follows the finger, so the pick is the finger's own. */
  protected pickNode(finger: Finger): ReturnType<InteractionRaycaster['raycastNode']> {
    this.raycaster.updateMousePosition(finger.position.x, finger.position.y);
    return this.raycaster.raycastNode();
  }

  defer(_finger: Finger): boolean {
    return true;
  }

  isActive(): boolean {
    return this.active;
  }

  protected emit<K extends string>(event: K, data: Record<string, unknown>): void {
    this.sg.events.emit(event, data);
  }
}
