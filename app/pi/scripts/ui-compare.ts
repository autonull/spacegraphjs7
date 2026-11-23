import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { uiComparison } from '../src/ui/evidence';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, '../../docs/screenshots/labs/ui-presets/comparison.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(uiComparison(), null, 2)}\n`);
console.log(`Wrote ${out}`);
