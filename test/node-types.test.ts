import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_TYPES, DEFAULT_NODE_TYPES, nodeTypeName } from '../src/core/defaults';
import { CurvedEdge } from '../src/edges/CurvedEdge';
import { Edge } from '../src/edges/Edge';
import { HtmlNode } from '../src/nodes/HtmlNode';
import { MermaidNode } from '../src/plugins/mermaid/MermaidNode';

describe('default type registration names', () => {
  it('does not register a subclass under an inherited typeName', () => {
    expect(nodeTypeName(HtmlNode)).toBe('HtmlNode');
    expect(nodeTypeName(MermaidNode)).toBe('MermaidNode');
    expect(nodeTypeName(Edge)).toBe('Edge');
    expect(nodeTypeName(CurvedEdge)).toBe('CurvedEdge');
  });

  it('registers every default node and edge type under a unique name', () => {
    const nodes = DEFAULT_NODE_TYPES.map((cls) => nodeTypeName(cls));
    const edges = DEFAULT_EDGE_TYPES.map((cls) => nodeTypeName(cls));
    expect(new Set(nodes).size).toBe(nodes.length);
    expect(new Set(edges).size).toBe(edges.length);
    expect(nodes).toContain('HtmlNode');
    expect(nodes).toContain('MermaidNode');
    expect(edges).toContain('Edge');
    expect(edges).toContain('CurvedEdge');
  });
});
