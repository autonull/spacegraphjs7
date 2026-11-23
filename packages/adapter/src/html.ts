export { escapeHtml } from '@spacegraphjs/renderer';

/** Formats an opacity the way a style attribute reads it: `.3`, not `0.3`. */
export function formatOpacity(value: number): string {
    return String(value).replace(/^0\./, '.');
}
