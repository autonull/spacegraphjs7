#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
    console.log('\n🚀 Welcome to SpaceGraphJS!');

    // Handle "npx sg6 create my-app" vs "npx create-spacegraph my-app"
    let targetDir = process.argv[2];
    if (targetDir === 'create' && process.argv[3]) {
        targetDir = process.argv[3];
    }
    targetDir = targetDir || 'spacegraph-app';

    const cwd = process.cwd();
    const root = path.join(cwd, targetDir);

    console.log(`\nScaffolding project in ${root}...`);

    if (!fs.existsSync(root)) {
        fs.mkdirSync(root, { recursive: true });
    } else {
        console.error(
            `\n❌ Error: Directory "${targetDir}" already exists. Please choose a different name.`,
        );
        process.exit(1);
    }

    // Determine the path to the framework root using __dirname instead of assuming PWD
    // packages/create-spacegraph/index.js -> /home/me/spacegraph7
    const frameworkRoot = path.resolve(__dirname, '..', '..');

    const pkg = {
        name: targetDir,
        version: '0.0.0',
        type: 'module',
        scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
        },
        dependencies: {
            spacegraphjs: `file:${frameworkRoot}`,
            three: '^0.160.0',
        },
        devDependencies: {
            typescript: '^5.0.0',
            vite: '^5.0.0',
        },
    };

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));

    const templateDir = path.resolve(__dirname, 'template');

    // Create src directly rather than copying a stub
    const srcDir = path.join(root, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // index.html
    fs.writeFileSync(
        path.join(root, 'index.html'),
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpaceGraphJS App</title>
    <style>
      body { margin: 0; padding: 0; box-sizing: border-box; overflow: hidden; background: #0f0f13;}
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    );

    // tsconfig.json
    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
    );

    // main.ts
    // Provide a stellar default config using VisionOverlayPlugin to fulfill the Phase 2 goals
    fs.writeFileSync(
        path.join(srcDir, 'main.ts'),
        `import { SpaceGraph, VisionOverlayPlugin } from 'spacegraphjs';

const nodes = [
    { id: 'a', type: 'ShapeNode', label: 'Start Here', position: [-100, 0, 0], data: { color: 0x3b82f6 } },
    { id: 'b', type: 'ShapeNode', label: 'Build Your App', position: [100, 0, 0], data: { color: 0x10b981 } },
];

const edges = [
    { id: 'e1', source: 'a', target: 'b', type: 'CurvedEdge' }
];

const sg = SpaceGraph.create('#app', { nodes, edges });

// Expose the vision overlay UI
sg.pluginManager.add(new VisionOverlayPlugin());

sg.render();
`,
    );

    console.log(`\n🎉 Done! The self-building AI vision engine is ready.\n`);
    console.log(`Next steps:\n  cd ${targetDir}\n  npm install\n  npm run dev\n`);
}

init().catch((e) => {
    console.error(e);
});
