import { NODE_CHROME_COLORS } from './palette';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { clamp } from '../utils/math';
import { HtmlNode } from './HtmlNode';

const KEYFRAMES_ID = 'sg-progress-indeterminate';

const ensureIndeterminateKeyframes = (): void => {
    if (document.getElementById(KEYFRAMES_ID)) return;
    const style = document.createElement('style');
    style.id = KEYFRAMES_ID;
    style.textContent = `
        @keyframes indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
        }
    `;
    document.head.appendChild(style);
};

export class ProgressBarNode extends HtmlNode {
    static readonly typeName: string = 'ProgressBarNode';
    private progressBar: HTMLElement | null = null;
    private progressFill: HTMLElement | null = null;
    private progressValue = 0;
    private indeterminate = false;
    private indeterminateAnim: number | null = null;

    constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
        super(sg, spec);
        this._setupProgressBar();
    }

    setValue(value: number): void {
        if (this.indeterminate) {
            this._stopIndeterminate();
        }
        this._setProgress(value);
        this.setDataField('value', value);
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

    getValue(): number {
        return this.progressValue;
    }

    dispose(): void {
        this._stopIndeterminate();
        super.dispose();
    }

    private _setupProgressBar(): void {
        const data = this.data as SpaceGraphNodeData;
        this.progressValue = (data?.value as number) ?? 0;
        this.indeterminate = (data?.indeterminate as boolean) ?? false;

        const wrapper = this.domElement;
        wrapper.style.padding = '12px';

        this.progressBar = DOMUtils.createElement('div');
        Object.assign(this.progressBar.style, {
            width: '100%',
            height: '8px',
            backgroundColor: NODE_CHROME_COLORS.deepSurface,
            borderRadius: '4px',
            overflow: 'hidden',
        });

        this.progressFill = DOMUtils.createElement('div');
        Object.assign(this.progressFill.style, {
            height: '100%',
            backgroundColor: NODE_CHROME_COLORS.accent,
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
        this.progressValue = clamp(value, 0, 100);
        if (this.progressFill) {
            this.progressFill.style.width = `${this.progressValue}%`;
        }
    }

    private _startIndeterminate(): void {
        if (!this.progressFill || this.indeterminateAnim !== null) return;
        this.progressFill.style.width = '30%';
        this.progressFill.style.animation = 'indeterminate 1.5s infinite ease-in-out';

        ensureIndeterminateKeyframes();
        this.indeterminateAnim = window.setInterval(() => {
            this.progressFill!.style.transform = 'translateX(0)';
        }, 1500);
    }

    private _stopIndeterminate(): void {
        if (this.indeterminateAnim !== null) {
            clearInterval(this.indeterminateAnim);
            this.indeterminateAnim = null;
        }
    }
}
