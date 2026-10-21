import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { toCssColor } from '../utils/color';
import { worldToClient } from '../utils/projection';
import { Edge } from './Edge';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class InterGraphEdge extends Edge {
  static readonly typeName: string = 'InterGraphEdge';
  public isInterGraphEdge = true;
  readonly svgLine: SVGPathElement;
  private svgContainer: SVGSVGElement;
  private animationFrameId?: number;

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
    super(sg, spec, source, target);

    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }

    this.svgContainer = this.getGlobalSvgContainer();
    this.svgLine = DOMUtils.createElementNS(SVG_NAMESPACE, 'path') as SVGPathElement;

    const data = spec.data as EdgeData & { color?: number | string };
    this.svgLine.setAttribute('stroke', toCssColor(data?.color ?? 0x666666));
    this.svgLine.setAttribute('stroke-width', '2');
    this.svgLine.setAttribute('fill', 'none');
    this.svgLine.setAttribute('stroke-dasharray', '5, 5');

    this.svgContainer.appendChild(this.svgLine);

    this.startUpdateLoop();
  }

  update() {
    // Handled by update loop
  }

  updateSpec(updates: Partial<EdgeSpec>): this {
    super.updateSpec(updates);
    if (updates.data?.color) {
      this.svgLine.setAttribute('stroke', toCssColor(updates.data.color as number | string));
    }
    return this;
  }

  dispose() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.svgLine.parentNode?.removeChild(this.svgLine);
    super.dispose();
  }

  private getGlobalSvgContainer(): SVGSVGElement {
    let svg = document.getElementById('spacegraph-intergraph-overlay') as SVGSVGElement | null;
    if (!svg) {
      svg = DOMUtils.createElementNS(SVG_NAMESPACE, 'svg', {
        id: 'spacegraph-intergraph-overlay',
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: '9999',
        },
      }) as SVGSVGElement;
      document.body.appendChild(svg);
    }
    return svg;
  }

  private projectToScreen(node: Node, targetVector: THREE.Vector3): void {
    const sg = node.sg;
    if (!sg?.renderer) return;
    node.getWorldPosition(targetVector);

    const screen = worldToClient(
      targetVector,
      sg.renderer.camera,
      sg.renderer.renderer.domElement
    );

    targetVector.set(screen.x, screen.y, 0);
  }

  private updateSvgLine() {
    const sourcePos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();

    this.projectToScreen(this.source, sourcePos);
    this.projectToScreen(this.target, targetPos);

    const path = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
    this.svgLine.setAttribute('d', path);
  }

  private startUpdateLoop() {
    const loop = () => {
      this.updateSvgLine();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }
}
