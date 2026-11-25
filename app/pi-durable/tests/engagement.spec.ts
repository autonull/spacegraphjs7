import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

type Addr = { readonly view?: string; readonly rung?: string; readonly layout?: string; readonly focus?: string };
type Representation = { readonly nodeIDs: readonly string[]; readonly edgeIDs: readonly string[] };
type Weights = { readonly weights: Readonly<Record<string, number>> };
type Emphasis = {
    readonly rung: string;
    readonly mutedNodes: number;
    readonly mutedEdges: number;
    readonly activeGroups: readonly string[];
};

test('E0 — follow thread uses recorded edges and Esc restores the address', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const head = 'd:1:conversation';
    await call(page, 'reveal', head);
    const before = await call<Addr>(page, 'address');
    const steps = await call<readonly { readonly id: string; readonly kind: string }[]>(page, 'followThread', head);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => ['orders', 'checkpoint'].includes(step.kind))).toBe(true);
    expect(await call<boolean>(page, 'threadActive')).toBe(true);

    await page.keyboard.press('Escape');
    expect(await call<boolean>(page, 'threadActive')).toBe(false);
    const after = await call<Addr>(page, 'address');
    expect(after.view ?? 'graph').toBe(before.view ?? 'graph');
    expect(after.rung ?? 'fact').toBe(before.rung ?? 'fact');
    expect(after.focus).toBe(before.focus);
    expect(errors).toEqual([]);
});

test('E1 — focus lens mutes without changing the fold and restores attention', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const id = 'd:1:conversation';
    await call(page, 'reveal', id);
    const before = await call<Representation>(page, 'representation');
    const weightsBefore = await call<Weights>(page, 'attention');

    await call(page, 'toggleFocusLens', id);
    expect(await call<boolean>(page, 'focusLensActive')).toBe(true);
    const after = await call<Representation>(page, 'representation');
    expect(after.nodeIDs).toEqual(before.nodeIDs);
    expect(after.edgeIDs).toEqual(before.edgeIDs);
    expect(await page.locator('#canvas [data-muted="true"]').count()).toBeGreaterThan(0);
    const weightsAfter = await call<Weights>(page, 'attention');
    expect(weightsAfter.weights[id]!).toBeGreaterThanOrEqual(weightsBefore.weights[id]!);
    const increased = Object.keys(weightsBefore.weights)
        .filter((nodeID) => (weightsAfter.weights[nodeID] ?? 0) > weightsBefore.weights[nodeID]!);
    expect(increased.length).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    expect(await call<boolean>(page, 'focusLensActive')).toBe(false);
    expect((await call<Weights>(page, 'attention')).weights[id]).toBeCloseTo(weightsBefore.weights[id]!);
    expect(errors).toEqual([]);
});

test('E2 — guided route exposes each committed caption in the drawer and inspector', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'insights');
    await page.locator('#route-next').click();
    await expect(page.locator('#route-caption')).toContainText('prompt committed');
    await expect(page.locator('#inspector')).toContainText('prompt committed');
    await page.locator('#route-prev').click();
    await expect(page.locator('#route-caption')).toContainText('seeded turn');
    expect(errors).toEqual([]);
});

test('E3 — commit ticker works under reduced motion and the ripple is cut', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'insights');
    await call(page, 'prompt', 'A reduced motion answer.');
    await expect(page.locator('#commit-ticker')).toContainText('message');
    const pulse = page.locator('#canvas [data-pulse="true"]').first();
    expect(await pulse.count()).toBeGreaterThan(0);
    const animation = await pulse.evaluate((node) => getComputedStyle(node, '::after').animationName);
    expect(animation).toBe('none');
    expect(errors).toEqual([]);
});

test('E4 — callouts count committed facts and keep the drawer usable at 900x700', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    const errors = await boot(page, '?shot=sleeping-approval');
    await page.locator('#menu-button').click();
    await openPanel(page, 'insights');
    expect(await call<readonly unknown[]>(page, 'callouts')).toHaveLength(3);
    await expect(page.locator('#callouts button')).toHaveCount(3);
    await expect(page.locator('#menu-button')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#drawer')).toBeHidden();
    expect(errors).toEqual([]);
});

test('C2 — muting chips dim non-matches without changing the fold', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'insights');
    const before = await call<Representation>(page, 'representation');
    await call(page, 'setRung', 'fact');
    const baseline = await page.locator('#canvas [data-muted="true"]').count();
    await page.locator('#filter-kinds .filter-chip', { hasText: 'message' }).click();
    await call(page, 'setRung', 'fact');
    const after = await call<Representation>(page, 'representation');
    expect(after.nodeIDs).toEqual(before.nodeIDs);
    expect(after.edgeIDs).toEqual(before.edgeIDs);
    const counts = await call<{ readonly counts: { readonly total: number; readonly matching: number } }>(page, 'filters');
    expect(counts.counts.total).toBe(before.nodeIDs.length);
    expect(counts.counts.matching).toBeLessThan(counts.counts.total);
    await expect(page.locator('#filter-count')).toContainText(`${counts.counts.matching} / ${counts.counts.total}`);
    expect(await page.locator('#canvas [data-muted="true"]').count()).toBeGreaterThan(baseline);
    await page.keyboard.press('m');
    await call(page, 'setRung', 'fact');
    expect(await page.locator('#canvas [data-muted="true"]').count()).toBe(baseline);
    expect((await call<{ readonly counts: { readonly matching: number } }>(page, 'filters')).counts.matching)
        .toBe(before.nodeIDs.length);
    expect(errors).toEqual([]);
});

test('ZUI — rung emphasis and band folding mute without changing the fold', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const before = await call<Representation>(page, 'representation');
    const fact = await call<Emphasis>(page, 'emphasis');
    expect(fact.mutedNodes).toBe(0);
    expect(fact.activeGroups.length).toBeGreaterThan(0);

    await call(page, 'setRung', 'cosmos');
    const cosmos = await call<Emphasis>(page, 'emphasis');
    expect(cosmos.mutedNodes).toBeGreaterThan(0);
    expect(cosmos.mutedEdges).toBeGreaterThan(0);
    expect(cosmos.activeGroups.length).toBeLessThanOrEqual(fact.activeGroups.length);
    const after = await call<Representation>(page, 'representation');
    expect(after.nodeIDs).toEqual(before.nodeIDs);
    expect(after.edgeIDs).toEqual(before.edgeIDs);

    await call(page, 'setRung', 'fact');
    expect((await call<Emphasis>(page, 'emphasis')).mutedNodes).toBe(0);
    expect(errors).toEqual([]);
});

test('C1 — the drawer pins a reference, diffs committed ids and clears the view', async ({ page }) => {
    const errors = await boot(page, '?shot=fork-tabs');
    await openPanel(page, 'insights');
    const before = await call<string>(page, 'viewName');
    await page.locator('#compare-pin').click();
    expect(await call<string | null>(page, 'pinned')).not.toBeNull();
    expect(await call<string>(page, 'viewName')).toBe('diff');
    await expect(page.locator('#compare-status')).toContainText('Reference:');
    expect(await page.locator('#canvas [data-diff]').count()).toBeGreaterThan(0);
    await page.locator('#compare-clear').click();
    expect(await call<string | null>(page, 'pinned')).toBeNull();
    expect(await call<string>(page, 'viewName')).toBe(before);

    const nodeID = (await call<Representation>(page, 'representation')).nodeIDs[0]!;
    expect(await call<boolean>(page, 'pinCompare', nodeID)).toBe(true);
    expect(await call<string | null>(page, 'pinned')).not.toBeNull();
    await page.locator('#compare-clear').click();
    expect(errors).toEqual([]);
});
