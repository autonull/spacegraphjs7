// SpaceGraphJS v7.0 - Edge (v7 Implementation)
// Basic edge using Line2

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Edge } from '../../graph/Edge';
import type { EdgeSpec, EdgeData } from '../../graph/types';
import type { Node } from '../../graph/Node';

export class EdgeImpl extends Edge {
  private line: Line2;
  private geometry: LineGeometry;
  private material: LineMaterial;

  constructor(spec: EdgeSpec<EdgeData>, source: Node, target: Node) {
    super(spec, source, target);

    const data = spec.data ?? {};

    // Create geometry
    this.geometry = new LineGeometry();
    this.updatePositions();

    // Create material
    this.material = new LineMaterial({
      linewidth: data.thickness ?? 3,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      resolution: new THREE.Vector2(
        typeof window !== 'undefined' ? window.innerWidth : 1920,
        typeof window !== 'undefined' ? window.innerHeight : 1080
      ),
      dashed: data.dashed ?? false,
      dashScale: data.dashScale ?? 1,
      dashSize: data.dashSize ?? 3,
      gapSize: data.gapSize ?? 1,
      color: data.color ?? 0x00d0ff
    });

    // Create line
    this.line = new Line2(this.geometry, this.material);
    this.line.renderOrder = -1;
  }

  override get object(): THREE.Object3D {
    return this.line;
  }

  override updatePositions(): void {
    const sourcePos = this.source.position;
    const targetPos = this.target.position;

    this.geometry.setPositions([
      sourcePos.x, sourcePos.y, sourcePos.z,
      targetPos.x, targetPos.y, targetPos.z
    ]);
  }

  update(spec: Partial<EdgeSpec<EdgeData>>): void {
    super.update(spec);

    if (spec.data) {
      const data = spec.data;

      if (data.color !== undefined && typeof data.color === 'number') {
        this.material.color.setHex(data.color);
      }

      if (data.thickness !== undefined) {
        this.material.linewidth = data.thickness;
      }

      if (data.opacity !== undefined) {
        this.material.opacity = data.opacity;
        this.material.transparent = data.opacity < 1;
      }

      if (data.dashed !== undefined) {
        this.material.dashed = data.dashed;
        if (data.dashed) {
          this.line.computeLineDistances();
        }
      }
    }
  }

  setHighlight(highlighted: boolean): void {
    if (highlighted) {
      this.material.color.setHex(0x00ffff);
      this.material.linewidth *= 1.5;
    } else {
      const originalColor = (this.data.color as number) ?? 0x00d0ff;
      this.material.color.setHex(originalColor);
      this.material.linewidth = (this.data.thickness ?? 3);
    }
  }

  updateResolution(width: number, height: number): void {
    this.material.resolution.set(width, height);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    super.dispose();
  }
}
