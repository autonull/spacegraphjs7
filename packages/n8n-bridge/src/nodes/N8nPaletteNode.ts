import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

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
        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '🎨';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' });
            el.textContent = '🎨 Palette';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(20, 20, 20, 0.8)', border: '2px solid #555' });
        } else {
            const header = document.createElement('div');
            setStyles(header, { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #444', paddingBottom: '8px' });
            header.textContent = '🎨 Node Palette';
            this.domElement.appendChild(header);

            this.categories.forEach(category => {
                const catHeader = document.createElement('div');
                setStyles(catHeader, { fontSize: '14px', fontWeight: 'bold', color: '#aaa', marginTop: '12px', marginBottom: '8px' });
                catHeader.textContent = category.name;
                this.domElement.appendChild(catHeader);

                category.items.forEach(nodeType => {
                    const item = document.createElement('div');
                    setStyles(item, { padding: '8px', background: '#333', marginBottom: '6px', borderRadius: '4px', fontSize: '12px', cursor: 'grab', userSelect: 'none' });
                    item.textContent = nodeType.replace('N8n', '');

                    item.draggable = true;
                    item.addEventListener('dragstart', (e) => {
                        e.dataTransfer?.setData('application/spacegraph-node', nodeType);
                        item.style.opacity = '0.5';
                    });
                    item.addEventListener('dragend', () => item.style.opacity = '1');

                    this.domElement.appendChild(item);
                });
            });

            setStyles(this.domElement, { background: 'rgba(20, 20, 20, 0.95)', border: '2px solid #555' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('div[draggable]') ? 'full' : (this.domElement?.querySelector('span') ? 'label' : 'icon');
        this.renderHtmlContent(level);
    }
}