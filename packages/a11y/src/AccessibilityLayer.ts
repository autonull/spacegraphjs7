// The core owns the implementation and its contract; this package adds the Solid wrapper.
export { AccessibilityLayer } from 'spacegraphjs/a11y';
export type { AccessibilityLayerOptions, AccessibleEdge, AccessibleItem } from 'spacegraphjs/a11y';

/** Configuration for the AccessibilityLayer (alias for compatibility with host API). */
export type AccessibilityLayerConfig = import('spacegraphjs/a11y').AccessibilityLayerOptions & {
    /** The container element to render the accessibility layer into. */
    container: HTMLElement;
    /** i18n functions for localized strings. */
    i18n?: import('@spacegraphjs/shared').I18n;
};
