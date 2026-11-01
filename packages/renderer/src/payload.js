/**
 * Shared helpers for extracting IDs from renderer event payloads.
 * Used by adapter implementations to normalize event data.
 */
export function idOf(payload) {
    return payload?.id ?? '';
}
export function nodeIdOf(payload) {
    return payload?.node?.id ?? '';
}
export function idsOf(payload) {
    return payload?.ids ?? [];
}
