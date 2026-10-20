// Builds every published package: the root library and the five leaf packages.
//
// The library's own scripts call this through pnpm, but a host that consumes the library as a
// workspace (the OpenCode fork) builds it with whatever toolchain it already has, so the build is
// a script rather than a package-manager command.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bin = (name: string) => resolve(root, 'node_modules/.bin', name);

console.log('building the root library');
execFileSync(bin('vite'), ['build', '--config', 'vite.lib.config.ts'], { cwd: root, stdio: 'inherit' });

console.log('building the leaf packages');
execFileSync(bin('tsx'), [resolve(root, 'script/build-packages.ts')], { cwd: root, stdio: 'inherit' });
