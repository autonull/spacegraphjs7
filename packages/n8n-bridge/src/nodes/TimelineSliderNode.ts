import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

export class TimelineSliderNode extends HtmlNode {
    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    private sliderInput!: HTMLInputElement;
    private labelDiv!: HTMLDivElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, {
            ...spec,
            html: '',
            style: {
                width: '400px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #9c27b0', // Purple for timeline
                boxSizing: 'border-box'
            }
        });
        this.renderHtmlContent('full');
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
        const params = (this.parameters && Object.keys(this.parameters).length > 0) ? this.parameters : (this.spec?.parameters || {});

        const min = params.min || 0;
        const max = params.max || 100;
        const val = params.value || 0;
        const currentTimestamp = params.currentTimestamp || 'No events';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '⏪';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#9c27b0' });
            el.textContent = '⏪ Timeline';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(20, 20, 20, 0.8)', border: '2px solid #9c27b0' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold' });
            title.textContent = '⏪ Timeline Scrub';

            const badge = document.createElement('span');
            setStyles(badge, { background: '#9c27b0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' });
            badge.textContent = `Step ${val}/${max}`;

            header.append(title, badge);
            this.domElement.appendChild(header);

            setStyles(this.domElement, { background: 'rgba(20, 20, 20, 0.95)', border: '2px solid #9c27b0' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px' });
            title.textContent = '⏪ Execution Replay';

            const badge = document.createElement('span');
            setStyles(badge, { background: '#9c27b0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' });
            badge.textContent = `${val} / ${max}`;

            header.append(title, badge);

            const container = document.createElement('div');
            setStyles(container, { display: 'flex', flexDirection: 'column', gap: '8px' });

            this.labelDiv = document.createElement('div');
            setStyles(this.labelDiv, { fontSize: '12px', color: '#aaa', textAlign: 'center' });
            this.labelDiv.textContent = currentTimestamp;

            this.sliderInput = document.createElement('input');
            this.sliderInput.type = 'range';
            this.sliderInput.min = min.toString();
            this.sliderInput.max = max.toString();
            this.sliderInput.value = val.toString();
            setStyles(this.sliderInput, { width: '100%', cursor: 'pointer' });

            this.sliderInput.addEventListener('input', (e) => {
                const newVal = parseInt((e.target as HTMLInputElement).value, 10);
                this.parameters = { ...this.parameters, value: newVal };
                this.sg.events.emit('timeline:scrub', { nodeId: this.id, value: newVal });
                badge.textContent = `${newVal} / ${max}`;
            });

            container.append(this.sliderInput, this.labelDiv);

            this.domElement.append(header, container);
            setStyles(this.domElement, { background: 'rgba(20, 20, 20, 0.95)', border: '2px solid #9c27b0' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('input[type="range"]') ? 'full' : (this.domElement?.querySelector('span[style*="background: #9c27b0"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}