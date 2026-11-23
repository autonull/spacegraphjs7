import { escapeHtml } from '@spacegraphjs/adapter';
import type { PinnedNote } from './annotations';

export type ReportInput = {
    readonly title: string;
    readonly permalink: string;
    readonly json: string;
    readonly svg: string;
    readonly html: string;
    readonly annotations: readonly PinnedNote[];
};

/** Self-contained audit report: geometry, serialized model, review notes and the replay link. */
export const buildReportHTML = ({
    title,
    permalink,
    json,
    svg,
    html,
    annotations,
}: ReportInput): string => {
    const notes = annotations
        .map(
            (note) =>
                `<li data-target="${escapeHtml(note.target)}">${escapeHtml(note.body)} <code>${escapeHtml(note.id)}</code></li>`,
        )
        .join('\n');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font:13px/1.5 system-ui;margin:24px;max-width:960px}pre{white-space:pre-wrap;overflow:auto;background:#f4f5f7;padding:12px}li{margin:4px 0}code{color:#555}</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
<p>Replay this exact state with the <a href="${escapeHtml(permalink)}">full-state permalink</a>.</p>
<h2>Reviewer notes</h2><ul>${notes}</ul>
<h2>Geometry</h2>${svg}
<h2>Kernel JSON</h2><pre>${escapeHtml(json)}</pre>
<h2>Render model HTML</h2><pre>${escapeHtml(html)}</pre>
</body></html>
`;
};
