import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class TimelineLayout implements ISpaceGraphPlugin {
    readonly id = 'timeline-layout';
    readonly name = 'Timeline Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        timeField: 'timestamp',
        orientation: 'horizontal' as 'horizontal' | 'vertical',
        spacing: 200,
        scaleFactor: 0.1,
        animate: true,
        animationDuration: 1.5,
        staggerLayout: true,
        staggerAmount: 150,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        if (!nodes.length) return;

        const {
            timeField,
            orientation,
            spacing,
            scaleFactor,
            animate,
            animationDuration,
            staggerLayout,
            staggerAmount,
        } = this.settings;

        const temporalNodes = nodes.map((node) => {
            let timeVal = 0;
            if (node.data?.[timeField] !== undefined) {
                const val = node.data[timeField];
                timeVal =
                    val instanceof Date
                        ? val.getTime()
                        : typeof val === 'string'
                          ? isNaN(Date.parse(val))
                              ? 0
                              : Date.parse(val)
                          : typeof val === 'number'
                            ? val
                            : 0;
            }
            return { node: node as Node, timeVal };
        });

        temporalNodes.sort((a, b) => a.timeVal - b.timeVal);

        const minTime = temporalNodes[0]?.timeVal ?? 0;
        const targetPos = new THREE.Vector3();
        let currentIndex = 0;

        for (let i = 0; i < temporalNodes.length; i++) {
            const { node, timeVal } = temporalNodes[i];
            const hasValidTime = timeVal !== 0 || minTime !== 0;
            const linearPos = hasValidTime
                ? (timeVal - minTime) * scaleFactor
                : currentIndex++ * spacing;

            const staggerOffset = staggerLayout
                ? i % 2 === 0
                    ? staggerAmount
                    : -staggerAmount
                : 0;

            targetPos.set(
                orientation === 'horizontal' ? linearPos : staggerOffset,
                orientation === 'horizontal' ? staggerOffset : -linearPos,
                0,
            );

            node.applyPosition(targetPos, { animate, duration: animationDuration });
        }

        const sumPos = new THREE.Vector3();
        for (const { node } of temporalNodes) sumPos.add(node.position);
        sumPos.divideScalar(temporalNodes.length || 1);

        for (const { node } of temporalNodes) {
            targetPos.copy(node.position).sub(sumPos);
            node.applyPosition(targetPos, { animate, duration: animationDuration });
        }

        for (const edge of this.sg.graph.edges.values()) edge.update?.();
    }

    dispose(): void {}
}
