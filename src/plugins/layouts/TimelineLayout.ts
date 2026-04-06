import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Node } from '../../nodes/Node';

export class TimelineLayout extends BaseLayout {
    readonly id = 'timeline-layout';
    readonly name = 'Timeline Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            timeField: 'timestamp',
            orientation: 'horizontal',
            spacing: 200,
            scaleFactor: 0.1,
            animate: true,
            duration: 1.5,
            staggerLayout: true,
            staggerAmount: 150,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            timeField = this.config.timeField as string,
            orientation = this.config.orientation as string,
            spacing = this.config.spacing as number,
            scaleFactor = this.config.scaleFactor as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.5,
            staggerLayout = this.config.staggerLayout as boolean,
            staggerAmount = this.config.staggerAmount as number,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter(
            (n) => !(n.data as Record<string, unknown>).pinned,
        );
        if (!nodes.length) return;

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
            this.applyPosition(node, targetPos, { animate, duration });
        }

        const sumPos = new THREE.Vector3();
        for (const { node } of temporalNodes) sumPos.add(node.position);
        sumPos.divideScalar(temporalNodes.length || 1);

        for (const { node } of temporalNodes) {
            targetPos.copy(node.position).sub(sumPos);
            this.applyPosition(node, targetPos, { animate, duration });
        }

        this.updateEdges();
    }
}
