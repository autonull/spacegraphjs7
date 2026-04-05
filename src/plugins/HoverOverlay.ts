// SpaceGraphJS - HoverOverlay
// Decoupled hover overlay system, inspired by SGJ's Hover<X, Y> as a Fingering

import type { Surface } from '../core/Surface';

export interface HoverModel {
    offset?: { x: number; y: number };
    position?: 'cursor' | 'fixed' | 'surface';
    delay?: number;
    duration?: number;
}

export class HoverOverlay<S extends Surface, T extends Surface> {
    private currentHover: T | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private source: S,
        private targetBuilder: (source: S) => T,
        private model: HoverModel = {},
    ) {
        this.source.on('pointerenter', () => this.onPointerEnter());
        this.source.on('pointerleave', () => this.onPointerLeave());
    }

    private onPointerEnter(): void {
        const delay = this.model.delay ?? 0;
        if (delay > 0) {
            this.timer = setTimeout(() => this.show(), delay);
        } else {
            this.show();
        }
    }

    private onPointerLeave(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.hide();
    }

    private show(): void {
        if (this.currentHover) return;
        this.currentHover = this.targetBuilder(this.source);
        this.currentHover.start();
    }

    private hide(): void {
        if (!this.currentHover) return;
        this.currentHover.stop();
        this.currentHover.delete();
        this.currentHover = null;
    }

    getHover(): T | null {
        return this.currentHover;
    }

    dispose(): void {
        if (this.timer) clearTimeout(this.timer);
        this.hide();
    }
}
