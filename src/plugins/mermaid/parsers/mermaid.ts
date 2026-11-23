import { result } from '../helpers';
import type {
    DiagramCluster,
    DiagramEdge,
    DiagramNode,
    DiagramParseResult,
    EdgeStyle,
    MermaidLayoutType,
} from '../types';

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

        const lines = mermaidCode
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('%%'));

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
            if (
                !line.startsWith('graph ') &&
                !line.startsWith('flowchart ') &&
                !line.startsWith('subgraph ') &&
                line !== 'end' &&
                !line.includes('-->') &&
                !line.includes('-.->') &&
                !line.includes('---')
            ) {
                this.parseNode(line);
            }
        }

        return this.buildResult();
    }

    private parseDirection(line: string): MermaidLayoutType {
        const match =
            line.match(/^graph\s+(TD|TB|BT|LR|RL)/) || line.match(/^flowchart\s+(TD|TB|BT|LR|RL)/);
        if (match) return match[1] as MermaidLayoutType;
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
            { regex: /^([A-Za-z0-9_]+)\{([^}]+)\}/, shape: 'diamond' },
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
            {
                regex: /^([A-Za-z0-9_]+)\s*-->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/,
                style: 'solid' as EdgeStyle,
            },
            { regex: /^([A-Za-z0-9_]+)\s*-\.->\s*([A-Za-z0-9_]+)/, style: 'dotted' as EdgeStyle },
            {
                regex: /^([A-Za-z0-9_]+)\s*-.->\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)/,
                style: 'dotted' as EdgeStyle,
            },
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
        const suggestedLayout =
            this.defaultDirection === 'LR' || this.defaultDirection === 'RL'
                ? 'tree'
                : 'hierarchical';

        return result(
            'mermaid',
            this.nodes.values(),
            this.edges,
            this.clusters.values(),
            suggestedLayout,
        );
    }
}
