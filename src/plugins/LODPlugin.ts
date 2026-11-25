import type * as THREE from 'three';
import { depthFade, depthTreatment, sceneFadeDensity } from '../depth/DepthCues';
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
        const isOrtho = 'isOrthographicCamera' in camera;
        const extentHeight = isOrtho ? visibleWorldExtent(camera, 0).height : 0;
        const graphNodes = this.sg.graph.nodes;

        const hiddenParentIds = this._updateGroupsAndFindHidden(
            graphNodes.values(),
            camera,
            isOrtho,
            extentHeight,
        );
        const fogDensity = this._fogDensity(graphNodes.values(), camera);
        this._updateNodeVisibility(
            graphNodes.values(),
            camera,
            isOrtho,
            extentHeight,
            hiddenParentIds,
            fogDensity,
        );
        this._updateEdgeVisibility();
    }

    setZoomLevel(_level: number, threshold?: number): void {
        if (threshold !== undefined) this.detailThreshold = threshold;
        this.onPreRender(0);
    }

    getCurrentDetailThreshold(): number {
        return this.detailThreshold;
    }

    private _updateGroupsAndFindHidden(
        nodes: Iterable<Node>,
        camera: THREE.Camera,
        isOrtho: boolean,
        extentHeight: number,
    ): Set<string> {
        const hiddenParentIds = new Set<string>();
        for (const node of nodes) {
            if ((node as any).isGroupNode) {
                (node as any).updateLod(
                    isOrtho ? extentHeight : camera.position.distanceTo(node.position),
                );
                if ((node.data as Record<string, unknown>)._lastLodVisible === false)
                    hiddenParentIds.add(node.id);
            }
        }
        return hiddenParentIds;
    }

    private _fogDensity(nodes: Iterable<Node>, camera: THREE.Camera): number {
        const strength = depthTreatment(this.sg.depth ?? 'flat').fade;
        if (strength <= 0) return 0;
        const cameraDistance = this.sg.cameraControls?.spherical.radius ?? camera.position.length();
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const node of nodes) {
            minZ = Math.min(minZ, node.position.z);
            maxZ = Math.max(maxZ, node.position.z);
        }
        return sceneFadeDensity(strength, cameraDistance, maxZ - minZ);
    }

    private _updateNodeVisibility(
        nodes: Iterable<Node>,
        camera: THREE.Camera,
        isOrtho: boolean,
        extentHeight: number,
        hiddenParentIds: Set<string>,
        fogDensity: number,
    ): void {
        for (const node of nodes) {
            const isHiddenByParent = this._isNodeHiddenByParent(node, hiddenParentIds);
            const distanceOrExtent = isOrtho
                ? extentHeight
                : camera.position.distanceTo(node.position);
            const maxDistOrExtent = isOrtho ? this.maxVisibleExtent : this.maxDistance;
            const transitionRange = isOrtho ? this.extentTransitionRange : this.transitionRange;

            const visible = !isHiddenByParent && distanceOrExtent <= maxDistOrExtent;
            const opacity = this._opacityForDistance(
                distanceOrExtent,
                maxDistOrExtent,
                transitionRange,
            );

            if ((node as any).isDOMNode) {
                if ((node as any).cssObject?.visible !== visible) (node as any).setVisibility(visible);
                if (visible) {
                    const fogOpacity = depthFade(
                        isOrtho ? camera.position.distanceTo(node.position) : distanceOrExtent,
                        fogDensity,
                    );
                    const nextOpacity = opacity * fogOpacity;
                    if (
                        (node as any).setOpacity &&
                        (node as any).domElement?.style.opacity !== String(nextOpacity)
                    )
                        (node as any).setOpacity(nextOpacity);
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
            1 -
                Math.max(0, distanceOrExtent - (maxDistOrExtent - transitionRange)) /
                    transitionRange,
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
            edge.object.visible = !edge.suppressLine && !(sourceHidden || targetHidden);
        }
    }
}
