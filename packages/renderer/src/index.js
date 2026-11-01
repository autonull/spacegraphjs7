/**
 * `@spacegraphjs/renderer` — the renderer contract.
 *
 * Types and tiny helpers only. Zero runtime dependencies, no `three`, no `cytoscape`, no core import.
 * A host builds a `RenderModel`, a renderer adapter renders it, and the two never share library objects.
 */
/** Canonical depth order, shallowest first; hosts render choosers in this order. */
export const DEPTH_MODES = ['flat', 'layered', 'depth-stack', 'orbit'];
/** Single predicate for capability-gated UI (L1.28). Unknown capabilities are never assumed. */
export function supports(capabilities, capability) {
    return capability === '2d' || capability === '3d'
        ? capabilities.projections.includes(capability)
        : capabilities[capability];
}
/** Whether a renderer can honour a depth treatment; hosts gate the depth chooser on this. */
export function supportsDepth(capabilities, depth) {
    return capabilities.depths.includes(depth);
}
// The theme bridge and the contrast auditor live beside the contract: they are pure, dependency-free,
// and every renderer and host needs them.
export * from './adapter';
export * from './color';
export * from './edge';
export * from './events';
export * from './theme';
export * from './patch';
export * from './model-renderer';
export * from './payload';
