import { DOMUtils } from '../../utils';
import type { SpaceGraph } from '../../SpaceGraph';
import { HUDDOMFactory } from './HUDDOMFactory';
import { HUDElement, type HUDElementSpec } from './HUDElement';
import { HUD_ANIMATIONS, HUD_COLORS, HUD_STYLES, HUD_ZINDEX } from './HUDStyles';

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

export class HUDAlerts extends HUDElement {
    protected spec(): HUDElementSpec {
        return {
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
        };
    }

    show(options: AlertOptions | string): void {
        if (!this.element || typeof document === 'undefined') return;

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

        this.element.appendChild(alert);
        HUDDOMFactory.fadeIn(alert);
        setTimeout(() => HUDDOMFactory.fadeOutAndRemove(alert), duration);
    }
}
