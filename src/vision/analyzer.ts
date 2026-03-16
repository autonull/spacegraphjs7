import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
        issues: []
    };

    // Find all HTML files in the output directory
    const htmlFiles = findHtmlFiles(outputDir);
    if (htmlFiles.length === 0) {
        console.warn('[Vision] No HTML files found in output directory to analyze.');
        return report;
    }

    try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        let serverProcess;
        try {
            // Start a static file server to host the built output
            console.log(`[Vision] Starting static server for ${outputDir}...`);
            serverProcess = spawn('npx', ['http-server', outputDir, '-p', '5175', '-c-1'], { stdio: 'ignore' });
            await new Promise(resolve => setTimeout(resolve, 2000)); // wait for server to start

            for (const file of htmlFiles) {
                const relativePath = path.relative(outputDir, file).replace(/\\/g, '/');
                const url = `http://localhost:5175/${relativePath}`;
                console.log(`[Vision] Analyzing ${url}`);

                try {
                    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

                    // Wait for SpaceGraph instances to register
                    const hasGraph = await page.waitForFunction(() => {
                        const w = window as any;
                        return w.__SPACEGRAPH_INSTANCES__ && w.__SPACEGRAPH_INSTANCES__.length > 0;
                    }, { timeout: 5000 }).catch(() => false);

                    if (!hasGraph) {
                        console.log(`[Vision] No SpaceGraph instance found on ${relativePath}, skipping.`);
                        continue;
                    }

                    // Give layout algorithms time to settle
                    await page.waitForTimeout(1000);

                    // Analyze nodes inside the page context
                    const fileAnalysis = await page.evaluate(() => {
                        const w = window as any;
                        const instances = w.__SPACEGRAPH_INSTANCES__;
                        const localIssues: any[] = [];
                        let overlaps = 0;

                        for (const sg of instances) {
                            const nodes = Array.from(sg.graph.nodes.values()) as any[];

                            // Check for node overlaps
                            for (let i = 0; i < nodes.length; i++) {
                                for (let j = i + 1; j < nodes.length; j++) {
                                    const dist = nodes[i].position.distanceTo(nodes[j].position);
                                    // Assuming typical node radius is ~20 as defined in ShapeNode
                                    if (dist < 40) {
                                        overlaps++;
                                        localIssues.push({
                                            type: 'overlap',
                                            severity: 'warning',
                                            message: `Overlap detected between nodes ${nodes[i].id} and ${nodes[j].id} (dist: ${dist.toFixed(2)})`
                                        });
                                    }
                                }
                            }
                        }

                        return { overlaps, localIssues };
                    });

                    if (fileAnalysis) {
                        report.layoutScore = Math.max(0, report.layoutScore - (fileAnalysis.overlaps * 5));
                        report.issues.push(...fileAnalysis.localIssues);
                    }

                } catch (e) {
                    console.error(`[Vision] Error analyzing ${relativePath}:`, e);
                }
            }
        } finally {
            if (serverProcess) {
                serverProcess.kill();
            }
        }
        await browser.close();
    } catch (e) {
        console.error('[Vision] Failed to run playwright analysis:', e);
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
