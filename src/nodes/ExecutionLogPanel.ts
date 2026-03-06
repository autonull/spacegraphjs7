import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class ExecutionLogPanel extends HtmlNode {
    private logsContainer: HTMLDivElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.domElement.className = 'spacegraph-execution-log-panel';
        this.domElement.style.width = '400px';
        this.domElement.style.height = '300px';
        this.domElement.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
        this.domElement.style.border = '2px solid #00ff00';
        this.domElement.style.color = '#00ff00';
        this.domElement.style.borderRadius = '4px';
        this.domElement.style.padding = '10px';
        this.domElement.style.overflow = 'hidden';
        this.domElement.style.fontFamily = 'monospace';
        this.domElement.style.fontSize = '12px';
        this.domElement.style.pointerEvents = 'auto';
        this.domElement.style.opacity = '1';
        this.domElement.style.justifyContent = 'flex-start';
        this.domElement.style.alignItems = 'flex-start';

        // Remove existing elements added by HtmlNode constructor
        const titleEl = this.domElement.querySelector('.html-node-title');
        const descEl = this.domElement.querySelector('.html-node-desc');
        if (titleEl) titleEl.remove();
        if (descEl) descEl.remove();

        // Add a header
        const header = document.createElement('div');
        header.style.width = '100%';
        header.style.borderBottom = '1px solid #444';
        header.style.paddingBottom = '5px';
        header.style.marginBottom = '5px';
        header.style.fontWeight = 'bold';
        header.style.color = '#fff';
        header.textContent = 'Execution Log';
        this.domElement.appendChild(header);

        // Add a container for logs
        this.logsContainer = document.createElement('div');
        this.logsContainer.style.width = '100%';
        this.logsContainer.style.height = 'calc(100% - 30px)';
        this.logsContainer.style.overflowY = 'auto';
        this.logsContainer.style.display = 'flex';
        this.logsContainer.style.flexDirection = 'column';
        this.domElement.appendChild(this.logsContainer);
    }

    addLog(message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') {
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '2px';

        switch (type) {
            case 'error': logEntry.style.color = '#ff5555'; break;
            case 'success': logEntry.style.color = '#50fa7b'; break;
            case 'warn': logEntry.style.color = '#f1fa8c'; break;
            default: logEntry.style.color = '#f8f8f2'; break;
        }

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
