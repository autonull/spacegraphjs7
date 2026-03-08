import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class ExecutionLogPanel extends HtmlNode {
    private logsContainer: HTMLDivElement;

    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.domElement.className = 'spacegraph-execution-log-panel';
        Object.assign(this.domElement.style, {
            width: '400px', height: '300px', backgroundColor: 'rgba(20, 20, 20, 0.9)',
            border: '2px solid #00ff00', color: '#00ff00', borderRadius: '4px',
            padding: '10px', overflow: 'hidden', fontFamily: 'monospace',
            fontSize: '12px', pointerEvents: 'auto', opacity: '1',
            justifyContent: 'flex-start', alignItems: 'flex-start'
        });

        this.domElement.querySelector('.html-node-title')?.remove();
        this.domElement.querySelector('.html-node-desc')?.remove();

        const header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', borderBottom: '1px solid #444', paddingBottom: '5px',
            marginBottom: '5px', fontWeight: 'bold', color: '#fff'
        });
        header.textContent = 'Execution Log';
        this.domElement.appendChild(header);

        this.logsContainer = document.createElement('div');
        Object.assign(this.logsContainer.style, {
            width: '100%', height: 'calc(100% - 30px)', overflowY: 'auto',
            display: 'flex', flexDirection: 'column'
        });
        this.domElement.appendChild(this.logsContainer);

        this.updateLod(0);
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';

        const setStyles = (styles: Partial<CSSStyleDeclaration>) => Object.assign(this.domElement.style, styles);

        if (level === 'icon') {
            setStyles({ width: '60px', height: '60px', border: 'none', background: 'transparent', fontSize: '48px', justifyContent: 'center', alignItems: 'center' });
            this.domElement.textContent = '📄';
            this.logsContainer.style.display = 'none';
        } else if (level === 'label') {
            setStyles({ width: '200px', height: '60px', border: '2px solid #00ff00', background: 'rgba(20, 20, 20, 0.8)', fontSize: '24px', fontWeight: 'bold', justifyContent: 'center', alignItems: 'center' });
            this.domElement.textContent = '📄 Exec Log';
            this.logsContainer.style.display = 'none';
        } else {
            setStyles({ width: '400px', height: '300px', border: '2px solid #00ff00', background: 'rgba(20, 20, 20, 0.9)', fontSize: '12px', justifyContent: 'flex-start', alignItems: 'flex-start', fontWeight: 'normal' });

            if (!this.domElement.querySelector('div')) {
                this.domElement.textContent = '';
                const header = document.createElement('div');
                Object.assign(header.style, { width: '100%', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px', fontWeight: 'bold', color: '#fff' });
                header.textContent = 'Execution Log';
                this.domElement.append(header, this.logsContainer);
            }
            this.logsContainer.style.display = 'flex';
        }
    }

    addLog(message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') {
        const logEntry = document.createElement('div');
        const colors: Record<string, string> = { 'error': '#ff5555', 'success': '#50fa7b', 'warn': '#f1fa8c' };

        Object.assign(logEntry.style, { marginBottom: '2px', color: colors[type] || '#f8f8f2' });

        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        logEntry.textContent = `[${timestamp}] ${message}`;
        this.logsContainer.appendChild(logEntry);

        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);

        if (updates.parameters && updates.parameters.newLog) {
            this.addLog(
                updates.parameters.newLog.message,
                updates.parameters.newLog.type
            );
        }
    }
}
