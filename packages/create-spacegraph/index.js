#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPEC = '^8.5.0';

function dependencySpec() {
    if (process.env.SPACEGRAPHJS_SPEC) return process.env.SPACEGRAPHJS_SPEC;
    try {
        const manifest = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, '../..', 'package.json'), 'utf8'),
        );
        if (manifest.name === 'spacegraphjs') return `^${manifest.version}`;
    } catch {
        // A published install has no framework manifest; fall back to the default range.
    }
    return DEFAULT_SPEC;
}

async function init() {
    console.log('\n🚀 Welcome to SpaceGraphJS!');

    let targetDir = process.argv[2];
    if (targetDir === 'create' && process.argv[3]) targetDir = process.argv[3];
    targetDir = targetDir || 'spacegraph-app';

    const root = path.join(process.cwd(), targetDir);
    console.log(`\nScaffolding project in ${root}...`);

    if (fs.existsSync(root)) {
        console.error(
            `\n❌ Error: Directory "${targetDir}" already exists. Please choose a different name.`,
        );
        process.exit(1);
    }

    fs.mkdirSync(root, { recursive: true });

    const pkg = {
        name: targetDir,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
            typecheck: 'tsc --noEmit',
        },
        dependencies: {
            spacegraphjs: dependencySpec(),
            three: '^0.160.0',
        },
        devDependencies: {
            typescript: '^5.9.0',
            vite: '^8.0.0',
        },
    };

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

    fs.writeFileSync(
        path.join(root, 'index.html'),
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpaceGraphJS App</title>
    <style>
      body { margin: 0; padding: 0; box-sizing: border-box; overflow: hidden; background: #0f0f13; }
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    );

    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        `${JSON.stringify(
            {
                compilerOptions: {
                    target: 'ES2022',
                    useDefineForClassFields: true,
                    module: 'ESNext',
                    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
                    skipLibCheck: true,
                    moduleResolution: 'bundler',
                    allowImportingTsExtensions: true,
                    resolveJsonModule: true,
                    isolatedModules: true,
                    noEmit: true,
                    strict: true,
                    noUnusedLocals: true,
                    noUnusedParameters: true,
                    noFallthroughCasesInSwitch: true,
                },
                include: ['src'],
            },
            null,
            2,
        )}\n`,
    );

    fs.writeFileSync(
        path.join(root, 'vite.config.ts'),
        `import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
    },
});
`,
    );

    const src = path.join(root, 'src');
    fs.mkdirSync(src, { recursive: true });

    fs.writeFileSync(
        path.join(src, 'main.ts'),
        `import { SpaceGraph, VisionOverlayPlugin, type GraphSpec } from 'spacegraphjs';

export const spec: GraphSpec = {
    nodes: [
        { id: 'a', type: 'ShapeNode', label: 'Start Here', position: [-100, 0, 0], data: { color: 0x3b82f6 } },
        { id: 'b', type: 'ShapeNode', label: 'Build Your App', position: [100, 0, 0], data: { color: 0x10b981 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'CurvedEdge' }],
};

const graph = await SpaceGraph.create('#app', spec);
const vision = new VisionOverlayPlugin();
graph.pluginManager.register('VisionOverlayPlugin', vision);
vision.init(graph);
graph.render();
`,
    );

    fs.writeFileSync(
        path.join(root, 'README.md'),
        `# ${targetDir}

Generated with \`pnpm dlx create-spacegraph\` and \`spacegraphjs@${pkg.dependencies.spacegraphjs}\`.

\`\`\`bash
pnpm install
pnpm run dev
\`\`\`

Edit \`src/main.ts\`. To check application-level quality, import \`checkQuality\` from
\`spacegraphjs/quality\` and pass the \`spec\` exported there. See \`docs/QUICKSTART.md\` for a
walkthrough and \`pnpm run typecheck\` for the TypeScript gate.
`,
    );

    console.log(`\n🎉 Done! Your SpaceGraphJS app is ready.\n`);
    console.log(`Next steps:\n  cd ${targetDir}\n  pnpm install\n  pnpm run dev\n`);
}

init().catch((e) => {
    console.error(e);
});
