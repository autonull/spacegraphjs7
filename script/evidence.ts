// D6: one machine-readable record for pending experiments. `check:evidence --write` migrates the
// scattered indexes into docs/evidence/record.json; the default mode is the integrity gate.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const recordPath = resolve(root, 'docs/evidence/record.json');
const experimentsPath = 'docs/screenshots/experiments.json';
const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 24 });
const tracked = new Set(git('ls-files').split('\n').filter(Boolean));
const generated = /^docs\/screenshots\/(labs|atlas|demo-atlas|inner-layout|retro-style|capture)\//;

const source = JSON.parse(readFileSync(resolve(root, experimentsPath), 'utf8'));
const sources = [experimentsPath, 'docs/screenshots/review.json', ...git('ls-files', 'docs/screenshots/reports/*-comparison.json').split('\n').filter(Boolean)];
const hash = createHash('sha256');
for (const path of [...sources].sort()) hash.update(`${path}\0${readFileSync(resolve(root, path))}\0`);
const sourceHash = hash.digest('hex');

const entries = source.experiments.map((experiment: Record<string, unknown>) => ({
    id: experiment.id,
    host: experiment.host,
    status: experiment.status,
    hypothesis: experiment.hypothesis,
    incumbent: experiment.incumbent,
    variant: experiment.variant,
    pair: experiment.pair,
    command: experiment.command,
    decision: experiment.decision,
}));
const record = { rule: source.rule, sourceHash, sources, entries };

if (process.argv.includes('--write')) {
    mkdirSync(resolve(root, 'docs/evidence'), { recursive: true });
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`evidence record written: ${entries.length} entries`);
    process.exit(0);
}

const current = JSON.parse(readFileSync(recordPath, 'utf8')) as typeof record;
const failures: string[] = [];
if (current.sourceHash !== sourceHash) failures.push('source files changed; run check:evidence --write');
if (current.entries.length !== 9) failures.push(`expected 9 entries, found ${current.entries.length}`);
if (new Set(current.entries.map((entry) => entry.id)).size !== current.entries.length) {
    failures.push('duplicate experiment id');
}
for (const entry of current.entries) {
    if (!entry.id || !entry.host || !entry.hypothesis || !entry.decision) {
        failures.push(`${entry.id ?? '<unnamed>'}: incomplete entry`);
    }
    const pointer = String(entry.decision).split('#')[0];
    if (!tracked.has(pointer) && !generated.test(pointer)) {
        failures.push(`${entry.id}: decision file is neither tracked nor regenerable: ${pointer}`);
    }
    for (const path of Object.values(entry.pair ?? {})) {
        if (!tracked.has(path) && !generated.test(path)) {
            failures.push(`${entry.id}: pair image is neither tracked nor regenerable: ${path}`);
        }
    }
    if (Object.prototype.hasOwnProperty.call(entry, 'default')) {
        failures.push(`${entry.id}: a default flip is not a developer decision`);
    }
}
if (failures.length) throw new Error(`evidence integrity failed:\n  ${failures.join('\n  ')}`);
console.log(`evidence check passed: ${current.entries.length} entries, source hash ${sourceHash.slice(0, 12)}`);
