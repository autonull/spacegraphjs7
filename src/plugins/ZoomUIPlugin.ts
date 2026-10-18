import gsap from 'gsap';
import type { Disposable } from '../core/EventEmitter';
import type { EventSystem } from '../core/events/EventSystem';
import type { Graph } from '../core/Graph';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core';

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

const POSITION_STYLES = {
  'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
  'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
  'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
  'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
} as const;

/**
 * ZoomUIPlugin — a container-scoped zoom-level indicator and one-time hint.
 *
 * Both overlays live inside the graph container (not `document.body`) so they clean up with the
 * graph and never escape an embedded host. `dispose()` releases the level listener and the hint
 * timer.
 */
export class ZoomUIPlugin implements Plugin {
  readonly id = 'zoom-ui';
  readonly name = 'Zoom UI';
  readonly version = '1.0.0';

  private sg!: SpaceGraph;
  private config: ZoomUIConfig;
  private currentLevel = 0;
  private levelIndicator: HTMLElement | null = null;
  private hintElement: HTMLElement | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private levelSubscription: Disposable | null = null;

  constructor(config: Partial<ZoomUIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
    this.sg = sg;

    this.levelSubscription = this.sg.events.on('fractal:level-change', (e: any) => {
      this.currentLevel = e.to;
      this.updateLevelIndicator(e.to, e.label);
      this.updateCursor(e.to);
    });

    if (this.config.showLevelIndicator) this.createLevelIndicator();
    if (this.config.showHint) this.showHint();
  }

  onPreRender(_delta: number): void {}

  dispose(): void {
    this.levelSubscription?.dispose();
    this.levelSubscription = null;
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.levelIndicator?.remove();
    this.hintElement?.remove();
    this.levelIndicator = null;
    this.hintElement = null;
  }

  private createLevelIndicator(): void {
    const el = document.createElement('div');
    el.className = 'fractal-level-indicator';

    Object.assign(el.style, {
      position: 'absolute',
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
      ...POSITION_STYLES[this.config.levelIndicatorPosition],
    });

    el.innerHTML = `
      <div style="font-size: 11px; opacity: 0.6; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Zoom Level</div>
      <div style="font-size: 20px; font-weight: bold; transition: color 0.3s ease;" id="level-text">Overview</div>
      <div style="font-size: 11px; opacity: 0.5; margin-top: 6px;" id="level-hint">Scroll or pinch to zoom</div>
    `;

    this.levelIndicator = el;
    this.sg.container.appendChild(el);
  }

  private updateLevelIndicator(level: number, label: string): void {
    if (!this.levelIndicator) return;
    const levelText = this.levelIndicator.querySelector('#level-text') as HTMLElement | null;
    if (!levelText) return;

    gsap.to(levelText, {
      color: LEVEL_COLORS[level % LEVEL_COLORS.length],
      duration: 0.3,
      ease: 'power2.out',
    });
    gsap.fromTo(
      levelText,
      { scale: 1.1 },
      { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
    );
    levelText.textContent = label;
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
    this.hintElement?.remove();

    const el = document.createElement('div');
    el.className = 'fractal-zoom-hint';
    Object.assign(el.style, {
      position: 'absolute',
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
    el.innerHTML = `
      <span style="opacity: 0.8;">🔍</span>
      <span style="margin-left: 8px;">Scroll or pinch to zoom through levels</span>
    `;

    this.hintElement = el;
    this.sg.container.appendChild(el);

    gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });

    this.hintTimer = setTimeout(() => {
      if (!this.hintElement) return;
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
    }, this.config.hintDuration);
  }
}
