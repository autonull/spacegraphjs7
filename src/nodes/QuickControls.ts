import { DOMUtils } from '../utils/DOMUtils';

export interface QuickControlButton {
    className: string;
    title: string;
    icon: string;
    action: () => void;
}

export interface QuickControlsElements {
    container: HTMLElement;
    buttons: Record<string, HTMLElement>;
}

const BUTTON_STYLES: Partial<CSSStyleDeclaration> = {
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: '12px',
    pointerEvents: 'auto',
};

const CONTAINER_STYLES: Partial<CSSStyleDeclaration> = {
    position: 'absolute',
    top: '-30px',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    opacity: '0',
    transition: 'opacity 0.2s',
    pointerEvents: 'none',
};

export function createQuickControls(
    buttons: QuickControlButton[],
    parent: HTMLElement,
): QuickControlsElements {
    const container = DOMUtils.createElement('div');
    container.className = 'node-controls';
    Object.assign(container.style, CONTAINER_STYLES);

    const buttonElements: Record<string, HTMLElement> = {};

    for (const { className, title, icon, action } of buttons) {
        const button = DOMUtils.createElement('button');
        button.className = `node-quick-button ${className}`;
        button.title = title;
        button.textContent = icon;
        Object.assign(button.style, BUTTON_STYLES);
        button.onclick = (e) => {
            e.stopPropagation();
            action();
        };
        container.appendChild(button);
        buttonElements[className] = button;
    }

    parent.appendChild(container);

    parent.addEventListener('mouseenter', () => {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    });

    parent.addEventListener('mouseleave', () => {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
    });

    return { container, buttons: buttonElements };
}
