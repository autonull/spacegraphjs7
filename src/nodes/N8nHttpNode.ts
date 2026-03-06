import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nHttpNode extends HtmlNode {
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
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #2196f3', // Blue for HTTP
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

    private getMethodColor(method: string): string {
        switch (method.toUpperCase()) {
            case 'POST': return '#4caf50';
            case 'PUT': return '#ff9800';
            case 'DELETE': return '#f44336';
            default: return '#2196f3';
        }
    }

    private renderHtmlContent(level: string) {
        if (!this.element) return;

        this.element.innerHTML = '';
        const params = this.spec.parameters || {};
        const method = (params.requestMethod || 'GET').toUpperCase();
        const url = params.url || 'https://api.example.com';
        const methodColor = this.getMethodColor(method);
        const status = params.status || 'waiting';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.style.fontWeight = 'bold';
            el.style.color = methodColor;
            el.textContent = '🌐';
            this.element.appendChild(el);
            this.element.style.background = 'transparent';
            this.element.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '8px';

            const badge = document.createElement('span');
            badge.style.background = methodColor;
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = method;

            const text = document.createElement('span');
            text.style.fontSize = '18px';
            text.style.fontWeight = 'bold';
            text.textContent = 'HTTP Request';

            el.appendChild(badge);
            el.appendChild(text);
            this.element.appendChild(el);
            this.element.style.background = 'rgba(30, 30, 30, 0.8)';
            this.element.style.border = `2px solid ${methodColor}`;
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '8px';

            const badge = document.createElement('span');
            badge.style.background = methodColor;
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = method;

            const domain = new URL(url.startsWith('http') ? url : `http://${url}`).hostname;
            const text = document.createElement('span');
            text.style.fontSize = '14px';
            text.style.fontWeight = 'bold';
            text.textContent = domain;

            header.appendChild(badge);
            header.appendChild(text);

            const preview = document.createElement('div');
            preview.style.background = '#000';
            preview.style.padding = '8px';
            preview.style.borderRadius = '4px';
            preview.style.fontSize = '11px';
            preview.style.fontFamily = 'monospace';
            preview.style.color = status === 'running' ? '#ffcc80' : '#a5d6a7';
            preview.style.height = '40px';
            preview.style.overflow = 'hidden';
            preview.textContent = status === 'running' ? 'Fetching...' : (params.response ? JSON.stringify(params.response).slice(0, 50) + '...' : 'Waiting...');

            this.element.appendChild(header);
            this.element.appendChild(preview);
            this.element.style.background = 'rgba(30, 30, 30, 0.95)';
            this.element.style.border = `2px solid ${methodColor}`;
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '12px';

            const badge = document.createElement('span');
            badge.style.background = methodColor;
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = method;

            const text = document.createElement('span');
            text.style.fontSize = '16px';
            text.style.fontWeight = 'bold';
            text.textContent = 'HTTP Request';

            header.appendChild(badge);
            header.appendChild(text);

            const urlGroup = document.createElement('div');
            urlGroup.style.marginBottom = '12px';
            const urlLabel = document.createElement('label');
            urlLabel.textContent = 'URL:';
            urlLabel.style.display = 'block';
            urlLabel.style.fontSize = '12px';
            urlLabel.style.color = '#aaa';
            urlLabel.style.marginBottom = '4px';

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = url;
            urlInput.style.width = '100%';
            urlInput.style.padding = '8px';
            urlInput.style.boxSizing = 'border-box';
            urlInput.style.background = '#333';
            urlInput.style.border = '1px solid #555';
            urlInput.style.color = 'white';
            urlInput.style.borderRadius = '4px';

            urlGroup.appendChild(urlLabel);
            urlGroup.appendChild(urlInput);

            const responseGroup = document.createElement('div');
            const resLabel = document.createElement('label');
            resLabel.textContent = 'Response Preview:';
            resLabel.style.display = 'block';
            resLabel.style.fontSize = '12px';
            resLabel.style.color = '#aaa';
            resLabel.style.marginBottom = '4px';

            const resPreview = document.createElement('pre');
            resPreview.style.background = '#000';
            resPreview.style.padding = '8px';
            resPreview.style.borderRadius = '4px';
            resPreview.style.fontSize = '11px';
            resPreview.style.fontFamily = 'monospace';
            resPreview.style.color = status === 'running' ? '#ffcc80' : '#a5d6a7';
            resPreview.style.height = '80px';
            resPreview.style.overflow = 'auto';
            resPreview.style.margin = '0';
            resPreview.textContent = status === 'running' ? 'Fetching...' : (params.response ? JSON.stringify(params.response, null, 2) : 'Waiting...');

            responseGroup.appendChild(resLabel);
            responseGroup.appendChild(resPreview);

            this.element.appendChild(header);
            this.element.appendChild(urlGroup);
            this.element.appendChild(responseGroup);
            this.element.style.background = 'rgba(30, 30, 30, 0.95)';
            this.element.style.border = `2px solid ${methodColor}`;
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        // We use innerHTML check just to get a hint of what's rendered, or could store currentLOD.
        // Assuming current LOD based on presence of URL input.
        const level = this.element?.querySelector('input') ? 'full' : (this.element?.querySelector('pre') ? 'summary' : (this.element?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
