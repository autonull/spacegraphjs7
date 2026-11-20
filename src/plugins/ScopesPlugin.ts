// The animated scope engine as an opt-in system plugin. Every adaptive feature is a switch: the
// plugin does nothing until `options.scopes.enabled` is set, and zoom/focus/vision/policy/animation
// can each be turned on independently. It writes positions into the existing graph, so renderers,
// adapters and the contract stay untouched.

import type { EventEmitter } from '../core/EventEmitter';
import type { Graph } from '../core/Graph';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { SpaceGraphEvents } from '../types';
import type { VisionReport } from '../vision/types';
import {
    ScopeSimulation,
    buildScopeTree,
    type ScopeForceOptions,
    type ScopeLayout,
    type ScopeLayoutOptions,
    type ScopePolicyInput,
    type ScopeSimulationOptions,
    type ScopeSpec,
    type ScopeVisionSignal,
} from '../layout';
import { BaseSystemPlugin } from './BaseSystemPlugin';

export interface ScopesPluginOptions {
    /** Master switch; the plugin is only constructed when this is true. */
    enabled?: boolean;
    /** The scope forest. May be empty and supplied later through `plugin.setSpecs`. */
    specs?: readonly ScopeSpec[];
    /** Animate toward solved layouts. Default true; false snaps every target. */
    animate?: boolean;
    /** Use the policy seam at all. Default true; false keeps the raw solved layout. */
    policy?: boolean;
    /** Read the current zoom as the activation band. Default false. */
    followZoom?: boolean;
    /** Pin the selected node and its owning scopes. Default false. */
    followFocus?: boolean;
    /** Feed the last vision report into the policy. Default false. */
    followVision?: boolean;
    /** Map zoom (0..1) to a band index when `followZoom` is on. Default `round(zoom * 3)`. */
    bandOf?: (zoom: number) => number;
    /** Create graph nodes for scope nodes that do not exist. Default false. */
    createNodes?: boolean;
    /** Node type used by `createNodes`. Default 'ShapeNode'. */
    nodeType?: string;
    /** Map a qualified scope node id to a graph node id. Default identity. */
    nodeId?: (qualified: string) => string;
    /** A host signal source; its values win over the follow* switches. */
    signals?: () => ScopePolicyInput;
    /** Transient inter-body forces, active only while the graph cools after a change. */
    forces?: ScopeForceOptions;
    layout?: ScopeLayoutOptions;
    simulation?: ScopeSimulationOptions;
    /** Called after every frame with the animated layout. */
    onFrame?: (view: ScopeLayout) => void;
}

/** Map a vision report onto the policy's overlap and legibility scores. */
export function visionScores(report: VisionReport): ScopeVisionSignal {
    return {
        overlap: Math.min(1, report.overlap.overlapCount / 8),
        legibility: Math.min(1, report.legibility.averageContrast / 4.5),
    };
}

const signalKey = (input: ScopePolicyInput): string =>
    `${input.band ?? ''}|${input.focus ?? ''}|${input.vision?.overlap ?? ''}|${input.vision?.legibility ?? ''}`;

export class ScopesPlugin extends BaseSystemPlugin {
    readonly id = 'scopes';
    readonly name = 'Scopes';
    readonly version = '1.0.0';

    readonly #simulation: ScopeSimulation;
    #specs: readonly ScopeSpec[];
    #qualifiedByNode = new Map<string, string>();
    #lastKey = '';
    #lastVision?: ScopeVisionSignal;

    constructor(readonly options: ScopesPluginOptions = {}) {
        super();
        this.#specs = options.specs ?? [];
        this.#simulation = new ScopeSimulation({
            ...options.simulation,
            forces: options.forces ?? options.simulation?.forces,
            layout: options.layout,
        });
    }

    get simulation(): ScopeSimulation {
        return this.#simulation;
    }

    get specs(): readonly ScopeSpec[] {
        return this.#specs;
    }

    init(sg: SpaceGraph, graph: Graph, events: EventEmitter<SpaceGraphEvents>): void {
        super.init(sg, graph, events);
        this.setSpecs(this.#specs);
        if (this.options.simulation?.instant === undefined) {
            this.#simulation.setInstant(this.sg.reducedMotion);
        }
        if (this.options.followVision) {
            this.on('vision:analysis-complete', (report: VisionReport) => {
                this.#lastVision = visionScores(report);
            });
        }
    }

    /** Replace the scope forest and re-target the simulation. */
    setSpecs(specs: readonly ScopeSpec[]): void {
        this.#specs = specs;
        if (this.options.createNodes) this.#ensureNodes();
        const tree = buildScopeTree(specs);
        const mapId = (qualified: string): string => this.options.nodeId?.(qualified) ?? qualified;
        this.#qualifiedByNode = new Map();
        for (const [path, entry] of tree.byPath) {
            for (const node of entry.nodes) {
                const qualified = `${path}/${node.id}`;
                this.#qualifiedByNode.set(mapId(qualified), qualified);
            }
        }
        this.#simulation.setSpecs(specs);
        this.#lastKey = '';
        this.applySignals();
    }

    /** Recompute signals now, or wait for the next frame. */
    applySignals(): void {
        if (this.options.policy === false) return;
        const input = this.#input();
        const key = signalKey(input);
        if (key === this.#lastKey) return;
        this.#lastKey = key;
        this.#simulation.setPolicy(input);
    }

    onPreRender(delta: number): void {
        this.applySignals();
        if (this.options.animate === false) this.#simulation.settle();
        else this.#simulation.advance(delta);
        this.#applyPositions();
        this.options.onFrame?.(this.#simulation.view());
        if (!this.#simulation.settled) this.sg.requestFrame();
    }

    #input(): ScopePolicyInput {
        const explicit = this.options.signals?.() ?? {};
        const band = explicit.band ?? (this.options.followZoom ? this.#bandOf(this.sg.zoom) : undefined);
        const selected = this.sg.selection?.list[0];
        const focus =
            explicit.focus ??
            (this.options.followFocus && selected ? this.#qualifiedByNode.get(selected) : undefined);
        const vision = explicit.vision ?? (this.options.followVision ? this.#lastVision : undefined);
        return { band, focus, vision };
    }

    #bandOf(zoom: number): number {
        return this.options.bandOf ? this.options.bandOf(zoom) : Math.round(zoom * 3);
    }

    #applyPositions(): void {
        const view = this.#simulation.view();
        for (const [qualified, position] of view.positions) {
            const nodeId = this.options.nodeId?.(qualified) ?? qualified;
            const node = this.graph.nodes.get(nodeId);
            if (!node) continue;
            if ((node as Node).isPinned?.() || node.data?.pinned === true) continue;
            node.position.set(position.x, position.y, position.z);
            node.object?.position.copy(node.position);
        }
    }

    #ensureNodes(): void {
        const tree = buildScopeTree(this.#specs);
        const mapId = (qualified: string): string => this.options.nodeId?.(qualified) ?? qualified;
        for (const [path, entry] of tree.byPath) {
            for (const node of entry.nodes) {
                const qualified = `${path}/${node.id}`;
                const id = mapId(qualified);
                if (this.graph.nodes.has(id)) continue;
                this.graph.addNode({
                    id,
                    type: this.options.nodeType ?? 'ShapeNode',
                    label: node.id,
                    position: [0, 0, 0],
                    data: {},
                });
            }
        }
    }
}
