// A screenshot path in a doc or a Shot is a contract: it must name a tracked file. Generated labs
// and atlas directories are gitignored by design and are declared here rather than guessed at.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 24 });
const tracked = new Set(git('ls-files', '-z').split('\0').filter(Boolean));
const failures: string[] = [];

for (const file of tracked) {
    if (file.endsWith('.prev')) failures.push(`tracked .prev file: ${file}`);
}

const { SHOTS } = await import('../app/pi/src/shots.ts');
for (const shot of SHOTS) {
    const path = `docs/screenshots/${shot.file}`;
    if (!tracked.has(path)) failures.push(`Shot.file is not tracked: ${path} (${shot.id})`);
}

const generated = /^(labs|atlas|demo-atlas|inner-layout|retro-style|capture)\//;
const markdown = git('ls-files', '*.md').split('\n').filter(Boolean);
for (const file of markdown) {
    const text = readFileSync(resolve(root, file), 'utf8');
    for (const [path] of text.matchAll(/docs\/screenshots\/[A-Za-z0-9_.\/-]+\.(?:png|jpe?g|json|html)/g)) {
        const relative = path.slice('docs/screenshots/'.length);
        if (relative === 'index.html' || generated.test(relative)) continue;
        if (!tracked.has(path)) failures.push(`${file}: missing ${path}`);
    }
    if (file === 'docs/screenshots/README.md') {
        for (const [name] of text.matchAll(/\bpi\/[A-Za-z0-9_.-]+\.png/g)) {
            const path = `docs/screenshots/${name}`;
            if (!tracked.has(path)) failures.push(`${file}: missing ${path}`);
        }
    }
}

if (failures.length) throw new Error(`path check failed:\n  ${failures.join('\n  ')}`);
console.log(`path check passed: ${SHOTS.length} shots, ${markdown.length} docs, no tracked .prev`);
