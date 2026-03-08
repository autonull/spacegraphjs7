import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

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

        // Use parameters to determine min, max, value, and current step timestamp
        const min = params.min || 0;
        const max = params.max || 100;
        const val = params.value || 0;
        const currentTimestamp = params.currentTimestamp || 'No events';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '⏪';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.style.color = '#9c27b0';
            el.textContent = '⏪ Timeline';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(20, 20, 20, 0.8)';
            this.domElement.style.border = '2px solid #9c27b0';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.textContent = '⏪ Timeline Scrub';

            const badge = document.createElement('span');
            badge.style.background = '#9c27b0';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.textContent = `Step ${val}/${max}`;

            header.appendChild(title);
            header.appendChild(badge);
            this.domElement.appendChild(header);

            this.domElement.style.background = 'rgba(20, 20, 20, 0.95)';
            this.domElement.style.border = '2px solid #9c27b0';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '12px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.textContent = '⏪ Execution Replay';

            const badge = document.createElement('span');
            badge.style.background = '#9c27b0';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.textContent = `${val} / ${max}`;

            header.appendChild(title);
            header.appendChild(badge);

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';

            this.labelDiv = document.createElement('div');
            this.labelDiv.style.fontSize = '12px';
            this.labelDiv.style.color = '#aaa';
            this.labelDiv.style.textAlign = 'center';
            this.labelDiv.textContent = currentTimestamp;

            this.sliderInput = document.createElement('input');
            this.sliderInput.type = 'range';
            this.sliderInput.min = min.toString();
            this.sliderInput.max = max.toString();
            this.sliderInput.value = val.toString();
            this.sliderInput.style.width = '100%';
            this.sliderInput.style.cursor = 'pointer';

            this.sliderInput.addEventListener('input', (e) => {
                const newVal = parseInt((e.target as HTMLInputElement).value, 10);
                this.parameters = { ...this.parameters, value: newVal };

                // Emit scrub event so the plugin can catch it
                this.sg.events.emit('timeline:scrub', { nodeId: this.id, value: newVal });

                badge.textContent = `${newVal} / ${max}`;
            });

            container.appendChild(this.sliderInput);
            container.appendChild(this.labelDiv);

            this.domElement.appendChild(header);
            this.domElement.appendChild(container);

            this.domElement.style.background = 'rgba(20, 20, 20, 0.95)';
            this.domElement.style.border = '2px solid #9c27b0';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('input[type="range"]') ? 'full' : (this.domElement?.querySelector('span[style*="background: #9c27b0"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}