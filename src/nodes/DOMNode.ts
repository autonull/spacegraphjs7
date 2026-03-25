import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class DOMNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    public meshGeometry: THREE.PlaneGeometry;
    public meshMaterial: THREE.MeshBasicMaterial;
    public backingMesh: THREE.Mesh;

    /**
     * Helper to set up standard FZUI container styles.
     */
    protected setupContainerStyles(
        width: number,
        height: number,
        theme: 'dark' | 'light' = 'dark',
        customStyles: Partial<CSSStyleDeclaration> = {},
    ): void {
        const isDark = theme === 'dark';
        const bgColor = isDark ? '#1e293b' : '#ffffff';
        const borderColor = isDark ? '#334155' : '#e2e8f0';
        const textColor = isDark ? '#f8fafc' : '#0f172a';

        Object.assign(this.domElement.style, {
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'var(--node-bg, ' + bgColor + ')',
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
            ...customStyles,
        });
    }

    /**
     * Helper to create a standard FZUI title bar.
     */
    protected createTitleBar(title: string, theme: 'dark' | 'light' = 'dark'): HTMLElement {
        const isDark = theme === 'dark';
        const headerColor = isDark ? '#0f172a' : '#f1f5f9';
        const borderColor = isDark ? '#334155' : '#e2e8f0';
        const titleColor = isDark ? '#94a3b8' : '#64748b';

        const titleBar = DOMUtils.createElement('div');
        Object.assign(titleBar.style, {
            background: headerColor,
            padding: '8px 12px',
            fontWeight: '600',
            fontSize: '13px',
            color: titleColor,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            flexShrink: '0',
            userSelect: 'none',
        });

        const titleSpan = DOMUtils.createElement('span');
        titleSpan.textContent = title;
        titleSpan.className = 'sg-node-title';
        titleBar.appendChild(titleSpan);

        return titleBar;
    }

    constructor(
        sg: SpaceGraph,
        spec: NodeSpec,
        domElement: HTMLElement,
        width: number = 200,
        height: number = 100,
        materialParams?: THREE.MeshBasicMaterialParameters,
    ) {
        super(sg, spec);

        this.domElement = domElement;
        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        this.meshGeometry = new THREE.PlaneGeometry(width, height);

        // Provide standard defaults but allow overrides
        const defaultTranslucency =
            materialParams?.visible === false
                ? {}
                : { color: 0x000000, opacity: 0.1, transparent: true };
        this.meshMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            ...defaultTranslucency,
            ...materialParams,
        });

        this.backingMesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
        this.object.add(this.backingMesh);

        this._setupPointerEventRelay(sg);
    }

    /**
     * Relay pointer events from this DOM element to the WebGL canvas so that
     * InteractionPlugin's raycaster-based hover and drag detection works for
     * DOM-backed nodes. Without this, the HTML element captures all pointer
     * events and the canvas never sees them.
     *
     * - mouseenter / mouseleave: synthetic pointermove to canvas triggers raycasting
     * - pointerdown/move/up:     relayed with pointer capture for smooth drag
     * - dblclick / contextmenu: relayed for semantic navigation and context menus
     */
    private _setupPointerEventRelay(sg: SpaceGraph): void {
        if (!sg?.renderer?.renderer?.domElement) return;

        const canvas = sg.renderer.renderer.domElement as HTMLCanvasElement;
        const el = this.domElement;

        const relayPointer = (type: string, src: PointerEvent) => {
            canvas.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: false,
                    cancelable: true,
                    clientX: src.clientX,
                    clientY: src.clientY,
                    pointerId: src.pointerId,
                    pointerType: src.pointerType,
                    isPrimary: src.isPrimary,
                    button: src.button,
                    buttons: src.buttons,
                    ctrlKey: src.ctrlKey,
                    shiftKey: src.shiftKey,
                    altKey: src.altKey,
                    metaKey: src.metaKey,
                }),
            );
        };

        // Hover enter: dispatch pointermove at real coords to trigger raycasting
        el.addEventListener('mouseenter', (e) => {
            canvas.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: false,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                }),
            );
        });

        // Hover leave: dispatch pointermove at an off-screen coordinate so the
        // raycaster finds nothing and InteractionPlugin emits node:pointerleave.
        el.addEventListener('mouseleave', () => {
            canvas.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: false,
                    clientX: -99999,
                    clientY: -99999,
                }),
            );
        });

        // Drag: capture pointer so subsequent move/up events stay on this element,
        // then relay each one to the canvas so InteractionPlugin handles dragging.
        el.addEventListener('pointerdown', (e) => {
            el.setPointerCapture(e.pointerId);
            relayPointer('pointerdown', e);
        });

        el.addEventListener('pointermove', (e) => {
            relayPointer('pointermove', e);
        });

        el.addEventListener('pointerup', (e) => {
            relayPointer('pointerup', e);
        });

        el.addEventListener('pointercancel', (e) => {
            relayPointer('pointercancel', e);
        });

        // Semantic navigation on double-click
        el.addEventListener('dblclick', (e) => {
            canvas.dispatchEvent(
                new MouseEvent('dblclick', {
                    bubbles: false,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                }),
            );
        });

        // Context menu
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            canvas.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: false,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                }),
            );
        });
    }

    protected updateBackingGeometry(width: number, height: number): void {
        if (this.meshGeometry) this.meshGeometry.dispose();
        this.meshGeometry = new THREE.PlaneGeometry(width, height);
        this.backingMesh.geometry = this.meshGeometry;
    }

    public setVisibility(visible: boolean): void {
        this.cssObject.visible = visible;
        this.domElement.style.display = visible ? 'flex' : 'none';
        this.backingMesh.visible = visible;
    }

    public updateLod(_distance: number): void {
        // Base implementation for LOD distance updates. Overridden by subclasses.
    }

    dispose(): void {
        if (this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }
        if (this.meshGeometry) this.meshGeometry.dispose();
        if (this.meshMaterial) this.meshMaterial.dispose();
        super.dispose();
    }
}
