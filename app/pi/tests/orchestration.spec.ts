import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page): Promise<void> => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.portalNodes().length), {
            timeout: 10_000,
        })
        .toBeGreaterThan(0);
};

test.describe('the living rectangle and orchestration seam', () => {
    test('mounts at most two contextual instruments and keeps the full kit in the inspector', async ({
        page,
    }) => {
        await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.setLevel('detail');
            pi.reveal(pi.edges()[0].target);
        });
        await expect(page.locator('#instrument-kit [data-instrument-for]').first()).toBeVisible({
            timeout: 5000,
        });
        expect(
            await page.evaluate(() => (window as any).__pi.railInstruments()),
        ).toBeLessThanOrEqual(2);
        await page.evaluate(() => (window as any).__pi.setInspectorTab('signals'));
        const kinds = await page
            .locator('#inspector-instruments [data-instrument-for]')
            .evaluateAll((nodes) => nodes.map((node) => node.className));
        expect(kinds.some((kind) => kind.includes('instrument-sparkline'))).toBe(true);
        expect(kinds.some((kind) => kind.includes('instrument-controls'))).toBe(true);
        const actions = await page
            .locator('#inspector-instruments [data-instrument-action]')
            .evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute('data-instrument-action')),
            );
        expect(actions).toContain('steer');
        expect(actions).toContain('approve');
    });

    test('steer affordance drives the prompt seam with transcript parity', async ({ page }) => {
        const requests: { mode?: string }[] = [];
        page.on('request', (request) => {
            if (request.url().endsWith('/prompt') && request.method() === 'POST') {
                requests.push(request.postDataJSON() as { mode?: string });
            }
        });
        await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.setLevel('detail');
            pi.reveal(pi.edges()[0].target);
            pi.setInspectorTab('signals');
        });
        await page
            .locator('#inspector-instruments [data-instrument-action="steer"]')
            .first()
            .click();
        await expect(page.locator('#prompt-mode')).toHaveValue('steer');
        await page.locator('#prompt-input').fill('inspect the failing test');
        await page.locator('#prompt-form button[type="submit"]').click();
        await expect.poll(() => requests.length).toBeGreaterThan(0);
        expect(requests[0].mode).toBe('steer');
        await expect(page.locator('#evidence li').first()).toContainText('prompt · steer');
        const kinds = await page.evaluate(() =>
            (window as any).__pi.recording().events.map((event: any) => event.kind),
        );
        expect(kinds).toContain('steer-affordance');
        expect(kinds).toContain('steer');
    });

    test('approve, reject, retry and compare stay inside the six kernel ops', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const pi = (window as any).__pi;
            const target = pi.edges()[0].target;
            const before = pi.ops();
            const approval = pi.approve(target);
            const approveEvidence = pi.evidence();
            const rejected = pi.reject(target);
            const retried = pi.retry(target);
            const retryEvidence = pi.evidence();
            const lines = pi.compareRuns();
            return {
                before,
                after: pi.ops(),
                approval,
                rejected,
                retried,
                lines,
                evidence: [...approveEvidence, ...retryEvidence],
                kinds: pi.recording().events.map((event: any) => event.kind),
            };
        });
        expect(result.approval).toContain('approval:');
        expect(result.rejected).toContain('approval:');
        expect(result.retried).toContain('retry:');
        expect(result.after).toBeGreaterThan(result.before);
        expect(result.lines[1]).toContain('added');
        expect(result.evidence.some((line: string) => line.startsWith('approve:'))).toBe(true);
        expect(result.evidence.some((line: string) => line.startsWith('retry:'))).toBe(true);
        for (const kind of ['approve', 'reject', 'retry', 'compare-runs']) {
            expect(result.kinds).toContain(kind);
        }
    });
});
