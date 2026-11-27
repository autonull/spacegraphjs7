import { runDev } from '../../../script/dev-runner';

runDev([
    ['pnpm', ['exec', 'tsx', 'src/server.ts']],
    ['pnpm', ['exec', 'vite', '--config', 'vite.config.ts']],
]);
