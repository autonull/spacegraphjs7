import type { EdgeSpec, NodeSpec } from '../../types';
import { parseColor } from '../../utils/color';
import type { DiagramEdge, DiagramNode, DiagramTheme, MermaidNodeShape } from './types';

/** The node a parsed diagram draws, as a core spec. */
export function nodeToSpec(node: DiagramNode, index: number, theme: DiagramTheme): NodeSpec {
    const data: Record<string, unknown> = {
        shape: node.shape as MermaidNodeShape,
        label: node.label,
        themeColors: theme.nodeColors,
        nodeIndex: index,
        color: node.color || theme.nodeColors[index % theme.nodeColors.length],
        width: node.width || 160,
        height: node.height || 60,
        cluster: node.cluster,
    };

    if (node.style) {
        data.style = node.style;
        if (node.style === 'filled') data.filled = true;
    }

    return {
        id: node.id,
        type: 'MermaidNode',
        label: node.label,
        position: [0, 0, 0] as [number, number, number],
        data,
    };
}

/** The edge a parsed diagram draws, as a core spec. */
export function edgeToSpec(edge: DiagramEdge, index: number, theme: DiagramTheme): EdgeSpec {
    const type =
        edge.style === 'dotted' || edge.style === 'dashed'
            ? 'DottedEdge'
            : edge.label
              ? 'LabeledEdge'
              : 'CurvedEdge';

    return {
        id: edge.id || `edge-${index}`,
        source: edge.source,
        target: edge.target,
        type,
        data: {
            label: edge.label,
            color: edge.color ? parseColor(edge.color) : theme.edgeColor,
            arrowhead: edge.arrowhead !== 'none',
            dashed: edge.style === 'dashed',
            style: edge.style,
        },
    };
}
