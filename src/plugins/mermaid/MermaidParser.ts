import type { NodeSpec, EdgeSpec } from '../../types';

export type DiagramFormat = 'mermaid' | 'dot' | 'graphml' | 'json';
export type MermaidLayoutType = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
export type MermaidNodeShape = 'rect' | 'round' | 'stadium' | 'circle' | 'diamond' | 'hexagon' | 'parallelogram' | 'parallelogram_alt' | 'trapezoid' | 'subroutine' | 'cylinder';
export type DotShape = 'box' | 'ellipse' | 'oval' | 'circle' | 'point' | 'diamond' | 'trapezium' | 'parallelogram' | 'house' | 'hexagon' | 'octagon' | 'doublecircle' | 'doubleoctagon';
export type EdgeStyle = 'solid' | 'dashed' | 'dotted' | 'bold' | 'tapered';

export interface DiagramNode {
  id: string;
  label: string;
  shape: string;
  cluster?: string;
  style?: string;
  color?: string;
  fontColor?: string;
  width?: number;
  height?: number;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: EdgeStyle;
  color?: string;
  arrowhead?: 'normal' | 'none' | 'tee' | 'odot' | 'crow' | 'diamond' | 'none';
  direction?: 'forward' | 'back' | 'both' | 'none';
}

export interface DiagramCluster {
  id: string;
  label: string;
  color?: string;
  style?: string;
}

export interface DiagramParseResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  clusters: DiagramCluster[];
  format: DiagramFormat;
  suggestedLayout: string;
  metadata?: Record<string, unknown>;
}

export function nodeToSpec(node: DiagramNode, index: number, themeColors: string[]): NodeSpec {
  return {
    id: node.id,
    type: 'MermaidNode',
    label: node.label,
    position: [0, 0, 0] as [number, number, number],
    data: {
      shape: node.shape as MermaidNodeShape,
      label: node.label,
      themeColors,
      nodeIndex: index,
      color: node.color || themeColors[index % themeColors.length],
      width: node.width,
      height: node.height,
      cluster: node.cluster,
      style: node.style,
    },
  };
}

export function edgeToSpec(edge: DiagramEdge, index: number): EdgeSpec {
  const edgeType = edge.style === 'dotted' || edge.style === 'dashed' ? 'DottedEdge' :
                   edge.label ? 'LabeledEdge' :
                   edge.style === 'solid' ? 'Edge' :
                   'CurvedEdge';

  return {
    id: edge.id || `edge-${index}`,
    source: edge.source,
    target: edge.target,
    type: edgeType,
    data: {
      label: edge.label,
      color: edge.color ? parseInt(edge.color.replace('#', ''), 16) : undefined,
      arrowhead: edge.arrowhead !== 'none',
      dashed: edge.style === 'dashed' || edge.style === 'dotted',
      style: edge.style,
    },
  };
}

const DIRECTION_MAP: Record<string, MermaidLayoutType> = {
  'TD': 'TD', 'TB': 'TB', 'BT': 'BT', 'LR': 'LR', 'RL': 'RL',
};

export class MermaidParser {
  private nodes: Map<string, DiagramNode> = new Map();
  private edges: DiagramEdge[] = [];
  private clusters: Map<string, DiagramCluster> = new Map();
  private defaultDirection: MermaidLayoutType = 'TD';
  private currentCluster: string | null = null;

  parse(mermaidCode: string): DiagramParseResult {
    this.nodes.clear();
    this.edges = [];
    this.clusters.clear();
    this.defaultDirection = 'TD';
    this.currentCluster = null;

    const lines = mermaidCode.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    for (const line of lines) {
      if (line.startsWith('graph ') || line.startsWith('flowchart ')) {
        const dir = this.parseDirection(line);
        this.defaultDirection = dir;
        continue;
      }

      if (line.startsWith('subgraph ')) {
        this.parseSubgraphStart(line);
        continue;
      }

      if (line === 'end') {
        this.currentCluster = null;
        continue;
      }

      if (line.includes('-->') || line.includes('-.->') || line.includes('---')) {
        this.parseEdge(line);
      }
    }

    for (const line of lines) {
      if (!line.startsWith('graph ') && !line.startsWith('flowchart ') &&
          !line.startsWith('subgraph ') && line !== 'end' &&
          !line.includes('-->') && !line.includes('-.->') && !line.includes('---')) {
        this.parseNode(line);
      }
    }

    return this.buildResult();
  }

  private parseDirection(line: string): MermaidLayoutType {
    const match = line.match(/^graph\s+(TD|TB|BT|LR|RL)/) ||
                  line.match(/^flowchart\s+(TD|TB|BT|LR|RL)/);
    if (match) {
      this.defaultDirection = DIRECTION_MAP[match[1]] || 'TD';
    }
    return this.defaultDirection;
  }

  private parseSubgraphStart(line: string): void {
    const match = line.match(/^subgraph\s+(\w+)(?:\s+\[([^\]]+)\])?/);
    if (match) {
      const clusterId = match[1];
      const clusterLabel = match[2] || clusterId;
      this.currentCluster = clusterId;
      this.clusters.set(clusterId, { id: clusterId, label: clusterLabel });
    }
  }

  private parseNode(line: string): void {
    const defs = [
      { regex: /^([A-Za-z0-9_]+)\[([^\]]+)\]/, shape: 'rect' },
      { regex: /^([A-Za-z0-9_]+)\(([^)]+)\)/, shape: 'round' },
      { regex: /^([A-Za-z0-9_]+)\(\(([^)]+)\)\)/, shape: 'circle' },
      { regex: /^([A-Za-z0-9_]+)\{([^}]+)\}/, shape: 'diamond' },
      { regex: /^([A-Za-z0-9_]+)\[\[([^\]]+)\]\]/, shape: 'stadium' },
      { regex: /^([A-Za-z0-9_]+)\((([^(]+))\)/, shape: 'subroutine' },
      { regex: /^([A-Za-z0-9_]+)>([^<]+)</, shape: 'trapezoid' },
    ];

    for (const { regex, shape } of defs) {
      const match = line.match(regex);
      if (match) {
        this.registerNode(match[1], match[2], shape);
        return;
      }
    }

    const simpleRef = line.match(/^([A-Za-z0-9_]+)$/);
    if (simpleRef && !this.nodes.has(simpleRef[1])) {
      this.registerNode(simpleRef[1], simpleRef[1], 'rect');
    }
  }

  private parseEdge(line: string): void {
    const patterns = [
      { regex: /^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/, style: 'solid' as EdgeStyle },
      { regex: /^([A-Za-z0-9_]+)\s*-->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/, style: 'solid' as EdgeStyle },
      { regex: /^([A-Za-z0-9_]+)\s*-\.->\s*([A-Za-z0-9_]+)/, style: 'dotted' as EdgeStyle },
      { regex: /^([A-Za-z0-9_]+)\s*-.->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/, style: 'dotted' as EdgeStyle },
      { regex: /^([A-Za-z0-9_]+)\s*==>\s*([A-Za-z0-9_]+)/, style: 'bold' as EdgeStyle },
      { regex: /^([A-Za-z0-9_]+)\s*---?\s*([A-Za-z0-9_]+)/, style: 'solid' as EdgeStyle },
    ];

    for (const { regex, style } of patterns) {
      const match = line.match(regex);
      if (match) {
        const edge: DiagramEdge = {
          id: `edge-${this.edges.length}`,
          source: match[1],
          target: match[3] || match[2],
          style,
        };
        if (match[2] && !match[3]) {
          // Could be label match on solid edge
          if (!['source', 'target'].includes(match[2])) {
            edge.label = match[2];
          }
        }
        this.registerNodeIfNeeded(edge.source);
        this.registerNodeIfNeeded(edge.target);
        this.edges.push(edge);
        return;
      }
    }
  }

  private registerNodeIfNeeded(id: string): void {
    if (!this.nodes.has(id)) {
      this.registerNode(id, id, 'rect');
    }
  }

  private registerNode(id: string, label: string, shape: string): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label, shape, cluster: this.currentCluster || undefined });
    }
  }

  private buildResult(): DiagramParseResult {
    const suggestedLayout = this.defaultDirection === 'LR' || this.defaultDirection === 'RL' ? 'tree' : 'hierarchical';

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      clusters: Array.from(this.clusters.values()),
      format: 'mermaid',
      suggestedLayout,
    };
  }
}

export class DOTParser {
  parse(dotCode: string): DiagramParseResult {
    const nodes = new Map<string, DiagramNode>();
    const edges: DiagramEdge[] = [];
    const clusters = new Map<string, DiagramCluster>();

    const graphMatch = dotCode.match(/^\s*(digraph|graph|strict\s+digraph|strict\s+graph)\s*(\w+)?\s*\{([\s\S]*)\}\s*$/m);
    if (!graphMatch) {
      return this.emptyResult();
    }

    const isDirected = graphMatch[1].includes('digraph');
    const graphContent = graphMatch[3];

    const subgraphRegex = /subgraph\s+(\w+)(?:\s*\{([\s\S]*?)\})?/g;
    let subgraphMatch;
    while ((subgraphMatch = subgraphRegex.exec(graphContent)) !== null) {
      const clusterId = subgraphMatch[1];
      const clusterContent = subgraphMatch[2] || '';
      const labelMatch = clusterContent.match(/label\s*=\s*"([^"]*)"/);
      const clusterLabel = labelMatch ? labelMatch[1] : clusterId;
      clusters.set(clusterId, { id: clusterId, label: clusterLabel });
    }

    const edgeRegex = /(\w+)\s*->\s*(\w+)(?:\s*\[[\s\S]*?\])?/g;

    let edgeMatch;
    while ((edgeMatch = edgeRegex.exec(graphContent)) !== null) {
      const edgeAttrs = this.parseAttributes(edgeMatch[0]);
      edges.push({
        id: `edge-${edges.length}`,
        source: edgeMatch[1],
        target: edgeMatch[2],
        label: edgeAttrs.label,
        style: this.mapDotStyle(edgeAttrs.style),
        color: edgeAttrs.color,
        arrowhead: edgeAttrs.arrowhead || (isDirected ? 'normal' : 'none'),
      });
    }

    const nodeStmtRegex = /(\w+)\s*\[[\s\S]*?\]/g;
    let nodeStmtMatch;
    while ((nodeStmtMatch = nodeStmtRegex.exec(graphContent)) !== null) {
      const nodeId = nodeStmtMatch[1];
      const attrs = this.parseAttributes(nodeStmtMatch[0]);
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          label: attrs.label || nodeId,
          shape: this.mapDotShape(attrs.shape),
          cluster: attrs.subgraph,
          color: attrs.fillcolor || attrs.color,
        });
      }
    }

    const simpleNodeRegex = /^\s*(\w+)(?!\s*\[)(?!\s*->)/gm;
    let simpleMatch;
    while ((simpleMatch = simpleNodeRegex.exec(graphContent)) !== null) {
      const nodeId = simpleMatch[1];
      if (!nodes.has(nodeId) && !['graph', 'digraph', 'subgraph', 'strict', 'node', 'edge'].includes(nodeId)) {
        nodes.set(nodeId, { id: nodeId, label: nodeId, shape: 'rect' });
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      clusters: Array.from(clusters.values()),
      format: 'dot',
      suggestedLayout: isDirected ? 'hierarchical' : 'force',
    };
  }

  private parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrMatch = attrString.match(/\[([\s\S]*?)\]/);
    if (attrMatch) {
      const pairs = attrMatch[1].split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (key && value) {
          attrs[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
    return attrs;
  }

  private mapDotShape(shape?: string): string {
    const map: Record<string, string> = {
      box: 'rect', rectangle: 'rect', ellipse: 'round', oval: 'round',
      circle: 'circle', diamond: 'diamond', trapezium: 'trapezoid',
      parallelogram: 'parallelogram', house: 'rect', hexagon: 'hexagon',
      octagon: 'hexagon', doublecircle: 'circle', doubleoctagon: 'circle',
    };
    return shape ? (map[shape] || 'rect') : 'rect';
  }

  private mapDotStyle(style?: string): EdgeStyle {
    const map: Record<string, EdgeStyle> = {
      dashed: 'dashed', dotted: 'dotted', solid: 'solid', bold: 'bold',
    };
    return style ? (map[style] || 'solid') : 'solid';
  }

  private emptyResult(): DiagramParseResult {
    return {
      nodes: [], edges: [], clusters: [],
      format: 'dot', suggestedLayout: 'hierarchical',
    };
  }
}

export class GraphMLParser {
  parse(graphmlCode: string): DiagramParseResult {
    const nodes = new Map<string, DiagramNode>();
    const edges: DiagramEdge[] = [];
    const clusters = new Map<string, DiagramCluster>();

    const parser = new DOMParser();
    const doc = parser.parseFromString(graphmlCode, 'text/xml');

    const graphml = doc.documentElement;
    if (graphml.tagName !== 'graphml') {
      return this.emptyResult();
    }

    const keyMap = new Map<string, string>();
    const keys = doc.querySelectorAll('key');
    keys.forEach(key => {
      const id = key.getAttribute('id');
      const attrName = key.getAttribute('attr.name');
      if (id && attrName) keyMap.set(id, attrName);
    });

    const graphEl = doc.querySelector('graph');
    graphEl?.getAttribute('id');
    const edgedefault = graphEl?.getAttribute('edgedefault') || 'directed';

    const nodeEls = doc.querySelectorAll('node');
    nodeEls.forEach(nodeEl => {
      const id = nodeEl.getAttribute('id') || '';
      let label = id;
      let cluster: string | undefined;

      const dataEls = nodeEl.querySelectorAll('data');
      dataEls.forEach(data => {
        const key = data.getAttribute('key');
        const keyName = keyMap.get(key || '') || key;
        const value = data.textContent || '';
        if (keyName === 'label' || key === 'd0') label = value;
        if (keyName === 'cluster' || keyName === 'parent') cluster = value;
      });

      const shapeEl = nodeEl.querySelector('shape, polygon');
      let shape = 'rect';
      if (shapeEl) {
        const type = shapeEl.getAttribute('type') || '';
        shape = this.mapGraphMLShape(type);
      }

      nodes.set(id, { id, label, shape, cluster });
    });

    const edgeEls = doc.querySelectorAll('edge');
    edgeEls.forEach((edgeEl, index) => {
      const source = edgeEl.getAttribute('source') || '';
      const target = edgeEl.getAttribute('target') || '';
      let label: string | undefined;
      let color: string | undefined;

      const dataEls = edgeEl.querySelectorAll('data');
      dataEls.forEach(data => {
        const key = data.getAttribute('key');
        const keyName = keyMap.get(key || '') || key;
        const value = data.textContent || '';
        if (keyName === 'label' || key === 'd0') label = value;
        if (keyName === 'color' || keyName === 'stroke') color = value;
      });

      edges.push({
        id: `edge-${index}`,
        source, target, label, color,
        arrowhead: edgedefault === 'directed' ? 'normal' : 'none',
      });
    });

    const subgraphEls = doc.querySelectorAll('graph[data]');
    subgraphEls.forEach(subgraphEl => {
      const dataEls = subgraphEl.querySelectorAll('data');
      let clusterId = '';
      let clusterLabel = '';

      dataEls.forEach(data => {
        const key = data.getAttribute('key');
        const keyName = keyMap.get(key || '') || key;
        const value = data.textContent || '';
        if (keyName === 'id' || key === 'd0') clusterId = value;
        if (keyName === 'label' || key === 'd1') clusterLabel = value;
      });

      if (clusterId && !clusters.has(clusterId)) {
        clusters.set(clusterId, { id: clusterId, label: clusterLabel || clusterId });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
      clusters: Array.from(clusters.values()),
      format: 'graphml',
      suggestedLayout: 'hierarchical',
    };
  }

  private mapGraphMLShape(type: string): string {
    const map: Record<string, string> = {
      rectangle: 'rect', box: 'rect', ellipse: 'round', oval: 'round',
      circle: 'circle', diamond: 'diamond', hexagon: 'hexagon',
      trapezium: 'trapezoid', parallelogram: 'parallelogram',
    };
    return map[type] || 'rect';
  }

  private emptyResult(): DiagramParseResult {
    return {
      nodes: [], edges: [], clusters: [],
      format: 'graphml', suggestedLayout: 'hierarchical',
    };
  }
}

export class JSONDiagramParser {
  parse(jsonCode: string): DiagramParseResult {
    try {
      const data = JSON.parse(jsonCode);

      const nodes: DiagramNode[] = (data.nodes || data.vertices || []).map((n: any, i: number) => ({
        id: n.id || `node-${i}`,
        label: n.label || n.text || n.name || n.id || `Node ${i}`,
        shape: n.shape || n.type || 'rect',
        cluster: n.cluster || n.group || n.parent,
        color: n.color || n.fill,
        width: n.width,
        height: n.height,
      }));

      const edges: DiagramEdge[] = (data.edges || data.links || data.connections || []).map((e: any, i: number) => ({
        id: e.id || `edge-${i}`,
        source: e.source || e.from || e.src,
        target: e.target || e.to || e.dst,
        label: e.label || e.text,
        style: e.style || (e.dashed ? 'dashed' : e.dotted ? 'dotted' : 'solid'),
        color: e.color || e.stroke,
        arrowhead: e.arrow !== false ? 'normal' : 'none',
      }));

      const clusters: DiagramCluster[] = (data.clusters || data.groups || []).map((c: any) => ({
        id: c.id || c.name,
        label: c.label || c.name || c.id,
        color: c.color,
        style: c.style,
      }));

      return {
        nodes,
        edges,
        clusters,
        format: 'json',
        suggestedLayout: data.suggestedLayout || (data.directed !== false ? 'hierarchical' : 'force'),
        metadata: data.metadata,
      };
    } catch {
      return {
        nodes: [], edges: [], clusters: [],
        format: 'json', suggestedLayout: 'hierarchical',
      };
    }
  }
}

export class DiagramParserFactory {
  private static parsers = {
    mermaid: new MermaidParser(),
    dot: new DOTParser(),
    graphml: new GraphMLParser(),
    json: new JSONDiagramParser(),
  };

  static parse(content: string, format?: DiagramFormat): DiagramParseResult {
    if (format) {
      const parser = this.parsers[format];
      if (parser) return parser.parse(content);
    }

    const trimmed = content.trim();

    if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ') ||
        trimmed.startsWith('sequenceDiagram') || trimmed.startsWith('classDiagram') ||
        trimmed.startsWith('stateDiagram') || trimmed.startsWith('erDiagram') ||
        trimmed.startsWith('gantt') || trimmed.startsWith('pie')) {
      return this.parsers.mermaid.parse(content);
    }

    if (trimmed.startsWith('digraph') || trimmed.startsWith('graph') && trimmed.includes('->')) {
      return this.parsers.dot.parse(content);
    }

    if (trimmed.startsWith('<?xml') || trimmed.includes('<graphml') || trimmed.includes('<GraphML')) {
      return this.parsers.graphml.parse(content);
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.parsers.json.parse(content);
    }

    return this.parsers.mermaid.parse(content);
  }

  static getSupportedFormats(): DiagramFormat[] {
    return ['mermaid', 'dot', 'graphml', 'json'];
  }

  static detectFormat(content: string): DiagramFormat {
    const trimmed = content.trim();

    if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ')) return 'mermaid';
    if (trimmed.startsWith('digraph') || (trimmed.startsWith('graph') && trimmed.includes('->'))) return 'dot';
    if (trimmed.startsWith('<?xml') || trimmed.includes('<graphml')) return 'graphml';
    if (trimmed.startsWith('{')) return 'json';

    return 'mermaid';
  }
}

export const MERMAID_THEMES = {
  default: {
    nodeColors: [
      'rgba(59, 130, 246, 0.9)',
      'rgba(139, 92, 246, 0.9)',
      'rgba(16, 185, 129, 0.9)',
      'rgba(245, 158, 11, 0.9)',
      'rgba(239, 68, 68, 0.9)',
      'rgba(236, 72, 153, 0.9)',
      'rgba(6, 182, 212, 0.9)',
      'rgba(132, 204, 22, 0.9)',
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
  neon: {
    nodeColors: [
      'rgba(251, 146, 60, 0.9)',
      'rgba(251, 191, 36, 0.9)',
      'rgba(34, 211, 238, 0.9)',
      'rgba(167, 139, 250, 0.9)',
      'rgba(244, 114, 182, 0.9)',
    ],
    edgeColor: 0x06b6d4,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
};

export type MermaidThemeName = keyof typeof MERMAID_THEMES;

export const LAYOUT_NAMES = [
  'force', 'circular', 'grid', 'hierarchical', 'radial', 'tree', 'spectral', 'cluster',
] as const;

export type LayoutName = typeof LAYOUT_NAMES[number];

export function getLayoutLabel(name: LayoutName): string {
  const labels: Record<LayoutName, string> = {
    force: 'Force Directed', circular: 'Circular', grid: 'Grid',
    hierarchical: 'Hierarchical', radial: 'Radial', tree: 'Tree',
    spectral: 'Spectral', cluster: 'Cluster',
  };
  return labels[name];
}