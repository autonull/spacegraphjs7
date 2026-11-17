// One representation ladder per kind. The library registers, arbitrates and selects rungs from a
// ScaleDomain sample; the host supplies the order, the bands and the appearance of every rung.
// Selection keeps node ids stable across swaps so selection and permalinks stay valid (P1.2/P1.3).

import { selectRung } from '../core/rung';
import { clamp } from '../utils/math';
import type { ScaleSample } from '../zoom/ScaleDomain';

export interface LadderNode {
    readonly id: string;
    readonly kind: string;
    /** Host salience value; overrides the interpolated importance of the scale sample. */
    readonly importance?: number;
}

export interface LadderContext {
    /** The stable node id, unchanged when the representation changes. */
    readonly id: string;
    readonly sample: ScaleSample;
    readonly rung: string;
}

export interface LadderRung<Node extends LadderNode = LadderNode, Output = unknown> {
    readonly id: string;
    /** Normalized scale at which this rung takes over, usually a ScaleDomain stop. */
    readonly at: number;
    /** Node kinds served by this rung; omitted means every kind. */
    readonly kinds?: readonly string[];
    /** Minimum effective importance for this rung; finer rungs are skipped below it. */
    readonly minImportance?: number;
    /** Host-owned appearance. The library never inspects the result. */
    readonly build: (node: Node, context: LadderContext) => Output;
}

export interface LadderConfig {
    /** Normalized dead zone around a rung boundary; dampens wheel bursts at a swap. */
    readonly hysteresis?: number;
}

export interface LadderSelection<Node extends LadderNode = LadderNode, Output = unknown> {
    readonly id: string;
    readonly rung: LadderRung<Node, Output>;
    readonly value: Output;
}

/** The coarse-to-fine ladder a host may adopt; hosts own the real order and appearance. */
export const DEFAULT_RUNG_IDS = ['dot', 'glyph', 'card', 'widget', 'detail'] as const;

export class RepresentationLadder<Node extends LadderNode = LadderNode, Output = unknown> {
    readonly #rungs: LadderRung<Node, Output>[];
    readonly #hysteresis: number;

    constructor(rungs: readonly LadderRung<Node, Output>[] = [], config: LadderConfig = {}) {
        this.#rungs = [...rungs].sort((a, b) => a.at - b.at);
        this.#hysteresis = config.hysteresis ?? 0;
    }

    get ids(): readonly string[] {
        return this.#rungs.map((rung) => rung.id);
    }

    register(rung: LadderRung<Node, Output>): this {
        this.#rungs.push(rung);
        this.#rungs.sort((a, b) => a.at - b.at);
        return this;
    }

    /** One node's rung at one scale sample, with hysteresis against its previous rung. */
    select(
        node: Node,
        sample: ScaleSample,
        previous?: string,
    ): LadderSelection<Node, Output> | undefined {
        const importance = node.importance ?? sample.importance;
        const candidates = this.#rungs.filter(
            (rung) =>
                (!rung.kinds || rung.kinds.includes(node.kind)) &&
                (rung.minImportance === undefined || importance >= rung.minImportance),
        );
        const rung = selectRung(candidates, sample.normalized, previous, this.#hysteresis);
        if (!rung) return undefined;
        return {
            id: node.id,
            rung,
            value: rung.build(node, { id: node.id, sample, rung: rung.id }),
        };
    }

    /** Every node's selection, keyed by the id the host uses for selection and permalinks. */
    resolve(
        nodes: readonly Node[],
        sample: ScaleSample,
        previous: ReadonlyMap<string, string> = new Map(),
    ): Map<string, LadderSelection<Node, Output>> {
        return new Map(
            nodes.flatMap((node) => {
                const selection = this.select(node, sample, previous.get(node.id));
                return selection ? [[node.id, selection] as const] : [];
            }),
        );
    }
}

/** Align rungs with the stops of a ScaleDomain; a missing builder removes that rung. */
export function ladderFromStops<Node extends LadderNode, Output>(
    stops: readonly { readonly at: number; readonly id: string }[],
    builders: Partial<Record<string, (node: Node, context: LadderContext) => Output>>,
    config: LadderConfig = {},
): RepresentationLadder<Node, Output> {
    return new RepresentationLadder(
        stops.flatMap((stop) => {
            const build = builders[stop.id];
            return build ? [{ at: clamp(stop.at, 0, 1), id: stop.id, build }] : [];
        }),
        config,
    );
}

export interface RungChange {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    /** Seconds to play the swap, supplied by the scale domain rather than hardcoded here. */
    readonly duration: number;
}

/** Diff two selections; the host plays the result with its own transition mechanism. */
export function representationChanges(
    previous: ReadonlyMap<string, string>,
    next: ReadonlyMap<string, string>,
    sample: ScaleSample,
): RungChange[] {
    return [...next].flatMap(([id, to]) => {
        const from = previous.get(id);
        return from !== undefined && from !== to ? [{ id, from, to, duration: sample.transitionDuration }] : [];
    });
}

export interface ClusterNode extends LadderNode {
    /** Members hidden while the cluster is collapsed; ids stay stable across swaps. */
    readonly clusterOf?: readonly string[];
}

export interface ClusterCollapse {
    /** Node ids a host may draw at this scale. */
    readonly visible: ReadonlySet<string>;
    /** Cluster id to its rung, so a host can draw the collapsed chip. */
    readonly clusters: ReadonlyMap<string, string>;
}

/** Clusters collapse as representations, not as a separate level state. */
export function collapseClusters<Node extends ClusterNode, Output>(
    nodes: readonly Node[],
    sample: ScaleSample,
    ladder: RepresentationLadder<Node, Output>,
    expandRung: string,
): ClusterCollapse {
    const clusters = new Map<string, string>();
    const hidden = new Set<string>();

    for (const node of nodes) {
        const rung = ladder.select(node, sample)?.rung.id;
        if (!rung || rung === expandRung || !node.clusterOf?.length) continue;
        clusters.set(node.id, rung);
        for (const member of node.clusterOf) hidden.add(member);
    }

    return {
        visible: new Set(nodes.filter((node) => !hidden.has(node.id)).map((node) => node.id)),
        clusters,
    };
}
