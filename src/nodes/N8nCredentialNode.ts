import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

import { HtmlNode } from './HtmlNode';

export class N8nCredentialNode extends HtmlNode {
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
                width: '300px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #e91e63', // Pink for credentials
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
        const serviceName = params.service || 'Unknown Service';
        const apiKey = params.apiKey || '';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '🔒';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#e91e63' });
            el.textContent = '🔒 Credential';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.8)', border: '2px solid #e91e63' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });

            const icon = document.createElement('span');
            icon.textContent = '🔒';

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold' });
            title.textContent = serviceName;

            header.append(icon, title);

            const status = document.createElement('div');
            setStyles(status, { fontSize: '12px', color: apiKey ? '#4caf50' : '#f44336' });
            status.textContent = apiKey ? 'Key Configured' : 'Missing Key';

            this.domElement.append(header, status);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #e91e63' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' });

            const icon = document.createElement('span');
            icon.textContent = '🔒';

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px' });
            title.textContent = `${serviceName} Credentials`;

            header.append(icon, title);

            const inputGroup = document.createElement('div');
            setStyles(inputGroup, { marginBottom: '12px' });

            const label = document.createElement('label');
            label.textContent = 'API Key / Token:';
            setStyles(label, { display: 'block', fontSize: '12px', marginBottom: '4px', color: '#aaa' });

            const input = document.createElement('input');
            input.type = 'password';
            input.value = apiKey;
            input.placeholder = 'Enter secret...';
            setStyles(input, { width: '100%', padding: '8px', boxSizing: 'border-box', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' });

            input.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.parameters = { ...this.parameters, apiKey: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'apiKey', value: val });
            });

            inputGroup.append(label, input);

            const testBtn = document.createElement('button');
            testBtn.textContent = 'Test Connection';
            setStyles(testBtn, { width: '100%', padding: '8px', background: '#e91e63', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' });

            testBtn.addEventListener('click', () => {
                testBtn.textContent = 'Testing...';
                setTimeout(() => {
                    testBtn.textContent = this.parameters?.apiKey ? 'Success!' : 'Failed';
                    testBtn.style.background = this.parameters?.apiKey ? '#4caf50' : '#f44336';
                    setTimeout(() => {
                        testBtn.textContent = 'Test Connection';
                        testBtn.style.background = '#e91e63';
                    }, 2000);
                }, 1000);
            });

            this.domElement.append(header, inputGroup, testBtn);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #e91e63' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('input') ? 'full' : (this.domElement?.querySelector('div[style*="12px"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'icon' : 'label'));
        this.renderHtmlContent(level);
    }
}
