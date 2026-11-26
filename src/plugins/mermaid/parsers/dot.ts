import { emptyResult, mapShape, mapStyle, result } from '../helpers';
import type { DiagramCluster, DiagramEdge, DiagramNode, DiagramParseResult } from '../types';

const RESERVED = new Set(['graph', 'digraph', 'subgraph', 'strict', 'node', 'edge']);

export class DOTParser {
    parse(dotCode: string): DiagramParseResult {
        const nodes = new Map<string, DiagramNode>();
        const clusters = new Map<string, DiagramCluster>();
        const graphMatch = dotCode.match(
            /^\s*(digraph|graph|strict\s+digraph|strict\s+graph)\s*(\w+)?\s*\{([\s\S]*)\}\s*$/m,
        );
        if (!graphMatch) return emptyResult('dot');
        const isDirected = graphMatch[1].includes('digraph');
        const graphContent = graphMatch[3];

        const subgraphRegex = /subgraph\s+(\w+)(?:\s*\{([\s\S]*?)\})?/g;
        for (const match of graphContent.matchAll(subgraphRegex)) {
            const clusterId = match[1];
            const clusterContent = match[2] || '';
            const labelMatch = clusterContent.match(/label\s*=\s*"([^"]*)"/);
            clusters.set(clusterId, {
                id: clusterId,
                label: labelMatch ? labelMatch[1] : clusterId,
            });
        }

        const edges: DiagramEdge[] = [];
        const statements = graphContent.replace(
            /(\w+)\s*(?:->|--)\s*(\w+)(?:\s*\[[\s\S]*?\])?/g,
            (statement, source: string, target: string) => {
                const attrs = this.parseAttributes(statement);
                edges.push({
                    id: `edge-${edges.length}`,
                    source,
                    target,
                    label: attrs.label,
                    style: mapStyle(attrs.style),
                    color: attrs.color,
                    arrowhead: (attrs.arrowhead ||
                        (isDirected ? 'normal' : 'none')) as DiagramEdge['arrowhead'],
                });
                return ' '.repeat(statement.length);
            },
        );

        for (const match of statements.matchAll(/(\w+)\s*\[[\s\S]*?\]/g)) {
            const nodeId = match[1];
            if (nodes.has(nodeId) || RESERVED.has(nodeId)) continue;
            const attrs = this.parseAttributes(match[0]);
            nodes.set(nodeId, {
                id: nodeId,
                label: attrs.label || nodeId,
                shape: mapShape(attrs.shape),
                cluster: attrs.subgraph,
                color: attrs.fillcolor || attrs.color,
            });
        }
        for (const match of statements.matchAll(/^\s*(\w+)(?!\s*\[)(?!\s*->)/gm)) {
            const nodeId = match[1];
            if (!nodes.has(nodeId) && !RESERVED.has(nodeId)) {
                nodes.set(nodeId, { id: nodeId, label: nodeId, shape: 'rect' });
            }
        }
        for (const edge of edges) {
            for (const id of [edge.source, edge.target]) {
                if (!nodes.has(id)) nodes.set(id, { id, label: id, shape: 'rect' });
            }
        }
        return result(
            'dot',
            nodes.values(),
            edges,
            clusters.values(),
            isDirected ? 'hierarchical' : 'force',
        );
    }
    private parseAttributes(attrString: string): Record<string, string> {
        const attrs: Record<string, string> = {};
        const attrMatch = attrString.match(/\[([\s\S]*?)\]/);
        if (attrMatch) {
            const pairs = attrMatch[1].split(',');
            for (const pair of pairs) {
                const [key, value] = pair.split('=').map((s) => s.trim());
                if (key && value) attrs[key] = value.replace(/^["']|["']$/g, '');
            }
        }
        return attrs;
    }
}
