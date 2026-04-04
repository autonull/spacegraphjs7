import { TypeRegistry } from './core/TypeRegistry';
import { ShapeNode, HtmlNode, ImageNode } from './nodes';
import { Edge } from './edges/Edge';

const registry = TypeRegistry.getInstance();
registry.registerNode('ShapeNode', ShapeNode);
registry.registerNode('HtmlNode', HtmlNode);
registry.registerNode('ImageNode', ImageNode);
registry.registerEdge('Edge', Edge);
