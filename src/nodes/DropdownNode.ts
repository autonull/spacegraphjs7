import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export interface DropdownOption {
    id: string;
    label: string;
    value?: unknown;
}

export class DropdownNode extends HtmlNode {
    private selectElement: HTMLSelectElement | null = null;
    private options: DropdownOption[] = [];
    private selectedValue: string = '';

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._setupDropdown();
    }

    private _setupDropdown(): void {
        const data = this.data as SpaceGraphNodeData;
        this.options = (data?.options as DropdownOption[]) ?? [
            { id: 'opt1', label: 'Option 1' },
            { id: 'opt2', label: 'Option 2' },
        ];
        this.selectedValue = (data?.value as string) ?? this.options[0]?.id ?? '';

        const wrapper = this.domElement;
        wrapper.style.padding = '8px';

        this.selectElement = DOMUtils.createElement('select') as HTMLSelectElement;
        Object.assign(this.selectElement.style, {
            width: '100%',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '14px',
            cursor: 'pointer',
        });

        for (const opt of this.options) {
            const option = DOMUtils.createElement('option') as HTMLOptionElement;
            option.value = opt.id;
            option.textContent = opt.label;
            if (opt.value !== undefined) option.value = String(opt.value);
            this.selectElement.appendChild(option);
        }

        this.selectElement.value = this.selectedValue;
        this.selectElement.addEventListener('change', () => {
            this._onSelectionChange(this.selectElement!.value);
        });

        wrapper.appendChild(this.selectElement);
    }

    private _onSelectionChange(value: string): void {
        this.selectedValue = value;
        const option = this.options.find((o) => o.id === value);
        this.data = { ...this.data, value };
        this.sg?.events.emit('node:dataChanged', {
            node: this,
            property: 'value',
            value,
            label: option?.label,
        });
    }

    getValue(): string {
        return this.selectedValue;
    }

    setValue(value: string): void {
        if (this.selectElement && this.options.some((o) => o.id === value)) {
            this.selectElement.value = value;
            this._onSelectionChange(value);
        }
    }

    setOptions(options: DropdownOption[]): void {
        this.options = options;
        if (!this.selectElement) return;
        this.selectElement.innerHTML = '';
        for (const opt of options) {
            const option = DOMUtils.createElement('option') as HTMLOptionElement;
            option.value = opt.id;
            option.textContent = opt.label;
            if (opt.value !== undefined) option.value = String(opt.value);
            this.selectElement.appendChild(option);
        }
    }
}