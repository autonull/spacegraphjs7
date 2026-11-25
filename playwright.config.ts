import { browserSuite } from './script/playwright-config';
export default browserSuite({
    testDir: './test',
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    video: true,
    outputDir: 'recordings/',
});
