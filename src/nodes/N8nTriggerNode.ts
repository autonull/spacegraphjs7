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

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '🔗';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#4caf50' });
            el.textContent = '🔗 Webhook';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.8)', border: '2px solid #4caf50' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', color: '#4caf50' });
            title.textContent = '🔗 Webhook Trigger';

            const badge = document.createElement('span');
            setStyles(badge, {
                background: isRunning ? '#ffeb3b' : '#388e3c', color: isRunning ? 'black' : 'white',
                padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
            });
            badge.textContent = isRunning ? 'Running' : 'Listening';

            header.append(title, badge);

            const traffic = document.createElement('div');
            setStyles(traffic, { fontSize: '12px', color: '#aaa' });
            traffic.textContent = `Live Traffic: ${trafficCount} reqs/min`;

            this.domElement.append(header, traffic);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #4caf50' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px', color: '#4caf50' });
            title.textContent = '🔗 Webhook Entry';

            const badge = document.createElement('span');
            setStyles(badge, {
                background: isRunning ? '#ffeb3b' : '#388e3c', color: isRunning ? 'black' : 'white',
                padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
            });
            badge.textContent = isRunning ? 'Running' : 'Listening';
            header.append(title, badge);

            const statsGroup = document.createElement('div');
            setStyles(statsGroup, { display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', marginBottom: '12px' });
            const countLabel = document.createElement('span');
            setStyles(countLabel, { fontSize: '12px', color: '#aaa' });
            countLabel.textContent = 'Traffic (reqs/min):';
            const countVal = document.createElement('span');
            setStyles(countVal, { fontSize: '14px', fontWeight: 'bold' });
            countVal.textContent = String(trafficCount);
            statsGroup.append(countLabel, countVal);

            const payloadGroup = document.createElement('div');
            setStyles(payloadGroup, { marginBottom: '12px' });
            const payloadTitle = document.createElement('div');
            setStyles(payloadTitle, { fontSize: '12px', color: '#aaa', marginBottom: '4px' });
            payloadTitle.textContent = 'Recent Payloads:';
            const payloadList = document.createElement('div');
            setStyles(payloadList, { maxHeight: '100px', overflowY: 'auto', background: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '4px' });

            if (!lastPayloads.length) {
                const empty = document.createElement('div');
                setStyles(empty, { color: '#777', fontSize: '11px', padding: '4px' });
                empty.textContent = 'No payloads received yet.';
                payloadList.appendChild(empty);
            } else {
                lastPayloads.forEach((payload: any) => {
                    const pre = document.createElement('pre');
                    setStyles(pre, { margin: '2px 0', padding: '4px', background: '#2d2d2d', borderRadius: '2px', fontSize: '10px', color: '#a5d6a7' });
                    pre.textContent = JSON.stringify(payload).slice(0, 50) + '...';
                    payloadList.appendChild(pre);
                });
            }
            payloadGroup.append(payloadTitle, payloadList);

            const testBtn = document.createElement('button');
            testBtn.textContent = 'Send Test Request';
            setStyles(testBtn, { width: '100%', padding: '8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' });

            testBtn.addEventListener('click', () => {
                const p = this.parameters || {};
                this.parameters = {
                    ...p,
                    trafficCount: (p.trafficCount || 0) + 1,
                    lastPayloads: [{ id: Math.random().toString(36).substr(2, 6), timestamp: Date.now() }, ...(p.lastPayloads || [])].slice(0, 5)
                };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'trafficCount', value: this.parameters.trafficCount });
                this.renderHtmlContent(level);
            });

            this.domElement.append(header, statsGroup, payloadGroup, testBtn);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.95)', border: '2px solid #4caf50' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);

        if (spec.parameters?.status === 'running' && this.portalMesh) {
             this.orbitTween ??= gsap.to(this.portalMesh.rotation, { z: this.portalMesh.rotation.z + Math.PI * 2, duration: 2, repeat: -1, ease: "linear" });
             this.glowTween ??= gsap.to(this.portalMesh.material, { opacity: 1, duration: 0.5, yoyo: true, repeat: -1 });
        } else if (this.portalMesh) {
             this.orbitTween?.kill();
             this.glowTween?.kill();
             this.orbitTween = this.glowTween = undefined;
             (this.portalMesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }

        const level = this.domElement?.querySelector('button') ? 'full' : (this.domElement?.querySelector('div[style*="Live Traffic"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.currentLevel = level;
        this.renderHtmlContent(level);
    }

    dispose(): void {
        super.dispose();
        this.orbitTween?.kill();
        this.glowTween?.kill();
    }
}
