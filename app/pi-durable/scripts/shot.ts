import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SHOTS } from '../src/shots';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const sheetOnly = args.includes('--sheet');
const requested = (args.find((arg) => !arg.startsWith('-')) ?? 'all').split(',').filter(Boolean);
const out = resolve(root, '../../docs/screenshots');
mkdirSync(out, { recursive: true });

const valid = requested[0] === 'all' ? SHOTS : SHOTS.filter((shot) => requested.includes(shot.id));
if (!valid.length || (requested[0] !== 'all' && valid.length !== requested.length)) {
    console.error(`Unknown shot: ${requested.join(',')}`);
    process.exit(1);
}

const reviewFile = resolve(out, 'pi-durable-review.json');
const review = existsSync(reviewFile) ? (JSON.parse(readFileSync(reviewFile, 'utf8')) as Record<string, { verdict?: string }>) : {};
const escape = (value: string): string =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

const capture = (): boolean => {
    for (const shot of SHOTS) {
        const file = resolve(out, shot.file);
        if (existsSync(file)) copyFileSync(file, `${file}.prev`);
    }
    const env = {
        ...process.env,
        SG_DURABLE_SHOTS: out,
        SG_DURABLE_SHOT: requested[0] === 'all' ? '' : requested.join(','),
        PI_DURABLE_FAUX_SEED: 'fixed',
    };
    return (
        spawnSync(
            'pnpm',
            ['exec', 'playwright', 'test', '--config', 'playwright.config.ts', 'tests/screenshots.spec.ts', '--grep', 'shot:'],
            { cwd: root, env, stdio: 'inherit' },
        ).status === 0
    );
};

const sheet = (): void => {
    const cards = SHOTS.map((shot) => {
        const file = resolve(out, shot.file);
        if (!existsSync(file)) return '';
        const stamp = Math.round(statSync(file).mtimeMs);
        const previous = resolve(out, `${shot.file}.prev`);
        const pair = existsSync(previous)
            ? `<div class="pair"><img class="prev" src="${shot.file}.prev?v=${stamp}" alt="${shot.title} previous"><img src="${shot.file}?v=${stamp}" alt="${shot.title}"></div>`
            : `<img src="${shot.file}?v=${stamp}" alt="${shot.title}">`;
        const selected = (verdict: string): string => (review[shot.id]?.verdict === verdict ? ' selected' : '');
        return `<figure>${pair}<figcaption><b>${escape(shot.title)}</b><br><code>${shot.id}</code> · ${escape(shot.question)}</figcaption>
        <div class="review" data-shot="${shot.id}"><select data-verdict><option value="">—</option><option value="kept"${selected('kept')}>kept</option><option value="rejected"${selected('rejected')}>rejected</option></select><textarea rows="1" placeholder="review note"></textarea></div></figure>`;
    }).join('\n');
    writeFileSync(
        resolve(out, 'pi-durable-index.html'),
        `<!doctype html><html><head><meta charset="utf-8">${watch ? '<meta http-equiv="refresh" content="4">' : ''}<title>Pi Durable — screenshot studio</title>
<style>body{margin:0;padding:20px;background:#0a0a0a;color:#eee;font:13px ui-monospace,monospace}h1{font-size:15px;text-transform:uppercase;letter-spacing:.08em}
figure{margin:0 0 24px;max-width:1100px}img{display:block;width:100%;border:1px solid #333}.pair{display:flex;gap:8px}.pair>*{flex:1}
figcaption{padding:8px 0;color:#999;line-height:1.5}b{color:#fff}.review{display:flex;gap:8px}.review select,.review textarea{background:#111;color:#eee;border:1px solid #444;font:inherit;padding:4px}.review textarea{flex:1;resize:vertical}
#copy{background:#111;color:#7cf;border:1px solid #444;font:inherit;padding:6px 10px;cursor:pointer;margin-bottom:16px}</style></head><body>
<h1>Pi Durable — screenshot studio</h1><button type="button" id="copy">Copy review JSON</button>${cards || '<p>No captures yet.</p>'}
<script>const key='pi-durable:review';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
document.querySelectorAll('.review').forEach((row)=>{const id=row.dataset.shot,v=row.querySelector('select'),n=row.querySelector('textarea'),s=saved[id];if(s){v.value=s.verdict||'';n.value=s.note||''}
const persist=()=>{saved[id]={verdict:v.value||undefined,note:n.value||undefined};localStorage.setItem(key,JSON.stringify(saved))};v.addEventListener('change',persist);n.addEventListener('input',persist)});
document.getElementById('copy').addEventListener('click',async()=>{const all={...saved};document.querySelectorAll('.review').forEach((row)=>{all[row.dataset.shot]={verdict:row.querySelector('select').value||undefined,note:row.querySelector('textarea').value||undefined}});
try{await navigator.clipboard.writeText(JSON.stringify(all,null,2));document.getElementById('copy').textContent='Copied — paste into docs/screenshots/pi-durable/review.json'}catch(e){}});
</script></body></html>`,
    );
};

if (sheetOnly || capture()) sheet();
else process.exit(1);
console.log(`\nScreenshot studio: file://${resolve(out, 'pi-durable-index.html')}`);

if (watch && !sheetOnly) {
    let previous = SHOTS.map((shot) => statSync(resolve(out, shot.file)).mtimeMs).join('|');
    const poll = (): void => {
        setTimeout(() => {
            const next = SHOTS.map((shot) => {
                const file = resolve(out, shot.file);
                return existsSync(file) ? statSync(file).mtimeMs : 0;
            }).join('|');
            if (next !== previous) {
                previous = next;
                if (capture()) sheet();
            }
            poll();
        }, 4000);
    };
    poll();
}
