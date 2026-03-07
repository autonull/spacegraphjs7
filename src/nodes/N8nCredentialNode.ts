import * as THREE from 'three';
import { ShapeNode } from './ShapeNode';
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

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '🔒';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.style.color = '#e91e63';
            el.textContent = '🔒 Credential';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.8)';
            this.domElement.style.border = '2px solid #e91e63';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '8px';

            const icon = document.createElement('span');
            icon.textContent = '🔒';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.textContent = serviceName;

            header.appendChild(icon);
            header.appendChild(title);

            const status = document.createElement('div');
            status.style.fontSize = '12px';
            status.style.color = apiKey ? '#4caf50' : '#f44336';
            status.textContent = apiKey ? 'Key Configured' : 'Missing Key';

            this.domElement.appendChild(header);
            this.domElement.appendChild(status);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #e91e63';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '12px';

            const icon = document.createElement('span');
            icon.textContent = '🔒';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.textContent = `${serviceName} Credentials`;

            header.appendChild(icon);
            header.appendChild(title);

            const inputGroup = document.createElement('div');
            inputGroup.style.marginBottom = '12px';

            const label = document.createElement('label');
            label.textContent = 'API Key / Token:';
            label.style.display = 'block';
            label.style.fontSize = '12px';
            label.style.marginBottom = '4px';
            label.style.color = '#aaa';

            const input = document.createElement('input');
            input.type = 'password';
            input.value = apiKey;
            input.placeholder = 'Enter secret...';
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.boxSizing = 'border-box';
            input.style.background = '#333';
            input.style.border = '1px solid #555';
            input.style.color = 'white';
            input.style.borderRadius = '4px';

            input.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.parameters = { ...this.parameters, apiKey: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'apiKey', value: val });
            });

            inputGroup.appendChild(label);
            inputGroup.appendChild(input);

            const testBtn = document.createElement('button');
            testBtn.textContent = 'Test Connection';
            testBtn.style.width = '100%';
            testBtn.style.padding = '8px';
            testBtn.style.background = '#e91e63';
            testBtn.style.color = 'white';
            testBtn.style.border = 'none';
            testBtn.style.borderRadius = '4px';
            testBtn.style.cursor = 'pointer';
            testBtn.style.fontWeight = 'bold';

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

            this.domElement.appendChild(header);
            this.domElement.appendChild(inputGroup);
            this.domElement.appendChild(testBtn);

            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #e91e63';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('input') ? 'full' : (this.domElement?.querySelector('div[style*="12px"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'icon' : 'label'));
        this.renderHtmlContent(level);
    }
}
