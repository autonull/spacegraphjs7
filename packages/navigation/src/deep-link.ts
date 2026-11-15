/**
 * Deep link codec for graph permalinks.
 * The host supplies the prefix (e.g., "#spacegraph:") and the codec handles the rest.
 */

export interface DeepLinkParts {
    /** The layout name (e.g., "lanes", "tree"). */
    layout: string;
    /** The zoom level (e.g., "overview", "execution", "detail"). */
    level: string;
    /** The node ID to focus, if any. */
    node?: string;
}

/** Options for the deep link codec. */
export interface DeepLinkOptions {
    /** The URL prefix the host uses for graph deep links (e.g., "#spacegraph:"). */
    prefix: string;
}

/**
 * Encode deep link parts into a URL fragment.
 * Format: `${prefix}${layout}:${level}${node ? `:${node}` : ''}`
 */
export function encodeDeepLink(parts: DeepLinkParts, options: DeepLinkOptions): string {
    const { layout, level, node } = parts;
    const segments = [layout, level];
    if (node) segments.push(node);
    return `${options.prefix}${segments.join(':')}`;
}

/**
 * Decode a URL fragment into deep link parts.
 * Returns undefined if the fragment doesn't match the expected prefix.
 */
export function decodeDeepLink(fragment: string, options: DeepLinkOptions): DeepLinkParts | undefined {
    const { prefix } = options;
    if (!fragment.startsWith(prefix)) return undefined;

    const content = fragment.slice(prefix.length);
    if (!content) return undefined;

    const segments = content.split(':');
    if (segments.length < 2) return undefined;

    const [layout, level, node] = segments;
    return { layout, level, node: node ?? undefined };
}

/**
 * Check if a URL fragment is a graph deep link for this codec.
 */
export function isDeepLink(fragment: string, options: DeepLinkOptions): boolean {
    return fragment.startsWith(options.prefix);
}

/**
 * Create a deep link codec with a fixed prefix.
 * Convenience function for hosts that use a single prefix.
 */
export function createDeepLinkCodec(prefix: string) {
    const options: DeepLinkOptions = { prefix };
    return {
        encode: (parts: DeepLinkParts) => encodeDeepLink(parts, options),
        decode: (fragment: string) => decodeDeepLink(fragment, options),
        isDeepLink: (fragment: string) => isDeepLink(fragment, options),
    };
}