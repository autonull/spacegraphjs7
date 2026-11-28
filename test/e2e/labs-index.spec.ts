import { expect, test } from '@playwright/test';
import { LAB_EXPERIMENTS } from '../../app/demo/src/lab-catalogue.js';
import { demoPath } from '../../app/demo/src/registry.js';

test('labs index loads, lists every experiment and resolves each link', async ({
    page,
    baseURL,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(demoPath('labs'));
    await expect(page.getByRole('heading', { name: 'Experiment labs', level: 1 })).toBeVisible();

    const cards = page.locator('[data-lab-id]');
    await expect(cards).toHaveCount(LAB_EXPERIMENTS.length);

    for (const experiment of LAB_EXPERIMENTS) {
        const card = page.locator(`[data-lab-id="${experiment.id}"]`);
        await expect(card).toHaveCount(1);
        await expect(card.locator('a')).toHaveAttribute('href', demoPath(experiment.id));
        await expect(card.locator('.lift')).toContainText(experiment.lift.join(' + '));
        const response = await page.request.get(
            new URL(demoPath(experiment.id), baseURL ?? 'http://localhost:5173').toString(),
        );
        expect(response.ok(), `${experiment.id} → ${demoPath(experiment.id)}`).toBe(true);
    }

    expect(errors).toEqual([]);
});
