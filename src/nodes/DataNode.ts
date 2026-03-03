import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * DataNode — Displays a key-value table or arbitrary JSON/object.
 *
 * data options:
 *   fields    : Record<string, any> — key-value pairs to display
 *   maxFields : max rows before truncating (default 8)
 *   width     : pixel width  (default 220)
 *   color     : header background CSS color (default '#0f172a')
 */
export class DataNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    private backing: THREE.Mesh;
    private readonly w: number;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.w = spec.data?.width ?? 220;
        this.domElement = this._buildDOM(spec);
        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        // Invisible backing for raycasting
        const h = parseInt(this.domElement.style.height) || 200;
        const geo = new THREE.PlaneGeometry(this.w, h);
        const mat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.backing = new THREE.Mesh(geo, mat);
        this.object.add(this.backing);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _buildDOM(spec: Partial<NodeSpec>): HTMLElement {
        const fields = spec.data?.fields ?? {};
        const maxFields = spec.data?.maxFields ?? 8;
        const headerBg = spec.data?.color ?? '#0f172a';
        const w = spec.data?.width ?? 220;

        const keys = Object.keys(fields).slice(0, maxFields);
        const rowH = 28;
        const headerH = 36;
        const totalH = headerH + rowH * Math.max(keys.length, 1) + 8;

        const root = document.createElement('div');
        root.className = 'sg-data-node';
        Object.assign(root.style, {
            width: `${w}px`,
            height: `${totalH}px`,
            background: '#1e293b',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e2e8f0',
            boxSizing: 'border-box',
        } as CSSStyleDeclaration);

        // Header
        const header = document.createElement('div');
        header.className = 'sg-data-header';
        Object.assign(header.style, {
            background: headerBg,
            padding: '8px 10px',
            fontWeight: 'bold',
            fontSize: '13px',
            color: '#94a3b8',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #334155',
        });
        header.textContent = spec.label ?? 'data';
        root.appendChild(header);

        // Rows
        for (const key of keys) {
            const row = document.createElement('div');
            row.className = 'sg-data-row';
            Object.assign(row.style, {
                display: 'flex',
                padding: '4px 10px',
                borderBottom: '1px solid #1e293b',
                alignItems: 'center',
                height: `${rowH}px`,
                boxSizing: 'border-box',
            });
            const k = document.createElement('span');
            k.style.color = '#7dd3fc';
            k.style.flex = '0 0 40%';
            k.style.overflow = 'hidden';
            k.style.textOverflow = 'ellipsis';
            k.textContent = key;

            const v = document.createElement('span');
            v.style.color = '#fbbf24';
            v.style.flex = '1';
            v.style.overflow = 'hidden';
            v.style.textOverflow = 'ellipsis';
            v.textContent = JSON.stringify(fields[key]);

            row.appendChild(k);
            row.appendChild(v);
            root.appendChild(row);
        }

        if (keys.length === 0) {
            const empty = document.createElement('div');
            empty.style.padding = '8px 10px';
            empty.style.color = '#475569';
            empty.textContent = '(no data)';
            root.appendChild(empty);
        }

        return root;
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.fields || updates.label !== undefined) {
            // Rebuild DOM in-place
            const oldDom = this.domElement;
            const parent = oldDom.parentNode;
            const newDom = this._buildDOM({
                data: { ...this.data, ...updates.data },
                label: updates.label ?? this.label
            });
            if (parent) parent.replaceChild(newDom, oldDom);
            (this.cssObject as any).element = newDom;
            (this as any).domElement = newDom;
        }
    }

    dispose(): void {
        this.domElement.parentNode?.removeChild(this.domElement);
        this.backing.geometry.dispose();
        (this.backing.material as THREE.Material).dispose();
        super.dispose();
    }
}
