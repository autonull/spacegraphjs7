import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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

const valid = id === 'all' ? SHOTS : SHOTS.filter((shot) => requested.includes(shot.id));
if (id !== 'all' && (!valid.length || valid.length !== requested.length)) {
    console.error(`Unknown shot "${id}". Available: ${SHOTS.map((shot) => shot.id).join(', ')}`);
    process.exit(1);
}

const capture = (): boolean => {
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
        return `<figure><a href="http://localhost:${process.env.SG_PI_PORT ?? 5175}/?shot=${shot.id}"><img src="${shot.file}?v=${stamp}" alt="${shot.title}"></a><figcaption><b>${shot.title}</b><br><code>${shot.id}</code> · ${shot.question}</figcaption></figure>`;
    }).join('\n');
    const refresh = watch ? '<meta http-equiv="refresh" content="4">' : '';
    writeFileSync(
        resolve(out, 'index.html'),
        `<!doctype html><html><head><meta charset="utf-8">${refresh}<title>Screenshot studio</title>
<style>body{margin:0;padding:20px;background:#0a0a0a;color:#eee;font:13px ui-monospace,monospace}
h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase}figure{margin:0 0 24px;max-width:1100px}
img{display:block;width:100%;border:1px solid #333}figcaption{padding:8px 0;color:#999;line-height:1.5}
b{color:#fff}</style></head><body><h1>Screenshot studio · ${out}</h1>${cards || '<p>No captures yet.</p>'}</body></html>`,
    );
};

const sourceFiles = (): string[] => {
    const files = ['index.html', 'tests/screenshots.spec.ts'];
    for (const dir of ['src', 'src/policy']) {
        const full = resolve(root, dir);
        if (existsSync(full))
            files.push(...readdirSync(full).filter((name) => name.endsWith('.ts')).map((name) => `${dir}/${name}`));
    }
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
