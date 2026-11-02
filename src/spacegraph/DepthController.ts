import type { DepthMode, Projection, CardFacing } from '../types';
import { depthTreatment } from '../depth/DepthCues';
import type { SpaceGraph } from '../SpaceGraph';

export class DepthController {
    #depth: DepthMode = 'flat';
    #cardFacing: CardFacing = 'auto';

    constructor(readonly sg: SpaceGraph) {}

    get depth(): DepthMode {
        return this.#depth;
    }

    setDepth(depth: DepthMode): SpaceGraph {
        const previous = this.#depth;
        this.#depth = depth;
        const effectiveDuration = this.sg.reducedMotion
            ? previous !== depth ? 0.5 : 0
            : previous !== depth ? 0.5 : 0;
        this.#applyDepth(depth, effectiveDuration);
        if (previous !== depth) this.sg.events.emit('depth:change', { depth, previous });
        return this.sg.commitCamera();
    }

    #applyDepth(depth: DepthMode, duration: number): void {
        const treatment = depthTreatment(depth);
        this.sg.renderer.setProjection(treatment.projection, this.sg.cameraControls?.target);
        this.sg.cameraControls?.setCamera(this.sg.renderer.camera);
        this.#applyCardFacing();
        this.sg.applySceneFade();
        this.sg.cameraControls?.setOrbitEnabled(treatment.orbit);
        this.sg.cameraControls?.setPolar(treatment.phi, 0, duration);
        this.sg.events.emit('projection:change', { projection: treatment.projection });
    }

    get cardFacing(): CardFacing {
        return this.#cardFacing;
    }

    setCardFacing(facing: CardFacing): SpaceGraph {
        this.#cardFacing = facing;
        this.#applyCardFacing();
        return this.sg.commitCamera();
    }

    #applyCardFacing(): void {
        const resolved =
            this.#cardFacing === 'auto' ? depthTreatment(this.#depth).facing : this.#cardFacing;
        this.sg.renderer.setCardFacing(resolved);
    }

    applySceneFade(): SpaceGraph {
        const treatment = depthTreatment(this.#depth);
        const depths = [...this.sg.graph.nodes.values()].map((node) => node.position.z);
        const sceneDepth = depths.length > 0 ? Math.max(...depths) - Math.min(...depths) : 0;
        const cameraDistance = this.sg.cameraControls?.spherical.radius ?? 0;
        this.sg.renderer.setDepthFadeFromScene(treatment.fade, cameraDistance, sceneDepth);
        return this.sg;
    }

    setProjection(projection: Projection): SpaceGraph {
        this.sg.renderer.setProjection(projection, this.sg.cameraControls?.target);
        this.sg.cameraControls?.setCamera(this.sg.renderer.camera);
        this.sg.events.emit('projection:change', { projection });
        return this.sg.commitCamera();
    }

    initialize(depth: DepthMode): void {
        this.#depth = depth;
        this.#applyDepth(depth, 0);
    }
}
