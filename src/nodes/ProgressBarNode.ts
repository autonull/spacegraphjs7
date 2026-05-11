import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class ProgressBarNode extends HtmlNode {
    private progressBar: HTMLElement | null = null;
    private progressFill: HTMLElement | null = null;
    private progressValue = 0;
    private indeterminate = false;
    private indeterminateAnim: number | null = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._setupProgressBar();
    }

    private _setupProgressBar(): void {
        const data = this.data as SpaceGraphNodeData;
        this.progressValue = (data?.value as number) ?? 0;
        this.indeterminate = data?.indeterminate as boolean ?? false;

        const wrapper = this.domElement;
        wrapper.style.padding = '12px';

        this.progressBar = DOMUtils.createElement('div');
        Object.assign(this.progressBar.style, {
            width: '100%',
            height: '8px',
            backgroundColor: '#1a1a2e',
            borderRadius: '4px',
            overflow: 'hidden',
        });

        this.progressFill = DOMUtils.createElement('div');
        Object.assign(this.progressFill.style, {
            height: '100%',
            backgroundColor: '#4ecdc4',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
        });

        this.progressBar.appendChild(this.progressFill);
        wrapper.appendChild(this.progressBar);

        if (this.indeterminate) {
            this._startIndeterminate();
        } else {
            this._setProgress(this.progressValue);
        }
    }

    private _setProgress(value: number): void {
        this.progressValue = Math.max(0, Math.min(100, value));
        if (this.progressFill) {
            this.progressFill.style.width = `${this.progressValue}%`;
        }
    }

    private _startIndeterminate(): void {
        if (!this.progressFill) return;
        this.progressFill.style.width = '30%';
        this.progressFill.style.animation = 'indeterminate 1.5s infinite ease-in-out';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes indeterminate {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }
        `;
        document.head.appendChild(style);
        this.indeterminateAnim = window.setInterval(() => {
            this.progressFill!.style.transform = 'translateX(0)';
        }, 1500);
    }

    setValue(value: number): void {
        if (this.indeterminate) {
            this._stopIndeterminate();
        }
        this._setProgress(value);
        this.data = { ...this.data, value };
        this.sg?.events.emit('node:dataChanged', { node: this, property: 'value', value });
    }

    setIndeterminate(indeterminate: boolean): void {
        this.indeterminate = indeterminate;
        if (indeterminate) {
            this._startIndeterminate();
        } else {
            this._stopIndeterminate();
            this._setProgress(this.progressValue);
        }
    }

    private _stopIndeterminate(): void {
        if (this.indeterminateAnim !== null) {
            clearInterval(this.indeterminateAnim);
            this.indeterminateAnim = null;
        }
    }

    getValue(): number {
        return this.progressValue;
    }

    dispose(): void {
        this._stopIndeterminate();
        super.dispose();
    }
}