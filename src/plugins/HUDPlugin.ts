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
    private alertsContainer!: HTMLElement;
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

        this.alertsContainer = document.createElement('div');
        this.alertsContainer.className = 'spacegraph-alerts-container';
        Object.assign(this.alertsContainer.style, {
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
            zIndex: '10000'
        });
        if (domElement.parentElement) {
            domElement.parentElement.appendChild(this.alertsContainer);
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

    /**
     * Displays a temporary alert/toast notification.
     * @param message Text to display
     * @param type Style variant
     * @param duration Time in ms before it disappears
     */
    showAlert(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 3000): void {
        if (!this.alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = `spacegraph-alert alert-${type}`;

        let bgColor = '#1e293b';
        let borderColor = '#334155';
        if (type === 'success') { bgColor = 'rgba(22, 163, 74, 0.9)'; borderColor = '#4ade80'; }
        else if (type === 'error') { bgColor = 'rgba(220, 38, 38, 0.9)'; borderColor = '#f87171'; }
        else if (type === 'warning') { bgColor = 'rgba(217, 119, 6, 0.9)'; borderColor = '#fbbf24'; }

        Object.assign(alert.style, {
            background: bgColor,
            border: `1px solid ${borderColor}`,
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '6px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            opacity: '0',
            transform: 'translateY(10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: 'auto'
        });

        alert.textContent = message;
        this.alertsContainer.appendChild(alert);

        // Animate in
        requestAnimationFrame(() => {
            alert.style.opacity = '1';
            alert.style.transform = 'translateY(0)';
        });

        // Remove after duration
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(10px)';
            setTimeout(() => {
                if (alert.parentElement) {
                    alert.parentElement.removeChild(alert);
                }
            }, 300); // Wait for fade out
        }, duration);
    }

    /**
     * Shows a tooltip at the given screen coordinates.
     */
    showTooltip(text: string, x: number, y: number): void {
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.id = 'spacegraph-tooltip';
        Object.assign(tooltip.style, {
            position: 'absolute',
            left: `${x + 15}px`,
            top: `${y + 15}px`,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#f1f5f9',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            pointerEvents: 'none', // tooltips shouldn't capture mouse
            zIndex: '10002',
            whiteSpace: 'pre-wrap',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        });
        tooltip.textContent = text;

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.appendChild(tooltip);
        }
    }

    hideTooltip(): void {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('spacegraph-tooltip');
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }

    /**
     * Shows a context menu at the given screen coordinates.
     */
    showContextMenu(items: Array<{ label: string; action: () => void }>, x: number, y: number): void {
        this.hideContextMenu(); // Close any existing

        const menu = document.createElement('div');
        menu.id = 'spacegraph-context-menu';
        Object.assign(menu.style, {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: '10001',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            minWidth: '120px',
            pointerEvents: 'auto'
        });

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.label;
            Object.assign(btn.style, {
                display: 'block',
                width: '100%',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: '#f1f5f9',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit'
            });
            btn.onmouseenter = () => { btn.style.background = '#334155'; };
            btn.onmouseleave = () => { btn.style.background = 'transparent'; };
            btn.onclick = (e) => {
                e.stopPropagation();
                this.hideContextMenu();
                item.action();
            };
            menu.appendChild(btn);
        });

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.appendChild(menu);
        }

        // Click anywhere to close
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                this.hideContextMenu();
                document.removeEventListener('pointerdown', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', closeMenu), 10);
    }

    hideContextMenu(): void {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('spacegraph-context-menu');
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }

    dispose(): void {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        if (this.alertsContainer && this.alertsContainer.parentElement) {
            this.alertsContainer.parentElement.removeChild(this.alertsContainer);
        }
        this.hideContextMenu();
        this.elements.clear();
    }
}
