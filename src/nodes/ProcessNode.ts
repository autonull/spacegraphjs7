import { NODE_CHROME_COLORS } from './palette';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

import { BaseContentNode } from './BaseContentNode';

export class ProcessNode extends BaseContentNode {
    static readonly typeName: string = 'ProcessNode';
    private cpuBar: HTMLDivElement;
    private memBar: HTMLDivElement;
    private cpuText: HTMLSpanElement;
    private memText: HTMLSpanElement;

    constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
        super(sg, spec, {
            defaultWidth: 200,
            defaultHeight: 120,
            materialParams: { opacity: 0.1 },
            className: 'sg-process-node',
            customStyles: {
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                padding: '10px',
                fontFamily: 'monospace',
                justifyContent: 'space-between',
            },
        });

        const pid = (spec.data?.pid as string) ?? '???';
        const name = spec.label ?? (spec.data?.name as string) ?? 'unknown_process';
        const cpu = (spec.data?.cpu as number) ?? 0;
        const mem = (spec.data?.memory as number) ?? 0;

        const header = DOMUtils.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.borderBottom = '1px solid #334155';
        header.style.paddingBottom = '4px';
        header.style.marginBottom = '8px';

        const titleSpan = DOMUtils.createElement('strong');
        titleSpan.textContent = name;

        const pidSpan = DOMUtils.createElement('span');
        pidSpan.textContent = `PID: ${pid}`;
        pidSpan.style.color = NODE_CHROME_COLORS.mutedText;

        header.appendChild(titleSpan);
        header.appendChild(pidSpan);
        this.domElement.appendChild(header);

        const stats = DOMUtils.createElement('div');
        stats.style.display = 'flex';
        stats.style.flexDirection = 'column';
        stats.style.gap = '8px';

        const cpuRow = this.createStatRow('CPU');
        this.cpuBar = cpuRow.bar;
        this.cpuText = cpuRow.text;
        stats.appendChild(cpuRow.container);

        const memRow = this.createStatRow('MEM');
        this.memBar = memRow.bar;
        this.memText = memRow.text;
        stats.appendChild(memRow.container);

        this.domElement.appendChild(stats);

        this.updateBars(cpu, mem);
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const cpu =
                (updates.data.cpu as number) ?? Number.parseFloat(this.cpuText.textContent ?? '0');
            const mem =
                (updates.data.memory as number) ??
                Number.parseFloat(this.memText.textContent ?? '0');
            this.updateBars(cpu, mem);
        }
        return this;
    }

    private createStatRow(label: string) {
        const container = DOMUtils.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

        const labelSpan = DOMUtils.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '30px';
        labelSpan.style.fontSize = '12px';

        const barTrack = DOMUtils.createElement('div');
        Object.assign(barTrack.style, {
            flex: '1',
            height: '8px',
            backgroundColor: '#1e293b',
            borderRadius: '4px',
            overflow: 'hidden',
        });

        const bar = DOMUtils.createElement('div');
        Object.assign(bar.style, {
            height: '100%',
            width: '0%',
            backgroundColor: label === 'CPU' ? '#3b82f6' : '#10b981',
            transition: 'width 0.2s ease-out, background-color 0.2s ease-out',
        });
        barTrack.appendChild(bar);

        const text = DOMUtils.createElement('span');
        text.textContent = '0%';
        text.style.width = '35px';
        text.style.textAlign = 'right';
        text.style.fontSize = '12px';

        container.appendChild(labelSpan);
        container.appendChild(barTrack);
        container.appendChild(text);

        return { container, bar, text };
    }

    private updateBars(cpu: number, mem: number) {
        this.cpuBar.style.width = `${Math.min(100, cpu)}%`;
        this.cpuText.textContent = `${cpu.toFixed(1)}%`;

        this.cpuBar.style.backgroundColor = barColor(cpu);

        this.memBar.style.width = `${Math.min(100, mem)}%`;
        this.memText.textContent = `${mem.toFixed(1)}%`;
        this.memBar.style.backgroundColor = barColor(mem, '#10b981');

        const scale = 1.0 + (mem / 100) * 0.5;
        this.object.scale.set(scale, scale, scale);
    }
}

const barColor = (value: number, low = '#3b82f6'): string =>
    value > 80 ? '#ef4444' : value > 50 ? '#f59e0b' : low;
