# SpaceGraphJS Package Template

**Copy this as your `package.json` base.**

---

## package.json

```json
{
    "name": "spacegraphjs",
    "version": "6.0.0-alpha.1",
    "description": "The first self-building UI framework — a Zoomable User Interface (ZUI) library powered by AI vision",
    "type": "module",
    "main": "./dist/spacegraphjs.js",
    "module": "./dist/spacegraphjs.js",
    "types": "./dist/types/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/types/index.d.ts",
            "import": "./dist/spacegraphjs.js"
        },
        "./vision": {
            "types": "./dist/types/vision/index.d.ts",
            "import": "./dist/vision.js"
        },
        "./plugins": {
            "types": "./dist/types/plugins/index.d.ts",
            "import": "./dist/plugins.js"
        },
        "./layouts": {
            "types": "./dist/types/layouts/index.d.ts",
            "import": "./dist/layouts.js"
        }
    },
    "files": ["dist", "README.md", "LICENSE", "QUICKSTART.md"],
    "sideEffects": false,
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "test": "vitest",
        "test:coverage": "vitest --coverage",
        "test:vision": "vitest run --config vitest.vision.config.ts",
        "docs": "typedoc src/index.ts",
        "docs:serve": "pnpm dlx http-server docs/api",
        "lint": "eslint src --ext .ts",
        "lint:fix": "eslint src --ext .ts --fix",
        "format": "prettier --write src/**/*.ts",
        "format:check": "prettier --check src/**/*.ts",
        "prepublishOnly": "pnpm run build && pnpm run test",
        "postpublish": "echo '🚀 Published! Visit https://www.npmjs.com/package/spacegraphjs'"
    },
    "keywords": [
        "zui",
        "zoomable",
        "ui",
        "graph",
        "visualization",
        "three.js",
        "webgl",
        "ai",
        "vision",
        "typescript"
    ],
    "author": {
        "name": "autonull",
        "url": "https://github.com/autonull"
    },
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/autonull/spacegraphjs.git"
    },
    "bugs": {
        "url": "https://github.com/autonull/spacegraphjs/issues"
    },
    "homepage": "https://spacegraphjs.dev",
    "peerDependencies": {
        "three": ">=0.150.0"
    },
    "dependencies": {
        "mitt": "^3.0.1"
    },
    "devDependencies": {
        "@types/node": "^20.10.0",
        "@types/three": "^0.160.0",
        "@typescript-eslint/eslint-plugin": "^6.13.0",
        "@typescript-eslint/parser": "^6.13.0",
        "@vitest/coverage-v8": "^1.0.0",
        "eslint": "^8.54.0",
        "playwright": "^1.40.0",
        "prettier": "^3.1.0",
        "three": "^0.160.0",
        "typedoc": "^0.25.4",
        "typedoc-plugin-markdown": "^3.17.1",
        "typescript": "^5.3.2",
        "vite": "^5.0.0",
        "vitest": "^1.0.0"
    },
    "engines": {
        "node": ">=18.0.0"
    },
    "publishConfig": {
        "access": "public"
    }
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { spacegraphVision } from './plugins/vite-plugin-spacegraph-vision';

export default defineConfig({
    plugins: [
        spacegraphVision({
            enabled: true,
            autoFix: false,
            thresholds: {
                layout: 80,
                legibility: 85,
            },
        }),
    ],

    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SpaceGraphJS',
            fileName: 'spacegraphjs',
        },
        rollupOptions: {
            external: ['three'],
            output: {
                globals: {
                    three: 'THREE',
                },
            },
        },
        sourcemap: true,
        minify: 'terser',
    },

    test: {
        globals: true,
        environment: 'jsdom',
    },
});
```

---

## tsconfig.json

```json
{
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
        "declaration": true,
        "declarationDir": "./dist/types",
        "outDir": "./dist",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist", "tests"]
}
```

---

## typedoc.json

```json
{
    "entryPoints": [
        "src/index.ts",
        "src/vision/index.ts",
        "src/plugins/index.ts",
        "src/layouts/index.ts"
    ],
    "out": "docs/api",
    "plugin": ["typedoc-plugin-markdown"],
    "readme": "none",
    "excludePrivate": true,
    "excludeProtected": false,
    "excludeInternal": true,
    "categoryOrder": ["Core", "Vision", "Plugins", "Layouts", "*"],
    "navigationLinks": {
        "GitHub": "https://github.com/autonull/spacegraphjs",
        "Quickstart": "https://github.com/autonull/spacegraphjs/blob/main/QUICKSTART.md"
    }
}
```

---

## .pnpmignore

```
# Source
src/
tests/
test/
__tests__/

# Config
.gitignore
.eslintrc*
.prettierrc*
tsconfig.json
vite.config.ts
typedoc.json

# Dev
node_modules/
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Misc
*.log
*.md
!README.md
!QUICKSTART.md
.DS_Store
Thumbs.db
```

---

## LICENSE (MIT)

```
MIT License

Copyright (c) 2026 autonull

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Usage Checklist

- [ ] Copy `package.json` template
- [ ] Update version to `6.0.0-alpha.1`
- [ ] Verify all paths match your structure
- [ ] Copy `vite.config.ts` template
- [ ] Copy `tsconfig.json` template
- [ ] Copy `typedoc.json` template
- [ ] Copy `.pnpmignore` template
- [ ] Copy `LICENSE` template
- [ ] Run `pnpm install`
- [ ] Run `pnpm run build`
- [ ] Verify output in `dist/`
- [ ] Run `pnpm pack --dry-run`
- [ ] Verify only intended files are included

---

## Post-Publish Verification

```bash
# Install fresh
mkdir /tmp/verify && cd /tmp/verify
pnpm create -y
pnpm install spacegraphjs@alpha three

# Test import
node -e "import('spacegraphjs').then(m => console.log('SpaceGraph:', typeof m.SpaceGraph))"

# Test types
pnpm dlx tsc --noEmit --skipLibCheck node_modules/spacegraphjs/dist/types/index.d.ts
```

---

## Troubleshooting

### "Cannot find module"

Ensure `type: "module"` is in package.json and you're using `.ts` extension in imports.

### "Types not found"

Verify `types` field points to correct path and `declaration: true` is in tsconfig.json.

### "Peer dependency warning"

Three.js is a peer dependency. Users must install it separately:

```bash
pnpm install three
```

### "Build fails"

Check that all entry points exist:

- `src/index.ts`
- `src/vision/index.ts`
- `src/plugins/index.ts`
- `src/layouts/index.ts`
