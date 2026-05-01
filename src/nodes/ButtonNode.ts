import { WidgetNode, type WidgetNodeData } from './WidgetNode';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface ButtonNodeData extends WidgetNodeData {
    label?: string;
    color?: number;
    hoverColor?: number;
    pressedColor?: number;
    onClick?: () => void;
}

export class ButtonNode extends WidgetNode {
    private _label = '';
    private _color = 0x4488ff;
    private _hoverColor = 0x66aaff;
    private _pressedColor = 0x2266dd;
    private _onClick?: () => void;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const data = spec.data as ButtonNodeData;
        super(sg, spec, data);

        this._label = data?.label ?? '';
        this._color = data?.color ?? this._color;
        this._hoverColor = data?.hoverColor ?? this._hoverColor;
        this._pressedColor = data?.pressedColor ?? this._pressedColor;
        this._onClick = data?.onClick;
    }

    protected getBaseColor(_data: WidgetNodeData | undefined): number {
        return this._color;
    }

    protected getHoverColor(): number {
        return this._hoverColor;
    }

    protected getPressedColor(): number {
        return this._pressedColor;
    }

    protected createLabelContent(ctx: CanvasRenderingContext2D, text: string): void {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this._width, this._height);
    }

    protected getLabelText(): string {
        return this._label;
    }

    onPointerUp(): void {
        if (this._isPressed) {
            this.onPointerUpCore();

            if (this._onClick) {
                this._onClick();
            }
            this.sg?.events.emit('node:click', { node: this });
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const data = updates.data as ButtonNodeData;
            if (data.color !== undefined) {
                this._color = data.color;
                this.baseMaterial.color.setHex(this._color);
            }
            if (data.hoverColor !== undefined) {
                this._hoverColor = data.hoverColor;
            }
            if (data.pressedColor !== undefined) {
                this._pressedColor = data.pressedColor;
            }
            if (data.label !== undefined) {
                this._label = data.label;
                this.updateLabel();
            }
            if (data.onClick !== undefined) {
                this._onClick = data.onClick;
            }
        }
        return this;
    }

    dispose(): void {
        super.dispose();
    }
}