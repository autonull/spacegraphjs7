import { test, expect } from '@playwright/test';
import { visionAssert } from '../src/vision/vision-test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SpaceGraph Vision System E2E', () => {
    // Increase timeout since VisionManager launches its own Chromium and http-server instance.
    test.setTimeout(30000);

    const fixtureDir = path.resolve(__dirname, 'fixtures');

    test('should detect bounding-box overlaps autonomously', async () => {
        // We expect the fixture graph to fail the overlap test because we deliberately placed nodes at (0,0) and (5,5)
        await expect(visionAssert.noOverlap(fixtureDir)).rejects.toThrow(/Expected no overlaps/);
    });

    test('should detect WCAG legibility contrast violations', async () => {
        // We expect the fixture graph to fail the WCAG legibility test because we deliberately used #ff0000 red backing behind white text.
        await expect(visionAssert.allTextLegible(fixtureDir)).rejects.toThrow(
            /Expected all text to be legible/,
        );
    });
});
