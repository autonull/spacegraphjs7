import type {
    GraphSpec,
    GraphImportData,
    NodeSpec,
    EdgeSpec,
    SpecUpdate,
    ZuiManifest,
    Projection,
} from '../types';
import { safeClone, wrapError, createLogger } from '../utils';
import { depthTreatment } from '../depth/DepthCues';
import type { CardFacing } from '@spacegraphjs/renderer';
import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

const logger = createLogger('GraphController');

export class GraphController {
    constructor(readonly sg: SpaceGraph) {}

    loadSpec(spec: GraphSpec): SpaceGraph {
        if (spec.nodes) {
            for (const node of spec.nodes) {
                this.sg.graph.addNode(node);
            }
        }
        if (spec.edges) {
            for (const edge of spec.edges) {
                this.sg.graph.addEdge(edge);
            }
        }
        return this.sg;
    }

    update(spec: SpecUpdate): void {
        spec.nodes?.forEach((u) => u.id && this.sg.graph.updateNode(u.id, u));
        spec.edges?.forEach((u) => u.id && this.sg.graph.updateEdge(u.id, u));
    }

    export(): GraphSpec & {
        camera?: { position: [number, number, number]; target: [number, number, number] };
        plugins?: Record<string, unknown>;
    } {
        const spec: GraphSpec & {
            camera?: { position: [number, number, number]; target: [number, number, number] };
            plugins?: Record<string, unknown>;
        } = {
            nodes: [...this.sg.graph.nodes.values()].map((node) => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z] as [
                    number,
                    number,
                    number,
                ],
                data: safeClone(node.data),
            })),
            edges: Array.from(this.sg.graph.edges.values()).map((edge) => ({
                id: edge.id,
                type: edge.constructor.name,
                source: edge.source.id,
                target: edge.target.id,
                data: safeClone(edge.data),
            })),
        };

        if (this.sg.cameraControls?.target) {
            const { camera } = this.sg.renderer;
            const { target } = this.sg.cameraControls;
            spec.camera = {
                position: [camera.position.x, camera.position.y, camera.position.z],
                target: [target.x, target.y, target.z],
            };
        }

        const pluginState = this.sg.pluginManager.export();
        if (pluginState && Object.keys(pluginState).length > 0) spec.plugins = pluginState;
        return spec;
    }

    import(data: GraphImportData): void {
        this.sg.graph.clear();
        this.loadSpec(data as GraphSpec);

        if (data.camera && this.sg.cameraControls?.target) {
            const { camera } = this.sg.renderer;
            const { target } = this.sg.cameraControls;
            camera.position.set(...data.camera.position);
            target.set(...data.camera.target);

            const diff = this.sg.renderer.mathPool
                .acquireVector3()
                .subVectors(camera.position, target);
            this.sg.cameraControls.spherical.radius = diff.length();
            const radius = this.sg.cameraControls.spherical.radius;
            const ratio = radius > 0 ? clamp01(diff.y / radius) : 0;
            this.sg.cameraControls.spherical.phi = Math.acos(ratio);
            this.sg.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);
            this.sg.renderer.mathPool.releaseVector3(diff);
            this.sg.cameraControls.update();
        }

        if (data.plugins) this.sg.pluginManager.import(data.plugins as Record<string, unknown>);
    }

    getNode(id: string): Node | undefined {
        return this.sg.graph.getNode(id);
    }

    getEdge(id: string): Edge | undefined {
        return this.sg.graph.getEdge(id);
    }

    hasNode(id: string): boolean {
        return this.sg.graph.hasNode(id);
    }

    hasEdge(id: string): boolean {
        return this.sg.graph.hasEdge(id);
    }

    clear(): void {
        this.sg.graph.clear();
    }

    addNode(spec: NodeSpec | Node): Node | null {
        return this.sg.graph.addNode(spec);
    }

    addEdge(spec: EdgeSpec | Edge): Edge | null {
        return this.sg.graph.addEdge(spec);
    }

    removeNode(id: string): void {
        this.sg.graph.removeNode(id);
    }

    removeEdge(id: string): void {
        this.sg.graph.removeEdge(id);
    }

    setPositions(positions: Record<string, [number, number, number]>): SpaceGraph {
        this.sg.graph.setPositions(positions);
        return this.sg;
    }

    pinAll(pinned = true): SpaceGraph {
        this.sg.graph.pinAll(pinned);
        return this.sg;
    }

    async layout(name: string, options?: Record<string, unknown>): Promise<void> {
        const plugin = this.sg.pluginManager.getPlugin(name);
        if (plugin && 'applyLayout' in plugin) {
            await (
                plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }
            ).applyLayout(options);
        }
    }

    layoutOnce(name: string, options?: Record<string, unknown>): Promise<void> {
        return this.layout(name, options);
    }

    get projection(): Projection {
        return this.sg.renderer.projection;
    }

    setProjection(projection: Projection): SpaceGraph {
        this.sg.renderer.setProjection(projection, this.sg.cameraControls?.target);
        this.sg.cameraControls?.setCamera(this.sg.renderer.camera);
        this.sg.events.emit('projection:change', { projection });
        this.sg.cameraController.reportViewport(true);
        this.sg.requestFrame();
        return this.sg;
    }
}
