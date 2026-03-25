import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

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
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length === 0) return;

        const temporalNodes = nodes.map(node => {
            let timeVal = 0;
            if (node.data && node.data[this.settings.timeField] !== undefined) {
                const val = node.data[this.settings.timeField];
                if (val instanceof Date) {
                    timeVal = val.getTime();
                } else if (typeof val === 'string') {
                    const parsed = Date.parse(val);
                    timeVal = isNaN(parsed) ? 0 : parsed;
                } else if (typeof val === 'number') {
                    timeVal = val;
                }
            }
            return { node, timeVal };
        });

        temporalNodes.sort((a, b) => a.timeVal - b.timeVal);

        const minTime = temporalNodes.length > 0 ? temporalNodes[0].timeVal : 0;

        let currentIndex = 0;
        const targetPos = new THREE.Vector3();

        for (let i = 0; i < temporalNodes.length; i++) {
            const item = temporalNodes[i];
            let linearPos;

            const hasValidTime = item.timeVal !== 0 || minTime !== 0;

            if (hasValidTime) {
                linearPos = (item.timeVal - minTime) * this.settings.scaleFactor;
            } else {
                linearPos = currentIndex * this.settings.spacing;
                currentIndex++;
            }

            const staggerOffset = this.settings.staggerLayout
                ? (i % 2 === 0 ? this.settings.staggerAmount : -this.settings.staggerAmount)
                : 0;

            if (this.settings.orientation === 'horizontal') {
                targetPos.set(linearPos, staggerOffset, 0);
            } else {
                targetPos.set(staggerOffset, -linearPos, 0); // Y down for vertical timelines is standard
            }

            (item.node as any).applyPosition(
                targetPos,
                this.settings.animate,
                this.settings.animationDuration
            );
        }

        // Center the entire timeline around the origin
        const sumPos = new THREE.Vector3();
        for (const item of temporalNodes) {
            sumPos.add(item.node.position);
        }
        sumPos.divideScalar(temporalNodes.length || 1);

        for (const item of temporalNodes) {
            targetPos.copy(item.node.position).sub(sumPos);
            (item.node as any).applyPosition(
                targetPos,
                this.settings.animate,
                this.settings.animationDuration
            );
        }
    }

    dispose(): void { }
}
