import * as THREE from 'three';
import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';
import { gsap } from 'gsap';

export class N8nTriggerNode extends HtmlNode {
    private portalMesh?: THREE.Mesh;
    private orbitTween?: gsap.core.Tween;
    private glowTween?: gsap.core.Tween;
    private currentLevel?: string;

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
                width: '320px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '2px solid #4caf50', // Green for trigger
                boxSizing: 'border-box'
            }
        });

        this._init3DPortal();
    }

    private _init3DPortal() {
        const size = (this.spec?.data as any)?.size || 80;

        // Base Hexagon Mesh
        const shape = new THREE.Shape();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = size * Math.cos(angle);
            const y = size * Math.sin(angle);
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();

        const extrudeSettings = { depth: 10, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 2, bevelThickness: 2 };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();

        const material = new THREE.MeshPhongMaterial({ color: '#2e7d32', transparent: true, opacity: 0.9 });
        const hexMesh = new THREE.Mesh(geometry, material);

        // Portal glow effect
        const portalGeo = new THREE.RingGeometry(size * 0.4, size * 0.45, 32);
        const portalMat = new THREE.MeshBasicMaterial({
            color: '#81c784',
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        this.portalMesh.position.z = 15;

        const group = new THREE.Group();
        group.add(hexMesh);
        group.add(this.portalMesh);

        this.object.add(group);
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';
        else if (distance > this.lodThresholds.summary) level = 'summary';

        if (this.currentLevel !== level) {
            this.currentLevel = level;
            this.renderHtmlContent(level);
        }

        // Manage visibility of 3D parts
        const isDistant = level === 'icon' || level === 'label';
        if (this.object.children.length > 0) {
            // The HTML container might have CSS3DObject attached, we only want to toggle the 3D meshes we added.
            // HTML node adds a CSS3DObject. Our group is the last child.
            this.object.children.forEach(child => {
                if (child instanceof THREE.Group) {
                    child.visible = isDistant;
                }
            });
        }
    }

    private renderHtmlContent(level: string) {
        if (!this.domElement) return;

        this.domElement.innerHTML = '';
        const params = (this.parameters && Object.keys(this.parameters).length > 0) ? this.parameters : (this.spec?.parameters || {});
        const isRunning = params.status === 'running';
        const trafficCount = params.trafficCount || 0;
        const lastPayloads = params.lastPayloads || [];

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '🔗';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.style.color = '#4caf50';
            el.textContent = '🔗 Webhook';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.8)';
            this.domElement.style.border = '2px solid #4caf50';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.justifyContent = 'space-between';
            header.style.marginBottom = '8px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.color = '#4caf50';
            title.textContent = '🔗 Webhook Trigger';

            const badge = document.createElement('span');
            badge.style.background = isRunning ? '#ffeb3b' : '#388e3c';
            badge.style.color = isRunning ? 'black' : 'white';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = isRunning ? 'Running' : 'Listening';

            header.appendChild(title);
            header.appendChild(badge);

            const traffic = document.createElement('div');
            traffic.style.fontSize = '12px';
            traffic.style.color = '#aaa';
            traffic.textContent = `Live Traffic: ${trafficCount} reqs/min`;

            this.domElement.appendChild(header);
            this.domElement.appendChild(traffic);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #4caf50';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.justifyContent = 'space-between';
            header.style.marginBottom = '12px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.style.color = '#4caf50';
            title.textContent = '🔗 Webhook Entry';

            const badge = document.createElement('span');
            badge.style.background = isRunning ? '#ffeb3b' : '#388e3c';
            badge.style.color = isRunning ? 'black' : 'white';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = isRunning ? 'Running' : 'Listening';

            header.appendChild(title);
            header.appendChild(badge);

            const statsGroup = document.createElement('div');
            statsGroup.style.display = 'flex';
            statsGroup.style.justifyContent = 'space-between';
            statsGroup.style.background = 'rgba(0,0,0,0.3)';
            statsGroup.style.padding = '8px';
            statsGroup.style.borderRadius = '4px';
            statsGroup.style.marginBottom = '12px';

            const countLabel = document.createElement('span');
            countLabel.style.fontSize = '12px';
            countLabel.style.color = '#aaa';
            countLabel.textContent = 'Traffic (reqs/min):';

            const countVal = document.createElement('span');
            countVal.style.fontSize = '14px';
            countVal.style.fontWeight = 'bold';
            countVal.textContent = String(trafficCount);

            statsGroup.appendChild(countLabel);
            statsGroup.appendChild(countVal);

            const payloadGroup = document.createElement('div');
            payloadGroup.style.marginBottom = '12px';

            const payloadTitle = document.createElement('div');
            payloadTitle.style.fontSize = '12px';
            payloadTitle.style.color = '#aaa';
            payloadTitle.style.marginBottom = '4px';
            payloadTitle.textContent = 'Recent Payloads:';

            const payloadList = document.createElement('div');
            payloadList.style.maxHeight = '100px';
            payloadList.style.overflowY = 'auto';
            payloadList.style.background = '#1e1e1e';
            payloadList.style.border = '1px solid #444';
            payloadList.style.borderRadius = '4px';
            payloadList.style.padding = '4px';

            if (lastPayloads.length === 0) {
                const empty = document.createElement('div');
                empty.style.color = '#777';
                empty.style.fontSize = '11px';
                empty.style.padding = '4px';
                empty.textContent = 'No payloads received yet.';
                payloadList.appendChild(empty);
            } else {
                lastPayloads.forEach((payload: any) => {
                    const pre = document.createElement('pre');
                    pre.style.margin = '2px 0';
                    pre.style.padding = '4px';
                    pre.style.background = '#2d2d2d';
                    pre.style.borderRadius = '2px';
                    pre.style.fontSize = '10px';
                    pre.style.color = '#a5d6a7';
                    pre.textContent = JSON.stringify(payload).slice(0, 50) + '...';
                    payloadList.appendChild(pre);
                });
            }

            payloadGroup.appendChild(payloadTitle);
            payloadGroup.appendChild(payloadList);

            const testBtn = document.createElement('button');
            testBtn.textContent = 'Send Test Request';
            testBtn.style.width = '100%';
            testBtn.style.padding = '8px';
            testBtn.style.background = '#4caf50';
            testBtn.style.color = 'white';
            testBtn.style.border = 'none';
            testBtn.style.borderRadius = '4px';
            testBtn.style.cursor = 'pointer';
            testBtn.style.fontWeight = 'bold';

            testBtn.addEventListener('click', () => {
                const p = this.parameters || {};
                const currentCount = p.trafficCount || 0;
                const payloads = p.lastPayloads || [];
                const newPayload = { id: Math.random().toString(36).substr(2, 6), timestamp: Date.now() };

                this.parameters = {
                    ...p,
                    trafficCount: currentCount + 1,
                    lastPayloads: [newPayload, ...payloads].slice(0, 5) // Keep last 5
                };

                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'trafficCount', value: this.parameters.trafficCount });
                this.renderHtmlContent(level); // Re-render
            });

            this.domElement.appendChild(header);
            this.domElement.appendChild(statsGroup);
            this.domElement.appendChild(payloadGroup);
            this.domElement.appendChild(testBtn);

            this.domElement.style.background = 'rgba(30, 30, 30, 0.95)';
            this.domElement.style.border = '2px solid #4caf50';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);

        // GSAP Portal animation if running
        if (spec.parameters && spec.parameters.status === 'running' && this.portalMesh) {
             if (!this.orbitTween) {
                 this.orbitTween = gsap.to(this.portalMesh.rotation, {
                    z: this.portalMesh.rotation.z + Math.PI * 2,
                    duration: 2,
                    repeat: -1,
                    ease: "linear"
                 });
             }
             if (!this.glowTween) {
                 this.glowTween = gsap.to(this.portalMesh.material, {
                     opacity: 1,
                     duration: 0.5,
                     yoyo: true,
                     repeat: -1
                 });
             }
        } else if (this.portalMesh) {
             if (this.orbitTween) {
                 this.orbitTween.kill();
                 this.orbitTween = undefined;
             }
             if (this.glowTween) {
                 this.glowTween.kill();
                 this.glowTween = undefined;
             }
             (this.portalMesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }

        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('div[style*="Live Traffic"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.currentLevel = level;
        this.renderHtmlContent(level);
    }

    dispose(): void {
        super.dispose();
        if (this.orbitTween) this.orbitTween.kill();
        if (this.glowTween) this.glowTween.kill();
    }
}
