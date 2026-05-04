import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import gsap from 'gsap';

export interface ZoomUIConfig {
    showHint: boolean;
    hintDuration: number;
    cursorStyle: 'default' | 'crosshair' | 'grab' | 'zoom';
    enableTransitions: boolean;
    transitionDuration: number;
    showLevelIndicator: boolean;
    levelIndicatorPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const DEFAULT_CONFIG: ZoomUIConfig = {
    showHint: true,
    hintDuration: 3000,
    cursorStyle: 'default',
    enableTransitions: true,
    transitionDuration: 0.5,
    showLevelIndicator: true,
    levelIndicatorPosition: 'top-right',
};

const LEVEL_COLORS = [
    'hsl(0, 80%, 60%)',
    'hsl(72, 80%, 60%)',
    'hsl(144, 80%, 60%)',
    'hsl(216, 80%, 60%)',
    'hsl(288, 80%, 60%)',
];

export class ZoomUIPlugin implements Plugin {
    readonly id = 'zoom-ui';
    readonly name = 'Zoom UI';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private config: ZoomUIConfig;
    private currentLevel: number = 0;
    private levelIndicator: HTMLElement | null = null;
    private hintElement: HTMLElement | null = null;
    private cursorElement: HTMLElement | null = null;

    constructor(config: Partial<ZoomUIConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;

        // Listen to zoom level changes
        this.sg.events.on('fractal:level-change', (e: any) => {
            this.currentLevel = e.to;
            this.updateLevelIndicator(e.to, e.label);
            this.updateCursor(e.to);
        });

        // Create UI elements
        if (this.config.showLevelIndicator) {
            this.createLevelIndicator();
        }

        // Show initial hint
        if (this.config.showHint) {
            this.showHint();
        }
    }

    private createLevelIndicator(): void {
        this.levelIndicator = document.createElement('div');
        this.levelIndicator.className = 'fractal-level-indicator';

        const position = this.config.levelIndicatorPosition;
        const positionStyles = {
            'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
            'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
            'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
            'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
        };

        Object.assign(this.levelIndicator.style, {
            position: 'fixed',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            zIndex: '10000',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
            ...positionStyles[position],
        });

        this.levelIndicator.innerHTML = `
      <div style="font-size: 11px; opacity: 0.6; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Zoom Level</div>
      <div style="font-size: 20px; font-weight: bold; transition: color 0.3s ease;" id="level-text">Overview</div>
      <div style="font-size: 11px; opacity: 0.5; margin-top: 6px;" id="level-hint">Scroll or pinch to zoom</div>
    `;

        document.body.appendChild(this.levelIndicator);
    }

    private updateLevelIndicator(level: number, label: string): void {
        if (!this.levelIndicator) return;

        const levelText = this.levelIndicator.querySelector('#level-text') as HTMLElement;
        if (levelText) {
            // Animate color change
            gsap.to(levelText, {
                color: LEVEL_COLORS[level % LEVEL_COLORS.length],
                duration: 0.3,
                ease: 'power2.out',
            });

            // Pulse animation
            gsap.fromTo(
                levelText,
                { scale: 1.1 },
                {
                    scale: 1,
                    duration: 0.4,
                    ease: 'elastic.out(1, 0.3)',
                },
            );

            levelText.textContent = label;
        }
    }

private updateCursor(level: number): void {
    if (!this.sg?.container) return;

    const cursorStyles: Record<number, string> = {
      0: 'grab',
      1: 'grab',
      2: 'default',
      3: 'crosshair',
      4: 'crosshair',
    };

    this.sg.container.style.cursor = cursorStyles[level] || 'default';
  }

    private showHint(): void {
        if (this.hintElement) {
            this.hintElement.remove();
        }

        this.hintElement = document.createElement('div');
        this.hintElement.className = 'fractal-zoom-hint';
        Object.assign(this.hintElement.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%) translateY(20px)',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            zIndex: '10001',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: '0',
            transition: 'all 0.4s ease',
        });

        this.hintElement.innerHTML = `
      <span style="opacity: 0.8;">🔍</span>
      <span style="margin-left: 8px;">Scroll or pinch to zoom through levels</span>
    `;

        document.body.appendChild(this.hintElement);

        // Fade in
        gsap.to(this.hintElement, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
        });

        // Fade out after duration
        setTimeout(() => {
            if (this.hintElement) {
                gsap.to(this.hintElement, {
                    opacity: 0,
                    y: 20,
                    duration: 0.4,
                    ease: 'power2.in',
                    onComplete: () => {
                        this.hintElement?.remove();
                        this.hintElement = null;
                    },
                });
            }
        }, this.config.hintDuration);
    }

    private hideHint(): void {
        if (this.hintElement) {
            gsap.to(this.hintElement, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    this.hintElement?.remove();
                    this.hintElement = null;
                },
            });
        }
    }

    onPreRender(_delta: number): void {}

    dispose(): void {
        this.levelIndicator?.remove();
        this.hintElement?.remove();
    }
}
