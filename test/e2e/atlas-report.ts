// Self-contained, browsable report for the generated demo atlases. No external assets: the page is
// written beside the frames and opens straight from disk.

export interface ReportEntry {
    id: string;
    title: string;
    description: string;
    file: string;
    bytes: number;
    ms: number;
    errors: string[];
    evidence?: string[];
}

export interface ReportGroup {
    id: string;
    title: string;
    summary: string;
    entries: ReportEntry[];
}

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

function card(entry: ReportEntry): string {
    const status = entry.errors.length ? 'fail' : 'pass';
    const evidence = entry.evidence?.length
        ? `<details><summary>Evidence (${entry.evidence.length})</summary><pre>${escape(entry.evidence.join('\n'))}</pre></details>`
        : '';
    const errors = entry.errors.length
        ? `<details><summary>Errors (${entry.errors.length})</summary><pre>${escape(entry.errors.join('\n'))}</pre></details>`
        : '';
    return `<article class="card">
  <div class="head"><h3>${escape(entry.title)}</h3><span class="badge ${status}">${status}</span></div>
  <p class="id">${escape(entry.id)}</p>
  <p>${escape(entry.description)}</p>
  <a href="${escape(entry.file)}"><img loading="lazy" src="${escape(entry.file)}" alt="${escape(entry.title)}"/></a>
  <p class="meta">${(entry.bytes / 1024).toFixed(1)} KB · ${entry.ms} ms</p>
  ${evidence}${errors}
</article>`;
}

export function renderAtlasReport(title: string, groups: readonly ReportGroup[]): string {
    const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
    const failed = groups.reduce(
        (sum, group) => sum + group.entries.filter((entry) => entry.errors.length).length,
        0,
    );
    const sections = groups
        .map(
            (group) => `<section id="${escape(group.id)}">
  <h2>${escape(group.title)} <small>${group.entries.length}</small></h2>
  <p class="summary">${escape(group.summary)}</p>
  <div class="grid">${group.entries.map(card).join('\n')}</div>
</section>`,
        )
        .join('\n');
    return `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escape(title)}</title>
<style>
:root{color-scheme:dark;--bg:#0b0f17;--surface:#151b26;--border:#2b3544;--text:#e6ecf5;--muted:#9aa7b8;--accent:#3b82f6;--ok:#34d399;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,sans-serif}
header{padding:24px 32px;border-bottom:1px solid var(--border)}h1{margin:0 0 8px;font-size:24px}
h2{font-size:18px;margin:0 0 4px}h2 small{color:var(--muted);font-size:13px;font-weight:400}h3{font-size:14px;margin:0}
main{padding:16px 32px 64px}section{margin:32px 0}.summary{color:var(--muted);margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.card{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:12px;overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.id,.meta{color:var(--muted);font-size:12px;margin:4px 0}.card p{margin:8px 0}
.badge{font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:99px;border:1px solid currentColor}
.badge.pass{color:var(--ok)}.badge.fail{color:var(--bad)}
a img{display:block;width:100%;height:auto;border:1px solid var(--border);border-radius:6px;background:#000}
details{margin-top:8px}summary{cursor:pointer;color:var(--accent)}pre{white-space:pre-wrap;word-break:break-word;font-size:11px;color:var(--muted);max-height:220px;overflow:auto}
nav{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}nav a{color:var(--accent)}
</style></head><body>
<header><h1>${escape(title)}</h1>
<p>${total} captures across ${groups.length} surfaces · ${failed} failures · generated ${new Date().toISOString()}</p>
<nav>${groups.map((group) => `<a href="#${escape(group.id)}">${escape(group.title)} (${group.entries.length})</a>`).join('')}</nav>
</header><main>${sections}</main></body></html>`;
}
