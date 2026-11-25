import { escapeHtml, inlineHTML, SAFE_IMAGE } from './markup';

export type DocumentBlock =
    | { readonly kind: 'heading'; readonly level: number; readonly text: string }
    | { readonly kind: 'paragraph'; readonly text: string }
    | { readonly kind: 'code'; readonly text: string; readonly language?: string }
    | { readonly kind: 'quote'; readonly text: string }
    | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
    | { readonly kind: 'image'; readonly src: string; readonly alt: string }
    | { readonly kind: 'table'; readonly header: readonly string[]; readonly rows: readonly (readonly string[])[] };

const cells = (row: string): readonly string[] =>
    row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

/** Parse a safe markdown subset into blocks. Unknown syntax stays committed paragraph text. */
export const parseDocument = (source: string): readonly DocumentBlock[] => {
    const lines = source.split(/\r?\n/);
    const blocks: DocumentBlock[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | undefined;
    const flushParagraph = (): void => {
        if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
        paragraph = [];
    };
    const flushList = (): void => {
        if (list) blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
        list = undefined;
    };
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]!;
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            flushParagraph(); flushList();
            const language = trimmed.slice(3).trim();
            const code: string[] = [];
            while (index + 1 < lines.length && !lines[index + 1]!.trim().startsWith('```'))
                code.push(lines[++index]!);
            if (index + 1 < lines.length) index += 1;
            blocks.push({ kind: 'code', text: code.join('\n'), ...(language ? { language } : {}) });
            continue;
        }
        if (!trimmed) { flushParagraph(); flushList(); continue; }
        const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
        if (heading) {
            flushParagraph(); flushList();
            blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]! });
            continue;
        }
        if (/^>\s?/.test(trimmed)) {
            flushParagraph(); flushList();
            const quote = [trimmed.replace(/^>\s?/, '')];
            while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1]!.trim()))
                quote.push(lines[++index]!.trim().replace(/^>\s?/, ''));
            blocks.push({ kind: 'quote', text: quote.join(' ') });
            continue;
        }
        const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
        const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
        if (bullet || numbered) {
            flushParagraph();
            const ordered = Boolean(numbered);
            if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
            list.items.push((bullet ?? numbered)![1]!);
            continue;
        }
        flushList();
        if (trimmed.startsWith('|') && index + 1 < lines.length && /^\|?[\s|:-]+\|?$/.test(lines[index + 1]!.trim())) {
            flushParagraph();
            const header = cells(trimmed);
            index += 1;
            const rows: string[][] = [];
            while (index + 1 < lines.length && lines[index + 1]!.trim().startsWith('|'))
                rows.push([...cells(lines[++index]!.trim())]);
            blocks.push({ kind: 'table', header, rows });
            continue;
        }
        const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
        if (image) {
            flushParagraph();
            blocks.push({ kind: 'image', alt: image[1]!, src: image[2]! });
            continue;
        }
        paragraph.push(trimmed);
    }
    flushParagraph();
    flushList();
    return blocks;
};

const cellHTML = (value: string, tag: 'th' | 'td'): string =>
    `<${tag}>${inlineHTML(value)}</${tag}>`;

/** Escape-first HTML for the parsed subset. No host string is trusted as markup. */
export const documentHTML = (blocks: readonly DocumentBlock[]): string =>
    blocks.map((block) => {
        switch (block.kind) {
            case 'heading': {
                const level = Math.min(6, Math.max(1, block.level));
                return `<h${level}>${inlineHTML(block.text)}</h${level}>`;
            }
            case 'paragraph': return `<p>${inlineHTML(block.text)}</p>`;
            case 'code':
                return `<pre><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ''}>${escapeHtml(block.text)}</code></pre>`;
            case 'quote': return `<blockquote><p>${inlineHTML(block.text)}</p></blockquote>`;
            case 'list': {
                const tag = block.ordered ? 'ol' : 'ul';
                return `<${tag}>${block.items.map((item) => `<li>${inlineHTML(item)}</li>`).join('')}</${tag}>`;
            }
            case 'image':
                return SAFE_IMAGE.test(block.src)
                    ? `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" loading="lazy" />`
                    : `<p class="sg-unsafe-image">${escapeHtml(block.alt)}</p>`;
            case 'table':
                return `<table><thead><tr>${block.header.map((cell) => cellHTML(cell, 'th')).join('')}</tr></thead>`
                    + `<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => cellHTML(cell, 'td')).join('')}</tr>`).join('')}</tbody></table>`;
        }
    }).join('');

export const safeDocumentHTML = (source: string): string => documentHTML(parseDocument(source));
