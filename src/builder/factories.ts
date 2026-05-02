// builder/factories.ts - Factory functions for nodes, edges, widgets
import type { EdgeSpec, SpaceGraphOptions, NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';
import { NodeBuilder } from './node';
import { WidgetBuilder } from './node';
import { GraphBuilder } from './graph';

// Graph spec builder - fluent API for creating graphs
export const graph = (): GraphBuilder => new GraphBuilder();

// Widget factory - quick creation of UI elements
export const widget = (id: string, type: 'button' | 'toggle' | 'slider' = 'button'): WidgetBuilder => {
    const typeMap = { button: 'ButtonNode', toggle: 'ToggleNode', slider: 'SliderNode' };
    return new WidgetBuilder(id, typeMap[type]);
};

// Convenience widget creators
export const button = (id: string, label?: string): WidgetBuilder =>
    new WidgetBuilder(id, 'ButtonNode').label(label ?? id).width(120).height(40);

export const toggle = (id: string, value = false): WidgetBuilder =>
    new WidgetBuilder(id, 'ToggleNode').data({ value }).width(60).height(30);

export const slider = (id: string, min = 0, max = 1, value = 0.5): WidgetBuilder =>
    new WidgetBuilder(id, 'SliderNode').data({ min, max, value }).width(200).height(20);

// Quick graph creation - create a SpaceGraph instance with nodes and edges
export async function quickGraph(
    container: string | HTMLElement,
    nodes: Array<{ id: string; label?: string; position?: [number, number, number]; data?: Record<string, unknown> }>,
    edges?: Array<{ id: string; source: string; target: string }>,
    options?: SpaceGraphOptions,
): Promise<SpaceGraph> {
    const { SpaceGraph } = await import('../SpaceGraph');
    return SpaceGraph.quickGraph(container, nodes, edges, options);
}

// Node factory - quick creation of common node types
export const NodeFactory = {
    shape(id: string, shape: 'box' | 'sphere' | 'circle' | 'cone' | 'cylinder' = 'box'): NodeBuilder {
        return new NodeBuilder(id, 'ShapeNode').data({ shape });
    },
    button(id: string, label?: string): NodeBuilder {
        return new NodeBuilder(id, 'ButtonNode').data({ label }).size(120);
    },
    slider(id: string, min = 0, max = 1, value = 0.5): NodeBuilder {
        return new NodeBuilder(id, 'SliderNode').data({ min, max, value }).size(200);
    },
    toggle(id: string, value = false): NodeBuilder {
        return new NodeBuilder(id, 'ToggleNode').data({ value }).size(60);
    },
    html(id: string, html = ''): NodeBuilder {
        return new NodeBuilder(id, 'HtmlNode').data({ html, width: 200, height: 150 });
    },
    image(id: string, url: string): NodeBuilder {
        return new NodeBuilder(id, 'ImageNode').data({ url, width: 200, height: 200 });
    },
    video(id: string, url: string): NodeBuilder {
        return new NodeBuilder(id, 'VideoNode').data({ url, width: 320, height: 180 });
    },
    text(id: string, text = ''): NodeBuilder {
        return new NodeBuilder(id, 'NoteNode').data({ text, width: 150, height: 100 });
    },
    group(id: string, title?: string): NodeBuilder {
        return new NodeBuilder(id, 'GroupNode').data({ title, width: 200, height: 200 });
    },
    container(id: string): NodeBuilder {
        return new NodeBuilder(id, 'GroupNode').data({ isContainer: true, width: 300, height: 300 });
    },
    // Convenience: Create node from spec
    fromSpec(spec: NodeSpec): NodeBuilder {
        return new NodeBuilder(spec.id, spec.type).position(spec.position).data(spec.data);
    },
    // Batch create nodes
    batch(specs: NodeSpec[]): NodeBuilder[] {
        return specs.map(spec => NodeFactory.fromSpec(spec));
    },
};

// Edge factory - quick creation of common edge types
export const EdgeFactory = {
    simple(source: string, target: string): EdgeSpec {
        return { id: `e-${source}-${target}`, source, target };
    },
    directional(source: string, target: string, label?: string): EdgeSpec {
        return { id: `e-${source}-${target}`, source, target, data: { arrowhead: true, label } };
    },
    dashed(source: string, target: string): EdgeSpec {
        return { id: `e-${source}-${target}`, source, target, data: { dashed: true } };
    },
    curved(source: string, target: string): EdgeSpec {
        return { id: `e-${source}-${target}`, source, target, type: 'CurvedEdge' };
    },
    bidirectional(source: string, target: string): EdgeSpec[] {
        return [
            { id: `e-${source}-${target}`, source, target },
            { id: `e-${target}-${source}`, source: target, target: source },
        ];
    },
    // Create edges from node connections
    fromConnections(connections: Array<{ source: string; target: string }>): EdgeSpec[] {
        return connections.map((c) => EdgeFactory.simple(c.source, c.target));
    },
};

// Layout application helpers
export const Layout = {
    async apply(sg: SpaceGraph, layoutName: string, options?: Record<string, unknown>): Promise<void> {
        const plugin = sg.pluginManager.getPlugin(layoutName);
        if (!plugin) throw new Error(`Layout "${layoutName}" not found`);
        if ('applyLayout' in plugin) await (plugin as any).applyLayout(options);
    },
    force(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'ForceLayout', options);
    },
    circular(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'CircularLayout', options);
    },
    grid(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'GridLayout', options);
    },
    hierarchy(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'HierarchicalLayout', options);
    },
    radial(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'RadialLayout', options);
    },
    tree(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'TreeLayout', options);
    },
    spectral(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'SpectralLayout', options);
    },
    cluster(sg: SpaceGraph, options?: Record<string, unknown>): Promise<void> {
        return Layout.apply(sg, 'ClusterLayout', options);
    },
};

// Extended Node Factory with more types
export const NodeFactoryExtended = {
    chart(id: string, chartType: 'bar' | 'line' | 'pie' = 'bar'): NodeBuilder {
        return new NodeBuilder(id, 'ChartNode').data({ chartType, width: 300, height: 200 });
    },
    markdown(id: string, content = ''): NodeBuilder {
        return new NodeBuilder(id, 'MarkdownNode').data({ content, width: 250, height: 150 });
    },
    code(id: string, language = 'javascript'): NodeBuilder {
        return new NodeBuilder(id, 'CodeEditorNode').data({ language, width: 300, height: 200 });
    },
    math(id: string, formula = ''): NodeBuilder {
        return new NodeBuilder(id, 'MathNode').data({ formula, width: 200, height: 80 });
    },
    audio(id: string, url?: string): NodeBuilder {
        return new NodeBuilder(id, 'AudioNode').data({ url, width: 200, height: 50 });
    },
    globe(id: string): NodeBuilder {
        return new NodeBuilder(id, 'GlobeNode').data({ width: 300, height: 300 });
    },
    scene(id: string): NodeBuilder {
        return new NodeBuilder(id, 'SceneNode').data({ width: 400, height: 300 });
    },
    iFrame(id: string, src = ''): NodeBuilder {
        return new NodeBuilder(id, 'IFrameNode').data({ src, width: 300, height: 200 });
    },
    panel(id: string, title?: string): NodeBuilder {
        return new NodeBuilder(id, 'PanelNode').data({ title, width: 250, height: 200 });
    },
    tabContainer(id: string): NodeBuilder {
        return new NodeBuilder(id, 'TabContainerNode').data({ width: 300, height: 250 });
    },
    port(id: string, direction: 'input' | 'output' = 'input'): NodeBuilder {
        return new NodeBuilder(id, 'PortNode').data({ direction, width: 30, height: 30 });
    },
    progressBar(id: string, value = 50): NodeBuilder {
        return new NodeBuilder(id, 'ProgressBarNode').data({ value, width: 200, height: 20 });
    },
    meter(id: string, value = 50, min = 0, max = 100): NodeBuilder {
        return new NodeBuilder(id, 'MeterNode').data({ value, min, max, width: 200, height: 30 });
    },
    colorPicker(id: string, value = '#ff0000'): NodeBuilder {
        return new NodeBuilder(id, 'ColorPickerNode').data({ value, width: 150, height: 40 });
    },
    dropdown(id: string, options: string[] = []): NodeBuilder {
        return new NodeBuilder(id, 'DropdownNode').data({ options, width: 150, height: 40 });
    },
    scrollPanel(id: string): NodeBuilder {
        return new NodeBuilder(id, 'ScrollPanelNode').data({ width: 300, height: 200 });
    },
};

// Preset configurations
export const Presets = {
    minimal(id: string): NodeBuilder {
        return new NodeBuilder(id, 'ShapeNode').size(50);
    },
    card(id: string, title?: string): NodeBuilder {
        return new NodeBuilder(id, 'PanelNode').data({ title, width: 200, height: 150 }).style({ padding: 10 });
    },
    buttonPrimary(id: string, label = 'Click'): NodeBuilder {
        return new NodeBuilder(id, 'ButtonNode').data({ label, variant: 'primary' }).size(120, 40);
    },
    buttonSecondary(id: string, label = 'Cancel'): NodeBuilder {
        return new NodeBuilder(id, 'ButtonNode').data({ label, variant: 'secondary' }).size(120, 40);
    },
    input(id: string, placeholder = ''): NodeBuilder {
        return new NodeBuilder(id, 'HtmlNode').data({ html: `<input placeholder="${placeholder}">`, width: 200, height: 40 });
    },
    label(id: string, text = ''): NodeBuilder {
        return new NodeBuilder(id, 'NoteNode').data({ text, width: 100, height: 30 }).style({ fontSize: 14 });
    },
};

// Data utilities for node specs
export const DataUtils = {
    setDefault(node: NodeBuilder, key: string, value: unknown): NodeBuilder {
        return node.data({ [key]: value });
    },
    setDefaults(node: NodeBuilder, defaults: Record<string, unknown>): NodeBuilder {
        return node.data(defaults);
    },
    addClass(node: NodeBuilder, className: string): NodeBuilder {
        return node.data({ class: className });
    },
    addStyle(node: NodeBuilder, style: Record<string, string>): NodeBuilder {
        return node.data({ style });
    },
    setDisabled(node: NodeBuilder, disabled = true): NodeBuilder {
        return node.data({ disabled });
    },
    setHidden(node: NodeBuilder, hidden = true): NodeBuilder {
        return node.data({ visible: !hidden });
    },
    setDraggable(node: NodeBuilder, draggable = true): NodeBuilder {
        return node.data({ draggable });
    },
    setSelectable(node: NodeBuilder, selectable = true): NodeBuilder {
        return node.data({ selectable });
    },
};

// Batch operations
export const Batch = {
    createNodes(specs: Array<{ id: string; type?: string; position?: [number, number, number]; data?: Record<string, unknown> }>): NodeBuilder[] {
        return specs.map(spec => new NodeBuilder(spec.id, spec.type ?? 'ShapeNode').position(spec.position).data(spec.data));
    },
    createEdges(connections: Array<{ source: string; target: string }>): EdgeSpec[] {
        return connections.map((c, i) => ({ id: `e-${i}`, source: c.source, target: c.target }));
    },
    createGrid(rows: number, cols: number, spacing = 100, startX = 0, startY = 0): Array<{ id: string; position: [number, number, number] }> {
        const nodes: Array<{ id: string; position: [number, number, number] }> = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                nodes.push({ id: `node-${r}-${c}`, position: [startX + c * spacing, startY + r * spacing, 0] });
            }
        }
        return nodes;
    },
    createRing(count: number, radius = 200, centerX = 0, centerY = 0): Array<{ id: string; position: [number, number, number] }> {
        const nodes: Array<{ id: string; position: [number, number, number] }> = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            nodes.push({
                id: `ring-${i}`,
                position: [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 0],
            });
        }
        return nodes;
    },
};