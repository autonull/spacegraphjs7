import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class InteractionPlugin implements ISpaceGraphPlugin {
    readonly id = 'interaction';
    readonly name = 'Interaction Controls';
    readonly version = '1.0.0';
    private sg;
    private raycaster;
    private mouse;
    private pointerDownPosition;
    private isDragging;
    private dragNode;
    private dragPlane;
    private dragOffset;
    private intersection;
    init(sg: SpaceGraph): void;
    private initClick;
    private updateMousePosition;
    private getIntersectedNode;
    private initDrag;
    private getNodeFromMesh;
    dispose(): void;
}
