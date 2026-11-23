import type {
    DiagramCluster,
    DiagramEdge,
    DiagramFormat,
    DiagramNode,
    DiagramParseResult,
    EdgeStyle,
} from './types';

/**
 * The foreign shape names the DOT and GraphML parsers read, mapped to the shape they draw as. The
 * GraphML vocabulary is a subset of the DOT one, so both parsers share this table.
 */
const SHAPE_ALIASES: Record<string, string> = {
    box: 'rect',
    rectangle: 'rect',
    house: 'rect',
    ellipse: 'round',
    oval: 'round',
    circle: 'circle',
    doublecircle: 'circle',
    doubleoctagon: 'circle',
    diamond: 'diamond',
    trapezium: 'trapezoid',
    parallelogram: 'parallelogram',
    hexagon: 'hexagon',
    octagon: 'hexagon',
};

export function mapShape(shape?: string): string {
    return (shape && SHAPE_ALIASES[shape]) || 'rect';
}

const EDGE_STYLES: Record<string, EdgeStyle> = {
    dashed: 'dashed',
    dotted: 'dotted',
    solid: 'solid',
    bold: 'bold',
};

export function mapStyle(style?: string): EdgeStyle {
    return (style && EDGE_STYLES[style]) || 'solid';
}

export function result(
    format: DiagramFormat,
    nodes: Iterable<DiagramNode>,
    edges: DiagramEdge[],
    clusters: Iterable<DiagramCluster>,
    suggestedLayout: string,
    metadata?: Record<string, unknown>,
): DiagramParseResult {
    return {
        nodes: [...nodes],
        edges,
        clusters: [...clusters],
        format,
        suggestedLayout,
        ...(metadata && { metadata }),
    };
}

export function emptyResult(format: DiagramFormat): DiagramParseResult {
    return result(format, [], [], [], 'hierarchical');
}

/** The resolved key, its mapped name, and its text, for each `<data>` element of a GraphML node. */
export function graphmlData(element: Element, keyMap: Map<string, string>) {
    return Array.from(element.querySelectorAll('data'), (data) => {
        const key = data.getAttribute('key');
        return {
            key: key || '',
            keyName: keyMap.get(key || '') || key || '',
            value: data.textContent || '',
        };
    });
}
