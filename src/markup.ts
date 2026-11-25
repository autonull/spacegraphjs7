export const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);

export const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/|\.?\/)/i;
export const SAFE_IMAGE = /^(https?:\/\/[^\s<>"']+|\/[\w./-]*|\.\.?\/[\w./-]*|data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+)$/i;

/** Escape first, then allow only known inline syntax. No raw HTML ever reaches the DOM. */
export const inlineHTML = (text: string): string =>
    escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) =>
            SAFE_HREF.test(href) ? `<a href="${href}">${label}</a>` : label,
        )
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
