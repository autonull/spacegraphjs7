/**
 * Shared helpers for extracting IDs from renderer event payloads.
 * Used by adapter implementations to normalize event data.
 */

export function idOf(payload: unknown): string {
    return (payload as { id?: string } | undefined)?.id ?? '';
}

export function nodeIdOf(payload: unknown): string {
    return (payload as { node?: { id?: string } } | undefined)?.node?.id ?? '';
}

export function idsOf(payload: unknown): readonly string[] {
    return (payload as { ids?: readonly string[] } | undefined)?.ids ?? [];
}
