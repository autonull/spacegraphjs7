import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export interface MeterThreshold {
    value: number;
    color: string;
}

export class MeterNode extends HtmlNode {
    private valueDisplay: HTMLElement | null = null;
    private sparklineCanvas: HTMLCanvasElement | null = null;
    private sparklineCtx: CanvasRenderingContext2D | null = null;
    private value = 0;
    private thresholds: MeterThreshold[] = [];
    private history: number[] = [];
    private maxHistory = 50;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._setupMeter();
    }

    private _setupMeter(): void {
        const data = this.data as SpaceGraphNodeData;
        this.value = (data?.value as number) ?? 0;
        this.thresholds = (data?.thresholds as MeterThreshold[]) ?? [
            { value: 80, color: '#ff6b6b' },
            { value: 60, color: '#ffeaa7' },
            { value: 0, color: '#4ecdc4' },
        ];

        const wrapper = this.domElement;
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '8px';
        wrapper.style.padding = '12px';

        this.valueDisplay = DOMUtils.createElement('div');
        Object.assign(this.valueDisplay.style, {
            fontSize: '28px',
            fontWeight: 'bold',
            color: this._getThresholdColor(this.value),
            fontFamily: 'monospace',
        });
        this.valueDisplay.textContent = String(this.value);

        wrapper.appendChild(this.valueDisplay);
    }

    private _getThresholdColor(value: number): string {
        for (const t of this.thresholds) {
            if (value >= t.value) return t.color;
        }
        return '#4ecdc4';
    }

    setValue(value: number): void {
        this.value = value;
        if (this.valueDisplay) {
            this.valueDisplay.textContent = String(value);
            this.valueDisplay.style.color = this._getThresholdColor(value);
        }

        this.history.push(value);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this._drawSparkline();

        this.data = { ...this.data, value };
        this.sg?.events.emit('node:dataChanged', { node: this, property: 'value', value });
    }

    private _drawSparkline(): void {
        if (this.history.length < 2 || !this.sparklineCanvas) return;
        const ctx = this.sparklineCtx;
        if (!ctx) return;

        const w = this.sparklineCanvas.width;
        const h = this.sparklineCanvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.beginPath();
        const max = Math.max(...this.history, 100);
        for (let i = 0; i < this.history.length; i++) {
            const x = (i / (this.history.length - 1)) * w;
            const y = h - (this.history[i] / max) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    getValue(): number {
        return this.value;
    }
}