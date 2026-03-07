import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nPaletteNode extends HtmlNode {
    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    private categories = [
        { name: 'Core', items: ['N8nTriggerNode', 'N8nScheduleNode'] },
        { name: 'AI/LLM', items: ['N8nAiNode', 'N8nVisionOptimizerNode'] },
        { name: 'Data', items: ['DataNode'] },
        { name: 'HTTP/API', items: ['N8nHttpNode'] },
        { name: 'Developer', items: ['N8nCodeNode'] },
        { name: 'Misc', items: ['N8nHitlNode', 'N8nCredentialNode'] }
    ];

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, {
            ...spec,
            html: '',
        });

        this.domElement.className = 'spacegraph-n8n-palette-node';
        this.domElement.style.cssText = `
            width: 250px;
            height: 400px;
            padding: 16px;
            border-radius: 8px;
            background-color: rgba(20, 20, 20, 0.95);
            color: white;
            font-family: sans-serif;
            border: 2px solid #555;
            box-sizing: border-box;
            overflow-y: auto;
            pointer-events: auto;
            display: block;
        `;
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';

        this.renderHtmlContent(level);
    }

    private renderHtmlContent(level: string) {
        if (!this.domElement) return;

        this.domElement.innerHTML = '';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '🎨';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.textContent = '🎨 Palette';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(20, 20, 20, 0.8)';
            this.domElement.style.border = '2px solid #555';
        } else {
            const header = document.createElement('div');
            header.style.fontSize = '18px';
            header.style.fontWeight = 'bold';
            header.style.marginBottom = '16px';
            header.style.borderBottom = '1px solid #444';
            header.style.paddingBottom = '8px';
            header.textContent = '🎨 Node Palette';
            this.domElement.appendChild(header);

            this.categories.forEach(category => {
                const catHeader = document.createElement('div');
                catHeader.style.fontSize = '14px';
                catHeader.style.fontWeight = 'bold';
                catHeader.style.color = '#aaa';
                catHeader.style.marginTop = '12px';
                catHeader.style.marginBottom = '8px';
                catHeader.textContent = category.name;
                this.domElement.appendChild(catHeader);

                category.items.forEach(nodeType => {
                    const item = document.createElement('div');
                    item.style.padding = '8px';
                    item.style.background = '#333';
                    item.style.marginBottom = '6px';
                    item.style.borderRadius = '4px';
                    item.style.fontSize = '12px';
                    item.style.cursor = 'grab';
                    item.style.userSelect = 'none';
                    item.textContent = nodeType.replace('N8n', '');

                    // Make it draggable
                    item.draggable = true;
                    item.addEventListener('dragstart', (e) => {
                        e.dataTransfer?.setData('application/spacegraph-node', nodeType);
                        item.style.opacity = '0.5';
                    });
                    item.addEventListener('dragend', () => {
                        item.style.opacity = '1';
                    });

                    this.domElement.appendChild(item);
                });
            });

            this.domElement.style.background = 'rgba(20, 20, 20, 0.95)';
            this.domElement.style.border = '2px solid #555';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('div[draggable]') ? 'full' : (this.domElement?.querySelector('span') ? 'label' : 'icon');
        this.renderHtmlContent(level);
    }
}