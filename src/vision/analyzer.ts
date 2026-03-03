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
                        const THREE = w.THREE;
                        const instances = w.__SPACEGRAPH_INSTANCES__;
                        const localIssues: any[] = [];
                        let overlaps = 0;

                        // Helper: relative luminance per WCAG 2.x
                        const getLuminance = (r: number, g: number, b: number) => {
                            const a = [r, g, b].map(function (v) {
                                v /= 255;
                                return v <= 0.03928
                                    ? v / 12.92
                                    : Math.pow((v + 0.055) / 1.055, 2.4);
                            });
                            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
                        };

                        if (!THREE) {
                            return { overlaps: 0, legibilityIssues: 0, localIssues: [] };
                        }

                        for (const sg of instances) {
                            const nodes = Array.from(sg.graph.nodes.values()) as any[];
                            const camera = sg.renderer.camera;
                            const frustum = new THREE.Frustum();
                            const cameraViewProjectionMatrix = new THREE.Matrix4();

                            camera.updateMatrixWorld();
                            camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
                            cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                            frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

                            for (let i = 0; i < nodes.length; i++) {
                                const nodeA = nodes[i];

                                // Color/Legibility check (TLA/CHE)
                                if (nodeA.data && nodeA.data.color !== undefined) {
                                    const nodeColor = new THREE.Color(nodeA.data.color);
                                    const nodeL1 = getLuminance(nodeColor.r * 255, nodeColor.g * 255, nodeColor.b * 255);
                                    const textL2 = getLuminance(255, 255, 255); // Assumed white text

                                    const brightest = Math.max(nodeL1, textL2);
                                    const darkest = Math.min(nodeL1, textL2);
                                    const contrastRatio = (brightest + 0.05) / (darkest + 0.05);

                                    // WCAG AA
                                    if (contrastRatio < 4.5) {
                                        localIssues.push({
                                            type: 'legibility',
                                            severity: 'error',
                                            nodeId: nodeA.id,
                                            message: `Poor contrast ratio (${contrastRatio.toFixed(2)}:1) for node ${nodeA.id}. Text may be illegible.`
                                        });
                                    }
                                }

                                if (!frustum.containsPoint(nodeA.object.position)) continue;

                                const boxA = new THREE.Box3().setFromObject(nodeA.object);
                                boxA.expandByScalar(5); // Padding buffer

                                for (let j = i + 1; j < nodes.length; j++) {
                                    const nodeB = nodes[j];
                                    if (!frustum.containsPoint(nodeB.object.position)) continue;

                                    const boxB = new THREE.Box3().setFromObject(nodeB.object);
                                    boxB.expandByScalar(5);

                                    if (boxA.intersectsBox(boxB)) {
                                        overlaps++;
                                        localIssues.push({
                                            type: 'overlap',
                                            severity: 'warning',
                                            nodeA: nodeA.id,
                                            nodeB: nodeB.id,
                                            message: `Bounding box overlap detected between nodes ${nodeA.id} and ${nodeB.id}.`
                                        });
                                    }
                                }
                            }
                        }

                        let legibilityIssues = localIssues.filter(i => i.type === 'legibility').length;
                        return { overlaps, legibilityIssues, localIssues };
                    });

                    if (fileAnalysis) {
                        report.layoutScore = Math.max(0, report.layoutScore - (fileAnalysis.overlaps * 5));
                        report.legibilityScore = Math.max(0, report.legibilityScore - (fileAnalysis.legibilityIssues * 10));
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
