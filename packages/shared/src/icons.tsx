/**
 * Icon abstraction for SpaceGraphJS components.
 * Hosts provide their own icon components; this package defines the contract.
 */

import type { JSX } from 'solid-js';

/** Props for an icon component. */
export type IconProps = {
    /** Icon name from the host's icon catalogue. */
    name: string;
    /** Size variant. */
    size?: 'small' | 'medium' | 'large';
    /** Additional CSS classes. */
    class?: string;
    /** Inline styles. */
    style?: JSX.CSSProperties;
};

/** Icon component type - a function that renders an icon. */
export type IconComponent = (props: IconProps) => JSX.Element;

/** Default inline SVG icons as fallback when host doesn't provide one. */
export const defaultIconSVGs: Record<string, string> = {
    'outline-eye': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8a7 7 0 0 1 14 0A7 7 0 0 1 1 8Z"/><circle cx="8" cy="8" r="3"/></svg>`,
    'outline-sliders': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="4" y2="12"/><line x1="8" y1="6" x2="8" y2="10"/><line x1="12" y1="2" x2="12" y2="14"/></svg>`,
    'outline-dots': `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>`,
    'magnifying-glass': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>`,
    expand: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h6v6M10 10h6v6"/></svg>`,
    plus: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>`,
    'outline-copy': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="6" height="10" rx="2"/><path d="M2 10v-4a2 2 0 0 1 2-2h8"/></svg>`,
    'outline-share': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="1"/><circle cx="14" cy="3" r="1"/><circle cx="3" cy="14" r="1"/><path d="M7.5 7.5L12.5 3.5M7.5 7.5L2.5 12.5"/></svg>`,
    'close-small': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`,
    'outline-chevron-down': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`,
    'outline-rotate-clockwise': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 0 9-9"/><path d="M3 3v6h6"/></svg>`,
    'outline-undo': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    'outline-redo': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>`,
    'layout-bottom': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M4 11h8"/></svg>`,
    'folder-tree': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5V3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8"/><path d="M8 3v4M8 7v8M12 7h-8M12 11h-8"/></svg>`,
    'outline-worktree': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h10v10M10 3v10M3 10h10"/></svg>`,
    'arrow-up-right': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h6v-6"/><path d="M4 12l8-8"/></svg>`,
    split: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h8v8M12 12h-8v-8"/></svg>`,
    'outline-arrow-left': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8H4M8 4l4 4-4 4"/></svg>`,
    close: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`,
    'outline-xmark': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`,
    'dot-grid': `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="4" r="1"/><circle cx="8" cy="4" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="4" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/></svg>`,
};

const sizeMap: Record<string, number> = { small: 16, medium: 20, large: 24 };

/**
 * Creates an icon renderer that uses the host's Icon component or falls back to inline SVGs.
 * @param hostIcon - Host's Icon component (optional)
 * @returns Function that renders an icon by name
 */
export function createIconRenderer(hostIcon?: IconComponent): IconComponent {
    if (hostIcon) return hostIcon;

    return (props: IconProps) => {
        const name = props.name;
        const size = props.size ?? 'small';
        const className = props.class ?? '';
        const style = props.style;

        const svgString = defaultIconSVGs[name];
        const dim = sizeMap[size];

        if (!svgString) {
            return (
                <svg
                    viewBox="0 0 16 16"
                    width={dim}
                    height={dim}
                    fill="none"
                    stroke="currentColor"
                    stroke-width={2}
                    class={className}
                    style={style}
                >
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                </svg>
            );
        }

        // Use innerHTML for the raw SVG string
        const html = svgString
            .replace(/width="\d+"/, `width="${dim}"`)
            .replace(/height="\d+"/, `height="${dim}"`);
        return <div class={className} style={style} innerHTML={html} />;
    };
}
