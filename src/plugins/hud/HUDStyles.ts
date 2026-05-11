/**
 * HUD Style Constants
 * Centralized style definitions for HUD components
 */

export const HUD_ZINDEX = {
    HUD: '9998',
    ALERTS: '10000',
    TOOLTIP: '10001',
    MODAL: '10002',
    LOADING: '10003',
    CONTEXT_MENU: '10004',
} as const;

export const HUD_COLORS = {
    background: 'rgba(15, 23, 42, 0.95)',
    surface: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    primary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    // Convenience accessors
    get successBg() { return this.success + '20'; },
    get warningBg() { return this.warning + '20'; },
    get errorBg() { return this.error + '20'; },
} as const;

// Type-safe style builder for HUD elements
export type HUDStyleKey = keyof typeof HUD_STYLES;
export type HUDPositionKey = keyof typeof HUD_POSITIONS;

export const HUD_STYLES = {
    base: {
        position: 'absolute' as const,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        color: HUD_COLORS.text,
    },

    container: {
        pointerEvents: 'none' as const,
        overflow: 'hidden' as const,
    },

    interactive: {
        pointerEvents: 'auto' as const,
    },

    button: {
        background: 'transparent',
        border: 'none',
        color: HUD_COLORS.text,
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '6px',
    },

    modal: {
        background: HUD_COLORS.surface,
        border: `1px solid ${HUD_COLORS.border}`,
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },

    alert: {
        background: HUD_COLORS.surface,
        border: `1px solid ${HUD_COLORS.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    },

    tooltip: {
        background: HUD_COLORS.surface,
        border: `1px solid ${HUD_COLORS.border}`,
        borderRadius: '6px',
        padding: '6px 10px',
        fontSize: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    },

    loading: {
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(4px)',
    },

    statusBar: {
        background: HUD_COLORS.background,
        borderTop: `1px solid ${HUD_COLORS.border}`,
    },
} as const;

export const HUD_POSITIONS = {
    'top-left': { top: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'bottom-left': { bottom: '44px', left: '16px' },
    'bottom-right': { bottom: '44px', right: '16px' },
    'top-center': { top: '16px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '44px', left: '50%', transform: 'translateX(-50%)' },
    'left-center': { top: '50%', left: '16px', transform: 'translateY(-50%)' },
    'right-center': { top: '50%', right: '16px', transform: 'translateY(-50%)' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
} as const;

// Helper to get position styles with optional offset
export const getHUDPosition = (position: HUDPositionKey, offsetX = 0, offsetY = 0) => {
    const base = HUD_POSITIONS[position];
    return { ...base, left: offsetX ? `calc(${base.left} + ${offsetX}px)` : base.left, top: offsetY ? `calc(${base.top} + ${offsetY}px)` : base.top };
};

export const HUD_ANIMATIONS = {
    fadeIn: {
        opacity: '0',
        transform: 'translateY(-8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
    },
    fadeInActive: {
        opacity: '1',
        transform: 'translateY(0)',
    },
    fadeOut: {
        opacity: '0',
        transition: 'opacity 0.2s ease',
    },
} as const;
