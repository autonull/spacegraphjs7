import { emptyResult, result } from '../helpers';
import type { DiagramCluster, DiagramEdge, DiagramNode, DiagramParseResult } from '../types';

export class JSONDiagramParser {
    parse(jsonCode: string): DiagramParseResult {
        try {
            const data = JSON.parse(jsonCode);

            const nodes: DiagramNode[] = (data.nodes || data.vertices || []).map(
                (n: any, i: number) => ({
                    id: n.id || `node-${i}`,
                    label: n.label || n.text || n.name || n.id || `Node ${i}`,
                    shape: n.shape || n.type || 'rect',
                    cluster: n.cluster || n.group || n.parent,
                    color: n.color || n.fill,
                    width: n.width,
                    height: n.height,
                }),
            );

            const edges: DiagramEdge[] = (data.edges || data.links || data.connections || []).map(
                (e: any, i: number) => ({
                    id: e.id || `edge-${i}`,
                    source: e.source || e.from || e.src,
                    target: e.target || e.to || e.dst,
                    label: e.label || e.text,
                    style: e.style || (e.dashed ? 'dashed' : e.dotted ? 'dotted' : 'solid'),
                    color: e.color || e.stroke,
                    arrowhead: e.arrow !== false ? 'normal' : 'none',
                }),
            );

            const clusters: DiagramCluster[] = (data.clusters || data.groups || []).map(
                (c: any) => ({
                    id: c.id || c.name,
                    label: c.label || c.name || c.id,
                    color: c.color,
                    style: c.style,
                }),
            );

            return result(
                'json',
                nodes,
                edges,
                clusters,
                data.suggestedLayout || (data.directed !== false ? 'hierarchical' : 'force'),
                data.metadata,
            );
        } catch {
            return emptyResult('json');
        }
    }
}
