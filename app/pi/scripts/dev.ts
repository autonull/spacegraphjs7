import { spawn, type ChildProcess } from 'node:child_process';

const children: ChildProcess[] = [];

const start = (command: string, args: readonly string[]): void => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    children.push(child);
};

start('pnpm', ['exec', 'tsx', 'src/server.ts']);
start('pnpm', ['exec', 'vite', '--config', 'vite.config.ts']);

const stop = (): void => {
    for (const child of children) child.kill('SIGTERM');
    process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
