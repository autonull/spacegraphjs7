import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class TimelineLayout implements ISpaceGraphPlugin {
    readonly id = 'timeline-layout';
    readonly name = 'Timeline Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        timeField: 'timestamp',    // The field in node.data to read time from
        orientation: 'horizontal' as 'horizontal' | 'vertical',
        spacing: 200,              // Base spacing if timeline is discrete
        scaleFactor: 0.1,          // Scale factor for continuous mapping (pixels per millisecond or tick)
        animate: true,
        animationDuration: 1.5,
        staggerLayout: true,       // Stagger nodes up and down to avoid overlap
        staggerAmount: 150,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length === 0) return;

        // Extract and sort nodes by time
        const temporalNodes = nodes.map(node => {
            let timeVal = 0;
            if (node.data && node.data[this.settings.timeField] !== undefined) {
                const val = node.data[this.settings.timeField];
                // Handle Date objects or strings
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

        // Sort chronologically
        temporalNodes.sort((a, b) => a.timeVal - b.timeVal);

        // Find min/max to normalize or start from zero
        const minTime = temporalNodes.length > 0 ? temporalNodes[0].timeVal : 0;

        let currentIndex = 0;

        temporalNodes.forEach((item, i) => {
            // Position along the primary axis
            let linearPos = 0;

            // If the time values are valid and spread out, use continuous scaling.
            // If they are all 0 or invalid, we fallback to discrete spacing based on order.
            const hasValidTime = item.timeVal !== 0 || minTime !== 0;

            if (hasValidTime) {
                linearPos = (item.timeVal - minTime) * this.settings.scaleFactor;
            } else {
                linearPos = currentIndex * this.settings.spacing;
                currentIndex++;
            }

            const targetPos = new THREE.Vector3();

            // Stagger logic to avoid overlaps for things that happen close in time
            const staggerOffset = this.settings.staggerLayout
                ? (i % 2 === 0 ? this.settings.staggerAmount : -this.settings.staggerAmount)
                : 0;

            if (this.settings.orientation === 'horizontal') {
                targetPos.x = linearPos;
                targetPos.y = staggerOffset;
                targetPos.z = 0;
            } else {
                targetPos.x = staggerOffset;
                targetPos.y = -linearPos; // downwards timeline is standard
                targetPos.z = 0;
            }

            if (this.settings.animate && (window as any).gsap) {
                (window as any).gsap.to(item.node.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: this.settings.animationDuration,
                    ease: 'power2.out',
                });
            } else {
                item.node.position.copy(targetPos);
            }
        });

        // Center the entire timeline around the origin
        const sumPos = new THREE.Vector3();
        temporalNodes.forEach(item => sumPos.add(item.node.position));
        sumPos.divideScalar(temporalNodes.length || 1);

        temporalNodes.forEach(item => {
            const finalPos = item.node.position.clone().sub(sumPos);
            if (this.settings.animate && (window as any).gsap) {
                // The animation might be jumping if we mutate while animating,
                // but since GSAP overwrites previous tweens on the same property,
                // we just re-issue the tween to the shifted final position.
                (window as any).gsap.to(item.node.position, {
                    x: finalPos.x,
                    y: finalPos.y,
                    z: finalPos.z,
                    duration: this.settings.animationDuration,
                    ease: 'power2.out',
                });
            } else {
                item.node.position.copy(finalPos);
            }
        });
    }

    dispose(): void { }
}
