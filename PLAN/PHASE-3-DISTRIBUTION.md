# Phase 3: Ubiquity & Distribution (Open-Only, Prioritized)

## 3.1 Priority Framework

**Tier System:**
- **P0 (Critical):** Must have for launch. Blocks adoption.
- **P1 (High):** Should have within 2 weeks. Significant friction without.
- **P2 (Medium):** Nice to have. Can defer.
- **Deferred:** Indefinitely postponed. Not worth the distraction.

---

## 3.2 Integration Priority Matrix

| Integration | Tier | Rationale |
|-------------|------|-----------|
| **npm** | P0 | Industry standard. No npm = no adoption. |
| **GitHub** | P0 | Already done. Primary repo hosting. |
| **Vite Plugin** | P0 | Vision system requires tight Vite integration. |
| **TypeDoc** | P1 | API discoverability. Blocks contributor onboarding. |
| **Vitest Assertions** | P1 | Testing infrastructure for adopters. |
| **Matrix/Element** | P1 | Community hub. Enables contributor coordination. |
| **Open VSX** | P2 | Editor integration. Defer until after launch. |
| **IPFS** | Deferred | Nice ideological fit, low practical impact. |
| **Self-hosted CDN** | Deferred | npm/unpkg suffice initially. |
| **Verdaccio** | Deferred | Users can self-host if they need it. |
| **Self-hosted Playground** | Deferred | Simple demos in repo suffice initially. |
| **Nix Flake** | Deferred | Too niche. Blocks nothing. |
| **Docker** | Deferred | Library, not a service. No runtime needed. |

---

## 3.3 P0: Critical Integrations (Week 1)

### 3.3.1 npm Package

**Why Critical:** Without npm, developers cannot install the library. This is non-negotiable.

**Minimal Package Structure:**
```json
{
  "name": "spacegraphjs",
  "version": "6.0.0-alpha.1",
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
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "peerDependencies": {
    "three": ">=0.150.0"
  },
  "sideEffects": false
}
```

**Publish Checklist (2 hours):**
```bash
# 1. Ensure build works
npm run build

# 2. Verify package contents
npm pack --dry-run

# 3. Publish alpha
npm publish --tag alpha

# 4. Test install
mkdir /tmp/test && cd /tmp/test
npm install spacegraphjs@alpha
```

---

### 3.3.2 Vite Plugin (Vision Integration)

**Why Critical:** The vision system is the core differentiator. Without Vite plugin integration, it's just a spec document.

**Minimal Plugin:**
```typescript
// plugins/vite-plugin-spacegraph-vision.ts
import { Plugin } from 'vite';
import { runVisionAnalysis } from '../vision/analyzer';

interface VisionPluginOptions {
  enabled?: boolean;
  autoFix?: boolean;
  thresholds?: { layout?: number; legibility?: number };
}

export function spacegraphVision(options: VisionPluginOptions = {}): Plugin {
  return {
    name: 'spacegraph-vision',
    enforce: 'post',
    
    async buildEnd() {
      if (!options.enabled) return;
      
      const report = await runVisionAnalysis('dist/');
      
      if (options.autoFix && report.issues.length > 0) {
        console.log(`🔧 Auto-fixing ${report.issues.length} issues...`);
        // Apply fixes
      }
      
      if (report.layoutScore < (options.thresholds?.layout ?? 80)) {
        console.warn(`⚠️  Layout quality below threshold: ${report.layoutScore}`);
      }
    },
    
    // Dev server overlay
    configureServer(server) {
      server.middlewares.use('/__vision', async (req, res) => {
        const report = await runVisionAnalysis('dist/');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      });
    },
  };
}
```

**Usage:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
  plugins: [
    spacegraphVision({
      enabled: true,
      autoFix: true,
      thresholds: { layout: 80, legibility: 85 },
    }),
  ],
});
```

**Effort:** 8 hours

---

## 3.4 P1: High Priority (Week 2)

### 3.4.1 TypeDoc (API Documentation)

**Why High Priority:** Without auto-generated API docs, contributors cannot discover node types, edge types, plugin APIs.

**Minimal Setup:**
```json
// package.json
{
  "scripts": {
    "docs": "typedoc src/index.ts src/vision/index.ts src/plugins/*.ts"
  },
  "devDependencies": {
    "typedoc": "^0.25.0",
    "typedoc-plugin-markdown": "^3.16.0"
  }
}
```

```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludePrivate": true,
  "excludeProtected": false
}
```

**Effort:** 2 hours

---

### 3.4.2 Vitest Assertions (Vision Testing)

**Why High Priority:** Adopters need to verify their graphs pass vision checks in CI.

**Minimal API:**
```typescript
// vision/vitest-assertions.ts
import { expect } from 'vitest';
import { runVisionAnalysis } from './analyzer';

export const visionAssert = {
  async noOverlap(graphId: string) {
    const report = await runVisionAnalysis(graphId);
    expect(report.overlaps).toHaveLength(0);
  },
  
  async allTextLegible(graphId: string) {
    const report = await runVisionAnalysis(graphId);
    expect(report.illegibleElements).toHaveLength(0);
  },
  
  async wcagCompliance(graphId: string, level: 'A' | 'AA' | 'AAA') {
    const report = await runVisionAnalysis(graphId);
    expect(report.wcagCompliance[level]).toBe(true);
  },
  
  async layoutQuality(graphId: string, minScore: number) {
    const report = await runVisionAnalysis(graphId);
    expect(report.layoutScore).toBeGreaterThanOrEqual(minScore);
  },
};
```

**Usage:**
```typescript
// tests/graph.test.ts
import { visionAssert } from 'spacegraphjs/vision-test';

test('graph has no overlaps', async () => {
  await visionAssert.noOverlap('test-graph');
});

test('all text is legible', async () => {
  await visionAssert.allTextLegible('test-graph');
});
```

**Effort:** 4 hours

---

### 3.4.3 Matrix/Element Community

**Why High Priority:** Contributors need a coordination channel. Matrix is open, federated, aligns with OSS values.

**Minimal Setup:**
1. Create room: `#spacegraphjs:matrix.org`
2. Add to GitHub README
3. Set up basic bots (GitHub webhook → Matrix)

**README Badge:**
```markdown
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)
```

**Join Link:**
```
https://matrix.to/#/#spacegraphjs:matrix.org
```

**Effort:** 1 hour

---

## 3.5 P2: Medium Priority (Week 3-4, Optional)

### 3.5.1 Open VSX Extension

**Defer until:** After launch, when users request editor integration.

**Rationale:** Editor integration is nice but blocks nothing. Users can view graphs in browser.

---

## 3.6 Deferred Indefinitely

| Integration | Reason for Deferral |
|-------------|---------------------|
| IPFS | npm suffices. Ideological, not practical. |
| Self-hosted CDN | npm/unpkg work. Add if CDN costs become an issue. |
| Verdaccio | Users can self-host if they need private registry. |
| Self-hosted Playground | Examples in repo suffice. Add if users demand interactive demos. |
| Nix Flake | Too niche. Users can manage their own dev env. |
| Docker | It's a library, not a service. No runtime needed. |
| Vercel | Proprietary silo service. |
| Netlify | Proprietary silo service. |
| CodeSandbox | Proprietary silo service. |
| StackBlitz | Proprietary silo service. |
| GitHub Marketplace | Proprietary silo service. |
| MS VSCode Marketplace | Proprietary silo service (use Open VSX if needed). |

---

## 3.7 Focused Integration Roadmap

```
Week 1 (P0 - Critical):
├── npm package publish (2 hours)
└── Vite vision plugin (8 hours)

Week 2 (P1 - High):
├── TypeDoc API docs (2 hours)
├── Vitest assertions (4 hours)
└── Matrix community (1 hour)

Week 3-4 (P2 - Medium, Optional):
└── Open VSX extension (20 hours, optional)

Deferred Indefinitely:
├── IPFS
├── Self-hosted CDN
├── Verdaccio
├── Self-hosted Playground
├── Nix Flake
└── Docker
```

**Total P0+P1 Effort:** 17 hours (~2-3 days focused work)

---

## 3.8 Phase 3 Deliverables Summary

### P0 Critical (Week 1)
✅ **npm package** - Industry standard distribution
✅ **Vite vision plugin** - Core differentiator integration

### P1 High (Week 2)
✅ **TypeDoc** - Auto-generated API documentation
✅ **Vitest assertions** - Vision testing in CI
✅ **Matrix community** - Contributor coordination hub

### P2 Medium (Week 3-4, Optional)
⏸️ **Open VSX** - Editor integration (defer until user demand)

### Deferred Indefinitely
❌ IPFS, Self-hosted CDN, Verdaccio, Playground, Nix, Docker, and all proprietary silo services
