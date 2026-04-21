import type { NodeSpec, EdgeSpec } from '../types';

export type MermaidLayoutType = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
export type MermaidNodeShape = 'rect' | 'round' | 'stadium' | 'circle' | 'diamond' | 'hexagon' | 'parallelogram' | 'parallelogram_alt' | 'trapezoid' | 'subroutine' | 'cylinder';

export interface MermaidParseResult {
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  layout: MermaidLayoutType;
  direction?: string;
}

export interface ParsedNode {
  id: string;
  label: string;
  shape: MermaidNodeShape;
  styles?: string[];
}

const DIRECTION_MAP: Record<string, MermaidLayoutType> = {
  'TD': 'TD',
  'TB': 'TB',
  'BT': 'BT',
  'LR': 'LR',
  'RL': 'RL',
};

export class MermaidParser {
  private nodes: Map<string, ParsedNode> = new Map();
  private edges: Array<{ source: string; target: string; label?: string }> = [];
  private defaultDirection: MermaidLayoutType = 'TD';

  parse(mermaidCode: string): MermaidParseResult {
    this.nodes.clear();
    this.edges = [];

    const lines = mermaidCode.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    let direction: MermaidLayoutType = this.defaultDirection;

    for (const line of lines) {
      if (line.startsWith('graph ')) {
        direction = this.parseDirection(line);
        continue;
      }

      if (line.includes('-->')) {
        this.parseEdge(line);
      } else if (line.includes('---') && !line.includes('-->')) {
        // Could be edge without arrow, treat as undirected
        const parts = line.split('---');
        if (parts.length === 2) {
          const source = parts[0].trim();
          const target = parts[1].trim();
          if (source && target) {
            this.edges.push({ source, target });
          }
        }
      }
    }

    for (const line of lines) {
      if (!line.startsWith('graph ') && !line.includes('-->') && !line.includes('---')) {
        this.parseNode(line);
      }
    }

    return {
      nodes: this.buildNodeSpecs(),
      edges: this.buildEdgeSpecs(),
      layout: direction,
    };
  }

  private parseDirection(line: string): MermaidLayoutType {
    const match = line.match(/^graph\s+(TD|TB|BT|LR|RL)/);
    if (match) {
      this.defaultDirection = DIRECTION_MAP[match[1]] || 'TD';
      return this.defaultDirection;
    }
    return this.defaultDirection;
  }

  private parseNode(line: string): void {
    // Handle node definitions: A[Label] or A-->B where A has definition
    // Multi-word labels in brackets: A[Multi Word Label]
    const simpleDef = line.match(/^([A-Za-z0-9_]+)\[([^\]]+)\]/);
    if (simpleDef) {
      this.registerNode(simpleDef[1], simpleDef[2], 'rect');
      return;
    }

    const roundDef = line.match(/^([A-Za-z0-9_]+)\(([^)]+)\)/);
    if (roundDef) {
      this.registerNode(roundDef[1], roundDef[2], 'round');
      return;
    }

    const circleDef = line.match(/^([A-Za-z0-9_]+)\(\(([^)]+)\)\)/);
    if (circleDef) {
      this.registerNode(circleDef[1], circleDef[2], 'circle');
      return;
    }

    const diamondDef = line.match(/^([A-Za-z0-9_]+)\{([^}]+)\}/);
    if (diamondDef) {
      this.registerNode(diamondDef[1], diamondDef[2], 'diamond');
      return;
    }

    const stadiumDef = line.match(/^([A-Za-z0-9_]+)\(([^)]+)\)/);
    if (stadiumDef) {
      this.registerNode(stadiumDef[1], stadiumDef[2], 'stadium');
      return;
    }

    // Simple node reference without definition (just appears in edges)
    const simpleRef = line.match(/^([A-Za-z0-9_]+)$/);
    if (simpleRef && !this.nodes.has(simpleRef[1])) {
      this.registerNode(simpleRef[1], simpleRef[1], 'rect');
    }
  }

  private parseEdge(line: string): void {
    // Standard arrow: A-->B
    const standardEdge = line.match(/^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/);
    if (standardEdge) {
      this.registerNodeIfNeeded(standardEdge[1]);
      this.registerNodeIfNeeded(standardEdge[2]);
      this.edges.push({ source: standardEdge[1], target: standardEdge[2] });
      return;
    }

    // Labeled edge: A-->|label|B
    const labeledEdge = line.match(/^([A-Za-z0-9_]+)\s*-->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/);
    if (labeledEdge) {
      this.registerNodeIfNeeded(labeledEdge[1]);
      this.registerNodeIfNeeded(labeledEdge[3]);
      this.edges.push({
        source: labeledEdge[1],
        target: labeledEdge[3],
        label: labeledEdge[2].trim()
      });
      return;
    }

    // Dotted/dashed edge: A-.->B or A-.text.->B
    const dottedEdge = line.match(/^([A-Za-z0-9_]+)\s*-\.->\s*([A-Za-z0-9_]+)/);
    if (dottedEdge) {
      this.registerNodeIfNeeded(dottedEdge[1]);
      this.registerNodeIfNeeded(dottedEdge[2]);
      this.edges.push({ source: dottedEdge[1], target: dottedEdge[2] });
      return;
    }

    // Open edge: A --- B
    const openEdge = line.match(/^([A-Za-z0-9_]+)\s*---\s*([A-Za-z0-9_]+)/);
    if (openEdge) {
      this.registerNodeIfNeeded(openEdge[1]);
      this.registerNodeIfNeeded(openEdge[2]);
      this.edges.push({ source: openEdge[1], target: openEdge[2] });
      return;
    }
  }

  private registerNodeIfNeeded(id: string): void {
    if (!this.nodes.has(id)) {
      this.registerNode(id, id, 'rect');
    }
  }

  private registerNode(id: string, label: string, shape: MermaidNodeShape): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label, shape });
    }
  }

  private buildNodeSpecs(): NodeSpec[] {
    return Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      type: 'MermaidNode',
      label: node.label,
      position: [0, 0, 0] as [number, number, number],
      data: {
        shape: node.shape,
        label: node.label,
      },
    }));
  }

  private buildEdgeSpecs(): EdgeSpec[] {
    return this.edges.map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'CurvedEdge',
      data: {
        label: edge.label,
        arrowhead: true,
      },
    }));
  }
}

export const MERMAID_THEMES = {
  default: {
    nodeColors: [
      'rgba(59, 130, 246, 0.9)',   // blue
      'rgba(139, 92, 246, 0.9)',   // purple
      'rgba(16, 185, 129, 0.9)',   // green
      'rgba(245, 158, 11, 0.9)',   // amber
      'rgba(239, 68, 68, 0.9)',    // red
      'rgba(236, 72, 153, 0.9)',   // pink
      'rgba(6, 182, 212, 0.9)',    // cyan
      'rgba(132, 204, 22, 0.9)',   // lime
    ],
    edgeColor: 0x64748b,
    textColor: '#ffffff',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  forest: {
    nodeColors: [
      'rgba(34, 197, 94, 0.9)',
      'rgba(22, 163, 74, 0.9)',
      'rgba(21, 128, 61, 0.9)',
      'rgba(20, 184, 166, 0.9)',
      'rgba(13, 148, 136, 0.9)',
    ],
    edgeColor: 0x22543d,
    textColor: '#ffffff',
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
  },
  neutral: {
    nodeColors: [
      'rgba(71, 85, 105, 0.9)',
      'rgba(100, 116, 139, 0.9)',
      'rgba(148, 163, 184, 0.9)',
    ],
    edgeColor: 0x475569,
    textColor: '#f1f5f9',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
};

export type MermaidThemeName = keyof typeof MERMAID_THEMES;

export const LAYOUT_NAMES = [
  'force',
  'circular',
  'grid',
  'hierarchical',
  'radial',
  'tree',
  'spectral',
  'cluster',
] as const;

export type LayoutName = typeof LAYOUT_NAMES[number];

export function getLayoutLabel(name: LayoutName): string {
  const labels: Record<LayoutName, string> = {
    force: 'Force Directed',
    circular: 'Circular',
    grid: 'Grid',
    hierarchical: 'Hierarchical',
    radial: 'Radial',
    tree: 'Tree',
    spectral: 'Spectral',
    cluster: 'Cluster',
  };
  return labels[name];
}