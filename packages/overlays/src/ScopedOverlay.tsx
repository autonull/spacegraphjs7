// The core owns the implementation and its contract; this package adds the Solid wrapper.
export { ScopedOverlay } from 'spacegraphjs/overlays';
export type { ScopedOverlayOptions } from 'spacegraphjs/overlays';

/** Solid.js wrapper component for ScopedOverlay. */
export { GraphOverlayManager, type GraphOverlayManagerProps } from './GraphOverlayManager';
