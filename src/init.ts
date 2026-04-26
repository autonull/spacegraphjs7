import { TypeRegistry } from './core/TypeRegistry';
import { ShapeNode, HtmlNode, ImageNode, ButtonNode, SliderNode, ToggleNode } from './nodes';
import { Edge } from './edges/Edge';
import type { NodeConstructor } from './core/TypeRegistry';

const registry = TypeRegistry.getInstance();
registry.registerNode('ShapeNode', ShapeNode as NodeConstructor);
registry.registerNode('HtmlNode', HtmlNode as NodeConstructor);
registry.registerNode('ImageNode', ImageNode as NodeConstructor);
registry.registerNode('ButtonNode', ButtonNode as NodeConstructor);
registry.registerNode('SliderNode', SliderNode as NodeConstructor);
registry.registerNode('ToggleNode', ToggleNode as NodeConstructor);
registry.registerEdge('Edge', Edge);
