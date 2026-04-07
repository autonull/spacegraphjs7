# SpaceGraphJS — Launch Plan (Properly Sequenced)

**Goal:** Ship a **working** prototype before publishing to pnpm.
**Principle:** Never publish what you haven't tested.

---

## Critical Path (12-16 hours total)

| Phase  | Task               | Time | Gates                  |
| ------ | ------------------ | ---- | ---------------------- |
| **P0** | Working prototype  | 4-6h | Must render a graph    |
| **P1** | ppnpm package prep   | 2h   | Must pass install test |
| **P2** | Documentation      | 3h   | QUICKSTART must work   |
| **P3** | Publish + announce | 2h   | Only if P0-P2 pass     |
| **P4** | Community setup    | 1h   | Matrix, Sponsors       |

**Total:** 12-16 hours (not 8, not 27)

**Why more than 8h?** Because testing takes time. Better to delay launch than publish broken code.

---

## Phase 0: Working Prototype (4-6 hours)

**DO NOT SKIP THIS PHASE.**

### □ 0.1 Verify Core Library Works (2-3h)

```bash
# Create a clean test project
mkdir /tmp/sg-prototype && cd /tmp/sg-prototype
pnpm create -y

# Install Three.js (peer dependency)
pnpm install three

# Link local spacegraphjs (DON'T publish yet)
pnpm link /path/to/spacegraphjs
```

**Test file:** `test-prototype.html`

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <title>SpaceGraphJS Prototype Test</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            #container {
                width: 100vw;
                height: 100vh;
                overflow: hidden;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from 'spacegraphjs';

            console.log('SpaceGraphJS loaded:', typeof SpaceGraph);

            try {
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
                        {
                            id: 'edge-ab',
                            source: 'node-a',
                            target: 'node-b',
                            type: 'Edge',
                        },
                        {
                            id: 'edge-bc',
                            source: 'node-b',
                            target: 'node-c',
                            type: 'Edge',
                        },
                        {
                            id: 'edge-ca',
                            source: 'node-c',
                            target: 'node-a',
                            type: 'Edge',
                        },
                    ],
                });

                graph.render();
                console.log('✓ Graph rendered successfully');
            } catch (error) {
                console.error('✗ Graph render failed:', error);
                document.body.innerHTML =
                    '<h1 style="color: red; padding: 20px;">ERROR: ' + error.message + '</h1>';
            }
        </script>
    </body>
</html>
```

**Test checklist:**

- [ ] File opens in browser without errors
- [ ] Three nodes render (different colors)
- [ ] Three edges connect nodes
- [ ] Camera controls work (rotate, pan, zoom)
- [ ] No console errors
- [ ] Frame rate is stable (60 FPS)
- [ ] Labels are legible

**DO NOT PROCEED** until this works.

---

### □ 0.2 Test Edge Cases (1-2h)

**Test 1: Empty graph**

```javascript
const graph = SpaceGraph.create('#container', {
    nodes: [],
    edges: [],
});
graph.render();
// Should not crash
```

**Test 2: Single node**

```javascript
const graph = SpaceGraph.create('#container', {
    nodes: [{ id: 'a', type: 'ShapeNode', label: 'Single' }],
    edges: [],
});
graph.render();
// Should render one node
```

**Test 3: Large graph (performance)**

```javascript
const nodes = [];
const edges = [];
for (let i = 0; i < 100; i++) {
    nodes.push({
        id: `node-${i}`,
        type: 'ShapeNode',
        label: `Node ${i}`,
        position: [Math.random() * 1000, Math.random() * 1000, 0],
    });
}
const graph = SpaceGraph.create('#container', { nodes, edges });
graph.render();
// Should maintain 60 FPS
```

**Checklist:**

- [ ] Empty graph doesn't crash
- [ ] Single node renders
- [ ] 100 nodes maintain 60 FPS
- [ ] No memory leaks (check DevTools)

---

### □ 0.3 Fix Any Bugs Found (variable)

**If you find bugs:**

1. Fix them
2. Rebuild: `pnpm run build`
3. Re-test: Reload test file
4. Repeat until all tests pass

**DO NOT PUBLISH** until all tests pass.

---

## Phase 1: pnpm Package Preparation (2 hours)

### □ 1.1 Prepare package.json

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
        }
    },
    "files": ["dist", "README.md", "LICENSE"],
    "sideEffects": false,
    "peerDependencies": {
        "three": ">=0.150.0"
    },
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/autonull/spacegraphjs.git"
    }
}
```

**Checklist:**

- [ ] Name is `spacegraphjs`
- [ ] Version is `6.0.0-alpha.1`
- [ ] `type: "module"` is set
- [ ] `main`, `types` point to correct paths
- [ ] `files` array is minimal
- [ ] `peerDependencies` includes three.js
- [ ] `license` is `MIT`

---

### □ 1.2 Build and Verify

```bash
# Clean build
pnpm run build

# Verify output
ls -la dist/
# Expected: spacegraphjs.js, types/

gzip -c dist/spacegraphjs.js | wc -c
# Expected: <500KB gzipped

# Verify types exist
ls dist/types/
# Expected: index.d.ts and other type definitions
```

**Checklist:**

- [ ] Build completes without errors
- [ ] `dist/spacegraphjs.js` exists
- [ ] `dist/types/index.d.ts` exists
- [ ] No console warnings during build

---

### □ 1.3 Test Package Contents

```bash
# See what will be published
pnpm pack --dry-run

# Create actual tarball
pnpm pack

# Inspect contents
tar -tzf spacegraphjs-6.0.0-alpha.1.tgz

# Expected output:
# package/dist/spacegraphjs.js
# package/dist/types/index.d.ts
# package/README.md
# package/LICENSE
# package/package.json
```

**Checklist:**

- [ ] Only expected files are included
- [ ] No `.git/`, `node_modules/`, source files
- [ ] No `.env`, secrets, or sensitive files
- [ ] README.md and LICENSE are included

---

### □ 1.4 Fresh Install Test (CRITICAL)

```bash
# Create completely fresh test directory
rm -rf /tmp/sg-pnpm-test
mkdir /tmp/sg-pnpm-test && cd /tmp/sg-pnpm-test

# Install from tarball (simulates pnpm install)
pnpm install /path/to/spacegraphjs-6.0.0-alpha.1.tgz
pnpm install three

# Create test file
cat > test.mjs << 'EOF'
import { SpaceGraph } from 'spacegraphjs';
console.log('Import successful:', typeof SpaceGraph);
EOF

# Run test
node test.mjs
# Expected: "Import successful: function"
```

**Checklist:**

- [ ] Package installs without errors
- [ ] Three.js installs as peer dependency
- [ ] Import works in Node.js
- [ ] TypeScript types are recognized

**DO NOT PROCEED** until fresh install works.

---

## Phase 2: Documentation (3 hours)

### □ 2.1 QUICKSTART.md (2h)

**Test as you write:**

```bash
# For each step in QUICKSTART.md:
# 1. Run the command in a fresh terminal
# 2. Verify it works exactly as written
# 3. Note any friction
# 4. Update instructions if needed
```

**Critical test:** Give QUICKSTART.md to someone who's never seen the code. Watch them follow it. Don't help them. Note where they get stuck.

**Checklist:**

- [ ] All commands work as written
- [ ] All code snippets are valid
- [ ] No missing steps
- [ ] Tested by a stranger (ideal)

---

### □ 2.2 README.md (1h)

**Keep it under 150 lines:**

````markdown
# SpaceGraphJS

[![pnpm](https://img.shields.io/pnpm/v/spacegraphjs.svg)](https://www.npmjs.com/package/spacegraphjs)
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)

## The First Self-Building UI Framework

SpaceGraphJS is a Zoomable User Interface (ZUI) library powered by AI vision.
It sees what it builds, verifies quality autonomously, and self-corrects.

**98% faster iteration. Pure FOSS.**

## Quickstart

```bash
pnpm install spacegraphjs three
```
````

[See QUICKSTART.md](./QUICKSTART.md) for a 5-minute guide.

## Features

- 🎨 18 node types, 8 edge types, 16 layout engines
- 👁️ AI vision (layout, legibility, overlap, color)
- ⚡ 60 FPS at 1000 nodes
- 📦 MIT License

## Community

- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
- GitHub: https://github.com/autonull/spacegraphjs

## License

MIT

````

**Checklist:**
- [ ] Under 150 lines
- [ ] One-liner is clear
- [ ] Quickstart command works
- [ ] Links are valid
- [ ] License is correct

---

## Phase 3: Publish + Announce (2 hours)

### □ 3.1 Publish to pnpm (30 min)

```bash
# Login (if not already)
pnpm login

# Publish alpha (not latest!)
pnpm publish --tag alpha

# Verify on npmjs.com
# https://www.npmjs.com/package/spacegraphjs
# Should show "alpha" tag

# Test public install
mkdir /tmp/sg-public-test && cd /tmp/sg-public-test
pnpm install spacegraphjs@alpha three
````

**Checklist:**

- [ ] `pnpm publish --tag alpha` completes
- [ ] Package visible on npmjs.com
- [ ] Tag is `alpha` (not `latest`)
- [ ] Public install works

---

### □ 3.2 Write Launch Article (1.5h)

**Title:** "Stop Describing UIs to AI. Start Specifying Them."

**Post to:** Dev.to (fastest audience, no approval needed)

**Structure:**

1. The problem (AI iteration hell) — 2 paragraphs
2. The insight (vision-closed development) — 1 paragraph
3. The solution (SpaceGraphJS) — 2 paragraphs
4. Try it (pnpm install command) — 1 paragraph
5. Join us (links) — 1 paragraph

**Total:** ~500 words, 2 hours max

**Checklist:**

- [ ] Article is published
- [ ] Link works
- [ ] pnpm install command is correct
- [ ] GitHub and Matrix links work

---

## Phase 4: Community Setup (1 hour)

### □ 4.1 Matrix Room (30 min)

```
1. Go to https://app.element.io
2. Create account (if needed)
3. Create room: #spacegraphjs:matrix.org
4. Set description: "SpaceGraphJS community — self-building UI framework"
5. Set avatar (logo if you have one)
6. Copy join link: https://matrix.to/#/#spacegraphjs:matrix.org
7. Add to README.md and ppnpm package
```

**Checklist:**

- [ ] Room created
- [ ] Description is set
- [ ] Join link works
- [ ] You can send messages

---

### □ 4.2 GitHub Sponsors (30 min)

```
1. Go to https://github.com/sponsors/autonull
2. Click "Create a sponsorship page"
3. Fill in:
   - About: "Building SpaceGraphJS — the first self-building UI framework"
   - Tiers: $5, $10, $25 (keep it simple)
4. Submit
5. Add badge to README.md
```

**Checklist:**

- [ ] Sponsorship page is live
- [ ] Badge renders in README
- [ ] Link works

---

## Phase 5: Launch Announcement (30 min)

### □ 5.1 Post Announcements

**GitHub Discussions:**

```
Title: SpaceGraphJS Alpha is Live!

Body:
The first self-building UI framework is now available on pnpm.

Try it: pnpm install spacegraphjs@alpha
Quickstart: [link to QUICKSTART.md]
Community: https://matrix.to/#/#spacegraphjs:matrix.org
```

**Matrix:**

```
🚀 SpaceGraphJS Alpha is live!

pnpm install spacegraphjs@alpha

Quickstart: [link]
GitHub: [link]
```

**Optional:** Twitter, LinkedIn, Reddit (check rules first)

---

## GATES: Do Not Proceed Until...

| Gate       | Requirement         | Test                                |
| ---------- | ------------------- | ----------------------------------- |
| **Gate 0** | Prototype works     | Test file renders 3 nodes + 3 edges |
| **Gate 1** | Build succeeds      | `pnpm run build` completes           |
| **Gate 2** | Fresh install works | `pnpm install` in empty directory    |
| **Gate 3** | QUICKSTART works    | Stranger can follow in <10 min      |
| **Gate 4** | All tests pass      | No console errors in test file      |

**If any gate fails:** Fix the issue. Re-test. Do not publish.

---

## Timeline

```
Day 1 (4-6h):
├── Phase 0: Working prototype
│   ├── 0.1 Core library test (2-3h)
│   ├── 0.2 Edge cases (1-2h)
│   └── 0.3 Bug fixes (variable)
│
└── STOP IF BUGS FOUND

Day 2 (6-8h):
├── Phase 1: pnpm prep (2h)
│   ├── 1.1 package.json (30 min)
│   ├── 1.2 Build and verify (1h)
│   └── 1.3 Fresh install test (30 min)
│
├── Phase 2: Documentation (3h)
│   ├── 2.1 QUICKSTART.md (2h)
│   └── 2.2 README.md (1h)
│
├── Phase 3: Publish (2h)
│   ├── 3.1 pnpm publish (30 min)
│   └── 3.2 Launch article (1.5h)
│
└── Phase 4: Community (1h)
    ├── 4.1 Matrix room (30 min)
    └── 4.2 GitHub Sponsors (30 min)

Day 3 (if needed):
└── Buffer for bug fixes, re-testing
```

**Total:** 12-16 hours over 2-3 days

---

## Success Metrics (Week 1)

| Metric            | Target       | Why                          |
| ----------------- | ------------ | ---------------------------- |
| pnpm downloads     | 50           | Validates install works      |
| Matrix members    | 10           | Validates community interest |
| GitHub stars      | 10           | Validates project appeal     |
| 1 external issue  | Yes          | Validates engagement         |
| **0 bug reports** | **Critical** | Validates quality            |

**If you get bug reports in Week 1:**

1. Acknowledge immediately
2. Fix within 48 hours
3. Re-publish as `alpha.2`
4. Thank the reporter

---

## The Genius Insight

**Publishing a broken package is worse than not publishing at all.**

- First impressions are permanent
- Word spreads faster about bugs than features
- Trust takes months to build, seconds to lose

**The proper sequence:**

1. Make it work (prototype)
2. Make sure it works for others (fresh install test)
3. Make sure others can use it (QUICKSTART test)
4. THEN publish

**Not:**

1. Publish
2. Hope it works
3. Fix bugs publicly
4. Lose trust

---

## One-Page Summary

```
┌─────────────────────────────────────────────────────────────┐
│           SPACEGRAPHJS LAUNCH PLAN (SEQUENCED)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 0: WORKING PROTOTYPE (4-6h) ← DO NOT SKIP           │
│  • Test file renders 3 nodes + 3 edges                      │
│  • Edge cases: empty, single node, 100 nodes               │
│  • Fix all bugs before proceeding                           │
│                                                              │
│  PHASE 1: NPM PREP (2h)                                     │
│  • package.json configured                                  │
│  • Build succeeds                                           │
│  • Fresh install test passes                                │
│                                                              │
│  PHASE 2: DOCUMENTATION (3h)                                │
│  • QUICKSTART.md tested by stranger                         │
│  • README.md under 150 lines                                │
│                                                              │
│  PHASE 3: PUBLISH (2h)                                      │
│  • pnpm publish --tag alpha                                  │
│  • Launch article on Dev.to                                 │
│                                                              │
│  PHASE 4: COMMUNITY (1h)                                    │
│  • Matrix room created                                      │
│  • GitHub Sponsors live                                     │
│                                                              │
│  GATES: Do not proceed until each test passes              │
│                                                              │
│  TOTAL: 12-16 hours over 2-3 days                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Ready to launch properly?**

Start with Phase 0: Create the test file. Make it render. Fix any bugs.

Then proceed to Phase 1.
