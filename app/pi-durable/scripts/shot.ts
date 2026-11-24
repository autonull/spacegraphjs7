import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HERO_SHOTS } from '../src/shots';
import { STORIES } from '../src/stories';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const sheetOnly = args.includes('--sheet');
const storiesOnly = args.includes('stories') || args.includes('--composite');
const requested = (args.find((arg) => !arg.startsWith('-')) ?? 'all').split(',').filter(Boolean);
const out = process.env.SG_DURABLE_SHOTS ?? resolve(root, '../../docs/screenshots');
mkdirSync(out, { recursive: true });

const heroIDs = HERO_SHOTS.map((shot) => shot.id);
const storyIDs = STORIES.map((story) => story.id);
const known = new Set([...heroIDs, ...storyIDs]);
if (requested[0] !== 'all' && requested[0] !== 'stories' && requested.some((id) => !known.has(id))) {
    console.error(`Unknown shot: ${requested.join(',')}`);
    process.exit(1);
}

const heroes = requested[0] === 'all' ? heroIDs : storiesOnly ? [] : requested.filter((id) => heroIDs.includes(id));
const stories = requested[0] === 'all' || storiesOnly
    ? requested[0] === 'stories' && requested.length > 1 ? requested.slice(1) : storyIDs
    : requested.filter((id) => storyIDs.includes(id));

const reviewFile = resolve(out, 'pi-durable-review.json');
const review = existsSync(reviewFile) ? (JSON.parse(readFileSync(reviewFile, 'utf8')) as Record<string, { verdict?: string }>) : {};
const escape = (value: string): string =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

const play = (spec: string, env: Record<string, string>): boolean =>
    spawnSync('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.config.ts', spec], {
        cwd: root,
        env: { ...process.env, ...env },
        stdio: 'inherit',
    }).status === 0;

const backup = (files: readonly string[]): void => {
    for (const file of files) if (existsSync(file)) copyFileSync(file, `${file}.prev`);
};

const capture = (): boolean => {
    const env = { ...process.env, SG_DURABLE_SHOTS: out, PI_DURABLE_FAUX_SEED: 'fixed' };
    if (heroes.length) {
        backup(heroes.map((id) => resolve(out, `pi-durable/${id}.png`)));
        if (!play('tests/screenshots.spec.ts', { ...env, SG_DURABLE_SHOT: heroes.join(',') })) return false;
    }
    if (stories.length) {
        backup(stories.map((id) => resolve(out, `pi-durable/stories/${id}.png`)));
        if (!play('tests/stories.spec.ts', { ...env, SG_DURABLE_STORY: stories.join(',') })) return false;
    }
    return true;
};

const card = (id: string, file: string, title: string, question: string): string => {
    const path = resolve(out, file);
    if (!existsSync(path)) return '';
    const stamp = Math.round(statSync(path).mtimeMs);
    const previous = resolve(out, `${file}.prev`);
    const pair = existsSync(previous)
        ? `<div class="pair"><img class="prev" src="${file}.prev?v=${stamp}" alt="${title} previous"><img src="${file}?v=${stamp}" alt="${title}"></div>`
        : `<img src="${file}?v=${stamp}" alt="${title}">`;
    const selected = (verdict: string): string => (review[id]?.verdict === verdict ? ' selected' : '');
    return `<figure>${pair}<figcaption><b>${escape(title)}</b><br><code>${id}</code> · ${escape(question)}</figcaption>
    <div class="review" data-shot="${id}"><select data-verdict><option value="">—</option><option value="kept"${selected('kept')}>kept</option><option value="rejected"${selected('rejected')}>rejected</option></select><textarea rows="1" placeholder="review note"></textarea></div></figure>`;
};

const sheet = (): void => {
    const cards = [
        ...HERO_SHOTS.map((shot) => card(shot.id, shot.file, shot.title, shot.question)),
        ...STORIES.map((story) => card(story.id, story.file, story.title, story.question)),
    ].join('\n');
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
    const tracked = [...HERO_SHOTS.map((shot) => shot.file), ...STORIES.map((story) => story.file)];
    let previous = tracked.map((file) => {
        const path = resolve(out, file);
        return existsSync(path) ? statSync(path).mtimeMs : 0;
    }).join('|');
    const poll = (): void => {
        setTimeout(() => {
            const next = tracked.map((file) => {
                const path = resolve(out, file);
                return existsSync(path) ? statSync(path).mtimeMs : 0;
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
