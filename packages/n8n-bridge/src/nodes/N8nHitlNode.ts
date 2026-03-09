import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

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
        const params = this.parameters || this.spec?.parameters || {};
        const taskSummary = params.taskSummary || 'Review required';
        const status = params.status || 'waiting';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '👤';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' });
            el.textContent = '👤 HITL';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(255, 152, 0, 0.8)', border: '2px solid #e65100' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold' });
            title.textContent = '👤 Human in Loop';

            const badge = document.createElement('span');
            setStyles(badge, { background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase' });
            badge.textContent = status;

            header.append(title, badge);

            const summary = document.createElement('div');
            setStyles(summary, { background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '4px', fontSize: '12px', maxHeight: '40px', overflow: 'hidden' });
            summary.textContent = taskSummary;

            this.domElement.append(header, summary);
            setStyles(this.domElement, { background: '#ff9800', border: '2px solid #e65100' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px' });
            title.textContent = '👤 Human Intervention';

            const badge = document.createElement('span');
            setStyles(badge, { background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' });
            badge.textContent = status;

            header.append(title, badge);

            const taskBox = document.createElement('div');
            setStyles(taskBox, { background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.4', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.2)' });
            taskBox.textContent = taskSummary;

            const btnGroup = document.createElement('div');
            setStyles(btnGroup, { display: 'flex', gap: '12px' });

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Reject';
            setStyles(rejectBtn, { flex: '1', padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' });

            const approveBtn = document.createElement('button');
            approveBtn.textContent = 'Approve';
            setStyles(approveBtn, { flex: '1', padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' });

            rejectBtn.addEventListener('click', () => {
                this.parameters = { ...this.parameters, status: 'rejected' };
                this.renderHtmlContent(level);
                this.sg.pluginManager.getPlugin?.('EventManager')?.emit('hitl:decision', { id: this.id, decision: 'reject' });
            });

            approveBtn.addEventListener('click', () => {
                this.parameters = { ...this.parameters, status: 'approved' };
                this.renderHtmlContent(level);
                this.sg.pluginManager.getPlugin?.('EventManager')?.emit('hitl:decision', { id: this.id, decision: 'approve' });
            });

            btnGroup.append(rejectBtn, approveBtn);

            this.domElement.append(header, taskBox);
            if (status === 'waiting') {
                this.domElement.appendChild(btnGroup);
            }

            setStyles(this.domElement, { background: '#ff9800', border: '2px solid #e65100' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('div[style*="maxHeight"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
