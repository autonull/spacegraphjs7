import { defineConfig } from '@playwright/test';
type Config = Parameters<typeof defineConfig>[0];
/** The browser-test defaults shared by the root suite and every app suite. */
export interface BrowserSuiteOptions {
    readonly testDir: string;
    readonly port?: number;
    readonly baseURL?: string;
    readonly webServer?: Config['webServer'];
    readonly timeout?: number;
    readonly retries?: number;
    readonly video?: boolean;
    readonly outputDir?: string;
}
export const browserSuite = ({
    testDir,
    port,
    baseURL,
    webServer,
    timeout,
    retries,
    video,
    outputDir,
}: BrowserSuiteOptions) =>
    defineConfig({
        testDir,
        testMatch: /.*\.spec\.ts/,
        reporter: 'list',
        ...(timeout === undefined ? {} : { timeout }),
        ...(retries === undefined ? {} : { retries }),
        ...(outputDir === undefined ? {} : { outputDir }),
        use: {
            headless: true,
            ...(video ? { video: 'on' as const } : {}),
            baseURL: baseURL ?? (port === undefined ? undefined : `http://localhost:${port}`),
        },
        ...(webServer === undefined ? {} : { webServer }),
    });
