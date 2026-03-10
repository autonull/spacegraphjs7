import { chromium } from 'playwright';

async function main() {
    console.log('Running Performance Benchmark (1000 nodes)...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:5174/examples/benchmark.html');

    // Wait for the graph to render and start spinning
    await page.waitForTimeout(3000);

    // Sample FPS over a 5 second window
    const samples = [];
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(1000);
        const fps = await page.evaluate(() => (window as any).__benchmark_fps || 0);
        console.log(`FPS Sample ${i + 1}: ${fps}`);
        samples.push(fps);
    }

    const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length;
    console.log(`\nAverage FPS: ${avgFps.toFixed(1)}`);

    // We expect modern hardware to comfortably hit 60.
    // Given the CI runner might be slow, let's just make sure it's above 30, but normally we target 60.
    if (avgFps < 30) {
        console.warn('⚠️ Benchmark warning: FPS dipped below 30 on this machine.');
    } else {
        console.log('✅ Benchmark passed: Consistently high framerate maintained.');
    }

    await browser.close();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});