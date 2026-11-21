import type { SpaceGraph } from '../../SpaceGraph';
import type { InteractionRaycaster } from './RaycasterHelper';

/** Shared context for pointer-driven interaction handlers. */
export abstract class InteractionHandler {
    readonly sg: SpaceGraph;
    readonly raycaster: InteractionRaycaster;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }
}
