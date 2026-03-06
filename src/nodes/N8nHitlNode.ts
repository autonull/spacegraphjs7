import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nHitlNode extends HtmlNode {
    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, {
            ...spec,
            html: '',
            style: {
                width: '350px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                background: '#ff9800', // Warning orange
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #e65100',
                boxSizing: 'border-box'
            }
        });
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';
        else if (distance > this.lodThresholds.summary) level = 'summary';

        this.renderHtmlContent(level);
    }

    private renderHtmlContent(level: string) {
        if (!this.domElement) return;

        this.domElement.innerHTML = '';
        const params = this.spec.parameters || {};
        const taskSummary = params.taskSummary || 'Review required';
        const status = params.status || 'waiting'; // could be 'approved', 'rejected'

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '👤';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.textContent = '👤 HITL';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(255, 152, 0, 0.8)';
            this.domElement.style.border = '2px solid #e65100';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.textContent = '👤 Human in Loop';

            const badge = document.createElement('span');
            badge.style.background = 'rgba(0,0,0,0.3)';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.textTransform = 'uppercase';
            badge.textContent = status;

            header.appendChild(title);
            header.appendChild(badge);

            const summary = document.createElement('div');
            summary.style.background = 'rgba(0,0,0,0.15)';
            summary.style.padding = '8px';
            summary.style.borderRadius = '4px';
            summary.style.fontSize = '12px';
            summary.style.maxHeight = '40px';
            summary.style.overflow = 'hidden';
            summary.textContent = taskSummary;

            this.domElement.appendChild(header);
            this.domElement.appendChild(summary);
            this.domElement.style.background = '#ff9800';
            this.domElement.style.border = '2px solid #e65100';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '12px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.textContent = '👤 Human Intervention';

            const badge = document.createElement('span');
            badge.style.background = 'rgba(0,0,0,0.3)';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.style.textTransform = 'uppercase';
            badge.textContent = status;

            header.appendChild(title);
            header.appendChild(badge);

            const taskBox = document.createElement('div');
            taskBox.style.background = 'rgba(0,0,0,0.15)';
            taskBox.style.padding = '12px';
            taskBox.style.borderRadius = '6px';
            taskBox.style.fontSize = '14px';
            taskBox.style.lineHeight = '1.4';
            taskBox.style.marginBottom = '16px';
            taskBox.style.border = '1px solid rgba(255,255,255,0.2)';
            taskBox.textContent = taskSummary;

            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '12px';

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Reject';
            rejectBtn.style.flex = '1';
            rejectBtn.style.padding = '10px';
            rejectBtn.style.background = '#f44336';
            rejectBtn.style.color = 'white';
            rejectBtn.style.border = 'none';
            rejectBtn.style.borderRadius = '4px';
            rejectBtn.style.fontWeight = 'bold';
            rejectBtn.style.cursor = 'pointer';

            const approveBtn = document.createElement('button');
            approveBtn.textContent = 'Approve';
            approveBtn.style.flex = '1';
            approveBtn.style.padding = '10px';
            approveBtn.style.background = '#4caf50';
            approveBtn.style.color = 'white';
            approveBtn.style.border = 'none';
            approveBtn.style.borderRadius = '4px';
            approveBtn.style.fontWeight = 'bold';
            approveBtn.style.cursor = 'pointer';

            rejectBtn.addEventListener('click', () => {
                this.parameters = { ...this.parameters, status: 'rejected' };
                this.renderHtmlContent(level); // re-render
                // Notify bridge via event manager
                this.sg.pluginManager.getPlugin('EventManager')?.emit('hitl:decision', { id: this.id, decision: 'reject' });
            });

            approveBtn.addEventListener('click', () => {
                this.parameters = { ...this.parameters, status: 'approved' };
                this.renderHtmlContent(level); // re-render
                // Notify bridge via event manager
                this.sg.pluginManager.getPlugin('EventManager')?.emit('hitl:decision', { id: this.id, decision: 'approve' });
            });

            btnGroup.appendChild(rejectBtn);
            btnGroup.appendChild(approveBtn);

            this.domElement.appendChild(header);
            this.domElement.appendChild(taskBox);
            if (status === 'waiting') {
                this.domElement.appendChild(btnGroup);
            }

            this.domElement.style.background = '#ff9800';
            this.domElement.style.border = '2px solid #e65100';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('div[style*="maxHeight"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
