// builder/node.ts - Unified node builder for all node types
import type { NodeSpec } from '../types';
import { BaseBuilder } from './base';

export class NodeBuilder extends BaseBuilder<NodeSpec> {
    constructor(id: string, type = 'ShapeNode') {
        super({ id, type });
    }

    /** Set the node label (alias: text, title) */
    label(label: string): this {
        this.spec.label = label;
        return this;
    }

    /** Set position from array [x,y,z] or individual coordinates */
    position(x: number | [number, number, number] | undefined, y?: number, z = 0): this {
        if (Array.isArray(x)) {
            this.spec.position = x;
        } else if (typeof x === 'number' && typeof y === 'number') {
            this.spec.position = [x, y, z];
        }
        return this;
    }

    /** Set rotation in radians */
    rotation(x: number, y: number, z = 0): this {
        this.spec.rotation = [x, y, z];
        return this;
    }

    /** Set scale factors */
    scale(x: number, y: number, z = 1): this {
        this.spec.scale = [x, y, z];
        return this;
    }

    /** Set size (uniform) or width+height */
    size(size: number, height?: number): this {
        if (typeof height === 'number') {
            this.mergeData({ width: size, height });
        } else {
            this.mergeData({ size });
        }
        return this;
    }

    /** Set width */
    width(w: number): this {
        this.mergeData({ width: w });
        return this;
    }

    /** Set height */
    height(h: number): this {
        this.mergeData({ height: h });
        return this;
    }

    /** Set depth */
    depth(d: number): this {
        this.mergeData({ depth: d });
        return this;
    }

    /** Set all dimensions at once */
    dimensions(w: number, h: number, d?: number): this {
        this.mergeData({ width: w, height: h, depth: d });
        return this;
    }

    /** Set color (alias: fill, bg) */
    color(color: number | string): this {
        this.mergeData({ color });
        return this;
    }

    /** Set opacity (alias: alpha) */
    opacity(opacity: number): this {
        this.mergeData({ opacity });
        return this;
    }

    /** Set transparent flag */
    transparent(transparent = true): this {
        this.mergeData({ transparent });
        return this;
    }

    /** Set shape type */
    shape(s: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring'): this {
        this.mergeData({ shape: s });
        return this;
    }

    /** Quick shape presets */
    box(): this {
        return this.shape('box');
    }

    sphere(): this {
        return this.shape('sphere');
    }

    circle(): this {
        return this.shape('circle');
    }

    plane(): this {
        return this.shape('plane');
    }

    cone(): this {
        return this.shape('cone');
    }

    cylinder(): this {
        return this.shape('cylinder');
    }

    torus(): this {
        return this.shape('torus');
    }

    /** Set node type */
    type(type: string): this {
        this.spec.type = type;
        return this;
    }

    /** Set custom parameters */
    params(params: Record<string, unknown>): this {
        this.spec.parameters = params;
        return this;
    }

    /** Set visibility (alias: show, hide) */
    visible(v = true): this {
        this.mergeData({ visible: v });
        return this;
    }

    /** Hide the node */
    hidden(): this {
        this.mergeData({ visible: false });
        return this;
    }

    /** Set pinned state (alias: pin, unpin) */
    pinned(pinned: boolean): this {
        this.mergeData({ pinned });
        return this;
    }

    /** Set position - shorthand (alias: pos, xy, xyz) */
    at(x: number, y: number, z?: number): this {
        return this.position(x, y, z ?? 0);
    }

    /** Set rotation - shorthand (alias: rot) */
    rotate(x: number, y: number, z?: number): this {
        return this.rotation(x, y, z ?? 0);
    }

    /** Rotate around Z axis in degrees */
    rotateZ(degrees: number): this {
        return this.rotation(0, 0, (degrees * Math.PI) / 180);
    }

    /** Set scale - shorthand */
    scaleTo(x: number, y?: number, z?: number): this {
        return this.scale(x, y ?? x, z ?? x);
    }

    /** Set uniform scale */
    scaleToUniform(s: number): this {
        return this.scale(s, s, s);
    }

    /** Center at origin (alias: origin, zero) */
    center(): this {
        return this.position(0, 0, 0);
    }

    /** Set CSS class name (alias: cls) */
    className(cls: string): this {
        this.mergeData({ className: cls });
        return this;
    }

    /** Set inline styles */
    style(css: Record<string, string>): this {
        this.mergeData({ style: css });
        return this;
    }

    /** Set click handler */
    onClick(fn: () => void): this {
        this.mergeData({ onClick: fn });
        return this;
    }

    /** Set hover handler */
    onHover(fn: (hovered: boolean) => void): this {
        this.mergeData({ onHover: fn });
        return this;
    }

    /** Set drag handler */
    onDrag(fn: (dx: number, dy: number) => void): this {
        this.mergeData({ onDrag: fn });
        return this;
    }

    /** Set change handler */
    onChange(fn: (value: unknown) => void): this {
        this.mergeData({ onChange: fn });
        return this;
    }

    /** Set arbitrary data key */
    set(key: string, value: unknown): this {
        this.mergeData({ [key]: value });
        return this;
    }

    /** Get data value */
    gets(key: string): unknown {
        return (this.spec as any).data?.[key];
    }

    /** Check if data key exists */
    has(key: string): boolean {
        return key in ((this.spec as any).data ?? {});
    }

    /** Set draggable flag */
    draggable(draggable = true): this {
        this.mergeData({ draggable });
        return this;
    }

    /** Set selectable flag */
    selectable(selectable = true): this {
        this.mergeData({ selectable });
        return this;
    }

    /** Set focusable flag */
    focusable(focusable = true): this {
        this.mergeData({ focusable });
        return this;
    }

    /** Pipe builder through a function */
    pipe<T>(fn: (builder: this) => T): T {
        return fn(this);
    }
}

export class WidgetBuilder extends NodeBuilder {
    constructor(id: string, type = 'ShapeNode') {
        super(id, type);
    }

    /** Set toggle handler */
    onToggle(fn: (value: boolean) => void): this {
        this.mergeData({ onToggle: fn });
        return this;
    }

    /** Set change handler for numeric values */
    onChange(fn: (value: number) => void): this {
        this.mergeData({ onChange: fn });
        return this;
    }

    /** Set minimum value */
    min(min: number): this {
        this.mergeData({ min });
        return this;
    }

    /** Set maximum value */
    max(max: number): this {
        this.mergeData({ max });
        return this;
    }

    /** Show value display */
    showValue(show = true): this {
        this.mergeData({ showValue: show });
        return this;
    }

    /** Set disabled state */
    disabled(disabled = true): this {
        this.mergeData({ disabled });
        return this;
    }

    /** Set value */
    value<V = unknown>(value: V): this {
        this.mergeData({ value });
        return this;
    }

    /** Set label alignment */
    labelAlign(align: 'left' | 'center' | 'right'): this {
        this.mergeData({ labelAlign: align });
        return this;
    }

    /** Set placeholder text */
    placeholder(text: string): this {
        this.mergeData({ placeholder: text });
        return this;
    }

    /** Set step increment */
    step(step: number): this {
        this.mergeData({ step });
        return this;
    }
}
