// builder/node.ts - Unified node builder for all node types
import type { NodeSpec } from '../types';
import { BaseBuilder } from './base';

export class NodeBuilder extends BaseBuilder<NodeSpec> {
    constructor(id: string, type = 'ShapeNode') {
        super({ id, type });
    }

    label(label: string): this { this.spec.label = label; return this; }
    text(label: string): this { return this.label(label); }
    title(label: string): this { return this.label(label); }
    position(x: number, y: number, z = 0): this {
        this.spec.position = [x, y, z];
        return this;
    }
    rotation(x: number, y: number, z = 0): this {
        this.spec.rotation = [x, y, z];
        return this;
    }
    scale(x: number, y: number, z = 1): this {
        this.spec.scale = [x, y, z];
        return this;
    }

    size(size: number): this { this.mergeData({ size }); return this; }
    width(w: number): this { this.mergeData({ width: w }); return this; }
    height(h: number): this { this.mergeData({ height: h }); return this; }
    depth(d: number): this { this.mergeData({ depth: d }); return this; }
    dimensions(w: number, h: number, d?: number): this { this.mergeData({ width: w, height: h, depth: d }); return this; }
    w(w: number): this { return this.width(w); }
    h(h: number): this { return this.height(h); }
    d(d: number): this { return this.depth(d); }

    color(color: number | string): this { this.mergeData({ color }); return this; }
    fill(color: number | string): this { return this.color(color); }
    bg(color: number | string): this { return this.color(color); }
    opacity(opacity: number): this { this.mergeData({ opacity }); return this; }
    alpha(opacity: number): this { return this.opacity(opacity); }
    transparent(transparent = true): this { this.mergeData({ transparent }); return this; }

    shape(s: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring'): this {
        this.mergeData({ shape: s });
        return this;
    }
    box(): this { return this.shape('box'); }
    sphere(): this { return this.shape('sphere'); }
    circle(): this { return this.shape('circle'); }
    plane(): this { return this.shape('plane'); }
    cone(): this { return this.shape('cone'); }
    cylinder(): this { return this.shape('cylinder'); }
    torus(): this { return this.shape('torus'); }

    type(type: string): this { this.spec.type = type; return this; }
    params(params: Record<string, unknown>): this { this.spec.parameters = params; return this; }

    visible(v = true): this { this.mergeData({ visible: v }); return this; }
    hidden(): this { this.mergeData({ visible: false }); return this; }
    show(): this { return this.visible(true); }
    hide(): this { return this.visible(false); }
    pinned(pinned: boolean): this { this.mergeData({ pinned }); return this; }
    pin(): this { return this.pinned(true); }
    unpin(): this { return this.pinned(false); }

    at(x: number, y: number, z?: number): this { return this.position(x, y, z ?? 0); }
    pos(x: number, y: number, z?: number): this { return this.position(x, y, z ?? 0); }
    xy(x: number, y: number): this { return this.position(x, y, 0); }
    xyz(x: number, y: number, z: number): this { return this.position(x, y, z); }
    atOrigin(): this { return this.position(0, 0, 0); }

    rotate(x: number, y: number, z?: number): this { return this.rotation(x, y, z ?? 0); }
    rot(x: number, y: number, z?: number): this { return this.rotation(x, y, z ?? 0); }
    rotateZ(degrees: number): this { return this.rotation(0, 0, degrees * Math.PI / 180); }

    scaleTo(x: number, y?: number, z?: number): this { return this.scale(x, y ?? x, z ?? x); }
    scaleToUniform(s: number): this { return this.scale(s, s, s); }

    center(): this { return this.position(0, 0, 0); }
    origin(): this { return this.position(0, 0, 0); }
    zero(): this { return this.position(0, 0, 0); }

    className(cls: string): this { this.mergeData({ className: cls }); return this; }
    cls(cls: string): this { return this.className(cls); }
    style(css: Record<string, string>): this { this.mergeData({ style: css }); return this; }

    onClick(fn: () => void): this { this.mergeData({ onClick: fn }); return this; }
    onHover(fn: (hovered: boolean) => void): this { this.mergeData({ onHover: fn }); return this; }
    onDrag(fn: (dx: number, dy: number) => void): this { this.mergeData({ onDrag: fn }); return this; }
    onChange(fn: (value: unknown) => void): this { this.mergeData({ onChange: fn }); return this; }

    set(key: string, value: unknown): this { this.mergeData({ [key]: value }); return this; }
    gets(key: string): unknown { return (this.spec as any).data?.[key]; }
    has(key: string): boolean { return key in ((this.spec as any).data ?? {}); }

    draggable(draggable = true): this { this.mergeData({ draggable }); return this; }
    selectable(selectable = true): this { this.mergeData({ selectable }); return this; }
    focusable(focusable = true): this { this.mergeData({ focusable }); return this; }

    pipe<T>(fn: (builder: this) => T): T { return fn(this); }
}

export class WidgetBuilder extends NodeBuilder {
    constructor(id: string, type = 'ShapeNode') {
        super(id, type);
    }

    onToggle(fn: (value: boolean) => void): this { this.mergeData({ onToggle: fn }); return this; }
    onChange(fn: (value: number) => void): this { this.mergeData({ onChange: fn }); return this; }
    min(min: number): this { this.mergeData({ min }); return this; }
    max(max: number): this { this.mergeData({ max }); return this; }
    showValue(show = true): this { this.mergeData({ showValue: show }); return this; }
    disabled(disabled = true): this { this.mergeData({ disabled }); return this; }
}