import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export interface HUDElementOptions {
    id: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center' | 'left-center' | 'right-center';
    html?: string;
    element?: HTMLElement;
    style?: Partial<CSSStyleDeclaration>;
}

export class HUDPlugin implements ISpaceGraphPlugin {
    readonly id = 'hud-plugin';
    readonly name = 'Heads Up Display';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private container!: HTMLElement;
    private elements: Map<string, { el: HTMLElement; options: HUDElementOptions }> = new Map();

    init(sg: SpaceGraph): void {
        this.sg = sg;
        if (typeof document === 'undefined') return;

        this.container = document.createElement('div');
        this.container.className = 'spacegraph-hud-container';
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Let clicks pass through to the canvas by default
            zIndex: '9998', // Just below the vision overlay which is 9999
            overflow: 'hidden'
        });

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.style.position = 'relative';
            domElement.parentElement.appendChild(this.container);
        }
    }

    /**
     * Adds an element to the HUD.
     */
    addElement(options: HUDElementOptions): HTMLElement {
        if (this.elements.has(options.id)) {
            this.removeElement(options.id);
        }

        const el = options.element || document.createElement('div');
        el.id = `sg-hud-${options.id}`;

        // Base styling for all HUD elements
        Object.assign(el.style, {
            position: 'absolute',
            pointerEvents: 'auto', // Enable pointer events for the HUD element itself
        });

        if (options.html) {
            el.innerHTML = options.html;
        }

        this.applyPosition(el, options.position);

        if (options.style) {
            Object.assign(el.style, options.style);
        }

        this.container.appendChild(el);
        this.elements.set(options.id, { el, options });

        return el;
    }

    /**
     * Updates an existing HUD element's HTML content or position.
     */
    updateElement(id: string, updates: Partial<HUDElementOptions>): HTMLElement | null {
        const item = this.elements.get(id);
        if (!item) return null;

        if (updates.html !== undefined) {
            item.el.innerHTML = updates.html;
            item.options.html = updates.html;
        }

        if (updates.position) {
            this.applyPosition(item.el, updates.position);
            item.options.position = updates.position;
        }

        if (updates.style) {
            Object.assign(item.el.style, updates.style);
            item.options.style = { ...item.options.style, ...updates.style };
        }

        return item.el;
    }

    /**
     * Removes an element from the HUD by ID.
     */
    removeElement(id: string): void {
        const item = this.elements.get(id);
        if (item) {
            if (this.container.contains(item.el)) {
                this.container.removeChild(item.el);
            }
            this.elements.delete(id);
        }
    }

    /**
     * Retrieves an existing HUD element's DOM node.
     */
    getElement(id: string): HTMLElement | null {
        return this.elements.get(id)?.el || null;
    }

    private applyPosition(el: HTMLElement, position: HUDElementOptions['position']) {
        // Reset positioning
        el.style.top = '';
        el.style.bottom = '';
        el.style.left = '';
        el.style.right = '';
        el.style.transform = '';

        const margin = '16px';

        switch (position) {
            case 'top-left':
                el.style.top = margin;
                el.style.left = margin;
                break;
            case 'top-right':
                el.style.top = margin;
                el.style.right = margin;
                break;
            case 'bottom-left':
                el.style.bottom = margin;
                el.style.left = margin;
                break;
            case 'bottom-right':
                el.style.bottom = margin;
                el.style.right = margin;
                break;
            case 'center':
                el.style.top = '50%';
                el.style.left = '50%';
                el.style.transform = 'translate(-50%, -50%)';
                break;
            case 'top-center':
                el.style.top = margin;
                el.style.left = '50%';
                el.style.transform = 'translateX(-50%)';
                break;
            case 'bottom-center':
                el.style.bottom = margin;
                el.style.left = '50%';
                el.style.transform = 'translateX(-50%)';
                break;
            case 'left-center':
                el.style.top = '50%';
                el.style.left = margin;
                el.style.transform = 'translateY(-50%)';
                break;
            case 'right-center':
                el.style.top = '50%';
                el.style.right = margin;
                el.style.transform = 'translateY(-50%)';
                break;
        }
    }

    dispose(): void {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        this.elements.clear();
    }
}
