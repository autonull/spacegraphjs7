import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';
import { gsap } from 'gsap';

import { HtmlNode } from './HtmlNode';

export class N8nScheduleNode extends HtmlNode {
    private orbitDot?: THREE.Mesh;
    private orbitPivot?: THREE.Group;
    private orbitTween?: gsap.core.Tween;

    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, {
            ...spec,
            html: '', // Will be dynamically generated based on LOD
            style: {
                width: '300px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #ff9800', // Orange for schedule
                boxSizing: 'border-box'
            }
        });

        // We will mix 3D shapes with HTML rendering for this specific node.
        // We initialize the 3D parts here.
        this._init3DOrbit();
    }

    private _init3DOrbit() {
        // Find size from spec data or fallback to 80
        const size = (this.spec?.data as any)?.size || 80;

        // Orbit dot for countdown
        const dotGeo = new THREE.CircleGeometry(size * 0.1, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: '#ffe0b2' });
        this.orbitDot = new THREE.Mesh(dotGeo, dotMat);

        // Position on the edge
        this.orbitDot.position.set(0, size, 0);

        this.orbitPivot = new THREE.Group();
        this.orbitPivot.add(this.orbitDot);

        this.object.add(this.orbitPivot);

        // Orbiting animation
        this.orbitTween = gsap.to(this.orbitPivot.rotation, {
            z: Math.PI * 2,
            duration: 5,
            repeat: -1,
            ease: "linear"
        });
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';
        else if (distance > this.lodThresholds.summary) level = 'summary';

        this.renderHtmlContent(level);

        // Show orbit only at higher distances or if we want it always.
        // For now, keep it visible.
        if (this.orbitPivot) {
            this.orbitPivot.visible = level === 'icon' || level === 'label';
        }
    }

    private renderHtmlContent(level: string) {
        if (!this.domElement) return;

        this.domElement.innerHTML = '';
        const params = (this.parameters && Object.keys(this.parameters).length > 0) ? this.parameters : ((this.spec as any)?.parameters || {});
        const cronExpr = params.cronExpression || '0 * * * *';
        const nextRun = params.nextRun || (this.spec?.data as any)?.nextRun || 'in 15 mins';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '🕐';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' });
            el.textContent = '🕐 Schedule';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.8)', border: '2px solid #ff9800' });
        } else if (level === 'summary') {
            const title = document.createElement('div');
            setStyles(title, { fontWeight: 'bold', marginBottom: '8px' });
            title.textContent = '🕐 Schedule Node';

            const run = document.createElement('div');
            run.textContent = `Next Run: ${nextRun}`;

            this.domElement.append(title, run);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #ff9800' });
        } else if (level === 'full') {
            const title = document.createElement('div');
            setStyles(title, { fontWeight: 'bold', marginBottom: '12px', fontSize: '18px' });
            title.textContent = '🕐 Schedule Cron';

            const run = document.createElement('div');
            setStyles(run, { marginBottom: '12px', color: '#ffb74d' });
            run.textContent = `Next Run: ${nextRun}`;

            const inputGroup = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = 'Cron Expression:';
            setStyles(label, { display: 'block', marginBottom: '4px', fontSize: '12px', color: '#aaa' });

            const input = document.createElement('input');
            input.type = 'text';
            input.value = cronExpr;
            setStyles(input, { width: '100%', padding: '8px', boxSizing: 'border-box', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' });

            inputGroup.append(label, input);

            this.domElement.append(title, run, inputGroup);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #ff9800' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.children[0]?.textContent === '🕐' ? 'icon' : 'full';
        this.renderHtmlContent(level);
    }

    dispose(): void {
        super.dispose();
        this.orbitTween?.kill();
    }
}
