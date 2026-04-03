import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class GeoLayout implements ISpaceGraphPlugin {
    readonly id = 'geo-layout';
    readonly name = 'Geospatial Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        projection: 'sphere' as 'sphere' | 'equirectangular' | 'mercator',
        radius: 500,
        mapWidth: 1000,
        mapHeight: 500,
        animate: true,
        animationDuration: 1.5,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        if (!nodes.length) return;

        const { projection, radius, mapWidth, mapHeight, animate, animationDuration } =
            this.settings;
        const targetPos = new THREE.Vector3();

        for (const node of nodes as Node[]) {
            const lat = (node.data?.lat as number) ?? Math.random() * 180 - 90;
            const lng = (node.data?.lng as number) ?? Math.random() * 360 - 180;

            switch (projection) {
                case 'sphere': {
                    const phi = (90 - lat) * (Math.PI / 180);
                    const theta = (lng + 180) * (Math.PI / 180);
                    targetPos.set(
                        -(radius * Math.sin(phi) * Math.cos(theta)),
                        radius * Math.cos(phi),
                        radius * Math.sin(phi) * Math.sin(theta),
                    );
                    break;
                }
                case 'equirectangular':
                    targetPos.set((lng / 180) * (mapWidth / 2), (lat / 90) * (mapHeight / 2), 0);
                    break;
                case 'mercator': {
                    const x = (lng + 180) * (mapWidth / 360);
                    const latTrunc = Math.max(-85.0511, Math.min(85.0511, lat));
                    const mercN = Math.log(Math.tan(Math.PI / 4 + (latTrunc * Math.PI) / 180 / 2));
                    const y = mapHeight / 2 - (mapWidth * mercN) / (2 * Math.PI);
                    targetPos.set(x - mapWidth / 2, mapHeight / 2 - y, 0);
                    break;
                }
            }

            node.applyPosition(targetPos, { animate, duration: animationDuration });
        }

        for (const edge of this.sg.graph.edges.values()) edge.update?.();
    }

    dispose(): void {}
}
