import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nVisionOptimizerNode extends HtmlNode {
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
                background: '#607d8b', // Blue Grey
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #455a64',
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
        const score = params.score !== undefined ? params.score : '--';
        const scoreColor = score >= 70 ? '#aed581' : (score === '--' ? 'white' : '#ffb74d');

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '👁️';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.textContent = '👁️ Vision Opt.';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(96, 125, 139, 0.8)';
            this.domElement.style.border = '2px solid #455a64';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.textContent = '👁️ Optimizer';

            const badge = document.createElement('span');
            badge.style.background = 'rgba(0,0,0,0.3)';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.color = scoreColor;
            badge.style.fontWeight = 'bold';
            badge.textContent = `Score: ${score}`;

            header.appendChild(title);
            header.appendChild(badge);

            this.domElement.appendChild(header);
            this.domElement.style.background = '#607d8b';
            this.domElement.style.border = '2px solid #455a64';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '12px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.textContent = '👁️ Vision Optimizer';

            header.appendChild(title);

            const scoreBox = document.createElement('div');
            scoreBox.style.display = 'flex';
            scoreBox.style.justifyContent = 'space-between';
            scoreBox.style.alignItems = 'center';
            scoreBox.style.background = 'rgba(0,0,0,0.15)';
            scoreBox.style.padding = '10px';
            scoreBox.style.borderRadius = '6px';
            scoreBox.style.border = '1px solid rgba(255,255,255,0.2)';
            scoreBox.style.marginBottom = '16px';

            const scoreLabel = document.createElement('span');
            scoreLabel.style.fontSize = '12px';
            scoreLabel.textContent = 'Layout Quality Score';

            const scoreValue = document.createElement('span');
            scoreValue.style.fontSize = '16px';
            scoreValue.style.fontWeight = 'bold';
            scoreValue.style.color = scoreColor;
            scoreValue.textContent = `${score}/100`;

            scoreBox.appendChild(scoreLabel);
            scoreBox.appendChild(scoreValue);

            const fixBtn = document.createElement('button');
            fixBtn.textContent = 'Auto-Fix Layout';
            fixBtn.style.width = '100%';
            fixBtn.style.padding = '10px';
            fixBtn.style.background = '#2196f3';
            fixBtn.style.color = 'white';
            fixBtn.style.border = 'none';
            fixBtn.style.borderRadius = '4px';
            fixBtn.style.fontWeight = 'bold';
            fixBtn.style.cursor = 'pointer';

            fixBtn.addEventListener('click', async () => {
                fixBtn.textContent = 'Fixing...';

                // Trigger Vision Manager Layout Heal
                const forceLayout = this.sg.pluginManager.getPlugin('ForceLayout') as any;
                if (forceLayout && typeof forceLayout.update === 'function') {
                    for (let i = 0; i < 50; i++) {
                        forceLayout.update(0.016);
                    }
                }

                // Simulate fix outcome
                setTimeout(() => {
                    this.parameters = { ...this.parameters, score: 95 };
                    this.renderHtmlContent(level); // Re-render triggers layout heal update on DOM
                }, 500);
            });

            this.domElement.appendChild(header);
            this.domElement.appendChild(scoreBox);
            this.domElement.appendChild(fixBtn);

            this.domElement.style.background = '#607d8b';
            this.domElement.style.border = '2px solid #455a64';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('span[style*="Score:"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
