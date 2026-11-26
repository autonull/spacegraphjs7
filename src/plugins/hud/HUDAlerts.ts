import { DOMUtils } from '../../utils';
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
        if (!this.element.hasAttribute('role')) {
            this.element.setAttribute('role', 'status');
            this.element.setAttribute('aria-live', 'polite');
        }

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
                pointerEvents: 'auto',
                userSelect: 'text',
                ...HUD_ANIMATIONS.fadeIn,
            } as Partial<CSSStyleDeclaration>,
        });

        const icon = HUDDOMFactory.createTextElement(variantStyle.icon);
        HUDDOMFactory.applyStyles(icon, { fontSize: '18px' });
        const text = HUDDOMFactory.createTextElement(message);
        HUDDOMFactory.applyStyles(text, { flex: '1', overflowWrap: 'anywhere' });
        const dismiss = DOMUtils.createElement('button', {
            textContent: '×',
            ariaLabel: 'Dismiss notification',
            title: 'Dismiss notification',
            style: {
                background: 'transparent',
                border: 'none',
                color: HUD_COLORS.textMuted,
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: '1',
                padding: '0 2px',
            },
        });
        dismiss.type = 'button';
        alert.append(icon, text, dismiss);

        this.element.appendChild(alert);
        HUDDOMFactory.fadeIn(alert);
        const timer = window.setTimeout(() => HUDDOMFactory.fadeOutAndRemove(alert), duration);
        dismiss.onclick = () => {
            window.clearTimeout(timer);
            alert.remove();
        };
        dismiss.onfocus = () => (dismiss.style.outline = `2px solid ${HUD_COLORS.primary}`);
        dismiss.onblur = () => (dismiss.style.outline = 'none');
    }
}
