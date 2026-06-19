import { DOMUtils } from '../../utils/DOMUtils';
import type { SpaceGraph } from '../../SpaceGraph';
import { HUD_STYLES, HUD_ANIMATIONS } from './HUDStyles';

/**
 * HUD DOM Factory
 * Centralized DOM creation utilities for HUD components
 */
export class HUDDOMFactory {
    static applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
        Object.assign(element.style, styles);
    }

    static createContainer(id?: string, className?: string): HTMLElement {
        return DOMUtils.createElement('div', {
            className,
            id,
            style: { ...HUD_STYLES.base, ...HUD_STYLES.container },
        });
    }

    static createInteractiveContainer(id?: string, className?: string): HTMLElement {
        return DOMUtils.createElement('div', {
            className,
            id,
            style: { ...HUD_STYLES.base, ...HUD_STYLES.interactive },
        });
    }

    static createButton(label: string, onClick?: () => void): HTMLButtonElement {
        const button = DOMUtils.createElement('button', {
            style: HUD_STYLES.button as Partial<CSSStyleDeclaration>,
        }) as HTMLButtonElement;

        button.textContent = label;
        button.type = 'button';

        if (onClick) {
            button.addEventListener('click', onClick);
        }

        button.onmouseenter = () => {
            button.style.background = '#334155';
        };
        button.onmouseleave = () => {
            button.style.background = 'transparent';
        };

        return button;
    }

    static createOverlay(id: string, zIndex: string): HTMLElement {
        const overlay = this.createContainer(id);
        overlay.style.zIndex = zIndex;
        overlay.style.inset = '0';
        return overlay;
    }

    static appendToRenderer(sg: SpaceGraph, element: HTMLElement): void {
        sg.renderer.renderer.domElement.parentElement?.appendChild(element);
    }

    static fadeIn(element: HTMLElement): void {
        this.applyStyles(element, HUD_ANIMATIONS.fadeIn);
        requestAnimationFrame(() => {
            this.applyStyles(element, HUD_ANIMATIONS.fadeInActive);
        });
    }

    static fadeOutAndRemove(element: HTMLElement, onComplete?: () => void): void {
        this.applyStyles(element, HUD_ANIMATIONS.fadeOut);
        setTimeout(() => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
            onComplete?.();
        }, 200);
    }

    static getElementById(id: string): HTMLElement | null {
        return document.getElementById(id);
    }

    static createTextElement(content: string, tagName: keyof HTMLElementTagNameMap = 'span'): HTMLElement {
        const element = DOMUtils.createElement(tagName);
        element.textContent = content;
        return element;
    }
}
