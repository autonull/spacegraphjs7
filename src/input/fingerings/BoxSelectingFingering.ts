import type { SpaceGraph } from '../../SpaceGraph';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';
import type { SelectionManager } from '../../plugins/interaction/SelectionManager';

export class BoxSelectingFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private selectionManager: SelectionManager;
    private active = false;

    constructor(
        sg: SpaceGraph,
        raycaster: InteractionRaycaster,
        selectionManager: SelectionManager,
    ) {
        this.sg = sg;
        this.raycaster = raycaster;
        this.selectionManager = selectionManager;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const data = (finger as any).originalData;
        if (!data?.shiftKey) return false;

        const nodeResult = this.raycaster.raycastNode();
        if (nodeResult?.node) return false;

        this.active = true;
        this.selectionManager.startBoxSelection(finger.position.x, finger.position.y);
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active) return false;
        this.selectionManager.updateBoxSelection(finger.position.x, finger.position.y);
        return true;
    }

    stop(_finger: Finger): void {
        if (!this.active) return;
        this.selectionManager.endBoxSelection();
        this.active = false;
    }

    defer(_finger: Finger): boolean {
        return true;
    }
}
