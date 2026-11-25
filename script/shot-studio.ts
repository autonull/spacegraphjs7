import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
/** Shared review studio: card markup, localStorage review state and capture watching. */
export const escapeHtml = (value: string): string =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);
export const loadJSON = <T>(file: string): T | undefined => {
    if (!existsSync(file)) return undefined;
    try {
        return JSON.parse(readFileSync(file, 'utf8')) as T;
    } catch {
        return undefined;
    }
};
export const backupFiles = (files: readonly string[]): void => {
    for (const file of files) if (existsSync(file)) copyFileSync(file, `${file}.prev`);
};
export interface StudioCard {
    readonly id: string;
    readonly title: string;
    readonly question: string;
    readonly file: string;
    readonly url?: string;
}
export interface StudioExperiment {
    readonly id: string;
    readonly host: string;
    readonly status: string;
    readonly hypothesis: string;
    readonly command: string;
}
export interface StudioOptions {
    readonly out: string;
    readonly title: string;
    readonly filename: string;
    readonly reviewKey: string;
    readonly review: Readonly<Record<string, { verdict?: string; note?: string }>>;
    readonly cards: readonly StudioCard[];
    readonly experiments?: readonly StudioExperiment[];
    readonly copyTarget: string;
    readonly watch: boolean;
}
export const writeStudio = ({
    out,
    title,
    filename,
    reviewKey,
    review,
    cards,
    experiments = [],
    copyTarget,
    watch,
}: StudioOptions): void => {
    const pending = experiments.filter((entry) => entry.status === 'pending');
    const cardHTML = cards
        .map((card) => {
            const file = resolve(out, card.file);
            if (!existsSync(file)) return '';
            const stamp = Math.round(statSync(file).mtimeMs);
            const entry = review[card.id] ?? {};
            const selected = (verdict: string): string =>
                entry.verdict === verdict ? ' selected' : '';
            const image = `<img src="${card.file}?v=${stamp}" alt="${escapeHtml(card.title)}">`;
            const pair = existsSync(`${file}.prev`)
                ? `<div class="pair"><img class="prev" src="${card.file}.prev?v=${stamp}" alt="${escapeHtml(card.title)} previous">${image}</div>`
                : image;
            const picture = card.url ? `<a href="${card.url}">${pair}</a>` : pair;
            return `<figure>${picture}<figcaption><b>${escapeHtml(card.title)}</b><br><code>${card.id}</code> · ${escapeHtml(card.question)}</figcaption><div class="review" data-shot="${card.id}"><select data-review-verdict aria-label="Review verdict for ${card.id}"><option value="">—</option><option value="kept"${selected('kept')}>kept</option><option value="rejected"${selected('rejected')}>rejected</option></select><textarea data-review-note rows="1" placeholder="review note" aria-label="Review note for ${card.id}">${escapeHtml(entry.note ?? '')}</textarea></div></figure>`;
        })
        .join('\n');
    const experimentHTML = pending
        .map(
            (entry) =>
                `<article class="experiment"><b>${escapeHtml(entry.id)}</b> · ${escapeHtml(entry.host)} · <em>${escapeHtml(entry.status)}</em><p>${escapeHtml(entry.hypothesis)}</p><code>${escapeHtml(entry.command)}</code></article>`,
        )
        .join('\n');
    writeFileSync(
        resolve(out, filename),
        `<!doctype html><html><head><meta charset="utf-8">${watch ? '<meta http-equiv="refresh" content="4">' : ''}<title>${escapeHtml(title)}</title>
<style>body{margin:0;padding:20px;background:#0a0a0a;color:#eee;font:13px ui-monospace,monospace}
h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase}figure{margin:0 0 24px;max-width:1100px}
img{display:block;width:100%;border:1px solid #333}.pair{display:flex;gap:8px}.pair>*{flex:1}figcaption{padding:8px 0;color:#999;line-height:1.5}
b{color:#fff}.review{display:flex;gap:8px;align-items:flex-start}.review select,.review textarea{background:#111;color:#eee;border:1px solid #444;font:inherit;padding:4px}.review textarea{flex:1;resize:vertical}
#copy-review{background:#111;color:#7cf;border:1px solid #444;font:inherit;padding:6px 10px;cursor:pointer;margin-bottom:16px}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:28px 0 12px;color:#7cf}
.experiment{max-width:1100px;padding:10px 12px;margin:0 0 8px;border:1px solid #333;background:#101014}.experiment p{margin:6px 0;color:#bbb}.experiment em{color:#e8c46a;font-style:normal}.experiment code{color:#7fd1d5}</style></head><body>
<h1>${escapeHtml(title)} · ${escapeHtml(out)}</h1><button type="button" id="copy-review">Copy review JSON</button>${cardHTML || '<p>No captures yet.</p>'}
${pending.length ? `<h2>Pending experiments · ${pending.length}</h2>${experimentHTML}` : ''}
<script>
const key=${JSON.stringify(reviewKey)};let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
document.querySelectorAll('.review').forEach((row)=>{const id=row.dataset.shot,v=row.querySelector('[data-review-verdict]'),n=row.querySelector('[data-review-note]'),s=saved[id];
if(s){if(s.verdict)v.value=s.verdict;if(s.note!==undefined)n.value=s.note}
const persist=()=>{saved[id]={verdict:v.value||undefined,note:n.value||undefined};localStorage.setItem(key,JSON.stringify(saved))};
v.addEventListener('change',persist);n.addEventListener('input',persist)});
document.getElementById('copy-review').addEventListener('click',async()=>{const all={...saved};
document.querySelectorAll('.review').forEach((row)=>{const id=row.dataset.shot,v=row.querySelector('[data-review-verdict]').value,n=row.querySelector('[data-review-note]').value;
if(v||n)all[id]={verdict:v||undefined,note:n||undefined}});
try{await navigator.clipboard.writeText(JSON.stringify(all,null,2));document.getElementById('copy-review').textContent='Copied — paste into ${escapeHtml(copyTarget)}'}catch(e){}});
</script></body></html>`,
    );
};
export const watchFingerprints = (
    interval: number,
    fingerprint: () => string,
    onCapture: () => void,
): void => {
    let last = fingerprint();
    const poll = (): void => {
        setTimeout(() => {
            const next = fingerprint();
            if (next !== last) {
                last = next;
                onCapture();
            }
            poll();
        }, interval);
    };
    poll();
};
