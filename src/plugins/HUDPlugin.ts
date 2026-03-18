import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

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

        this.container = DOMUtils.createElement('div', {
            className: 'spacegraph-hud-container',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Let clicks pass through to the canvas by default
                zIndex: '9998', // Just below the vision overlay which is 9999
                overflow: 'hidden'
            }
        });

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.style.position = 'relative';
            domElement.parentElement.appendChild(this.container);
        }

        this.alertsContainer = DOMUtils.createElement('div', {
            className: 'spacegraph-alerts-container',
            style: {
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none',
                zIndex: '10000'
            }
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

        let el = options.element;
        if (!el) {
            el = DOMUtils.createElement('div', {
                id: `sg-hud-${options.id}`,
                style: {
                    position: 'absolute',
                    pointerEvents: 'auto', // Enable pointer events for the HUD element itself
                },
                innerHTML: options.html
            });

            if (options.style) {
                Object.assign(el.style, options.style);
            }
        } else {
            el.id = `sg-hud-${options.id}`;
            Object.assign(el.style, {
                position: 'absolute',
                pointerEvents: 'auto',
            });
            if (options.html) el.innerHTML = options.html;
            if (options.style) Object.assign(el.style, options.style);
        }

        this.applyPosition(el, options.position);

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

    private _createModalOverlay(): HTMLElement {
        return DOMUtils.createElement('div', {
            id: 'spacegraph-modal-overlay',
            style: {
                position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: '10003', pointerEvents: 'auto', opacity: '0', transition: 'opacity 0.2s ease'
            }
        });
    }

    private _createModalContainer(width?: string): HTMLElement {
        return DOMUtils.createElement('div', {
            style: {
                background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
                width: width || '400px', maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif',
                transform: 'scale(0.95)', transition: 'transform 0.2s ease'
            }
        });
    }

    private _createModalHeader(titleText: string, onClose?: () => void): HTMLElement {
        const header = DOMUtils.createElement('div', {
            style: {
                padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)'
            }
        });

        const title = DOMUtils.createElement('h3', {
            textContent: titleText,
            style: { margin: '0', color: '#f8fafc', fontSize: '16px' }
        });
        header.appendChild(title);

        const closeBtn = DOMUtils.createElement('button', {
            innerHTML: '✕',
            style: { background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }
        });
        closeBtn.onmouseenter = () => closeBtn.style.color = 'white';
        closeBtn.onmouseleave = () => closeBtn.style.color = '#94a3b8';
        closeBtn.onclick = () => {
            if (onClose) onClose();
            this.hideModal();
        };
        header.appendChild(closeBtn);
        return header;
    }

    /**
     * Shows a centralized modal overlay with backdrop.
     */
    showModal(options: { title: string; html: string; width?: string; onClose?: () => void }) {
        if (typeof document === 'undefined') return;

        this.hideModal();

        const overlay = this._createModalOverlay();
        const modal = this._createModalContainer(options.width);
        const header = this._createModalHeader(options.title, options.onClose);

        modal.appendChild(header);

        const body = DOMUtils.createElement('div', {
            innerHTML: options.html,
            style: { padding: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }
        });
        modal.appendChild(body);

        overlay.appendChild(modal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (options.onClose) options.onClose();
                this.hideModal();
            }
        });

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.appendChild(overlay);
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
        }
    }

    hideModal() {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('spacegraph-modal-overlay');
        if (existing && existing.parentElement) {
            existing.style.opacity = '0';
            existing.children[0].setAttribute('style', existing.children[0].getAttribute('style') + '; transform: scale(0.95)');
            setTimeout(() => {
                if (existing.parentElement) existing.parentElement.removeChild(existing);
            }, 200);
        }
    }

    private _createLoadingOverlay(message: string): HTMLElement {
        const overlay = DOMUtils.createElement('div', {
            id: 'spacegraph-loading-overlay',
            style: {
                position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(2px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                zIndex: '10004', pointerEvents: 'auto', color: 'white', fontFamily: 'sans-serif'
            }
        });

        const spinner = DOMUtils.createElement('div', {
            style: {
                width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)',
                borderTop: '4px solid #3b82f6', borderRadius: '50%', marginBottom: '16px',
                animation: 'sg-spin 1s linear infinite'
            }
        });

        if (!document.getElementById('sg-spin-keyframes')) {
            const keyframes = DOMUtils.createElement('style', {
                id: 'sg-spin-keyframes',
                innerHTML: `@keyframes sg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`
            });
            document.head.appendChild(keyframes);
        }

        const text = DOMUtils.createElement('div', {
            textContent: message,
            style: { fontSize: '14px', color: '#cbd5e1' }
        });

        overlay.appendChild(spinner);
        overlay.appendChild(text);

        return overlay;
    }

    /**
     * Shows a generic blocking loading overlay with a message.
     */
    showLoading(message: string = 'Loading...') {
        if (typeof document === 'undefined') return;

        this.hideLoading();
        const overlay = this._createLoadingOverlay(message);

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.appendChild(overlay);
        }
    }

    hideLoading() {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('spacegraph-loading-overlay');
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
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

        const alertStyles: Record<string, { bg: string, border: string }> = {
            'info': { bg: '#1e293b', border: '#334155' },
            'success': { bg: 'rgba(22, 163, 74, 0.9)', border: '#4ade80' },
            'warning': { bg: 'rgba(217, 119, 6, 0.9)', border: '#fbbf24' },
            'error': { bg: 'rgba(220, 38, 38, 0.9)', border: '#f87171' },
        };
        const style = alertStyles[type] || alertStyles['info'];

        const alert = DOMUtils.createElement('div', {
            className: `spacegraph-alert alert-${type}`,
            textContent: message,
            style: {
                background: style.bg,
                border: `1px solid ${style.border}`,
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
            }
        });
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

        const tooltip = DOMUtils.createElement('div', {
            id: 'spacegraph-tooltip',
            textContent: text,
            style: {
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
            }
        });

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

        const menu = DOMUtils.createElement('div', {
            id: 'spacegraph-context-menu',
            style: {
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
            }
        });

        for (const item of items) {
            const btn = DOMUtils.createElement('button', {
                textContent: item.label,
                style: {
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
                }
            });
            btn.onmouseenter = () => { btn.style.background = '#334155'; };
            btn.onmouseleave = () => { btn.style.background = 'transparent'; };
            btn.onclick = (e) => {
                e.stopPropagation();
                this.hideContextMenu();
                item.action();
            };
            menu.appendChild(btn);
        }

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
