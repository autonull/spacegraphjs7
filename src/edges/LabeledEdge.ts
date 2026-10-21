import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Node } from '../nodes/Node';
import { lodLevelAt, lodVisibility } from '../core/lod';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec, LabelLodLevel } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { midpoint } from '../utils/vector';
import { Edge } from './Edge';

/**
 * LabeledEdge — Straight edge with a mid-point text label rendered via CSS2D.
 *
 * data options:
 *   label     : string (falls back to spec.id)
 *   color     : line hex color (default 0x888888)
 *   labelColor: CSS color string (default '#ffffff')
 *   fontSize  : CSS font-size (default '12px')
 *   labelLod  : Array of { distance, scale, style } for LOD-based visibility/scaling
 */
export class LabeledEdge extends Edge {
  static readonly typeName: string = 'LabeledEdge';
  public labelLod: LabelLodLevel[] = [];
  readonly labelEl: HTMLElement;
  readonly labelObject: CSS2DObject;
  // The base Edge constructor calls update(), which is overridden here, before the label fields exist.
  private ready = false;

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
    super(sg, { ...spec, data: { color: 0x888888, ...spec.data } }, source, target);

    const data = spec.data as EdgeData & {
      labelColor?: string;
      fontSize?: string;
      labelLod?: LabelLodLevel[];
    };

    const theme = this.sg?.options?.theme;
    const fontSize =
      data?.fontSize ??
      (theme?.label?.fontSize !== undefined ? `${theme.label.fontSize}px` : '12px');
    this.labelEl = DOMUtils.createElement('div');
    this.labelEl.className = 'sg-edge-label';
    Object.assign(this.labelEl.style, {
      color: data?.labelColor ?? theme?.edge?.labelColor ?? theme?.label?.color ?? '#ffffff',
      fontSize,
      fontFamily: theme?.label?.fontFamily ?? 'sans-serif',
      background: data?.labelBackground ?? theme?.edge?.labelBackground ?? 'rgba(0,0,0,0.55)',
      padding: '1px 5px',
      borderRadius: '3px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    });
    this.labelEl.textContent = spec.data?.label ?? spec.id;

    this.labelObject = new CSS2DObject(this.labelEl);
    this.object.add(this.labelObject);

    if (data?.labelLod) {
      this.labelLod = data.labelLod;
    }

    this.ready = true;
    this._positionLabel();
  }

  get labelElement(): HTMLElement {
    return this.labelEl;
  }

  updateLod(_distance: number): void {
    if (!this.ready) return;

    const camera = this.sg?.renderer?.camera;
    if (!camera) return;

    const { sourcePos, targetPos } = this.endpointPositions();
    const level = lodLevelAt(this.labelLod, midpoint(sourcePos, targetPos).distanceTo(camera.position));

    this.labelEl.style.visibility = lodVisibility(level);
    this.labelEl.style.transform = level?.scale !== undefined ? `scale(${level.scale})` : '';
  }

  update(): void {
    if (!this.ready) return;
    super.update();
    this._positionLabel();
    this.updateLod(0);
  }

  updateSpec(updates: Partial<EdgeSpec>): this {
    super.updateSpec(updates);
    const data = updates.data as EdgeData & { labelColor?: string; labelLod?: LabelLodLevel[] };
    if (updates.data?.label !== undefined) {
      this.labelEl.textContent = updates.data.label;
    }
    if (data?.labelColor) {
      this.labelEl.style.color = data.labelColor;
    }
    if (data?.labelLod !== undefined) {
      this.labelLod = data.labelLod;
    }
    return this;
  }

  dispose(): void {
    this.labelEl.parentNode?.removeChild(this.labelEl);
    super.dispose();
  }

  private _positionLabel() {
    if (!this.source || !this.target || !this.labelObject) return;
    const { sourcePos, targetPos } = this.endpointPositions();

    // labelObject is child of this.object, which is in world space
    this.labelObject.position.copy(midpoint(sourcePos, targetPos)).sub(this.object.position);
  }
}
