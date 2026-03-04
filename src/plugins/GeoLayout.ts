import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';

export class GeoLayout implements ISpaceGraphPlugin {
    readonly id = 'geo-layout';
    readonly name = 'Geospatial Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        projection: 'sphere' as 'sphere' | 'equirectangular' | 'mercator',
        radius: 500,          // Used for sphere projection
        mapWidth: 1000,       // Used for flat projections
        mapHeight: 500,       // Used for flat projections
        animate: true,
        animationDuration: 1.5,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length === 0) return;

        nodes.forEach(node => {
            // Check if node data contains lat/lng
            const lat = node.data?.lat !== undefined ? node.data.lat : (Math.random() * 180 - 90);
            const lng = node.data?.lng !== undefined ? node.data.lng : (Math.random() * 360 - 180);

            const targetPos = new THREE.Vector3();

            if (this.settings.projection === 'sphere') {
                // Convert lat/lng to Cartesian coordinates on a sphere
                // Lat: -90 (South Pole) to +90 (North Pole)
                // Lng: -180 (West) to +180 (East)
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = (lng + 180) * (Math.PI / 180);

                targetPos.x = -(this.settings.radius * Math.sin(phi) * Math.cos(theta));
                targetPos.z = (this.settings.radius * Math.sin(phi) * Math.sin(theta));
                targetPos.y = (this.settings.radius * Math.cos(phi));
            }
            else if (this.settings.projection === 'equirectangular') {
                // Flat mapping where x and y are directly proportional to lng and lat
                targetPos.x = (lng / 180) * (this.settings.mapWidth / 2);
                targetPos.y = (lat / 90) * (this.settings.mapHeight / 2);
                targetPos.z = 0;
            }
            else if (this.settings.projection === 'mercator') {
                // Web mercator projection
                const x = (lng + 180) * (this.settings.mapWidth / 360);
                const latRad = lat * (Math.PI / 180);

                // Truncate lat to avoid infinity
                let latTrunc = Math.max(-85.0511, Math.min(85.0511, lat));
                const mercN = Math.log(Math.tan((Math.PI / 4) + (latTrunc * Math.PI / 180) / 2));

                // Normalize to mapHeight
                const y = (this.settings.mapHeight / 2) - (this.settings.mapWidth * mercN / (2 * Math.PI));

                // Centering to origin [-mapWidth/2, +mapWidth/2]
                targetPos.x = x - (this.settings.mapWidth / 2);
                targetPos.y = (this.settings.mapHeight / 2) - y;
                targetPos.z = 0;
            }

            if (this.settings.animate && (window as any).gsap) {
                (window as any).gsap.to(node.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: this.settings.animationDuration,
                    ease: 'power3.out',
                });
            } else {
                node.position.copy(targetPos);
            }
        });
    }

    dispose(): void { }
}
