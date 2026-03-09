import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

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
        const colors: Record<string, string> = {
            'POST': '#4caf50',
            'PUT': '#ff9800',
            'DELETE': '#f44336'
        };
        return colors[method.toUpperCase()] || '#2196f3';
    }

    private renderHtmlContent(level: string) {
        if (!this.domElement) return;

        this.domElement.innerHTML = '';
        const params = (this.parameters && Object.keys(this.parameters).length > 0) ? this.parameters : (this.spec?.parameters || {});
        const method = (params.requestMethod || 'GET').toUpperCase();
        const url = params.url || 'https://api.example.com';
        const methodColor = this.getMethodColor(method);
        const status = params.status || 'waiting';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center', fontWeight: 'bold', color: methodColor });
            el.textContent = '🌐';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { display: 'flex', alignItems: 'center', gap: '8px' });

            const badge = document.createElement('span');
            setStyles(badge, { background: methodColor, padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' });
            badge.textContent = method;

            const text = document.createElement('span');
            setStyles(text, { fontSize: '18px', fontWeight: 'bold' });
            text.textContent = 'HTTP Request';

            el.append(badge, text);
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.8)', border: `2px solid ${methodColor}` });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });

            const badge = document.createElement('span');
            setStyles(badge, { background: methodColor, padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' });
            badge.textContent = method;

            const domain = new URL(url.startsWith('http') ? url : `http://${url}`).hostname;
            const text = document.createElement('span');
            setStyles(text, { fontSize: '14px', fontWeight: 'bold' });
            text.textContent = domain;

            header.append(badge, text);

            const preview = document.createElement('div');
            setStyles(preview, { background: '#000', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: status === 'running' ? '#ffcc80' : '#a5d6a7', height: '40px', overflow: 'hidden' });
            preview.textContent = status === 'running' ? 'Fetching...' : (params.response ? JSON.stringify(params.response).slice(0, 50) + '...' : 'Waiting...');

            this.domElement.append(header, preview);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: `2px solid ${methodColor}` });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' });

            const badge = document.createElement('span');
            setStyles(badge, { background: methodColor, padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' });
            badge.textContent = method;

            const text = document.createElement('span');
            setStyles(text, { fontSize: '16px', fontWeight: 'bold' });
            text.textContent = 'HTTP Request';

            header.append(badge, text);

            const urlGroup = document.createElement('div');
            setStyles(urlGroup, { marginBottom: '12px' });
            const urlLabel = document.createElement('label');
            urlLabel.textContent = 'URL:';
            setStyles(urlLabel, { display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' });

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = url;
            setStyles(urlInput, { width: '100%', padding: '8px', boxSizing: 'border-box', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' });

            urlInput.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.parameters = { ...this.parameters, url: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'url', value: val });
            });

            urlGroup.append(urlLabel, urlInput);

            const responseGroup = document.createElement('div');
            const resLabel = document.createElement('label');
            resLabel.textContent = 'Response Preview:';
            setStyles(resLabel, { display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' });

            const resPreview = document.createElement('pre');
            setStyles(resPreview, { background: '#000', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: status === 'running' ? '#ffcc80' : '#a5d6a7', height: '80px', overflow: 'auto', margin: '0' });
            resPreview.textContent = status === 'running' ? 'Fetching...' : (params.response ? JSON.stringify(params.response, null, 2) : 'Waiting...');

            responseGroup.append(resLabel, resPreview);

            this.domElement.append(header, urlGroup, responseGroup);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: `2px solid ${methodColor}` });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        // We use innerHTML check just to get a hint of what's rendered, or could store currentLOD.
        // Assuming current LOD based on presence of URL input.
        const level = this.domElement?.querySelector('input') ? 'full' : (this.domElement?.querySelector('pre') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
