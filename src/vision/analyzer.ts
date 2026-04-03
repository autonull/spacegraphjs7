import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('Vision');

export interface VisionReport {
    layoutScore: number;
    legibilityScore: number;
    issues: VisionIssue[];
}

export interface VisionIssue {
    type: 'overlap' | 'legibility' | 'color';
    severity: 'error' | 'warning';
    message: string;
}

export async function runVisionAnalysis(outputDir: string): Promise<VisionReport> {
    const report: VisionReport = {
        layoutScore: 100,
        legibilityScore: 100,
        issues: [],
    };

    const htmlFiles = findHtmlFiles(outputDir);
    if (htmlFiles.length === 0) {
        logger.warn('No HTML files found in output directory to analyze.');
        return report;
    }

    try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        let serverProcess;
        try {
            logger.info(`Starting static server for ${outputDir}...`);
            serverProcess = spawn(
                'npx',
                ['vite', 'serve', outputDir, '--port', '5175', '--strictPort', '--no-open'],
                {
                    stdio: 'ignore',
                },
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            for (const file of htmlFiles) {
                const relativePath = path.relative(outputDir, file).replace(/\\/g, '/');
                const url = `http://localhost:5175/${relativePath}`;
                logger.info(`Analyzing ${url}`);

                try {
                    page.on('console', (msg) =>
                        logger.debug(`[Browser] ${msg.type()}: ${msg.text()}`),
                    );
                    page.on('pageerror', (err) => logger.error(`[Browser Error] ${err.message}`));
                    page.on('requestfailed', (request) =>
                        logger.error(
                            `[Browser] Request failed: ${request.url()} (${request.failure()?.errorText})`,
                        ),
                    );

                    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

                    const hasGraph = await page
                        .waitForFunction(
                            () => {
                                const w = window as any;
                                return (
                                    w.SpaceGraph &&
                                    w.SpaceGraph.instances &&
                                    w.SpaceGraph.instances.size > 0
                                );
                            },
                            { timeout: 5000 },
                        )
                        .catch(() => false);

                    if (!hasGraph) {
                        logger.debug(`No SpaceGraph instance found on ${relativePath}, skipping.`);
                        continue;
                    }

                    await page.waitForTimeout(1000);

                    const fileAnalysis = await page.evaluate(async () => {
                        const w = window as any;
                        const instances = w.__SPACEGRAPH_INSTANCES__;
                        if (!instances)
                            return { overlaps: 0, legibilityIssues: 0, localIssues: [] };

                        let overlaps = 0;
                        let legibilityIssues = 0;
                        const localIssues: any[] = [];

                        for (const sg of instances) {
                            sg.vision.stopAutonomousCorrection();
                            const report = await sg.vision.analyzeVision();

                            overlaps += report.overlap.overlaps.length;
                            legibilityIssues += report.legibility.failures.length;

                            localIssues.push(
                                ...report.overlap.overlaps.map((o: any) => ({
                                    type: 'overlap',
                                    severity: 'warning',
                                    nodeA: o.nodeA,
                                    nodeB: o.nodeB,
                                    message: `Bounding box overlap detected between nodes ${o.nodeA} and ${o.nodeB}.`,
                                })),
                            );

                            localIssues.push(...report.legibility.failures);
                        }

                        return { overlaps, legibilityIssues, localIssues };
                    });

                    if (fileAnalysis) {
                        report.layoutScore = Math.max(
                            0,
                            report.layoutScore - fileAnalysis.overlaps * 5,
                        );
                        report.legibilityScore = Math.max(
                            0,
                            report.legibilityScore - fileAnalysis.legibilityIssues * 10,
                        );
                        report.issues.push(...fileAnalysis.localIssues);
                    }
                } catch (e) {
                    logger.error(`Error analyzing ${relativePath}:`, e);
                }
            }
        } finally {
            if (serverProcess) {
                serverProcess.kill();
            }
        }
        await browser.close();
    } catch (e) {
        logger.error('Failed to run playwright analysis:', e);
    }

    return report;
}

function findHtmlFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}
