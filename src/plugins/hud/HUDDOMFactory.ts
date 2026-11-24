import { DOMUtils } from '../../utils';
import type { SpaceGraph } from '../../SpaceGraph';
import { HUD_ANIMATIONS, HUD_STYLES } from './HUDStyles';

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
}
