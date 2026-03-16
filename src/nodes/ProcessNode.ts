import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class ProcessNode extends DOMNode {
    private cpuBar: HTMLDivElement;
    private memBar: HTMLDivElement;
    private cpuText: HTMLSpanElement;
    private memText: HTMLSpanElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 200;
        const h = spec.data?.height ?? 120;

        const div = document.createElement('div');
        div.className = 'sg-process-node';

        super(sg, spec, div, w, h, { opacity: 0.1 });

        const pid = spec.data?.pid ?? '???';
        const name = spec.label ?? spec.data?.name ?? 'unknown_process';
        const cpu = spec.data?.cpu ?? 0;
        const mem = spec.data?.memory ?? 0;

        this.setupContainerStyles(w, h, 'dark', {
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '10px',
            fontFamily: 'monospace',
            justifyContent: 'space-between',
        });

        // Header (PID + Name)
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.borderBottom = '1px solid #334155';
        header.style.paddingBottom = '4px';
        header.style.marginBottom = '8px';

        const titleSpan = document.createElement('strong');
        titleSpan.textContent = name;

        const pidSpan = document.createElement('span');
        pidSpan.textContent = `PID: ${pid}`;
        pidSpan.style.color = '#94a3b8';

        header.appendChild(titleSpan);
        header.appendChild(pidSpan);
        div.appendChild(header);

        // Stats Container
        const stats = document.createElement('div');
        stats.style.display = 'flex';
        stats.style.flexDirection = 'column';
        stats.style.gap = '8px';

        // CPU row
        const cpuRow = this.createStatRow('CPU');
        this.cpuBar = cpuRow.bar;
        this.cpuText = cpuRow.text;
        stats.appendChild(cpuRow.container);

        // Memory row
        const memRow = this.createStatRow('MEM');
        this.memBar = memRow.bar;
        this.memText = memRow.text;
        stats.appendChild(memRow.container);

        div.appendChild(stats);

        this.updateBars(cpu, mem);
    }

    private createStatRow(label: string) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '30px';
        labelSpan.style.fontSize = '12px';

        const barTrack = document.createElement('div');
        Object.assign(barTrack.style, {
            flex: '1',
            height: '8px',
            backgroundColor: '#1e293b',
            borderRadius: '4px',
            overflow: 'hidden'
        });

        const bar = document.createElement('div');
        Object.assign(bar.style, {
            height: '100%',
            width: '0%',
            backgroundColor: label === 'CPU' ? '#3b82f6' : '#10b981',
            transition: 'width 0.2s ease-out, background-color 0.2s ease-out'
        });
        barTrack.appendChild(bar);

        const text = document.createElement('span');
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

        // Color coding for CPU usage
        if (cpu > 80) this.cpuBar.style.backgroundColor = '#ef4444'; // red
        else if (cpu > 50) this.cpuBar.style.backgroundColor = '#f59e0b'; // yellow
        else this.cpuBar.style.backgroundColor = '#3b82f6'; // blue

        this.memBar.style.width = `${Math.min(100, mem)}%`;
        this.memText.textContent = `${mem.toFixed(1)}%`;

        if (mem > 80) this.memBar.style.backgroundColor = '#ef4444'; // red
        else if (mem > 50) this.memBar.style.backgroundColor = '#f59e0b'; // yellow
        else this.memBar.style.backgroundColor = '#10b981'; // green

        // Dynamically scale node based on memory usage as per FZUI specs
        const scale = 1.0 + (mem / 100) * 0.5; // Max 1.5x scale
        this.object.scale.set(scale, scale, scale);
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);
        if (updates.data) {
            const cpu = updates.data.cpu !== undefined ? updates.data.cpu : parseFloat(this.cpuText.textContent || '0');
            const mem = updates.data.memory !== undefined ? updates.data.memory : parseFloat(this.memText.textContent || '0');
            this.updateBars(cpu, mem);
        }
    }
}
