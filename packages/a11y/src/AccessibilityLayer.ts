// Re-export the core AccessibilityLayer from the main library (implementation)
// Types are defined locally to avoid build-time dependency on main library's types
export { AccessibilityLayer } from 'spacegraphjs/a11y';

/** Options for the AccessibilityLayer (mirrored from main library). */
export interface AccessibilityLayerOptions {
    label?: string;
    /** Called with the id when the user activates an item (Enter/Space). */
    onSelect?: (id: string) => void;
    /** Called when Escape is pressed on the list (e.g. go back or clear focus). */
    onEscape?: () => void;
    /** Localized announcement for a selection change; defaults to English. */
    formatSelection?: (labels: readonly string[]) => string;
    /** The label of the connection list; defaults to English. */
    edgeLabel?: string;
    /** Localized announcement for the connections of the selected nodes; defaults to none. */
    edgeAnnouncer?: (edges: readonly AccessibleEdge[]) => string;
}

/** An item in the accessibility layer. */
export interface AccessibleItem {
    id: string;
    label: string;
    kind?: string;
    status?: string;
    /** Non-interactive items are listed but skipped by keyboard traversal. Defaults to true. */
    interactive?: boolean;
    /** Child items for hierarchical groups. When present, the item is a group container. */
    children?: AccessibleItem[];
    /** Whether the group is currently expanded (for aria-expanded). */
    expanded?: boolean;
}

/** An edge in the accessibility layer. */
export interface AccessibleEdge {
    id: string;
    source: string;
    target: string;
    kind?: string;
    /** The text a screen reader reads for the connection; the host composes it. */
    label?: string;
}

/** Configuration for the AccessibilityLayer (alias for compatibility with host API). */
export type AccessibilityLayerConfig = AccessibilityLayerOptions & {
    /** The container element to render the accessibility layer into. */
    container: HTMLElement;
    /** i18n functions for localized strings. */
    i18n?: import('@spacegraphjs/shared').I18n;
};

/** Solid.js wrapper component for AccessibilityLayer. */
export { GraphA11y, type GraphA11yProps } from './GraphA11y';
