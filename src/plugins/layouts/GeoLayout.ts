import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Edge } from '../../edges/Edge';

export class GeoLayout extends BaseLayout {
    readonly id = 'geo-layout';
    readonly name = 'Geospatial Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return { projection: 'sphere', radius: 500, mapWidth: 1000, mapHeight: 500, animate: true, duration: 1.5 };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            projection = this.config.projection as string,
            radius = this.config.radius as number,
            mapWidth = this.config.mapWidth as number,
            mapHeight = this.config.mapHeight as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.5,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter((n) => !(n.data as Record<string, unknown>).pinned);
        if (!nodes.length) return;

        const targetPos = new THREE.Vector3();
        for (const node of nodes) {
            const lat = (node.data?.lat as number) ?? Math.random() * 180 - 90;
            const lng = (node.data?.lng as number) ?? Math.random() * 360 - 180;

            if (projection === 'sphere') {
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = (lng + 180) * (Math.PI / 180);
                targetPos.set(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
            } else if (projection === 'equirectangular') {
                targetPos.set((lng / 180) * (mapWidth / 2), (lat / 90) * (mapHeight / 2), 0);
            } else {
                const x = (lng + 180) * (mapWidth / 360);
                const latTrunc = Math.max(-85.0511, Math.min(85.0511, lat));
                const mercN = Math.log(Math.tan(Math.PI / 4 + (latTrunc * Math.PI) / 180 / 2));
                const y = mapHeight / 2 - (mapWidth * mercN) / (2 * Math.PI);
                targetPos.set(x - mapWidth / 2, mapHeight / 2 - y, 0);
            }

            this.applyPosition(node, targetPos, { animate, duration });
        }

        for (const edge of this.graph.getEdges()) (edge as Edge).update?.();
    }
}
