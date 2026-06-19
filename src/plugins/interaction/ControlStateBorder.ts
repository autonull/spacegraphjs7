export type ControlState = 'normal' | 'hovered' | 'pressed' | 'dragging' | 'selected' | 'disabled';

export interface ControlStateStyle {
    borderColor: string;
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted';
    glowColor?: string;
    glowRadius?: number;
    animation?: 'pulse' | 'wave' | 'none';
    opacity?: number;
}

export const STATE_STYLES: Record<ControlState, ControlStateStyle> = {
    normal: { borderColor: 'transparent', borderWidth: 0, borderStyle: 'solid', animation: 'none' },
    hovered: { borderColor: '#8B5CF6', borderWidth: 2, borderStyle: 'dashed', animation: 'pulse' },
    pressed: { borderColor: '#3B82F6', borderWidth: 3, borderStyle: 'solid', animation: 'none' },
    dragging: { borderColor: '#10B981', borderWidth: 3, borderStyle: 'solid', glowColor: '#10B981', glowRadius: 15, animation: 'none' },
    selected: { borderColor: '#F59E0B', borderWidth: 2, borderStyle: 'solid', animation: 'none' },
    disabled: { borderColor: '#6B7280', borderWidth: 1, borderStyle: 'dotted', opacity: 0.5, animation: 'none' },
};

export const getBorderStyles = (state: ControlState): ControlStateStyle =>
    STATE_STYLES[state] ?? STATE_STYLES.normal;

export const applyControlStateStyles = (element: HTMLElement, state: ControlState, prevState?: ControlState): void => {
    const style = getBorderStyles(state);
    if (style.borderColor !== 'transparent') {
        element.style.outline = `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`;
        if (style.glowColor) element.style.boxShadow = `0 0 ${style.glowRadius}px ${style.glowColor}`;
    } else {
        element.style.outline = 'none';
        element.style.boxShadow = 'none';
    }
    if (style.opacity !== undefined) element.style.opacity = String(style.opacity);
    if (prevState && prevState !== state) animateStateTransition(element, prevState, state);
};

const animateStateTransition = (element: HTMLElement, from: ControlState, to: ControlState): void => {
    const fromStyle = getBorderStyles(from);
    const toStyle = getBorderStyles(to);
    if (fromStyle.animation === 'pulse' || toStyle.animation === 'pulse') {
        element.animate([
            { outline: `${fromStyle.borderWidth}px ${fromStyle.borderStyle} ${fromStyle.borderColor}` },
            { outline: `${toStyle.borderWidth}px ${toStyle.borderStyle} ${toStyle.borderColor}` },
        ], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    }
};