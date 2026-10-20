const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes the five HTML-special characters. The renderers inject host card markup with `innerHTML`,
 * so this is the barrier between a model's text and the document.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

/** Formats an opacity the way a style attribute reads it: `.3`, not `0.3`. */
export function formatOpacity(value: number): string {
  return String(value).replace(/^0\./, '.');
}
