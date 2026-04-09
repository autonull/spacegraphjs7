import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';
import type { SelectionManager } from '../../plugins/interaction/SelectionManager';

export class BoxSelectingFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private selectionManager: SelectionManager;
    private active = false;
    private startNDC = new THREE.Vector2();
    private currentNDC = new THREE.Vector2();

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
        if (!this.sg.input.getState().keysPressed.has('Shift')) return false;

        const nodeResult = this.raycaster.raycastNode();
        if (nodeResult?.node) return false;

        this.active = true;
        this.startNDC.set(finger.ndc.x, finger.ndc.y);
        this.currentNDC.copy(this.startNDC);
        this.selectionManager.startBoxSelection(finger.position.x, finger.position.y);
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active) return false;

        this.currentNDC.set(finger.ndc.x, finger.ndc.y);
        this.selectionManager.updateBoxSelection(finger.position.x, finger.position.y);

        const frustum = this.computeSelectionFrustum(this.startNDC, this.currentNDC);
        const selected = Array.from(this.sg.graph.nodes.values()).filter(n =>
            n.bounds3D && frustum.containsPoint(n.position)
        );
        this.sg.events.emit('selection:preview', { nodes: selected });

        return true;
    }

    stop(_finger: Finger): void {
        if (!this.active) return;

        const frustum = this.computeSelectionFrustum(this.startNDC, this.currentNDC);
        const selected = Array.from(this.sg.graph.nodes.values()).filter(n =>
            n.bounds3D && frustum.containsPoint(n.position)
        );

        this.selectionManager.endBoxSelection();
        this.sg.events.emit('selection:change', { nodes: selected });

        this.active = false;
    }

    private computeSelectionFrustum(start: THREE.Vector2, end: THREE.Vector2): THREE.Frustum {
        const camera = this.sg.renderer.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;

        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        const frustum = new THREE.Frustum();
        const projection = new THREE.Matrix4();

        const originalProjection = camera.projectionMatrix.clone();

        const pickScale = new THREE.Vector2(2 / (maxX - minX), 2 / (maxY - minY));
        const pickOffset = new THREE.Vector2(- (minX + maxX) / 2, - (minY + maxY) / 2);

        projection.copy(originalProjection);

        projection.elements[0] *= pickScale.x;
        projection.elements[4] *= pickScale.x;
        projection.elements[8] = (projection.elements[8] + pickOffset.x) * pickScale.x;
        projection.elements[12] *= pickScale.x;

        projection.elements[1] *= pickScale.y;
        projection.elements[5] *= pickScale.y;
        projection.elements[9] = (projection.elements[9] + pickOffset.y) * pickScale.y;
        projection.elements[13] *= pickScale.y;

        const viewMatrix = camera.matrixWorldInverse;
        const viewProjection = new THREE.Matrix4().multiplyMatrices(projection, viewMatrix);

        frustum.setFromProjectionMatrix(viewProjection);
        return frustum;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}
