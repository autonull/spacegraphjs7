import { HtmlNode } from '../../nodes';
import type { SpaceGraph } from '../../SpaceGraph';
import type { BaseNodeData, NodeSpec, SpaceGraphNodeData } from '../../types';
import type { MermaidNodeShape } from './MermaidParser';

export interface MermaidNodeData extends BaseNodeData {
  shape?: MermaidNodeShape;
  label?: string;
  themeColors?: string[];
  nodeIndex?: number;
  color?: string;
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

/** The card markup of a mermaid node: the shape's style, the fill, and the label. */
function cardMarkup(
  label: string,
  background: string,
  shape: MermaidNodeShape,
  border?: string
): string {
  const shapeStyle = SHAPE_STYLES[shape] || SHAPE_STYLES.rect;
  const borderStyle = border ? `\n          border: ${border};` : '';

  return `<div style="
          ${DEFAULT_STYLE}
          ${shapeStyle}
          background: ${background};${borderStyle}
          transform-origin: center center;
        ">${label}</div>`;
}

export class MermaidNode extends HtmlNode {
  readonly shape: MermaidNodeShape = 'rect';
  readonly nodeIndex: number = 0;
  private themeColors: string[] = [];

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    const data = spec.data as MermaidNodeData;
    const shape = (data?.shape as MermaidNodeShape) ?? 'rect';
    const label = (data?.label as string) ?? spec.label ?? '';
    const nodeIndex = (data?.nodeIndex as number) ?? 0;
    const themeColors = (data?.themeColors as string[]) ?? ['rgba(59, 130, 246, 0.9)'];

    const colorIndex = nodeIndex % themeColors.length;
    const bgColor = themeColors[colorIndex] || themeColors[0];

    super(sg, {
      ...spec,
      data: {
        ...data,
        width: 160,
        height: 60,
        color: bgColor,
        html: cardMarkup(label, bgColor, shape),
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

    const label = (this.data as MermaidNodeData)?.label ?? this.label ?? '';

    this.updateSpec({
      data: {
        ...this.data,
        color: bgColor,
        html: cardMarkup(label, bgColor, this.shape),
      },
    });
  }

  updateLabel(newLabel: string): void {
    const data = this.data as MermaidNodeData;
    const bgColor =
      (data?.color as string) ?? this.themeColors[this.nodeIndex % this.themeColors.length];

    this.updateSpec({
      data: {
        ...this.data,
        label: newLabel,
        html: cardMarkup(newLabel, bgColor, this.shape),
      },
    });
  }

  setSelectedStyle(selected: boolean): void {
    const data = this.data as MermaidNodeData;
    const bgColor =
      (data?.color as string) ?? this.themeColors[this.nodeIndex % this.themeColors.length];
    const label = (data?.label as string) ?? this.label ?? '';

    const border = selected ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.3)';

    this.updateSpec({
      data: {
        ...this.data,
        html: cardMarkup(label, bgColor, this.shape, border),
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
