// Executable docs: the lab catalogue, the demo registry, the demo JOB lines and the docs lift lines
// are one handoff. Drift between them is a check failure, not a note in a later plan.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LAB_EXPERIMENTS } from '../app/demo/src/lab-catalogue.ts';
import { demoEntry, demoPath } from '../app/demo/src/registry.ts';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const docs = read('docs/console-experiments.md');
const plan = read('TODO20.md');
const heads = [...docs.matchAll(/^## \d+\. .+ — `([^`]+)`$/gm)];
const failures: string[] = [];
const fail = (message: string) => failures.push(message);

if (heads.length !== LAB_EXPERIMENTS.length)
    fail(`docs has ${heads.length} experiments; catalogue has ${LAB_EXPERIMENTS.length}`);

const catalogueSection = plan.slice(plan.indexOf('## 4.'), plan.indexOf('## 5.'));
const outcomesSection = plan.slice(plan.indexOf('## 5.'), plan.indexOf('## 6.'));
if (!outcomesSection.includes('Every lift candidate is indexed in §4'))
    fail('TODO20.md §5 no longer points to §4 as the lift-candidate index');

for (const experiment of LAB_EXPERIMENTS) {
    const entry = demoEntry(experiment.id);
    if (!entry || demoPath(experiment.id) === `/${experiment.id}.html`) {
        fail(`${experiment.id}: no generated registry entry`);
        continue;
    }
    const sourcePath = `app/demo/${entry.path}`;
    if (!existsSync(resolve(root, sourcePath))) fail(`${experiment.id}: missing ${sourcePath}`);
    else if (!read(sourcePath).includes(`JOB: ${experiment.job}`))
        fail(`${experiment.id}: JOB line differs from the catalogue`);

    const heading = heads.find((head) => head[1] === entry.path);
    if (!heading || heading.index === undefined) {
        fail(`${experiment.id}: no numbered section in docs/console-experiments.md`);
        continue;
    }
    const start = heading.index + heading[0].length;
    const next = docs.indexOf('\n## ', start);
    const section = docs.slice(start, next < 0 ? docs.length : next);
    if (!section.includes('**Lift:**')) fail(`${experiment.id}: docs section has no Lift: line`);
    for (const lift of experiment.lift) {
        if (!section.includes(lift)) fail(`${experiment.id}: docs Lift line omits ${lift}`);
        if (!catalogueSection.includes(lift)) fail(`${experiment.id}: TODO20.md §4 omits ${lift}`);
    }
}

if (!read('app/demo/html/labs.html').includes("from '../src/lab-catalogue'"))
    fail('labs index does not read the catalogue');

if (failures.length) throw new Error(`lab catalogue check failed:\n  ${failures.join('\n  ')}`);
console.log(
    `lab catalogue check passed: ${LAB_EXPERIMENTS.length} experiments, registry paths, JOB lines and Lift lines agree`,
);
