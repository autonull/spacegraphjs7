// builder/edge.ts - Edge builder
import type { EdgeSpec } from '../types';
import { BaseBuilder } from './base';
import type { GraphBuilder } from './graph';

export class EdgeBuilder extends BaseBuilder<EdgeSpec> {
    constructor(id: string, source: string, target: string, type = 'Edge') {
        super({ id, source, target, type });
    }

    /** Set edge label */
    label(label: string): this {
        this.mergeData({ label });
        return this;
    }

    /** Set line thickness */
    thickness(thickness: number): this {
        this.mergeData({ thickness });
        return this;
    }

    /** Set dashed style (alias: dotted) */
    dashed(dashed = true): this {
        this.mergeData({ dashed });
        return this;
    }

    /** Set arrowhead (alias: noArrow, bothArrows) */
    arrowhead(arrowhead: boolean | 'source' | 'target' | 'both' = true): this {
        this.mergeData({ arrowhead });
        return this;
    }

    /** Set edge color */
    color(color: number | string): this {
        this.mergeData({ color });
        return this;
    }

    /** Set edge type */
    type(type: string): this {
        this.spec.type = type;
        return this;
    }

    /** Set dash scale */
    dashScale(scale: number): this {
        this.mergeData({ dashScale: scale });
        return this;
    }

    /** Set gap size for dashed lines */
    gapSize(size: number): this {
        this.mergeData({ gapSize: size });
        return this;
    }

    /** Set arrowhead size */
    arrowSize(size: number): this {
        this.mergeData({ arrowheadSize: size });
        return this;
    }

    /** Add reverse edge for bidirectional connection */
    bidirectional(builder: GraphBuilder): GraphBuilder {
        builder.addEdge(this.spec);
        builder.addEdge({
            id: `reverse-${this.spec.source}-${this.spec.target}`,
            source: this.spec.target,
            target: this.spec.source,
            type: this.spec.type,
            data: this.spec.data,
        });
        return builder;
    }

    /** Use curved edge type */
    curved(): this {
        this.spec.type = 'CurvedEdge';
        return this;
    }

    /** Use flow edge type */
    flow(): this {
        this.spec.type = 'FlowEdge';
        return this;
    }

    /** Use animated edge type */
    animated(): this {
        this.spec.type = 'AnimatedEdge';
        return this;
    }

    /** Use bundled edge type */
    bundled(): this {
        this.spec.type = 'BundledEdge';
        return this;
    }

    /** Use labeled edge type */
    labeled(): this {
        this.spec.type = 'LabeledEdge';
        return this;
    }
}
