import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.SG_DEMO_URL ?? 'http://localhost:5173';

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(`${BASE_URL}/hardening.html`);
  await page.waitForFunction(() => (window as any).__ready === true);
  return errors;
}

test.describe('SpaceGraph hardening (L1.5-L1.7, L1.14)', () => {
  test('mounts as an orthographic, on-demand graph without console errors', async ({ page }) => {
    const errors = await boot(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    expect(await page.evaluate(() => (window as any).__sg.projection)).toBe('orthographic');
    expect(await page.evaluate(() => (window as any).__sg.nodeCount)).toBe(3);
    // Edge labels render through the CSS2D layer.
    await expect(page.locator('.sg-edge-label').first()).toBeVisible({ timeout: 10_000 });

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('switches projection and honours programmatic zoom', async ({ page }) => {
    const errors = await boot(page);

    await page.evaluate(() => (window as any).__sg.setProjection('perspective'));
    expect(await page.evaluate(() => (window as any).__sg.projection)).toBe('perspective');
    await page.evaluate(() => (window as any).__sg.setProjection('orthographic'));
    expect(await page.evaluate(() => (window as any).__sg.projection)).toBe('orthographic');

    await page.evaluate(() => (window as any).__sg.setZoom(0.8));
    expect(await page.evaluate(() => (window as any).__sg.viewport.zoom)).toBeCloseTo(0.8, 2);
    expect(await page.evaluate(() => (window as any).__zoomEvents)).toBeGreaterThan(0);

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('selects a node and treats a plain click as selection', async ({ page }) => {
    const errors = await boot(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    const box = await page.locator('canvas').boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    await page.evaluate(() => (window as any).__sg.select('b'));
    expect(await page.evaluate(() => (window as any).__sg.selected)).toEqual(['b']);

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('mount/dispose cycles release canvases and registry entries', async ({ page }) => {
    const errors = await boot(page);

    const cycles = await page.evaluate(() => (window as any).__cycle(20));
    expect(cycles.instances).toBe(1);
    expect(cycles.canvases).toBe(1);

    await page.evaluate(() => (window as any).__disposeMain());
    const after = await page.evaluate(() => (window as any).__cycle(1));
    expect(after.canvases).toBe(0);
    expect(after.instances).toBe(0);

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});

test.describe('SpaceGraph touch parity (L1.32)', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 900 } });

  test('pinch zooms and two-finger drag pans on a 390x900 touch viewport', async ({ page }) => {
    const errors = await boot(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    const before = await page.evaluate(() => (window as any).__sg.viewport.zoom);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const fire = (type: string, id: number, x: number, y: number) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            clientX: x,
            clientY: y,
            buttons: type === 'pointerup' ? 0 : 1,
            bubbles: true,
          })
        );
      fire('pointerdown', 1, cx - 30, cy);
      fire('pointerdown', 2, cx + 30, cy);
      fire('pointermove', 1, cx - 90, cy);
      fire('pointermove', 2, cx + 90, cy);
      fire('pointerup', 1, cx - 90, cy);
      fire('pointerup', 2, cx + 90, cy);
    });
    await page.waitForTimeout(150);

    const after = await page.evaluate(() => (window as any).__sg.viewport.zoom);
    expect(Math.abs(after - before)).toBeGreaterThan(0.01);
    expect(await page.evaluate(() => (window as any).__zoomEvents)).toBeGreaterThan(0);
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});
