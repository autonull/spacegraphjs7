import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';

export class TreeLayout implements ISpaceGraphPlugin {
    readonly id = 'tree-layout';
    readonly name = 'Tree Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        levelHeight: 150,     // Vertical distance between levels
        nodeSpacing: 100,     // Horizontal distance between siblings
        orientation: 'vertical' as 'vertical' | 'horizontal',
        animate: true,
        animationDuration: 1.0,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        const edges = Array.from(this.sg.graph.edges);

        if (nodes.length === 0) return;

        // InDegree map to find roots
        const inDegree = new Map<string, number>();
        const childrenMap = new Map<string, Node[]>();

        nodes.forEach(n => {
            inDegree.set(n.id, 0);
            childrenMap.set(n.id, []);
        });

        edges.forEach(e => {
            if (e.source && e.target && e.source.id && e.target.id) {
                inDegree.set(e.target.id, (inDegree.get(e.target.id) || 0) + 1);
                childrenMap.get(e.source.id)?.push(e.target);
            }
        });

        const roots = nodes.filter(n => inDegree.get(n.id) === 0);

        // If no roots (cycle), use the first node as root
        if (roots.length === 0) {
            roots.push(nodes[0]);
        }

        const positions = new Map<string, THREE.Vector3>();

        // We assign X relative horizontal space and Y as vertical depth
        let currentX = 0;

        const assignPositions = (node: Node, depth: number) => {
            const children = childrenMap.get(node.id) || [];

            // Post-order traversal for placing parents centered above children
            if (children.length === 0) {
                positions.set(node.id, new THREE.Vector3(currentX, -depth * this.settings.levelHeight, 0));
                currentX += this.settings.nodeSpacing;
            } else {
                let minX = Infinity;
                let maxX = -Infinity;

                for (const child of children) {
                    assignPositions(child, depth + 1);
                    const cp = positions.get(child.id);
                    if (cp) {
                        minX = Math.min(minX, cp.x);
                        maxX = Math.max(maxX, cp.x);
                    }
                }

                const centerX = (minX + maxX) / 2;
                positions.set(node.id, new THREE.Vector3(centerX, -depth * this.settings.levelHeight, 0));
            }
        };

        // Layout all disconnected trees alongside each other
        for (const root of roots) {
            assignPositions(root, 0);
            currentX += this.settings.nodeSpacing * 2; // Gap between different root trees
        }

        // Center the whole tree to Origin
        let sumX = 0, sumY = 0;
        positions.forEach(p => {
            sumX += p.x;
            sumY += p.y;
        });
        const offsetX = sumX / positions.size;
        const offsetY = sumY / positions.size;

        positions.forEach((pos, id) => {
            const finalPos = new THREE.Vector3(pos.x - offsetX, pos.y - offsetY, 0);

            // Handle Horizontal orientation
            if (this.settings.orientation === 'horizontal') {
                const temp = finalPos.x;
                finalPos.x = -finalPos.y; // depth goes to right
                finalPos.y = -temp; // breadth goes top-to-bottom
            }

            const targetNode = this.sg.graph.nodes.get(id);
            if (targetNode) {
                if (this.settings.animate && (window as any).gsap) {
                    (window as any).gsap.to(targetNode.position, {
                        x: finalPos.x,
                        y: finalPos.y,
                        z: finalPos.z,
                        duration: this.settings.animationDuration,
                        ease: 'power2.out',
                    });
                } else {
                    targetNode.position.copy(finalPos);
                }
            }
        });
    }

    dispose(): void { }
}
