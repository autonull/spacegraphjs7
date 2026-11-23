// D2 gate: the compatibility manifest and the committed public-surface snapshot.
// `check:compat` fails when a previous export or a documented alias disappears;
// `check:compat --update` records additions and intentional removals after review.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LIBRARY_ENTRIES } from './library-entries.js';
import { compilerOptions, exportedNames } from './surface.js';

type Alias = {
    symbols: string[];
    prefixes?: string[];
    replacement: string;
    source: string;
    deprecated: boolean;
};

type Manifest = {
    version: number;
    policy: { rule: string; reference: string; deprecateAt: string };
    aliases: Alias[];
    duplicateExports: { symbols: string[]; paths: string[]; action: string }[];
};

const root = resolve(import.meta.dirname, '..');
const snapshotPath = resolve(root, 'test/fixtures/public-surface.json');
const update = process.argv.includes('--update');

const manifest = JSON.parse(
    readFileSync(resolve(root, 'docs/api-compatibility.json'), 'utf8'),
) as Manifest;

if (manifest.version !== 1) throw new Error(`unsupported compatibility manifest version ${manifest.version}`);
if (!manifest.policy?.rule || !manifest.policy.reference || !manifest.policy.deprecateAt) {
    throw new Error('compatibility manifest is missing policy metadata');
}

const files = LIBRARY_ENTRIES.map((entry) => resolve(root, entry.source));
const names = exportedNames(files, compilerOptions(root));
const surface = Object.fromEntries(
    LIBRARY_ENTRIES.map((entry) => [entry.subpath, names.get(resolve(root, entry.source)) ?? []]),
);

if (update) {
    writeFileSync(snapshotPath, `${JSON.stringify(surface, null, 4)}\n`);
    console.log(
        `updated public surface: ${LIBRARY_ENTRIES.length} entries, ${Object.values(surface).reduce((total, names) => total + names.length, 0)} names`,
    );
    process.exit(0);
}

const removals: string[] = [];
if (!readFileSync(snapshotPath, 'utf8')) throw new Error(`${snapshotPath} is empty`);
const previous = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, string[]>;
for (const [subpath, names] of Object.entries(previous)) {
    if (!(subpath in surface)) {
        removals.push(`${subpath} (published entry removed)`);
        continue;
    }
    for (const name of names) {
        if (!surface[subpath].includes(name)) removals.push(`${subpath}: ${name}`);
    }
}
if (removals.length) {
    throw new Error(
        `unannounced public export removal; run check:compat --update after review:\n  ${removals.join('\n  ')}`,
    );
}

const aliasFailures: string[] = [];
for (const alias of manifest.aliases) {
    if (!alias.symbols?.length || !alias.replacement || !alias.source || typeof alias.deprecated !== 'boolean') {
        aliasFailures.push(`malformed alias: ${JSON.stringify(alias)}`);
        continue;
    }
    const source = readFileSync(resolve(root, alias.source), 'utf8');
    for (const symbol of alias.symbols) {
        if (!new RegExp(`\\b${symbol}\\b`).test(source)) {
            aliasFailures.push(`${alias.source}: alias ${symbol} is gone`);
        }
    }
    for (const prefix of alias.prefixes ?? []) {
        if (!source.includes(prefix)) aliasFailures.push(`${alias.source}: alias prefix ${prefix} is gone`);
    }
    if (alias.deprecated && !source.includes('@deprecated')) {
        aliasFailures.push(`${alias.source}: marked deprecated but has no @deprecated pointer`);
    }
}
if (aliasFailures.length) {
    throw new Error(`compatibility manifest is stale:\n  ${aliasFailures.join('\n  ')}`);
}

const additions = Object.entries(surface).flatMap(([subpath, names]) =>
    names.filter((name) => !(previous[subpath] ?? []).includes(name)).map((name) => `${subpath}: ${name}`),
);
console.log(
    `compat check passed: ${manifest.aliases.length} aliases present, ${additions.length} additive exports since the snapshot`,
);
if (additions.length) console.log(`  ${additions.join('\n  ')}`);
