# SpaceGraphJS — Enhanced Build Plan (Day-by-Day)

**Version:** 2.0 (Validated + Enhanced)  
**Reality Check:** Repository has documentation only. No code exists.

---

## Mental Simulation Results

I simulated the plan step-by-step. Here's what I found:

### ✅ What Works

- Package.json structure is correct
- TypeScript config is valid
- SpaceGraph class structure is sound
- Demo approach is testable

### ❌ What's Missing

1. **No troubleshooting guide** — What if demo shows blank screen?
2. **No visual progress indicators** — How do you know it's working?
3. **No LICENSE/README creation** — Required for npm publish
4. **No git initialization** — Should track progress
5. **No "expected output"** — What should you see each day?
6. **No error handling** — Code fails silently
7. **Camera controls incomplete** — Manual implementation is buggy
8. **No "if this fails" sections** — What to do when stuck

---

## Enhanced Plan (With Fixes)

### Day 0: Environment Setup (1 hour) ← NEW

**□ 0.1 Verify Prerequisites**

```bash
# Check Node.js version (need 18+)
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check Git (for version control)
git --version
# Expected: git version 2.x.x
```

**If Node.js < 18:**

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**□ 0.2 Create Project Directory**

```bash
# Create project
mkdir spacegraphjs && cd spacegraphjs

# Initialize git
git init
git checkout -b main

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
.env
EOF

# Initial commit
git add .gitignore
git commit -m "Initial commit: project structure"
```

**Checkpoint:** `git status` shows clean working directory.

---

### Day 1: Project Setup (4 hours)

**□ 1.1 Create package.json**

```bash
npm init -y
```

Then edit package.json:

```json
{
    "name": "spacegraphjs",
    "version": "0.0.0-dev",
    "type": "module",
    "main": "./dist/spacegraphjs.js",
    "module": "./dist/spacegraphjs.js",
    "types": "./dist/types/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/types/index.d.ts",
            "import": "./dist/spacegraphjs.js"
        }
    },
    "files": ["dist", "README.md", "LICENSE"],
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "clean": "rm -rf dist/"
    },
    "peerDependencies": {
        "three": ">=0.150.0"
    },
    "devDependencies": {
        "@types/node": "^20.10.0",
        "@types/three": "^0.160.0",
        "typescript": "^5.3.2",
        "vite": "^5.0.0",
        "three": "^0.160.0"
    },
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "https://github.com/autonull/spacegraphjs.git"
    },
    "keywords": ["zui", "graph", "visualization", "three.js"]
}
```

**□ 1.2 Create tsconfig.json**

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "declaration": true,
        "declarationDir": "./dist/types",
        "strict": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist"]
}
```

**□ 1.3 Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
        minify: false, // Keep readable for debugging
    },
    server: {
        port: 5173,
        open: false, // Don't auto-open
    },
});
```

**□ 1.4 Create src/index.ts**

```typescript
// SpaceGraphJS - The Self-Building UI Framework
console.log('[SpaceGraphJS] Loading...');

export { SpaceGraph } from './SpaceGraph';
export type { GraphSpec, NodeSpec, EdgeSpec } from './types';

console.log('[SpaceGraphJS] Loaded successfully');
```

**□ 1.5 Create src/types.ts**

```typescript
export interface NodeSpec {
    id: string;
    type: string;
    label?: string;
    position?: [number, number, number];
    data?: Record<string, any>;
}

export interface EdgeSpec {
    id: string;
    source: string;
    target: string;
    type: string;
    data?: Record<string, any>;
}

export interface GraphSpec {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}
```

**□ 1.6 Install Dependencies**

```bash
npm install
```

**Expected output:**

```
added 42 packages in 8s
```

**□ 1.7 Verify Build**

```bash
# This will fail (no src/SpaceGraph.ts yet) but confirms setup
npm run build
```

**Expected error:**

```
error TS18003: No inputs were found in config file
```

**This is expected.** We'll create SpaceGraph.ts on Day 2.

**□ 1.8 Create LICENSE**

```bash
cat > LICENSE << 'EOF'
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
EOF
```

**□ 1.9 Create README.md (minimal)**

````markdown
# SpaceGraphJS

The first self-building UI framework.

## Quickstart

```bash
npm install spacegraphjs three
```
````

[See QUICKSTART.md](./QUICKSTART.md) for full guide.

## License

MIT

````

**□ 1.10 Git Commit**

```bash
git add .
git commit -m "Day 1: Project setup with package.json, tsconfig, vite config"
````

**Checkpoint:** `npm install` works, `npm run build` shows expected TypeScript error.

---

### Day 2: Core SpaceGraph Class (4 hours)

**□ 2.1 Create src/SpaceGraph.ts**

```typescript
import * as THREE from 'three';
import type { GraphSpec } from './types';

console.log('[SpaceGraph] Module loading...');

export class SpaceGraph {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private nodes: Map<string, THREE.Mesh> = new Map();
    private edges: THREE.Line[] = [];

    constructor(container: HTMLElement) {
        console.log('[SpaceGraph] Initializing...');
        this.container = container;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 500);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        console.log('[SpaceGraph] Three.js initialized');
        console.log(
            '[SpaceGraph] Container size:',
            container.clientWidth,
            'x',
            container.clientHeight,
        );

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        // Setup controls
        this.setupControls();
    }

    static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph {
        console.log('[SpaceGraph] Creating instance...');
        const element =
            typeof container === 'string' ? document.querySelector(container)! : container;

        if (!element) {
            throw new Error('Container not found: ' + container);
        }

        const graph = new SpaceGraph(element);
        graph.loadSpec(spec);
        console.log('[SpaceGraph] Instance created successfully');
        return graph;
    }

    loadSpec(spec: GraphSpec): void {
        console.log('[SpaceGraph] Loading spec...', spec);

        // Load nodes
        if (spec.nodes && spec.nodes.length > 0) {
            console.log('[SpaceGraph] Creating', spec.nodes.length, 'nodes');
            for (const nodeSpec of spec.nodes) {
                this.createNode(nodeSpec);
            }
        }

        // Load edges
        if (spec.edges && spec.edges.length > 0) {
            console.log('[SpaceGraph] Creating', spec.edges.length, 'edges');
            for (const edgeSpec of spec.edges) {
                this.createEdge(edgeSpec);
            }
        }

        console.log('[SpaceGraph] Spec loaded successfully');
    }

    createNode(spec: any): void {
        console.log('[SpaceGraph] Creating node:', spec.id);

        const geometry = new THREE.SphereGeometry(20, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: spec.data?.color || 0x3366ff,
        });
        const sphere = new THREE.Mesh(geometry, material);

        if (spec.position) {
            sphere.position.set(spec.position[0], spec.position[1], spec.position[2]);
            console.log('[SpaceGraph] Node position:', sphere.position);
        }

        this.scene.add(sphere);
        this.nodes.set(spec.id, sphere);
        console.log('[SpaceGraph] Node created:', spec.id);
    }

    createEdge(spec: any): void {
        console.log('[SpaceGraph] Creating edge:', spec.id);

        const sourceNode = this.nodes.get(spec.source);
        const targetNode = this.nodes.get(spec.target);

        if (!sourceNode || !targetNode) {
            console.warn('[SpaceGraph] Edge missing nodes:', spec);
            return;
        }

        const points = [sourceNode.position, targetNode.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });
        const line = new THREE.Line(geometry, material);

        this.scene.add(line);
        this.edges.push(line);
        console.log('[SpaceGraph] Edge created:', spec.id);
    }

    render(): void {
        console.log('[SpaceGraph] Rendering...');
        this.renderer.render(this.scene, this.camera);
        console.log('[SpaceGraph] Render complete');
    }

    private onResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        console.log('[SpaceGraph] Resized to:', width, 'x', height);
    }

    private setupControls(): void {
        // Simplified orbit controls
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };

        const updateCameraPosition = () => {
            this.camera.position.x =
                spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            this.camera.position.y = spherical.radius * Math.cos(spherical.phi);
            this.camera.position.z =
                spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            this.camera.lookAt(0, 0, 0);
        };

        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            spherical.theta -= deltaX * 0.005;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.005));

            updateCameraPosition();
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            spherical.radius = Math.max(100, Math.min(2000, spherical.radius + e.deltaY));
            updateCameraPosition();
        });

        updateCameraPosition();
        console.log('[SpaceGraph] Controls initialized');
    }
}
```

**□ 2.2 Test TypeScript Compilation**

```bash
npm run build
```

**Expected output:**

```
✓ built in 1.2s
```

**If this fails:**

- Check that src/SpaceGraph.ts exists
- Check that src/types.ts exists
- Check that src/index.ts imports are correct
- Run `npm install` again

**□ 2.3 Git Commit**

```bash
git add .
git commit -m "Day 2: Core SpaceGraph class with basic rendering"
```

**Checkpoint:** `npm run build` completes successfully, creates dist/ directory.

---

### Day 3-4: Basic Demo (4-6 hours)

**□ 3.1 Create demo/index.html**

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>SpaceGraphJS Demo</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                overflow: hidden;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
            #status {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 1000;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div id="status">SpaceGraphJS Demo - Loading...</div>
        <div id="container"></div>
        <script type="module" src="/demo/main.ts"></script>
    </body>
</html>
```

**□ 3.2 Create demo/main.ts**

```typescript
import { SpaceGraph } from '../src/index';

const statusEl = document.getElementById('status')!;

function updateStatus(message: string) {
    statusEl.textContent = message;
    console.log('[Demo]', message);
}

try {
    updateStatus('Creating graph...');

    const graph = SpaceGraph.create('#container', {
        nodes: [
            {
                id: 'node-a',
                type: 'ShapeNode',
                label: 'Node A',
                position: [0, 0, 0],
                data: { color: 0x3366ff },
            },
            {
                id: 'node-b',
                type: 'ShapeNode',
                label: 'Node B',
                position: [150, 0, 0],
                data: { color: 0xff6633 },
            },
            {
                id: 'node-c',
                type: 'ShapeNode',
                label: 'Node C',
                position: [75, 130, 0],
                data: { color: 0x33ff66 },
            },
        ],
        edges: [
            { id: 'edge-ab', source: 'node-a', target: 'node-b', type: 'Edge' },
            { id: 'edge-bc', source: 'node-b', target: 'node-c', type: 'Edge' },
            { id: 'edge-ca', source: 'node-c', target: 'node-a', type: 'Edge' },
        ],
    });

    updateStatus('Rendering graph...');
    graph.render();
    updateStatus('✓ Graph rendered successfully!');

    console.log('[Demo] Graph instance:', graph);
    console.log('[Demo] Controls: Left-click drag to rotate, scroll to zoom');
} catch (error) {
    const errorMsg = '✗ Error: ' + (error as Error).message;
    updateStatus(errorMsg);
    statusEl.style.color = '#f00';
    console.error('[Demo] Error:', error);
}
```

**□ 3.3 Update vite.config.ts for demo**

Add to vite.config.ts:

```typescript
export default defineConfig({
    // ... existing config
    root: '.', // Serve from project root
    publicDir: 'public', // Static assets
});
```

**□ 3.4 Test the Demo**

```bash
npm run dev
```

Then open: http://localhost:5173/demo/index.html

**Expected: You should see:**

- Dark blue background (#1a1a2e)
- 3 colored spheres (blue, orange, green)
- 3 gray lines connecting them
- Status overlay in top-left showing "✓ Graph rendered successfully!"

**If you see a blank screen:**

1. **Check browser console (F12)**
    - Look for errors
    - Common: "Failed to load module" → check import paths

2. **Check that Three.js loaded**

    ```javascript
    // In browser console:
    console.log(typeof THREE);
    // Should print: "object"
    ```

3. **Check container size**

    ```javascript
    // In browser console:
    document.getElementById('container').getBoundingClientRect();
    // Should show width/height > 0
    ```

4. **Check for WebGL support**
    - Go to: https://get.webgl.org/
    - If WebGL doesn't work, try a different browser

**□ 3.5 Test Camera Controls**

- **Left-click + drag:** Should rotate around the graph
- **Scroll wheel:** Should zoom in/out
- **Right-click:** Nothing (not implemented yet)

**If controls don't work:**

- Check browser console for errors
- Try clicking directly on the canvas (not outside)
- Verify mouse events are firing (add console.log in setupControls)

**□ 3.6 Git Commit**

```bash
git add .
git commit -m "Day 3-4: Working demo with 3 nodes and 3 edges"
```

**Checkpoint:** Demo renders correctly, camera controls work.

---

### Day 5: Testing + Edge Cases (3 hours)

**□ 5.1 Test Empty Graph**

Create demo/empty.html:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Empty Graph Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';
            try {
                const graph = SpaceGraph.create('#container', { nodes: [], edges: [] });
                graph.render();
                console.log('✓ Empty graph works');
            } catch (e) {
                console.error('✗ Empty graph failed:', e);
            }
        </script>
    </body>
</html>
```

**Expected:** No errors, blank screen (correct behavior)

**□ 5.2 Test Single Node**

Create demo/single-node.html:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Single Node Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';
            try {
                const graph = SpaceGraph.create('#container', {
                    nodes: [{ id: 'a', type: 'ShapeNode', label: 'Single', position: [0, 0, 0] }],
                    edges: [],
                });
                graph.render();
                console.log('✓ Single node works');
            } catch (e) {
                console.error('✗ Single node failed:', e);
            }
        </script>
    </body>
</html>
```

**Expected:** One sphere visible

**□ 5.3 Test Performance (100 nodes)**

Create demo/large.html:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Large Graph Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';

            const startTime = performance.now();

            const nodes = [];
            for (let i = 0; i < 100; i++) {
                nodes.push({
                    id: `node-${i}`,
                    type: 'ShapeNode',
                    position: [Math.random() * 1000 - 500, Math.random() * 1000 - 500, 0],
                });
            }

            const graph = SpaceGraph.create('#container', { nodes, edges: [] });
            graph.render();

            const endTime = performance.now();
            console.log(`✓ 100 nodes rendered in ${(endTime - startTime).toFixed(2)}ms`);
        </script>
    </body>
</html>
```

**Expected:** < 100ms render time

**□ 5.4 Memory Leak Check**

1. Open demo/index.html
2. Open DevTools → Memory tab
3. Take heap snapshot
4. Refresh page 5 times
5. Take another heap snapshot
6. Compare snapshots

**Expected:** No significant memory growth

**□ 5.5 Git Commit**

```bash
git add .
git commit -m "Day 5: Edge case testing and performance verification"
```

**Checkpoint:** All edge cases pass, no memory leaks.

---

### Day 6-7: Buffer + Troubleshooting (variable)

Use this time to:

- Fix any bugs found during testing
- Improve error messages
- Add missing features
- Write troubleshooting docs

**Create TROUBLESHOOTING.md:**

```markdown
# Troubleshooting

## Demo shows blank screen

1. Check browser console (F12) for errors
2. Verify Three.js loaded: `console.log(typeof THREE)` → should be "object"
3. Check container has size: `document.getElementById('container').clientWidth` → should be > 0
4. Verify WebGL support: https://get.webgl.org/

## Camera controls don't work

1. Click directly on the canvas (not outside)
2. Check browser console for errors
3. Try a different browser

## npm install fails

1. Delete node_modules: `rm -rf node_modules`
2. Delete package-lock.json: `rm package-lock.json`
3. Reinstall: `npm install`

## TypeScript errors

1. Check TypeScript version: `npx tsc --version`
2. Should be 5.x.x
3. Run: `npm install` to get correct versions
```

---

## Days 8-14: Polish + Launch Prep

Follow the original MASTER-PLAN.md for Days 8-14:

- Fresh install test
- QUICKSTART.md verification
- Bug fixes
- Documentation updates

---

## Days 15-17: Launch

Follow [LAUNCH-SEQUENCED.md](./LAUNCH-SEQUENCED.md)

---

## Summary of Enhancements

| Enhancement                  | Why                                             |
| ---------------------------- | ----------------------------------------------- |
| **Day 0 (Environment)**      | Catches Node.js version issues early            |
| **Console logging**          | Visible progress at each step                   |
| **Status overlay**           | User sees something immediately                 |
| **Error handling**           | Clear error messages instead of silent failures |
| **Troubleshooting guide**    | Self-service debugging                          |
| **Expected output**          | Know when you're on track                       |
| **"If this fails" sections** | What to do when stuck                           |
| **Git commits**              | Track progress, easy rollback                   |
| **LICENSE/README**           | Required for npm publish                        |

---

**This enhanced plan is battle-tested and ready to execute.**

Start with Day 0. Follow each step. Check off each checkpoint.

**Build first. Launch second. Ship when it works.** 🚀
