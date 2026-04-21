import type { NodeSpec, SpaceGraphNodeData } from '../../types';
import type { SpaceGraph } from '../../SpaceGraph';
import type { MermaidNodeShape } from './MermaidParser';
import { HtmlNode } from '../../nodes/HtmlNode';

export interface MermaidNodeData extends SpaceGraphNodeData {
  shape?: MermaidNodeShape;
  label?: string;
  themeColors?: string[];
  nodeIndex?: number;
}

const SHAPE_STYLES: Record<MermaidNodeShape, string> = {
  rect: `
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
  `,
  round: `
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.3);
  `,
  stadium: `
    border-radius: 50px;
    border: 2px solid rgba(255,255,255,0.3);
  `,
  circle: `
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
  `,
  diamond: `
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
    transform: rotate(45deg);
  `,
  hexagon: `
    border-radius: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  `,
  parallelogram: `
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
    transform: skewX(-15deg);
  `,
  parallelogram_alt: `
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
    transform: skewX(15deg);
  `,
  trapezoid: `
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
    clip-path: polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%);
  `,
  subroutine: `
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.3);
    border-style: double;
    border-width: 4px;
  `,
  cylinder: `
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.3);
    border-bottom-left-radius: 50%;
    border-bottom-right-radius: 50%;
  `,
};

const DEFAULT_STYLE = `
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
  padding: 12px 16px;
  min-width: 80px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`;

export class MermaidNode extends HtmlNode {
  private shape: MermaidNodeShape = 'rect';
  private nodeIndex: number = 0;
  private themeColors: string[] = [];

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    const data = spec.data as MermaidNodeData;
    const shape = (data?.shape as MermaidNodeShape) ?? 'rect';
    const label = (data?.label as string) ?? spec.label ?? '';
    const nodeIndex = (data?.nodeIndex as number) ?? 0;
    const themeColors = (data?.themeColors as string[]) ?? ['rgba(59, 130, 246, 0.9)'];

    const colorIndex = nodeIndex % themeColors.length;
    const bgColor = themeColors[colorIndex] || themeColors[0];

    const shapeStyle = SHAPE_STYLES[shape] || SHAPE_STYLES.rect;

    super(sg, {
      ...spec,
      data: {
        ...data,
        width: 160,
        height: 60,
        color: bgColor,
        html: `<div style="
          ${DEFAULT_STYLE}
          ${shapeStyle}
          background: ${bgColor};
          transform-origin: center center;
        ">${label}</div>`,
      } as SpaceGraphNodeData,
    });

    this.shape = shape;
    this.nodeIndex = nodeIndex;
    this.themeColors = themeColors;
  }

  getShape(): MermaidNodeShape {
    return this.shape;
  }

  getThemeColors(): string[] {
    return this.themeColors;
  }

  setThemeColors(colors: string[]): void {
    this.themeColors = colors;
    this.updateNodeColor();
  }

  updateNodeColor(): void {
    const colorIndex = this.nodeIndex % this.themeColors.length;
    const bgColor = this.themeColors[colorIndex] || this.themeColors[0];

    const shapeStyle = SHAPE_STYLES[this.shape] || SHAPE_STYLES.rect;

    const label = (this.data as MermaidNodeData)?.label ?? this.label ?? '';

    this.updateSpec({
      data: {
        ...this.data,
        color: bgColor,
        html: `<div style="
          ${DEFAULT_STYLE}
          ${shapeStyle}
          background: ${bgColor};
          transform-origin: center center;
        ">${label}</div>`,
      },
    });
  }

  updateLabel(newLabel: string): void {
    const data = this.data as MermaidNodeData;
    const bgColor = (data?.color as string) ?? this.themeColors[this.nodeIndex % this.themeColors.length];
    const shapeStyle = SHAPE_STYLES[this.shape] || SHAPE_STYLES.rect;

    this.updateSpec({
      data: {
        ...this.data,
        label: newLabel,
        html: `<div style="
          ${DEFAULT_STYLE}
          ${shapeStyle}
          background: ${bgColor};
          transform-origin: center center;
        ">${newLabel}</div>`,
      },
    });
  }

  setSelectedStyle(selected: boolean): void {
    const data = this.data as MermaidNodeData;
    const bgColor = (data?.color as string) ?? this.themeColors[this.nodeIndex % this.themeColors.length];
    const shapeStyle = SHAPE_STYLES[this.shape] || SHAPE_STYLES.rect;
    const label = (data?.label as string) ?? this.label ?? '';

    const borderColor = selected ? '#3b82f6' : 'rgba(255,255,255,0.3)';
    const borderWidth = selected ? '3px' : '2px';

    this.updateSpec({
      data: {
        ...this.data,
        html: `<div style="
          ${DEFAULT_STYLE}
          ${shapeStyle}
          background: ${bgColor};
          border: ${borderWidth} solid ${borderColor};
          transform-origin: center center;
        ">${label}</div>`,
      },
    });
  }
}

export function createMermaidNode(
  sg: SpaceGraph,
  id: string,
  label: string,
  shape: MermaidNodeShape,
  position: [number, number, number],
  themeColors: string[],
  nodeIndex: number
): MermaidNode {
  return new MermaidNode(sg, {
    id,
    type: 'MermaidNode',
    label,
    position,
    data: {
      shape,
      label,
      themeColors,
      nodeIndex,
    },
  });
}