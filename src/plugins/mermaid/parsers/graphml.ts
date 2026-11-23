import { emptyResult, graphmlData, mapShape, result } from '../helpers';
import type { DiagramCluster, DiagramEdge, DiagramNode, DiagramParseResult } from '../types';

export class GraphMLParser {
    parse(graphmlCode: string): DiagramParseResult {
        const nodes = new Map<string, DiagramNode>();
        const edges: DiagramEdge[] = [];
        const clusters = new Map<string, DiagramCluster>();

        const parser = new DOMParser();
        const doc = parser.parseFromString(graphmlCode, 'text/xml');

        const graphml = doc.documentElement;
        if (graphml.tagName !== 'graphml') {
            return emptyResult('graphml');
        }

        const keyMap = new Map<string, string>();
        const keys = doc.querySelectorAll('key');
        keys.forEach((key) => {
            const id = key.getAttribute('id');
            const attrName = key.getAttribute('attr.name');
            if (id && attrName) keyMap.set(id, attrName);
        });

        const graphEl = doc.querySelector('graph');
        const edgedefault = graphEl?.getAttribute('edgedefault') || 'directed';

        const nodeEls = doc.querySelectorAll('node');
        nodeEls.forEach((nodeEl) => {
            const id = nodeEl.getAttribute('id') || '';
            let label = id;
            let cluster: string | undefined;

            for (const { key, keyName, value } of graphmlData(nodeEl, keyMap)) {
                if (keyName === 'label' || key === 'd0') label = value;
                if (keyName === 'cluster' || keyName === 'parent') cluster = value;
            }

            const shapeEl = nodeEl.querySelector('shape, polygon');
            const shape = mapShape(shapeEl?.getAttribute('type') || undefined);

            nodes.set(id, { id, label, shape, cluster });
        });

        const edgeEls = doc.querySelectorAll('edge');
        edgeEls.forEach((edgeEl, index) => {
            const source = edgeEl.getAttribute('source') || '';
            const target = edgeEl.getAttribute('target') || '';
            let label: string | undefined;
            let color: string | undefined;

            for (const { key, keyName, value } of graphmlData(edgeEl, keyMap)) {
                if (keyName === 'label' || key === 'd0') label = value;
                if (keyName === 'color' || keyName === 'stroke') color = value;
            }

            edges.push({
                id: `edge-${index}`,
                source,
                target,
                label,
                color,
                arrowhead: edgedefault === 'directed' ? 'normal' : 'none',
            });
        });

        const subgraphEls = doc.querySelectorAll('graph[data]');
        subgraphEls.forEach((subgraphEl) => {
            let clusterId = '';
            let clusterLabel = '';

            for (const { key, keyName, value } of graphmlData(subgraphEl, keyMap)) {
                if (keyName === 'id' || key === 'd0') clusterId = value;
                if (keyName === 'label' || key === 'd1') clusterLabel = value;
            }

            if (clusterId && !clusters.has(clusterId)) {
                clusters.set(clusterId, { id: clusterId, label: clusterLabel || clusterId });
            }
        });

        return result('graphml', nodes.values(), edges, clusters.values(), 'hierarchical');
    }
}
