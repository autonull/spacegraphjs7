import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS } from '../src/shots';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const positional = args.filter((arg) => !arg.startsWith('-'));
const id = positional[0] ?? 'all';
const requested = id.split(',').map((entry) => entry.trim()).filter(Boolean);
const outIndex = args.indexOf('--out');
const out = resolve(root, outIndex >= 0 ? args[outIndex + 1]! : '../../docs/screenshots');
mkdirSync(out, { recursive: true });

interface ReviewEntry {
    readonly verdict?: 'kept' | 'rejected';
    readonly note?: string;
}
const reviewPath = resolve(out, 'review.json');
const loadReview = (): Record<string, ReviewEntry> => {
    if (!existsSync(reviewPath)) return {};
    try {
        return JSON.parse(readFileSync(reviewPath, 'utf8')) as Record<string, ReviewEntry>;
    } catch {
        return {};
    }
};
const review = loadReview();
const escapeHtml = (value: string): string =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

const valid = id === 'all' ? SHOTS : SHOTS.filter((shot) => requested.includes(shot.id));
if (id !== 'all' && (!valid.length || valid.length !== requested.length)) {
    console.error(`Unknown shot "${id}". Available: ${SHOTS.map((shot) => shot.id).join(', ')}`);
    process.exit(1);
}

const capture = (): boolean => {
    for (const shot of SHOTS) {
        const file = resolve(out, shot.file);
        if (existsSync(file)) copyFileSync(file, `${file}.prev`);
    }
    const env = { ...process.env, SG_PI_SHOTS: out, SG_PI_SHOT: id === 'all' ? '' : requested.join(',') };
    const grep = id === 'all' ? 'shot:' : `shot: (${requested.join('|')})`;
    const result = spawnSync(
        'pnpm',
        ['exec', 'playwright', 'test', '--config', 'playwright.config.ts', 'tests/screenshots.spec.ts', '--grep', grep],
        { cwd: root, env, stdio: 'inherit' },
    );
    return result.status === 0;
};

const contactSheet = (): void => {
    const cards = SHOTS.map((shot) => {
        const file = resolve(out, shot.file);
        if (!existsSync(file)) return '';
        const stamp = Math.round(statSync(file).mtimeMs);
        const entry = review[shot.id] ?? {};
        const kept = entry.verdict === 'kept' ? ' selected' : '';
        const rejected = entry.verdict === 'rejected' ? ' selected' : '';
        const verdict = `<select data-review-verdict aria-label="Review verdict for ${shot.id}"><option value="">—</option><option value="kept"${kept}>kept</option><option value="rejected"${rejected}>rejected</option></select>`;
        const note = `<textarea data-review-note rows="1" placeholder="review note" aria-label="Review note for ${shot.id}">${escapeHtml(entry.note ?? '')}</textarea>`;
        const previous = resolve(out, `${shot.file}.prev`);
        const pair = existsSync(previous)
            ? `<div class="pair"><img class="prev" src="${shot.file}.prev?v=${stamp}" alt="${shot.title} previous"><a href="http://localhost:${process.env.SG_PI_PORT ?? 5175}/?shot=${shot.id}"><img src="${shot.file}?v=${stamp}" alt="${shot.title}"></a></div>`
            : `<a href="http://localhost:${process.env.SG_PI_PORT ?? 5175}/?shot=${shot.id}"><img src="${shot.file}?v=${stamp}" alt="${shot.title}"></a>`;
        return `<figure>${pair}<figcaption><b>${shot.title}</b><br><code>${shot.id}</code> · ${shot.question}</figcaption><div class="review" data-shot="${shot.id}">${verdict}${note}</div></figure>`;
    }).join('\n');
    const refresh = watch ? '<meta http-equiv="refresh" content="4">' : '';
    writeFileSync(
        resolve(out, 'index.html'),
        `<!doctype html><html><head><meta charset="utf-8">${refresh}<title>Screenshot studio</title>
<style>body{margin:0;padding:20px;background:#0a0a0a;color:#eee;font:13px ui-monospace,monospace}
h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase}figure{margin:0 0 24px;max-width:1100px}
img{display:block;width:100%;border:1px solid #333}.pair{display:flex;gap:8px}.pair>*{flex:1}figcaption{padding:8px 0;color:#999;line-height:1.5}
b{color:#fff}.review{display:flex;gap:8px;align-items:flex-start}.review select,.review textarea{background:#111;color:#eee;border:1px solid #444;font:inherit;padding:4px}.review textarea{flex:1;resize:vertical}
#copy-review{background:#111;color:#7cf;border:1px solid #444;font:inherit;padding:6px 10px;cursor:pointer;margin-bottom:16px}</style></head><body>
<h1>Screenshot studio · ${out}</h1><button type="button" id="copy-review">Copy review JSON</button>${cards || '<p>No captures yet.</p>'}
<script>
const key='spacegraph:review';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
document.querySelectorAll('.review').forEach((row)=>{const id=row.dataset.shot,v=row.querySelector('[data-review-verdict]'),n=row.querySelector('[data-review-note]'),s=saved[id];
if(s){if(s.verdict)v.value=s.verdict;if(s.note!==undefined)n.value=s.note}
const persist=()=>{saved[id]={verdict:v.value||undefined,note:n.value||undefined};localStorage.setItem(key,JSON.stringify(saved))};
v.addEventListener('change',persist);n.addEventListener('input',persist)});
document.getElementById('copy-review').addEventListener('click',async()=>{const all={...saved};
document.querySelectorAll('.review').forEach((row)=>{const id=row.dataset.shot,v=row.querySelector('[data-review-verdict]').value,n=row.querySelector('[data-review-note]').value;
if(v||n)all[id]={verdict:v||undefined,note:n||undefined}});
try{await navigator.clipboard.writeText(JSON.stringify(all,null,2));document.getElementById('copy-review').textContent='Copied — paste into docs/screenshots/review.json'}catch(e){}});
</script></body></html>`,
    );
};

const sourceFiles = (): string[] => {
    const files = ['index.html', 'tests/screenshots.spec.ts'];
    const walk = (dir: string): void => {
        const full = resolve(root, dir);
        if (!existsSync(full)) return;
        for (const entry of readdirSync(full, { withFileTypes: true })) {
            const relative = `${dir}/${entry.name}`;
            if (entry.isDirectory()) walk(relative);
            else if (entry.name.endsWith('.ts')) files.push(relative);
        }
    };
    walk('src');
    walk('../../packages/shared/src');
    return files;
};

const fingerprint = (): string =>
    sourceFiles()
        .map((file) => {
            const path = resolve(root, file);
            return `${file}:${existsSync(path) ? statSync(path).mtimeMs : 0}`;
        })
        .join('|');

if (!capture()) process.exit(1);
contactSheet();
console.log(`\nScreenshot studio: file://${resolve(out, 'index.html')}`);

if (watch) {
    let last = fingerprint();
    console.log('Watching source files. Ctrl-C to stop.');
    const poll = async (): Promise<void> => {
        await new Promise((done) => setTimeout(done, 700));
        const next = fingerprint();
        if (next !== last) {
            last = next;
            console.log('Source changed — recapturing…');
            if (capture()) contactSheet();
        }
        void poll();
    };
    void poll();
}
