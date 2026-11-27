import { spawn, type ChildProcess } from 'node:child_process';

type Command = readonly [command: string, args: readonly string[]];

export const runDev = (commands: readonly Command[]): void => {
    const children: ChildProcess[] = commands.map(([command, args]) =>
        spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' }),
    );
    const stop = (): void => {
        for (const child of children) child.kill('SIGTERM');
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
};
