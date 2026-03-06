import * as THREE from 'three';
import { ShapeNode } from './ShapeNode';
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
        const size = this.spec.size || 80;

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
        const params = this.spec.parameters || {};
        const cronExpr = params.cronExpression || '0 * * * *';
        const nextRun = params.nextRun || 'in 15 mins';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '🕐';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.textContent = '🕐 Schedule';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.8)';
            this.domElement.style.border = '2px solid #ff9800';
        } else if (level === 'summary') {
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '8px';
            title.textContent = '🕐 Schedule Node';

            const run = document.createElement('div');
            run.textContent = `Next Run: ${nextRun}`;

            this.domElement.appendChild(title);
            this.domElement.appendChild(run);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #ff9800';
        } else if (level === 'full') {
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '12px';
            title.style.fontSize = '18px';
            title.textContent = '🕐 Schedule Cron';

            const run = document.createElement('div');
            run.style.marginBottom = '12px';
            run.style.color = '#ffb74d';
            run.textContent = `Next Run: ${nextRun}`;

            const inputGroup = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = 'Cron Expression:';
            label.style.display = 'block';
            label.style.marginBottom = '4px';
            label.style.fontSize = '12px';
            label.style.color = '#aaa';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = cronExpr;
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.boxSizing = 'border-box';
            input.style.background = '#333';
            input.style.border = '1px solid #555';
            input.style.color = 'white';
            input.style.borderRadius = '4px';

            inputGroup.appendChild(label);
            inputGroup.appendChild(input);

            this.domElement.appendChild(title);
            this.domElement.appendChild(run);
            this.domElement.appendChild(inputGroup);

            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #ff9800';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        // Force a re-render of current LOD
        const level = this.domElement?.children[0]?.textContent === '🕐' ? 'icon' : 'full';
        this.renderHtmlContent(level);
    }

    dispose(): void {
        super.dispose();
        if (this.orbitTween) {
            this.orbitTween.kill();
        }
    }
}
