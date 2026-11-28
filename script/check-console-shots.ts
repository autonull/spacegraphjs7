// Guards the committed console captures: every declared shot must exist, be a valid PNG at the
// declared viewport size, and appear in the screenshot studio. Pixel hashes are intentionally not
// compared: animation timing makes detail captures vary between identical runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONSOLE_SHOT_META } from '../app/pi-durable/src/console-shots';

const root = resolve(import.meta.dirname, '..');
const studio = readFileSync(resolve(root, 'docs/screenshots/pi-durable-index.html'), 'utf8');
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

for (const shot of CONSOLE_SHOT_META) {
    const file = `pi-durable/console/${shot.id}.png`;
    const path = resolve(root, 'docs/screenshots', file);
    const png = readFileSync(path);
    const viewport = shot.viewport ?? { width: 1600, height: 1000 };
    if (!png.subarray(0, 8).equals(signature)) throw new Error(`${file} is not a PNG`);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== viewport.width || height !== viewport.height)
        throw new Error(`${file} is ${width}x${height}; expected ${viewport.width}x${viewport.height}`);
    if (!studio.includes(file)) throw new Error(`${file} is missing from the studio`);
}

console.log(
    `console shot check passed: ${CONSOLE_SHOT_META.length} captures match their declarations`,
);
