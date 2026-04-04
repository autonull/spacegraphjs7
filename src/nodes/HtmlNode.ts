import { DOMUtils } from '../utils/DOMUtils';
import { clamp } from '../utils/math';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { DOMNode } from './DOMNode';

export interface LabelLodLevel {
    distance: number;
    scale?: number;
    style?: string;
}

export class HtmlNode extends DOMNode {
    public static MIN_SIZE = { width: 80, height: 40 };
    public static CONTENT_SCALE_RANGE = { min: 0.3, max: 3.0 };

    public size = { width: 160, height: 70 };
    public billboard = false;
    public labelLod: LabelLodLevel[] = [];
    private resizeHandle: HTMLElement | null = null;
    private contentWrapper: HTMLElement | null = null;
    private controlsWrapper: HTMLElement | null = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const width = (spec.data?.width as number) ?? 200;
        const height = (spec.data?.height as number) ?? 100;
        const div = DOMUtils.createElement('div');
        super(sg, spec, div, width, height, { visible: false });

        this.size = { width, height };

        this.domElement.className = `spacegraph-html-node node-common ${(spec.data?.className as string) ?? ''}`;
        this.domElement.id = `node-html-${spec.id}`;
        this.domElement.dataset.nodeId = spec.id;

        this.setupContainerStyles(width, height, 'dark', {
            backgroundColor: (spec.data?.color as string) ?? 'rgba(51, 102, 255, 0.8)',
            color: 'white',
            border: '2px solid white',
            padding: '0',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: (spec.data?.pointerEvents as string) ?? 'auto',
            ...((spec.data?.style as Record<string, string>) ?? {}),
        });

        this._createInnerContent(spec);
        this._createControls();
        this._createResizeHandle();

        const data = (spec.data as SpaceGraphNodeData) ?? {};
        if (data.contentScale) {
            this.setContentScale(data.contentScale as number);
        }

        if (data.billboard) {
            this.billboard = data.billboard as boolean;
        }

        if (data.labelLod) {
            this.labelLod = data.labelLod as LabelLodLevel[];
        }

        this._applyNodeBgColor((spec.data?.color as string) ?? 'rgba(51, 102, 255, 0.8)');

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _createInnerContent(spec: NodeSpec): void {
        const wrapper = DOMUtils.createElement('div');
        wrapper.className = 'node-inner-wrapper';

        const contentWrapper = DOMUtils.createElement('div');
        contentWrapper.className = 'node-content';
        const data = (spec.data as SpaceGraphNodeData) ?? {};
        contentWrapper.style.transform = `scale(${(data.contentScale as number) ?? 1.0})`;
        contentWrapper.style.transformOrigin = 'center center';

        if (data.html) {
            contentWrapper.innerHTML = data.html as string;
            Object.assign(this.domElement.style, {
                display: 'block',
                padding: '0',
                border: 'none',
                backgroundColor: 'transparent',
            });
        } else if (data.editable) {
            contentWrapper.contentEditable = 'true';
            contentWrapper.spellcheck = false;
            contentWrapper.textContent = (data.content as string) ?? spec.label ?? 'HTML Node';

            let debounceTimer: ReturnType<typeof setTimeout>;
            contentWrapper.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data = { ...this.data, content: contentWrapper.innerHTML };
                    this.sg?.events.emit('node:dataChanged', {
                        node: this,
                        property: 'content',
                        value: contentWrapper.innerHTML,
                    });
                }, 300);
            });

            contentWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
            contentWrapper.addEventListener('touchstart', (e) => e.stopPropagation(), {
                passive: true,
            });
            contentWrapper.addEventListener(
                'wheel',
                (e) => {
                    const isScrollable =
                        contentWrapper.scrollHeight > contentWrapper.clientHeight ||
                        contentWrapper.scrollWidth > contentWrapper.clientWidth;
                    const canScrollY =
                        (e.deltaY < 0 && contentWrapper.scrollTop > 0) ||
                        (e.deltaY > 0 &&
                            contentWrapper.scrollTop <
                                contentWrapper.scrollHeight - contentWrapper.clientHeight);
                    const canScrollX =
                        (e.deltaX < 0 && contentWrapper.scrollLeft > 0) ||
                        (e.deltaX > 0 &&
                            contentWrapper.scrollLeft <
                                contentWrapper.scrollWidth - contentWrapper.clientWidth);
                    if (isScrollable && (canScrollY || canScrollX)) {
                        e.stopPropagation();
                    }
                },
                { passive: false },
            );
        } else {
            contentWrapper.textContent = (data.content as string) ?? spec.label ?? 'HTML Node';
        }

        wrapper.appendChild(contentWrapper);
        this.domElement.appendChild(wrapper);
        this.contentWrapper = contentWrapper;
    }

    private _createControls(): void {
        const controls = DOMUtils.createElement('div');
        controls.className = 'node-controls';
        controls.style.cssText = `
            position: absolute;
            top: -30px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        `;

        const buttons = [
            {
                class: 'node-content-zoom-in',
                title: 'Zoom In Content (+)',
                icon: '➕',
                action: () => this.adjustContentScale(1.15),
            },
            {
                class: 'node-content-zoom-out',
                title: 'Zoom Out Content (-)',
                icon: '➖',
                action: () => this.adjustContentScale(1 / 1.15),
            },
            {
                class: 'node-grow',
                title: 'Grow Node (Ctrl++)',
                icon: '↗️',
                action: () => this.adjustNodeSize(1.2),
            },
            {
                class: 'node-shrink',
                title: 'Shrink Node (Ctrl+-)',
                icon: '↙️',
                action: () => this.adjustNodeSize(1 / 1.2),
            },
            {
                class: 'node-delete',
                title: 'Delete Node (Del)',
                icon: '🗑️',
                action: () => this._requestDelete(),
            },
        ];

        buttons.forEach(({ class: cls, title, icon, action }) => {
            const button = DOMUtils.createElement('button');
            button.className = `node-quick-button ${cls}`;
            button.title = title;
            button.textContent = icon;
            button.style.cssText = `
                background: rgba(0,0,0,0.7);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                color: white;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 12px;
                pointer-events: auto;
            `;
            button.onclick = (e) => {
                e.stopPropagation();
                action();
            };
            controls.appendChild(button);
        });

        this.domElement.appendChild(controls);
        this.controlsWrapper = controls;

        this.domElement.addEventListener('mouseenter', () => {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
        });

        this.domElement.addEventListener('mouseleave', () => {
            controls.style.opacity = '0';
            controls.style.pointerEvents = 'none';
        });
    }

    private _createResizeHandle(): void {
        const handle = DOMUtils.createElement('div');
        handle.className = 'resize-handle';
        handle.title = 'Resize Node';
        handle.style.cssText = `
            position: absolute;
            right: -6px;
            bottom: -6px;
            width: 12px;
            height: 12px;
            background: white;
            border: 1px solid #333;
            border-radius: 2px;
            cursor: nwse-resize;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 10;
        `;

        this.domElement.appendChild(handle);
        this.resizeHandle = handle;

        this.domElement.addEventListener('mouseenter', () => {
            handle.style.opacity = '1';
        });
        this.domElement.addEventListener('mouseleave', () => {
            handle.style.opacity = '0';
        });
    }

    private _requestDelete(): void {
        this.sg?.events.emit('ui:request:confirm', {
            message: `Delete node "${this.id.substring(0, 10)}..."?`,
            onConfirm: () => {
                this.sg?.events.emit('node:delete', { node: this });
            },
        });
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        const data = (updates.data as SpaceGraphNodeData) ?? {};

        if (updates.data) {
            if (data.color) {
                this.domElement.style.backgroundColor = data.color as string;
            }
            if (data.className !== undefined) {
                this.domElement.className = `spacegraph-html-node node-common ${data.className as string}`;
            }
            if (data.pointerEvents) {
                this.domElement.style.pointerEvents = data.pointerEvents as string;
            }
            if (data.width || data.height) {
                const w = (data.width as number) ?? (this.data.width as number) ?? 200;
                const h = (data.height as number) ?? (this.data.height as number) ?? 100;
                this.setSize(w, h);
            }
            if (data.contentScale !== undefined) {
                this.setContentScale(data.contentScale as number);
            }
            if (data.billboard !== undefined) {
                this.billboard = data.billboard as boolean;
            }
            if (data.labelLod !== undefined) {
                this.labelLod = data.labelLod as LabelLodLevel[];
            }
            if (data.color !== undefined) {
                this._applyNodeBgColor(data.color as string);
            }
            if (data.html !== undefined && this.contentWrapper) {
                this.contentWrapper.innerHTML = data.html as string;
            } else if (
                data.content !== undefined &&
                this.contentWrapper &&
                !this.contentWrapper.isContentEditable
            ) {
                this.contentWrapper.textContent = data.content as string;
            }
        }

        if (
            updates.label !== undefined &&
            this.contentWrapper &&
            !this.contentWrapper.isContentEditable
        ) {
            this.contentWrapper.textContent = updates.label;
        }

        return this;
    }

    setSize(width: number, height: number, scaleContent = false): void {
        const oldSize = { ...this.size };
        const oldArea = oldSize.width * oldSize.height;

        this.size.width = Math.max(HtmlNode.MIN_SIZE.width, width);
        this.size.height = Math.max(HtmlNode.MIN_SIZE.height, height);

        this.domElement.style.width = `${this.size.width}px`;
        this.domElement.style.height = `${this.size.height}px`;

        this.updateBackingGeometry(this.size.width, this.size.height);

        if (scaleContent && oldArea > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / oldArea);
            this.setContentScale(((this.data?.contentScale as number) ?? 1.0) * scaleFactor);
        }

        this.data = { ...this.data, width: this.size.width, height: this.size.height };
    }

    setContentScale(scale: number): void {
        const clampedScale = clamp(
            scale,
            HtmlNode.CONTENT_SCALE_RANGE.min,
            HtmlNode.CONTENT_SCALE_RANGE.max,
        );
        this.data = { ...this.data, contentScale: clampedScale };

        if (this.contentWrapper) {
            this.contentWrapper.style.transform = `scale(${clampedScale})`;
        }

        this.sg?.events.emit('node:dataChanged', {
            node: this,
            property: 'contentScale',
            value: clampedScale,
        });
    }

    adjustContentScale(deltaFactor: number): void {
        this.setContentScale(((this.data?.contentScale as number) ?? 1.0) * deltaFactor);
    }

    adjustNodeSize(factor: number): void {
        this.setSize(this.size.width * factor, this.size.height * factor, false);
    }

    startResize(): void {
        this.domElement?.classList.add('resizing');
        this.data.pinned = true;
        this.sg?.events.emit('node:resizestart', { node: this });
    }

    resize(newWidth: number, newHeight: number): void {
        this.setSize(newWidth, newHeight);
        this.sg?.events.emit('node:resized', { node: this, size: { ...this.size } });
    }

    endResize(): void {
        this.domElement?.classList.remove('resizing');
        this.data.pinned = false;
        this.sg?.events.emit('node:resizeend', { node: this, finalSize: { ...this.size } });
    }

    startDrag(): void {
        this.domElement?.classList.add('dragging');
    }

    endDrag(): void {
        this.domElement?.classList.remove('dragging');
    }

    setSelectedStyle(selected: boolean): void {
        this.domElement?.classList.toggle('selected', selected);
    }

    updatePosition(x: number, y: number, z: number): this {
        super.updatePosition(x, y, z);

        if (this.billboard && this.sg?.renderer?.camera) {
            this.cssObject.quaternion.copy(this.sg.renderer.camera.quaternion);
        }

        return this;
    }

    getBoundingSphereRadius(): number {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    getResizeHandle(): HTMLElement | null {
        return this.resizeHandle;
    }

    private _applyNodeBgColor(color: string): void {
        this.domElement.style.setProperty('--node-bg', color);
    }

    setBackgroundColor(color: string): void {
        this.data = { ...this.data, color };
        this._applyNodeBgColor(color);
        this.sg?.events.emit('node:dataChanged', {
            node: this,
            property: 'backgroundColor',
            value: color,
        });
    }

    updateLod(_distance: number): void {
        if (!this.labelLod.length) {
            if (this.contentWrapper) {
                const baseScale = (this.data?.contentScale as number) ?? 1.0;
                this.contentWrapper.style.transform = `scale(${baseScale})`;
            }
            this.domElement.style.visibility = '';
            return;
        }

        const sortedLodLevels = [...this.labelLod].sort(
            (a, b) => (b.distance ?? 0) - (a.distance ?? 0),
        );
        const camera = this.sg?.renderer?.camera;
        if (!camera) return;

        const distanceToCamera = this.position.distanceTo(camera.position);

        let ruleApplied = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance ?? 0)) {
                this.domElement.style.visibility = level.style?.includes('visibility:hidden')
                    ? 'hidden'
                    : '';
                if (this.contentWrapper) {
                    const baseScale = (this.data?.contentScale as number) ?? 1.0;
                    this.contentWrapper.style.transform = `scale(${baseScale * (level.scale ?? 1.0)})`;
                }
                ruleApplied = true;
                break;
            }
        }

        if (!ruleApplied) {
            this.domElement.style.visibility = '';
            if (this.contentWrapper) {
                const baseScale = (this.data?.contentScale as number) ?? 1.0;
                this.contentWrapper.style.transform = `scale(${baseScale})`;
            }
        }
    }

    dispose(): void {
        this.resizeHandle?.remove();
        this.controlsWrapper?.remove();
        this.contentWrapper?.remove();
        super.dispose();
    }
}
