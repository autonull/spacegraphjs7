# SpaceGraphJS — Launch Plan (Optimized)

**Goal:** Launch in 8 hours, not 27 hours.  
**Principle:** Ship only what blocks adoption. Everything else waits.

---

## The Critical Path (8 hours total)

| #   | Task            | Time    | Why                          |
| --- | --------------- | ------- | ---------------------------- |
| 1   | npm package     | 2 hours | Blocks ALL adoption          |
| 2   | QUICKSTART.md   | 2 hours | First working graph in 5 min |
| 3   | README.md       | 1 hour  | First impression             |
| 4   | Matrix room     | 30 min  | Community hub                |
| 5   | Launch article  | 2 hours | Drives initial traffic       |
| 6   | GitHub Sponsors | 30 min  | Passive donation option      |

**Total:** 8 hours

---

## What's DEFERRED (Not Week 1)

| Task               | Original | New     | Why Defer                               |
| ------------------ | -------- | ------- | --------------------------------------- |
| Vite vision plugin | 8 hours  | Month 2 | Blocks nothing. Ship working lib first. |
| TypeDoc            | 2 hours  | Month 2 | Inline JSDoc suffices initially.        |
| CI/CD workflows    | 2 hours  | Month 2 | Manual tests work for alpha.            |
| CONTRIBUTING.md    | 2 hours  | Month 2 | No contributors until there's adoption. |
| Content calendar   | 6 hours  | Month 2 | One article is enough to start.         |
| Vision tests       | 4 hours  | Month 2 | Regular tests suffice initially.        |
| Release checklist  | 1 hour   | Month 2 | Alpha doesn't need ceremony.            |

**Time saved:** 25 hours → 8 hours

---

## Launch Day Checklist

### □ 1. npm Package (2 hours)

```bash
# 1. Verify package.json
cat package.json | grep -E '"name"|"version"|"license"'
# Expected: "spacegraphjs", "6.0.0-alpha.1", "MIT"

# 2. Build
npm run build

# 3. Verify dist/
ls dist/
# Expected: spacegraphjs.js, types/

# 4. Test package contents
npm pack --dry-run

# 5. Publish
npm publish --tag alpha

# 6. Verify install
mkdir /tmp/test && cd /tmp/test
npm install spacegraphjs@alpha three
node -e "import('spacegraphjs').then(m => console.log('OK:', typeof m.SpaceGraph))"
```

**Done when:** `npm install spacegraphjs@alpha` works.

---

### □ 2. QUICKSTART.md (2 hours)

**Keep it under 100 lines. Test it works.**

````markdown
# SpaceGraphJS Quickstart

## Install

```bash
npm install spacegraphjs three
```
````

## Your First Graph

```html
<!DOCTYPE html>
<html>
    <body>
        <div id="container" style="width: 100vw; height: 100vh;"></div>
        <script type="module">
            import { SpaceGraph } from 'spacegraphjs';

            const graph = SpaceGraph.create('#container', {
                nodes: [
                    { id: 'a', type: 'ShapeNode', label: 'A', position: [0, 0, 0] },
                    { id: 'b', type: 'ShapeNode', label: 'B', position: [100, 0, 0] },
                ],
                edges: [{ id: 'e1', source: 'a', target: 'b', type: 'Edge' }],
            });

            graph.render();
        </script>
    </body>
</html>
```

Open in browser. Done.

## Controls

- Rotate: Left-click + drag
- Pan: Right-click + drag
- Zoom: Scroll wheel

## Next

- GitHub: https://github.com/autonull/spacegraphjs
- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org

````

**Done when:** A stranger can follow it in <5 minutes.

---

### □ 3. README.md (1 hour)

**Keep it under 200 lines.**

```markdown
# SpaceGraphJS

[![npm](https://img.shields.io/npm/v/spacegraphjs.svg)](https://www.npmjs.com/package/spacegraphjs)
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)

## The First Self-Building UI Framework

SpaceGraphJS is a Zoomable User Interface (ZUI) library powered by AI vision.
It sees what it builds, verifies quality autonomously, and self-corrects.

**98% faster iteration. Pure FOSS.**

## Quickstart

```bash
npm install spacegraphjs three
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

```

**Done when:** Someone understands what it is in 30 seconds.

---

### □ 4. Matrix Room (30 min)

```

1. Go to https://app.element.io
2. Create account (if needed)
3. Create room: #spacegraphjs:matrix.org
4. Set description: "SpaceGraphJS community — self-building UI framework"
5. Set avatar (logo if you have one)
6. Copy join link: https://matrix.to/#/#spacegraphjs:matrix.org
7. Add to README.md

````

**Done when:** Join link works.

---

### □ 5. Launch Article (2 hours)

**Title:** "Stop Describing UIs to AI. Start Specifying Them."

**Post to:** Dev.to (fastest audience)

```markdown
# Stop Describing UIs to AI. Start Specifying Them.

We've all lived it:

1. Describe what you want to AI
2. AI generates code
3. You run it — it's wrong
4. You describe what's wrong
5. AI guesses again
6. Repeat 10-20 times

30 minutes per iteration. Exhausting.

## The Insight

What if AI could see what it builds?

Not just parse the code — see the actual rendered output.
Measure quality. Detect issues. Self-correct.

This is vision-closed development.

## SpaceGraphJS

I built SpaceGraphJS to solve this. It synthesizes 175,000 lines
of proven code from 5 repositories into one TypeScript codebase.

Six AI vision models analyze every build:
- Layout quality
- Text legibility
- Color harmony
- Overlap detection
- Visual hierarchy
- Interaction ergonomics

Result: 30-second iterations. 98% faster.

## Try It

```bash
npm install spacegraphjs@alpha
````

[QUICKSTART.md](link) gets you running in 5 minutes.

## Join Us

We're building a world where interfaces are visible,
comprehensible, and alive.

- GitHub: https://github.com/autonull/spacegraphjs
- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org

```

**Done when:** Article is published and linked from README.

---

### □ 6. GitHub Sponsors (30 min)

```

1. Go to https://github.com/sponsors/autonull
2. Click "Create a sponsorship page"
3. Fill in:
    - About: "Building SpaceGraphJS — the first self-building UI framework"
    - Tiers: $5, $10, $25 (keep it simple)
    - Benefits: "Thank you!", "Early access", "Priority support"
4. Submit
5. Add badge to README.md

```

**Done when:** Sponsorship page is live.

---

## Launch Announcement (30 min)

**Post to:**

1. **GitHub Discussions** (Announcement)
2. **Matrix** (#spacegraphjs:matrix.org — welcome message)
3. **Twitter/LinkedIn** (optional)
4. **r/javascript** (optional, check rules first)

**Template:**

```

🚀 SpaceGraphJS Alpha is Live!

The first self-building UI framework is now available on npm.

98% faster iteration with AI vision that sees, verifies, and self-corrects.

Try it: npm install spacegraphjs@alpha
Docs: [link to QUICKSTART.md]
Community: https://matrix.to/#/#spacegraphjs:matrix.org

#opensource #typescript #threejs

```

---

## Success Metrics (Week 1)

| Metric | Target | Why |
|--------|--------|-----|
| npm downloads | 50 | Validates install works |
| Matrix members | 10 | Validates community interest |
| GitHub stars | 10 | Validates project appeal |
| 1 external issue | Yes | Validates engagement |

**Ignore:**
- Revenue (too early)
- Contributors (too early)
- Article views (vanity metric)

---

## Week 2+ (Only If Week 1 Succeeds)

**If** you hit Week 1 targets, then consider:

| Task | Priority | When |
|------|----------|------|
| Vite vision plugin | P1 | Week 3+ |
| TypeDoc | P2 | Week 4+ |
| CI/CD | P2 | Week 4+ |
| More articles | P2 | Week 3+ |
| Example gallery | P1 | Week 2+ |

**If not,** fix Week 1 fundamentals first:
- Is QUICKSTART.md actually working?
- Is the npm package installable?
- Is the value proposition clear?

---

## The Genius Insight

**Most projects fail from over-engineering, not under-delivering.**

SpaceGraphJS doesn't need:
- ❌ Complex CI/CD (yet)
- ❌ Perfect documentation (yet)
- ❌ Vision plugin integration (yet)
- ❌ Content calendars (yet)
- ❌ Revenue projections (yet)

It needs:
- ✅ Working npm package
- ✅ 5-minute quickstart
- ✅ One compelling story
- ✅ One place to gather (Matrix)

**Ship the minimum. Learn. Iterate.**

---

## One-Page Summary

```

┌─────────────────────────────────────────────────────────────┐
│ SPACEGRAPHJS LAUNCH PLAN │
├─────────────────────────────────────────────────────────────┤
│ │
│ GOAL: 8 hours to launch │
│ │
│ CRITICAL PATH: │
│ 1. npm package (2h) ← Blocks adoption │
│ 2. QUICKSTART.md (2h) ← First working graph │
│ 3. README.md (1h) ← First impression │
│ 4. Matrix room (30m) ← Community hub │
│ 5. Launch article (2h) ← Drives traffic │
│ 6. GitHub Sponsors (30m) ← Passive donations │
│ │
│ DEFERRED (Month 2+): │
│ • Vite vision plugin │
│ • TypeDoc │
│ • CI/CD workflows │
│ • CONTRIBUTING.md │
│ • Content calendar │
│ │
│ WEEK 1 TARGETS: │
│ • 50 npm downloads │
│ • 10 Matrix members │
│ • 10 GitHub stars │
│ • 1 external issue │
│ │
│ PRINCIPLE: Ship minimum. Learn. Iterate. │
│ │
└─────────────────────────────────────────────────────────────┘

```

---

**Ready to launch in 8 hours?**

Start with Task 1: `npm run build && npm publish --tag alpha`
```
