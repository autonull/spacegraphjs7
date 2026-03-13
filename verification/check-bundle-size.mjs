import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_BUNDLE_SIZE_KB = 200;

async function checkBundleSize() {
    console.log('[Bundle Audit] Checking SpaceGraphJS build size...');

    const bundlePath = path.resolve(__dirname, '../dist/spacegraphjs.js');

    if (!fs.existsSync(bundlePath)) {
        console.error(`[Error] Bundle not found at ${bundlePath}. Did you run "npm run build"?`);
        process.exit(1);
    }

    const stats = fs.statSync(bundlePath);
    const sizeKb = stats.size / 1024;

    console.log(`[Bundle Audit] dist/spacegraphjs.js: ${sizeKb.toFixed(2)} KB`);

    if (sizeKb > MAX_BUNDLE_SIZE_KB) {
        console.warn(`[Warning] Bundle size (${sizeKb.toFixed(2)} KB) exceeds soft target of ${MAX_BUNDLE_SIZE_KB} KB! Prefer smaller bundle size.`);
    } else {
        console.log('[Bundle Audit] Success: Bundle size is within the soft target (< 200KB).');
    }
}

checkBundleSize();
