import { TypeRegistry } from './core/TypeRegistry';
import { ShapeNode, HtmlNode, ImageNode, ButtonNode, SliderNode, ToggleNode } from './nodes';
import { Edge } from './edges/Edge';

const registry = TypeRegistry.getInstance();
registry.registerNode('ShapeNode', ShapeNode);
registry.registerNode('HtmlNode', HtmlNode);
registry.registerNode('ImageNode', ImageNode);
registry.registerNode('ButtonNode', ButtonNode);
registry.registerNode('SliderNode', SliderNode);
registry.registerNode('ToggleNode', ToggleNode);
registry.registerEdge('Edge', Edge);
