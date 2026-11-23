// builder/edge.ts - Edge builder
import type { EdgeSpec } from '../types';
import { BaseBuilder } from './base';
import type { GraphBuilder } from './graph';

export class EdgeBuilder extends BaseBuilder<EdgeSpec> {
    constructor(id: string, source: string, target: string, type = 'Edge') {
        super({ id, source, target, type });
    }

    label(label: string): this {
        this.mergeData({ label });
        return this;
    }

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

    color(color: number | string): this {
        this.mergeData({ color });
        return this;
    }

    type(type: string): this {
        this.spec.type = type;
        return this;
    }

    dashScale(scale: number): this {
        this.mergeData({ dashScale: scale });
        return this;
    }

    gapSize(size: number): this {
        this.mergeData({ gapSize: size });
        return this;
    }

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

    curved(): this {
        this.spec.type = 'CurvedEdge';
        return this;
    }

    flow(): this {
        this.spec.type = 'FlowEdge';
        return this;
    }

    animated(): this {
        this.spec.type = 'AnimatedEdge';
        return this;
    }

    bundled(): this {
        this.spec.type = 'BundledEdge';
        return this;
    }

    labeled(): this {
        this.spec.type = 'LabeledEdge';
        return this;
    }
}
