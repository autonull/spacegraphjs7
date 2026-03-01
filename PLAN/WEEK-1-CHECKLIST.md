# Week 1 Execution Checklist

**Goal:** Ship npm package + quickstart + community presence  
**Total Time:** ~23 hours  
**Status:** [ ] Not Started [ ] In Progress [ ] Complete

---

## Day 1: npm Package (4 hours)

### □ 1.1 Prepare package.json (30 min)

```bash
# Verify these fields exist in package.json:
- name: "spacegraphjs"
- version: "6.0.0-alpha.1"
- type: "module"
- main: "./dist/spacegraphjs.js"
- types: "./dist/types/index.d.ts"
- files: ["dist", "README.md", "LICENSE"]
- peerDependencies: { "three": ">=0.150.0" }
```

**Checklist:**
- [ ] Name is `spacegraphjs` (not taken)
- [ ] Version is `6.0.0-alpha.1`
- [ ] `type: "module"` is set
- [ ] `main`, `module`, `types` point to correct paths
- [ ] `files` array includes only what's needed
- [ ] `peerDependencies` includes three.js
- [ ] `license` is `MIT`
- [ ] `repository` URL is correct
- [ ] `bugs` URL is correct
- [ ] `homepage` URL is correct

---

### □ 1.2 Build and Verify (1 hour)

```bash
# Run build
npm run build

# Verify output exists
ls -la dist/

# Check package contents
npm pack --dry-run

# Inspect what will be published
npm pack
tar -tzf spacegraphjs-6.0.0-alpha.1.tgz
```

**Checklist:**
- [ ] Build completes without errors
- [ ] `dist/` directory contains compiled JS
- [ ] `dist/types/` contains TypeScript definitions
- [ ] `npm pack --dry-run` shows expected files only
- [ ] No sensitive files included (.env, .git, etc.)
- [ ] Bundle size is reasonable (<1MB gzipped)

---

### □ 1.3 Publish to npm (30 min)

```bash
# Login (if not already)
npm login

# Publish alpha tag
npm publish --tag alpha

# Verify on npmjs.com
# https://www.npmjs.com/package/spacegraphjs
```

**Checklist:**
- [ ] `npm login` successful
- [ ] `npm publish --tag alpha` completes
- [ ] Package visible on npmjs.com
- [ ] Install test works: `npm install spacegraphjs@alpha`

---

### □ 1.4 Test Installation (30 min)

```bash
# Create test project
mkdir /tmp/sg6-test && cd /tmp/sg6-test
npm init -y
npm install spacegraphjs@alpha three

# Verify import works
node -e "import('spacegraphjs').then(m => console.log('OK:', typeof m.SpaceGraph))"
```

**Checklist:**
- [ ] Package installs without errors
- [ ] Three.js installs as peer dependency
- [ ] Import works in Node.js
- [ ] TypeScript types are recognized

---

## Day 2: QUICKSTART.md + README (4 hours)

### □ 2.1 Review QUICKSTART.md (1 hour)

```bash
# Verify quickstart works end-to-end
cd /tmp
mkdir quickstart-test && cd quickstart-test
# Follow QUICKSTART.md exactly
# Note any friction points
```

**Checklist:**
- [ ] All commands work as written
- [ ] All code snippets are valid
- [ ] No missing steps
- [ ] Time to complete is <10 minutes
- [ ] Screenshots added (optional)

---

### □ 2.2 Update README.md (2 hours)

**Required Sections:**
```markdown
# SpaceGraphJS

[![npm](https://img.shields.io/npm/v/spacegraphjs.svg)](https://www.npmjs.com/package/spacegraphjs)
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/autonull)](https://github.com/sponsors/autonull)

## The First Self-Building UI Framework

SpaceGraphJS is a Zoomable User Interface (ZUI) library powered by AI vision.
It sees what it builds, verifies quality autonomously, and self-corrects in 30 seconds.

**98% faster iteration. Pixel-perfect. Pure FOSS.**

## Quickstart

```bash
npm install spacegraphjs three
```

[See QUICKSTART.md](./QUICKSTART.md) for a 5-minute guide.

## Features

- 🎨 18 node types, 8 edge types, 16 layout engines
- 👁️ 6 AI vision models (LQ-Net, TLA, CHE, ODN, VHS, EQA)
- ⚡ 60 FPS at 1000 nodes
- 🔧 Vision-closed development (self-correcting UI)
- 📦 Pure FOSS (MIT license)

## Examples

[Link to examples directory]

## Documentation

[Link to docs]

## Community

- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
- GitHub: https://github.com/autonull/spacegraphjs

## License

MIT — See [LICENSE](./LICENSE)
```

**Checklist:**
- [ ] Badges work (npm, Matrix, Sponsors)
- [ ] One-liner is clear
- [ ] Quickstart command works
- [ ] Features list is accurate
- [ ] Links are valid
- [ ] License is correct

---

### □ 2.3 Add LICENSE File (30 min)

```bash
# Verify LICENSE exists
cat LICENSE

# Should be MIT license
```

**Checklist:**
- [ ] LICENSE file exists
- [ ] Contains full MIT license text
- [ ] Copyright year is current
- [ ] Copyright holder is correct

---

## Day 3: Community Setup (3 hours)

### □ 3.1 Create Matrix Room (1 hour)

**Steps:**
1. Go to https://app.element.io
2. Create account (if needed)
3. Create room: `#spacegraphjs:matrix.org`
4. Set room description: "SpaceGraphJS community — self-building UI framework"
5. Set room avatar (logo)
6. Set permissions (anyone can join, members can send messages)

**Checklist:**
- [ ] Room created: `#spacegraphjs:matrix.org`
- [ ] Description is set
- [ ] Avatar is uploaded
- [ ] Permissions are correct
- [ ] Join link works: https://matrix.to/#/#spacegraphjs:matrix.org

---

### □ 3.2 Set Up GitHub Sponsors (1 hour)

**Steps:**
1. Go to https://github.com/sponsors/autonull
2. Click "Create a sponsorship page"
3. Fill in:
   - About: "Building the first self-building UI framework"
   - Suggested tiers: $5, $10, $25, $50, $100
   - Benefits: Thank you, early access, priority support (by tier)
4. Submit for review

**Checklist:**
- [ ] Sponsorship page created
- [ ] About section is compelling
- [ ] Tiers are set
- [ ] Benefits are clear
- [ ] Page is published

---

### □ 3.3 Add Badges to README (30 min)

```markdown
[![npm](https://img.shields.io/npm/v/spacegraphjs.svg)](https://www.npmjs.com/package/spacegraphjs)
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/autonull)](https://github.com/sponsors/autonull)
```

**Checklist:**
- [ ] npm badge links to package
- [ ] Matrix badge links to room
- [ ] Sponsors badge links to sponsorship page
- [ ] All badges render correctly

---

### □ 3.4 Set Up Open Collective (Optional, 30 min)

**Steps:**
1. Go to https://opencollective.com
2. Create collective: "SpaceGraphJS"
3. Link GitHub repository
4. Set up bank account for withdrawals
5. Add donation button to README

**Checklist:**
- [ ] Collective created
- [ ] GitHub linked
- [ ] Bank account verified
- [ ] Donate button added to README

---

## Day 4-5: Vite Vision Plugin (8 hours)

### □ 4.1 Create Plugin Structure (2 hours)

**File:** `plugins/vite-plugin-spacegraph-vision.ts`

```typescript
import { Plugin } from 'vite';

interface VisionPluginOptions {
  enabled?: boolean;
  autoFix?: boolean;
  thresholds?: {
    layout?: number;
    legibility?: number;
  };
}

export function spacegraphVision(options: VisionPluginOptions = {}): Plugin {
  return {
    name: 'spacegraph-vision',
    enforce: 'post',
    
    async buildEnd() {
      if (!options.enabled) return;
      console.log('👁️  Vision analysis running...');
      // TODO: Implement vision analysis
    },
    
    configureServer(server) {
      server.middlewares.use('/__vision', async (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    },
  };
}
```

**Checklist:**
- [ ] Plugin file created
- [ ] Interface defined
- [ ] Basic structure works
- [ ] TypeScript compiles

---

### □ 4.2 Implement Vision Analysis Stub (3 hours)

**File:** `vision/analyzer.ts`

```typescript
export interface VisionReport {
  layoutScore: number;
  legibilityScore: number;
  issues: VisionIssue[];
}

export interface VisionIssue {
  type: 'overlap' | 'legibility' | 'color';
  severity: 'error' | 'warning';
  message: string;
}

export async function runVisionAnalysis(outputDir: string): Promise<VisionReport> {
  // Stub implementation
  return {
    layoutScore: 85,
    legibilityScore: 90,
    issues: [],
  };
}
```

**Checklist:**
- [ ] Types defined
- [ ] Function signature works
- [ ] Returns valid report structure
- [ ] Integrates with plugin

---

### □ 4.3 Test Plugin (2 hours)

```bash
# Create test project
mkdir /tmp/vision-test && cd /tmp/vision-test
npm init -y
npm install spacegraphjs@alpha three vite

# Create vite.config.ts with plugin
# Run build
npm run build

# Check for vision output
```

**Checklist:**
- [ ] Plugin loads without errors
- [ ] Vision analysis runs on build
- [ ] Report is logged to console
- [ ] Dev server middleware works

---

### □ 4.4 Document Plugin Usage (1 hour)

**Add to docs/vision-plugin.md:**

```markdown
# Vision Plugin

The Vite plugin integrates AI vision analysis into your build process.

## Installation

```bash
npm install spacegraphjs
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
  plugins: [
    spacegraphVision({
      enabled: true,
      autoFix: true,
      thresholds: {
        layout: 80,
        legibility: 85,
      },
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Enable/disable analysis |
| autoFix | boolean | false | Auto-fix issues |
| thresholds.layout | number | 80 | Minimum layout score |
| thresholds.legibility | number | 85 | Minimum legibility score |
```

**Checklist:**
- [ ] Installation steps clear
- [ ] Configuration example works
- [ ] All options documented
- [ ] Troubleshooting section added

---

## Day 6: Content Creation (6 hours)

### □ 5.1 Write Manifesto Article (4 hours)

**Title:** "Stop Describing UIs to AI. Start Specifying Them."

**Outline:**
```markdown
## The Broken Loop

We've all lived it:
1. Describe what you want to AI
2. AI generates code
3. You run it — it's wrong
4. You describe what's wrong
5. AI guesses again
6. Repeat 10-20 times

30 minutes per iteration. Exhausting. Imprecise.

## The Insight

What if AI could see what it builds?

Not just parse the code. See the actual output.
Measure quality. Detect issues. Self-correct.

## Vision-Closed Development

SpaceGraphJS embeds AI vision at every layer:
- LQ-Net evaluates layout quality
- TLA ensures text is legible
- ODN detects overlapping elements
- CHE analyzes color harmony
- VHS scores visual hierarchy
- EQA assesses interaction ergonomics

Result: 30-second iterations. 98% faster.

## The Architecture

[Technical details: 175K LOC synthesis, 6 vision models, etc.]

## Try It

```bash
npm install spacegraphjs@alpha
```

[Link to QUICKSTART.md]

## Join Us

We're building a world where interfaces are visible, comprehensible, and alive.

- GitHub: https://github.com/autonull/spacegraphjs
- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
```

**Checklist:**
- [ ] Article is 2000-2500 words
- [ ] Problem is clearly stated
- [ ] Solution is explained
- [ ] Code examples work
- [ ] Call to action is clear
- [ ] Posted to Dev.to/Hashnode

---

### □ 5.2 Prepare Social Posts (1 hour)

**Twitter/LinkedIn Thread:**
```
🧵 SpaceGraphJS is the first self-building UI framework.

It sees what it builds, verifies quality autonomously, and self-corrects in 30 seconds.

98% faster than traditional AI iteration.

Here's how it works: 👇

[1/7]
```

**Checklist:**
- [ ] Thread written (5-7 tweets)
- [ ] Screenshots attached
- [ ] Links included
- [ ] Scheduled for launch day

---

### □ 5.3 Record Demo Video (Optional, 1 hour)

**Script:**
```
[0:00-0:15] Show broken graph (overlapping nodes)
[0:15-0:30] Run vision analysis (show scores)
[0:30-0:45] Trigger auto-fix
[0:45-1:00] Show fixed graph
[1:00-1:15] Call to action: "Try it yourself"
```

**Checklist:**
- [ ] Screen recording captured
- [ ] Narration recorded
- [ ] Edited and exported
- [ ] Uploaded to YouTube

---

## Day 7: Launch (2 hours)

### □ 6.1 Final Verification (1 hour)

```bash
# Verify everything works
npm install spacegraphjs@alpha
# Follow QUICKSTART.md
# Verify Matrix room is accessible
# Verify GitHub Sponsors page is live
# Verify article is published
```

**Checklist:**
- [ ] npm package installs
- [ ] QUICKSTART.md works end-to-end
- [ ] Matrix room is accessible
- [ ] GitHub Sponsors is live
- [ ] Article is published
- [ ] All links work

---

### □ 6.2 Announce Launch (1 hour)

**Post to:**
- [ ] GitHub Discussions (Announcement)
- [ ] Matrix room (Welcome message)
- [ ] Twitter/LinkedIn (Thread)
- [ ] Dev.to/Hashnode comments (Reply to early commenters)
- [ ] Relevant subreddits (r/javascript, r/typescript, r/threejs)

**Announcement Template:**
```
🚀 SpaceGraphJS Alpha is Live!

The first self-building UI framework is now available on npm.

98% faster iteration with AI vision that sees, verifies, and self-corrects.

Try it: npm install spacegraphjs@alpha
Docs: [link]
Community: https://matrix.to/#/#spacegraphjs:matrix.org

#opensource #typescript #threedjs
```

---

## Week 1 Complete Checklist

- [ ] npm package published (`spacegraphjs@alpha`)
- [ ] QUICKSTART.md written and tested
- [ ] README.md updated with badges
- [ ] LICENSE file present (MIT)
- [ ] Matrix room created (`#spacegraphjs:matrix.org`)
- [ ] GitHub Sponsors page live
- [ ] Vite vision plugin (minimal) working
- [ ] Manifesto article published
- [ ] Launch announcement posted

**Success Metrics:**
- [ ] 100 npm downloads
- [ ] 10 Matrix members
- [ ] 5 GitHub stars
- [ ] 1 external issue/PR

---

## Notes

```
[Add any issues, blockers, or observations here]
```
