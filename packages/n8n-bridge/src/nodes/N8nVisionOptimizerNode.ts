import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

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
        const score = params.score !== undefined ? params.score : '--';
        const scoreColor = score >= 70 ? '#aed581' : (score === '--' ? 'white' : '#ffb74d');

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '👁️';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' });
            el.textContent = '👁️ Vision Opt.';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(96, 125, 139, 0.8)', border: '2px solid #455a64' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold' });
            title.textContent = '👁️ Optimizer';

            const badge = document.createElement('span');
            setStyles(badge, { background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: scoreColor, fontWeight: 'bold' });
            badge.textContent = `Score: ${score}`;

            header.append(title, badge);

            this.domElement.appendChild(header);
            setStyles(this.domElement, { background: '#607d8b', border: '2px solid #455a64' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px' });
            title.textContent = '👁️ Vision Optimizer';

            header.appendChild(title);

            const scoreBox = document.createElement('div');
            setStyles(scoreBox, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '16px' });

            const scoreLabel = document.createElement('span');
            setStyles(scoreLabel, { fontSize: '12px' });
            scoreLabel.textContent = 'Layout Quality Score';

            const scoreValue = document.createElement('span');
            setStyles(scoreValue, { fontSize: '16px', fontWeight: 'bold', color: scoreColor });
            scoreValue.textContent = `${score}/100`;

            scoreBox.append(scoreLabel, scoreValue);

            const fixBtn = document.createElement('button');
            fixBtn.textContent = 'Auto-Fix Layout';
            setStyles(fixBtn, { width: '100%', padding: '10px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' });

            fixBtn.addEventListener('click', async () => {
                fixBtn.textContent = 'Fixing...';

                // Trigger Vision Manager Layout Heal
                const forceLayout = this.sg.pluginManager.getPlugin?.('ForceLayout') as any;
                if (forceLayout?.update) {
                    for (let i = 0; i < 50; i++) {
                        forceLayout.update(0.016);
                    }
                }

                // Simulate fix outcome
                setTimeout(() => {
                    this.parameters = { ...this.parameters, score: 95 };
                    this.renderHtmlContent(level);
                }, 500);
            });

            this.domElement.append(header, scoreBox, fixBtn);
            setStyles(this.domElement, { background: '#607d8b', border: '2px solid #455a64' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('span[style*="Score:"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
