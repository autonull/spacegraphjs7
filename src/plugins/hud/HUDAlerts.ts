import type { SpaceGraph } from '../../SpaceGraph';
import { DOMUtils } from '../../utils/DOMUtils';
import { HUD_STYLES, HUD_ZINDEX, HUD_COLORS } from './HUDStyles';
import { HUDDOMFactory } from './HUDDOMFactory';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertOptions {
    message: string;
    variant?: AlertVariant;
    duration?: number;
}

const ALERT_VARIANTS: Record<AlertVariant, { border: string; icon: string }> = {
    info: { border: HUD_COLORS.primary, icon: 'ℹ️' },
    success: { border: HUD_COLORS.success, icon: '✅' },
    warning: { border: HUD_COLORS.warning, icon: '⚠️' },
    error: { border: HUD_COLORS.error, icon: '❌' },
};

export class HUDAlerts {
    private alertsContainer: HTMLElement | null = null;
    private sg: SpaceGraph;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    create(): void {
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
                zIndex: HUD_ZINDEX.ALERTS,
            },
        });

        HUDDOMFactory.appendToRenderer(this.sg, this.alertsContainer);
    }

    show(options: AlertOptions | string): void {
        if (!this.alertsContainer || typeof document === 'undefined') return;

        const config = typeof options === 'string' ? { message: options } : options;
        const { message, variant = 'info', duration = 3000 } = config;
        const variantStyle = ALERT_VARIANTS[variant];

        const alert = DOMUtils.createElement('div', {
            style: {
                ...HUD_STYLES.alert,
                borderLeft: `3px solid ${variantStyle.border}`,
                minWidth: '280px',
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                ...HUD_ANIMATIONS.fadeIn,
            } as Partial<CSSStyleDeclaration>,
        });

        alert.innerHTML = `
            <span style="font-size: 18px">${variantStyle.icon}</span>
            <span style="flex: 1">${message}</span>
        `;

        this.alertsContainer.appendChild(alert);

        HUDDOMFactory.fadeIn(alert);

        setTimeout(() => {
            HUDDOMFactory.fadeOutAndRemove(alert);
        }, duration);
    }

    dispose(): void {
        if (this.alertsContainer?.parentElement) {
            this.alertsContainer.parentElement.removeChild(this.alertsContainer);
        }
        this.alertsContainer = null;
    }
}

const HUD_ANIMATIONS = {
    fadeIn: {
        opacity: '0',
        transform: 'translateY(-8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
    },
} as const;
