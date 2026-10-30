import {
  AdditiveBlending,
  BackSide,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from 'three';

import type { SpaceGraph } from '../SpaceGraph';
import type { GlobeNodeData, NodeSpec } from '../types';
import { latLngToVec3 } from '../utils/vector';
import { Node } from './Node';

export class GlobeNode extends Node {
  static readonly typeName: string = 'GlobeNode';
  readonly _object: Group;
  readonly mesh!: Mesh;
  readonly wireframe?: Mesh;
  readonly markersGroup!: Group;
  private readonly halo: Mesh;
  private textureLoader = new TextureLoader();

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    super(sg, spec);

    this._object = new Group();

    const r = (spec.data?.radius as number) ?? 50;
    const color = (spec.data?.color as number) ?? 0x3b82f6;
    const textureUrl = spec.data?.textureUrl as string;
    const showWireframe = (spec.data?.wireframe as boolean) ?? true;
    const segments = (spec.data?.segments as number) ?? 32;

    const geo = new SphereGeometry(r, segments, segments);
    const mat = new MeshBasicMaterial({ color });

    if (textureUrl) {
      this.textureLoader.load(textureUrl, (tex) => {
        mat.map = tex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      });
    }

    this.mesh = new Mesh(geo, mat);
    this.object.add(this.mesh);

    if (showWireframe) {
      const wireMat = new MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      this.wireframe = new Mesh(geo, wireMat);
      this.object.add(this.wireframe);
    }

    const haloGeo = new SphereGeometry(r * 1.1, segments, segments);
    const haloMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      side: BackSide,
      blending: AdditiveBlending,
    });
    this.halo = new Mesh(haloGeo, haloMat);
    this.object.add(this.halo);

    this.markersGroup = new Group();
    this.object.add(this.markersGroup);

    if (spec.data?.markers) {
      this._renderMarkers(spec.data.markers as GlobeNodeData['markers'], r);
    }

    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  get object(): Object3D {
    return this._object;
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);

    if (!updates.data) return this;

    const r = (this.data?.radius as number) ?? 50;

    if (updates.data.textureUrl !== undefined) {
      const mat = this.mesh.material as MeshBasicMaterial;
      if (updates.data.textureUrl) {
        this.textureLoader.load(updates.data.textureUrl as string, (tex) => {
          mat.map?.dispose();
          mat.map = tex;
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
        });
      } else {
        mat.map?.dispose();
        mat.map = null;
        mat.color.setHex(
          (updates.data.color as number) ?? (this.data?.color as number) ?? 0x3b82f6
        );
        mat.needsUpdate = true;
      }
    } else if (updates.data.color !== undefined) {
      const mat = this.mesh.material as MeshBasicMaterial;
      if (!mat.map) {
        mat.color.setHex(updates.data.color as number);
      }
    }

    if (updates.data.markers !== undefined) {
      this._renderMarkers(updates.data.markers as GlobeNodeData['markers'], r);
    }

    return this;
  }

  private _renderMarkers(markers: GlobeNodeData['markers'], radius: number) {
    while (this.markersGroup.children.length > 0) {
      const child = this.markersGroup.children[0] as Mesh;
      this.markersGroup.remove(child);
      child.geometry.dispose();
      (child.material as Material).dispose();
    }

    const position = new Vector3();
    for (const marker of markers ?? []) {
      const { lat, lng, size = 2, color = 0xff0000 } = marker;

      latLngToVec3(lat, lng, radius, position);

      const geo = new SphereGeometry(size, 8, 8);
      const mat = new MeshBasicMaterial({ color });
      const mesh = new Mesh(geo, mat);

      mesh.position.copy(position);
      this.markersGroup.add(mesh);
    }
  }
}
