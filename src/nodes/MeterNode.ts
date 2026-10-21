import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { HtmlNode } from './HtmlNode';

export interface MeterThreshold {
  value: number;
  color: string;
}

export class MeterNode extends HtmlNode {
  static readonly typeName: string = 'MeterNode';
  private valueDisplay: HTMLElement | null = null;
  private value = 0;
  private thresholds: MeterThreshold[] = [];

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    super(sg, spec);
    this._setupMeter();
  }

  setValue(value: number): void {
    this.value = value;
    if (this.valueDisplay) {
      this.valueDisplay.textContent = String(value);
      this.valueDisplay.style.color = this._getThresholdColor(value);
    }

    this.data = { ...this.data, value };
    this.emitDataChanged('value', value);
  }

  getValue(): number {
    return this.value;
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
    Object.assign(wrapper.style, HtmlNode.CONTROL_WRAPPER_STYLE);

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
}
