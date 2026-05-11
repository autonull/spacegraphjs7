import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class ColorPickerNode extends HtmlNode {
    private colorInput: HTMLInputElement | null = null;
    private colorPreview: HTMLElement | null = null;
    private hexInput: HTMLInputElement | null = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._setupColorPicker();
    }

    private _setupColorPicker(): void {
        const data = this.data as SpaceGraphNodeData;
        const color = (data?.color as string) ?? '#4ecdc4';

        const wrapper = this.domElement;
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '8px';
        wrapper.style.padding = '12px';

        this.colorPreview = DOMUtils.createElement('div');
        Object.assign(this.colorPreview.style, {
            width: '100%',
            height: '60px',
            backgroundColor: color,
            borderRadius: '4px',
            border: '1px solid #444',
        });

        this.colorInput = DOMUtils.createElement('input') as HTMLInputElement;
        this.colorInput.type = 'color';
        this.colorInput.value = color;
        this.colorInput.style.width = '100%';
        this.colorInput.addEventListener('input', () => {
            this._onColorChange(this.colorInput!.value);
        });

        const label = DOMUtils.createElement('div');
        label.textContent = 'Color';
        label.style.color = '#fff';
        label.style.fontSize = '12px';

        this.hexInput = DOMUtils.createElement('input') as HTMLInputElement;
        this.hexInput.type = 'text';
        this.hexInput.value = color.toUpperCase();
        Object.assign(this.hexInput.style, {
            width: '100%',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '6px',
            fontFamily: 'monospace',
        });
        this.hexInput.addEventListener('change', () => {
            this._onHexChange(this.hexInput!.value);
        });

        wrapper.appendChild(this.colorPreview);
        wrapper.appendChild(label);
        wrapper.appendChild(this.colorInput);
        wrapper.appendChild(this.hexInput);
    }

    private _onColorChange(color: string): void {
        if (this.colorPreview) this.colorPreview.style.backgroundColor = color;
        if (this.hexInput) this.hexInput.value = color.toUpperCase();
        this.data = { ...this.data, color };
        this.sg?.events.emit('node:dataChanged', { node: this, property: 'color', value: color });
    }

    private _onHexChange(hex: string): void {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            this._onColorChange(hex);
            if (this.colorInput) this.colorInput.value = hex;
        }
    }

    getColor(): string {
        return this.colorInput?.value ?? '#4ecdc4';
    }

    setColor(color: string): void {
        this._onColorChange(color);
    }
}