import { emptyResult, mapShape, mapStyle, result } from '../helpers';
import type { DiagramCluster, DiagramEdge, DiagramNode, DiagramParseResult } from '../types';

export class DOTParser {
    parse(dotCode: string): DiagramParseResult {
        const nodes = new Map<string, DiagramNode>();
        const edges: DiagramEdge[] = [];
        const clusters = new Map<string, DiagramCluster>();

        const graphMatch = dotCode.match(
            /^\s*(digraph|graph|strict\s+digraph|strict\s+graph)\s*(\w+)?\s*\{([\s\S]*)\}\s*$/m,
        );
        if (!graphMatch) {
            return emptyResult('dot');
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
                style: mapStyle(edgeAttrs.style),
                color: edgeAttrs.color,
                arrowhead: (edgeAttrs.arrowhead ||
                    (isDirected ? 'normal' : 'none')) as DiagramEdge['arrowhead'],
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
                    shape: mapShape(attrs.shape),
                    cluster: attrs.subgraph,
                    color: attrs.fillcolor || attrs.color,
                });
            }
        }

        const simpleNodeRegex = /^\s*(\w+)(?!\s*\[)(?!\s*->)/gm;
        let simpleMatch;
        while ((simpleMatch = simpleNodeRegex.exec(graphContent)) !== null) {
            const nodeId = simpleMatch[1];
            if (
                !nodes.has(nodeId) &&
                !['graph', 'digraph', 'subgraph', 'strict', 'node', 'edge'].includes(nodeId)
            ) {
                nodes.set(nodeId, { id: nodeId, label: nodeId, shape: 'rect' });
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
                if (key && value) {
                    attrs[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            }
        }
        return attrs;
    }
}
