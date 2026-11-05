import type * as THREE from 'three';
import type { Node } from '../nodes/Node';
import { parentIdOf } from '../utils/nodeParent';
import { BaseSystemPlugin } from './BaseSystemPlugin';
import { visibleWorldExtent } from '../utils/CameraUtils';

export interface LODPluginOptions {
    /** Max world distance for perspective cameras. Default: 3000 */
    maxDistance?: number;
    /** Distance transition range for fade-out (world units). Default: 500 */
    transitionRange?: number;
    /** For orthographic cameras: max visible world extent (frustum height). Default: 5000 */
    maxVisibleExtent?: number;
    /** For orthographic cameras: extent transition range for fade-out. Default: 1000 */
    extentTransitionRange?: number;
}

export class LODPlugin extends BaseSystemPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    private readonly maxDistance: number;
    private readonly transitionRange: number;
    private readonly maxVisibleExtent: number;
    private readonly extentTransitionRange: number;
    private detailThreshold = 0.5;

    constructor(options: LODPluginOptions = {}) {
        super();
        this.maxDistance = options.maxDistance ?? 3000;
        this.transitionRange = options.transitionRange ?? 500;
        this.maxVisibleExtent = options.maxVisibleExtent ?? 5000;
        this.extentTransitionRange = options.extentTransitionRange ?? 1000;
    }

    onPreRender(_delta: number): void {
        if (!this.sg?.renderer?.camera) return;

        const camera = this.sg.renderer.camera;
        const isOrtho = camera.isOrthographicCamera;
        const nodes = Array.from(this.sg.graph.nodes.values());

        const hiddenParentIds = this._updateGroupsAndFindHidden(nodes, camera, isOrtho);
        this._updateNodeVisibility(nodes, camera, isOrtho, hiddenParentIds);
        this._updateEdgeVisibility();
    }

    setZoomLevel(_level: number, threshold?: number): void {
        if (threshold !== undefined) this.detailThreshold = threshold;
        this.onPreRender(0);
    }

    getCurrentDetailThreshold(): number {
        return this.detailThreshold;
    }

    private _updateGroupsAndFindHidden(nodes: Node[], camera: THREE.Camera, isOrtho: boolean): Set<string> {
        const hiddenParentIds = new Set<string>();
        for (const node of nodes) {
            if ((node as any).isGroupNode) {
                let distanceOrExtent = 0;
                if (isOrtho) {
                    const extent = visibleWorldExtent(camera, 0);
                    distanceOrExtent = extent.height;
                } else {
                    distanceOrExtent = camera.position.distanceTo(node.position);
                }
                (node as any).updateLod(distanceOrExtent);
                if ((node.data as Record<string, unknown>)._lastLodVisible === false)
                    hiddenParentIds.add(node.id);
            }
        }
        return hiddenParentIds;
    }

    private _updateNodeVisibility(
        nodes: Node[],
        camera: THREE.Camera,
        isOrtho: boolean,
        hiddenParentIds: Set<string>,
    ): void {
        for (const node of nodes) {
            const isHiddenByParent = this._isNodeHiddenByParent(node, hiddenParentIds);
            let distanceOrExtent = 0;
            let maxDistOrExtent = 0;
            let transitionRange = 0;

            if (isOrtho) {
                const extent = visibleWorldExtent(camera, 0);
                distanceOrExtent = extent.height;
                maxDistOrExtent = this.maxVisibleExtent;
                transitionRange = this.extentTransitionRange;
            } else {
                distanceOrExtent = camera.position.distanceTo(node.position);
                maxDistOrExtent = this.maxDistance;
                transitionRange = this.transitionRange;
            }

            const visible = !isHiddenByParent && distanceOrExtent <= maxDistOrExtent;
            const opacity = this._opacityForDistance(distanceOrExtent, maxDistOrExtent, transitionRange);

            if ((node as any).isDOMNode) {
                (node as any).setVisibility(visible);
                if (visible) {
                    if ((node as any).setOpacity) (node as any).setOpacity(opacity);
                    (node as any).updateLod(distanceOrExtent);
                }
            } else if (!(node as any).isGroupNode) {
                node.object.visible = visible;
                if (visible) {
                    // Use setOpacity if available (updates data.opacity for tests)
                    if ((node as any).setOpacity) {
                        (node as any).setOpacity(opacity);
                    } else if ((node.object as any).material) {
                        // Fallback for nodes without setOpacity
                        const mat = (node.object as any).material;
                        mat.opacity = opacity;
                        mat.transparent = opacity < 1;
                    }
                }
            }
        }
    }

    private _opacityForDistance(
        distanceOrExtent: number,
        maxDistOrExtent: number,
        transitionRange: number,
    ): number {
        return Math.max(
            0,
            1 - Math.max(0, distanceOrExtent - (maxDistOrExtent - transitionRange)) / transitionRange,
        );
    }

    private _isNodeHiddenByParent(node: Node, hiddenParentIds: Set<string>): boolean {
        let currentParent = parentIdOf(node);
        while (currentParent) {
            if (hiddenParentIds.has(currentParent)) return true;
            const parentNode = this.sg?.graph.nodes.get(currentParent);
            currentParent = parentIdOf(parentNode);
        }
        return false;
    }

    private _updateEdgeVisibility(): void {
        for (const [, edge] of this.sg!.graph.edges) {
            if (!edge.object) continue;
            const sourceHidden =
                edge.source?.object?.visible === false ||
                ((edge.source as any).isDOMNode && !(edge.source as any).cssObject?.visible);
            const targetHidden =
                edge.target?.object?.visible === false ||
                ((edge.target as any).isDOMNode && !(edge.target as any).cssObject?.visible);
            edge.object.visible = !(sourceHidden || targetHidden);
        }
    }
}
