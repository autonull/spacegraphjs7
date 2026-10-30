import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { clamp } from '../../utils/math';
import { latLngToVec3 } from '../../utils/vector';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface GeoLayoutOptions extends LayoutOptions {
  projection: string;
  radius: number;
  mapWidth: number;
  mapHeight: number;
}

export class GeoLayout extends BaseLayout<GeoLayoutOptions> {
  readonly id = 'geo-layout';
  readonly name = 'Geospatial Layout';
  readonly version = '1.0.0';

  protected place(nodes: Node[], config: GeoLayoutOptions): void {
    const target = new Vector3();

    for (const node of nodes) {
      const lat = (node.data?.lat as number) ?? Math.random() * 180 - 90;
      const lng = (node.data?.lng as number) ?? Math.random() * 360 - 180;
      this.applyPosition(
        node,
        project(target, lat, lng, config.projection, config.radius, config.mapWidth, config.mapHeight)
      );
    }
  }

  protected defaultConfig(): GeoLayoutOptions {
    return {
      projection: 'sphere',
      radius: 500,
      mapWidth: 1000,
      mapHeight: 500,
      animate: true,
      duration: 1.5,
    };
  }
}

function project(
  target: Vector3,
  lat: number,
  lng: number,
  projection: string,
  radius: number,
  mapWidth: number,
  mapHeight: number
): Vector3 {
  if (projection === 'sphere') {
    return latLngToVec3(lat, lng, radius, target);
  }
  if (projection === 'equirectangular') {
    return target.set((lng / 180) * (mapWidth / 2), (lat / 90) * (mapHeight / 2), 0);
  }
  const x = (lng + 180) * (mapWidth / 360);
  const latTrunc = clamp(lat, -85.0511, 85.0511);
  const mercN = Math.log(Math.tan(Math.PI / 4 + (latTrunc * Math.PI) / 180 / 2));
  const y = mapHeight / 2 - (mapWidth * mercN) / (2 * Math.PI);
  return target.set(x - mapWidth / 2, mapHeight / 2 - y, 0);
}
