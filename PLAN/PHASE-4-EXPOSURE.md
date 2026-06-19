# Phase 4: Exposure & Community-Led Growth

## 4.1 The Exposure Imperative

**SpaceGraphJS faces a visibility crisis:**

> It has **industry-first AI vision technology** buried in a spec document that almost no one will read.

**The goal:** Transform technical depth into visible authority. Make the invisible visible.

---

## 4.2 Content Strategy: Technical Authority

### 4.2.1 Core Narrative

**The Hook:**

```
"Stop describing UIs to AI. Start specifying them.

SpaceGraphJS is the first UI framework that sees what it builds,
verifies quality autonomously, and self-corrects in milliseconds.

Traditional AI iteration: 30 minutes per cycle
Vision-closed development: 30 seconds per cycle

98% faster. Pixel-perfect. Autonomous."
```

**Supporting Points:**

1. **Problem:** AI can't see what it builds → slow, imprecise, exhausting iteration
2. **Solution:** Embed AI vision at every layer → autonomous quality verification
3. **Proof:** 6 vision models, 175K LOC synthesized, production-tested code

---

### 4.2.2 Content Pillars

| Pillar                   | Format                       | Frequency    | Channel                         | Owner     |
| ------------------------ | ---------------------------- | ------------ | ------------------------------- | --------- |
| **Technical Deep Dives** | Long-form blog (2000+ words) | 2x/month     | Dev.to, Hashnode, Personal blog | Core dev  |
| **Vision System Demos**  | Short video (2-5 min)        | 1x/month     | YouTube, Matrix, GitHub         | Core dev  |
| **Example Gallery**      | Interactive demos            | 10 at launch | Docs site                       | Core dev  |
| **Release Notes**        | Changelog posts              | Per release  | GitHub Releases, Matrix         | Core dev  |
| **Community Showcase**   | User project highlights      | 1x/month     | Matrix, GitHub Discussions      | Community |

---

### 4.2.3 Launch Content (Week 1-2)

**Article 1: The Vision-Closed Development Manifesto**

```
Title: "Stop Describing UIs to AI. Start Specifying Them."
Length: 2500 words
Channel: Dev.to, Hashnode, Personal blog

Outline:
1. The broken AI iteration loop (we've all lived it)
2. What "vision-closed" means (the insight)
3. How SpaceGraphJS implements it (the architecture)
4. Demo: AI detects overlap → auto-fixes in 30 seconds
5. Why this changes everything (the implication)
6. Call to action: Try it, contribute, join Matrix
```

**Article 2: Technical Deep Dive**

```
Title: "Building a Self-Building UI Library: Architecture of SpaceGraphJS"
Length: 3500 words
Channel: Dev.to, Hashnode

Outline:
1. Synthesizing 5 codebases (175K LOC) into one
2. The 6 vision models (LQ-Net, TLA, CHE, ODN, VHS, EQA)
3. Plugin architecture (17 plugins unified)
4. Performance systems (60 FPS at 1000 nodes)
5. TypeScript migration lessons
6. Call to action: Contributors wanted
```

**Video 1: Vision System Demo**

```
Title: "Watch AI Fix Its Own UI Bugs in 30 Seconds"
Length: 2:30
Format: Screen recording with narration

Script:
1. Show broken graph (overlapping nodes, illegible text)
2. Run vision analysis (show scores: 65/100 layout, 12 overlaps)
3. Trigger auto-fix
4. Show fixed graph (91/100 layout, 0 overlaps)
5. Side-by-side comparison
6. "This is vision-closed development. Try it yourself."
```

---

### 4.2.4 Ongoing Content Calendar

| Week    | Content                               | Channel                  |
| ------- | ------------------------------------- | ------------------------ |
| Week 1  | Launch Article 1 (Manifesto)          | Dev.to, Hashnode, Matrix |
| Week 2  | Launch Article 2 (Architecture)       | Dev.to, Hashnode         |
| Week 3  | Video 1 (Vision Demo)                 | YouTube, Matrix          |
| Week 4  | Example Gallery Launch (10 demos)     | Docs site                |
| Week 5  | Article 3 (Performance Deep Dive)     | Dev.to                   |
| Week 6  | Community Showcase #1                 | Matrix, GitHub           |
| Week 7  | Article 4 (Contributor Guide)         | Dev.to                   |
| Week 8  | Video 2 (Building a Custom Node Type) | YouTube                  |
| Week 9  | Article 5 (Vision Model Training)     | Dev.to                   |
| Week 10 | Community Showcase #2                 | Matrix, GitHub           |
| Week 11 | Article 6 (Roadmap v6.1)              | GitHub Discussions       |
| Week 12 | Video 3 (3-Month Retrospective)       | YouTube                  |

---

## 4.3 Community Engagement Plan

### 4.3.1 Matrix-First Strategy

**Room Structure:**

```
#spacegraphjs:matrix.org (main)
├── #sg6-announcements:matrix.org (read-only, announcements only)
├── #sg6-help:matrix.org (support, Q&A)
├── #sg6-contributors:matrix.org (dev coordination)
└── #sg6-showcase:matrix.org (user projects)
```

**Bot Integration:**
| Bot | Purpose | Setup Effort |
|-----|---------|--------------|
| **GitHub Bot** | Push notifications, PR updates | 30 min |
| **CI Bot** | Build/test results | 30 min |
| **Welcome Bot** | Greet new members, link to resources | 1 hour |

**Welcome Bot Example:**

```typescript
// Matrix welcome bot
import { MatrixClient } from 'matrix-js-sdk';

const WELCOME_MESSAGE = `
👋 Welcome to SpaceGraphJS!

Quick links:
• Docs: https://spacegraphjs.dev
• GitHub: https://github.com/autonull/spacegraphjs
• Quickstart: pnpm install spacegraphjs
• Contributing: CONTRIBUTING.md

Channels:
• #sg6-help:matrix.org - Get help
• #sg6-contributors:matrix.org - Build with us
• #sg6-showcase:matrix.org - Show what you made

Say hi and tell us what you're building!
`;

client.on('RoomMember.membership', (event, member) => {
    if (member.membership === 'invite' && member.userId === client.getUserId()) {
        client.sendText(member.roomId, WELCOME_MESSAGE);
    }
});
```

---

### 4.3.2 GitHub Discussions

**Categories:**

```
📋 Announcements (maintainers only)
💡 Ideas (feature requests, RFCs)
🙏 Q&A (support questions)
📖 Documentation (docs improvements)
🎉 Showcase (user projects)
```

**Template: Feature Request**

```markdown
### Problem Statement

What problem does this solve?

### Proposed Solution

How should it work?

### Alternatives Consider

What other approaches did you think about?

### Implementation Sketch

Pseudocode or architecture ideas (optional)
```

---

### 4.3.3 Contributor Onboarding

**CONTRIBUTING.md Structure:**

````markdown
# Contributing to SpaceGraphJS

## Quick Start

```bash
git clone https://github.com/autonull/spacegraphjs
cd spacegraphjs
pnpm install
pnpm run dev
```
````

## Where to Start

- 🟢 **Good First Issues**: Labelled `good first issue`
- 🟡 **Help Wanted**: Labelled `help wanted`
- 🔴 **High Priority**: Labelled `priority`

## Development Workflow

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes
4. Run tests: `pnpm test`
5. Run vision checks: `pnpm run vision`
6. Submit PR

## Code Style

- TypeScript strict mode
- Prettier auto-formatting
- ESLint rules enforced in CI

## Vision Model Contributions

See [docs/vision-models.md](docs/vision-models.md) for training data, architecture docs.

## Join the Conversation

Matrix: https://matrix.to/#/#spacegraphjs:matrix.org

```

**Good First Issues (Examples):**
```

Issue #42: Add example demo for HtmlNode
Labels: good first issue, documentation
Description: Create a minimal working demo showing HtmlNode usage

Issue #43: Write TypeDoc comments for NodePlugin
Labels: good first issue, documentation
Description: Add JSDoc comments to all public APIs in src/plugins/NodePlugin.ts

Issue #44: Fix typo in QUICKSTART.md
Labels: good first issue, documentation
Description: "intall" → "install" in line 12

```

---

## 4.4 90-Day Go-to-Market Calendar

### Month 1: Foundation & Launch

| Week | Milestone | Deliverables | Success Metric |
|------|-----------|--------------|----------------|
| **Week 1** | pnpm Launch | • ppnpm package published<br>• README with quickstart<br>• Matrix room created | • 100 pnpm downloads<br>• 10 Matrix members |
| **Week 2** | Content Launch | • Article 1 (Manifesto)<br>• Article 2 (Architecture)<br>• TypeDoc published | • 500 article views<br>• 5 GitHub stars |
| **Week 3** | Vision Demo | • Video 1 (Vision Demo)<br>• Vite plugin working<br>• Vitest assertions | • 100 video views<br>• 3 external PRs |
| **Week 4** | Example Gallery | • 10 working demos<br>• CONTRIBUTING.md<br>• First community issue | • 20 demo forks<br>• 1 community demo |

---

### Month 2: Growth & Engagement

| Week | Milestone | Deliverables | Success Metric |
|------|-----------|--------------|----------------|
| **Week 5** | Performance Deep Dive | • Article 3 (Performance)<br>• Benchmark suite<br>• LOD demo | • 1000 pnpm downloads<br>• 25 GitHub stars |
| **Week 6** | Community Showcase #1 | • First user project featured<br>• Matrix AMA session<br>• GitHub Discussions active | • 50 Matrix members<br>• 3 user projects shared |
| **Week 7** | Contributor Push | • Article 4 (Contributor Guide)<br>• 5 good first issues<br>• First external PR merged | • 5 external contributors<br>• 10 GitHub stars |
| **Week 8** | Tutorial Video | • Video 2 (Custom Node Type)<br>• Example gallery expanded to 15 | • 500 video views<br>• 2000 pnpm downloads |

---

### Month 3: Momentum & Sustainability

| Week | Milestone | Deliverables | Success Metric |
|------|-----------|--------------|----------------|
| **Week 9** | Vision Model Deep Dive | • Article 5 (Vision Training)<br>• Model architecture docs<br>• Training data samples | • 30 GitHub stars<br>• 1 vision model contributor |
| **Week 10** | Community Showcase #2 | • Second user project<br>• Matrix community call<br>• Roadmap discussion | • 100 Matrix members<br>• 5 user projects |
| **Week 11** | Roadmap v6.1 | • Article 6 (Roadmap)<br>• GitHub milestone<br>• Community voting on features | • 50 GitHub stars<br>• 10 roadmap comments |
| **Week 12** | 90-Day Retrospective | • Video 3 (Retrospective)<br>• Metrics report<br>• v6.1 release planning | • 5000 pnpm downloads<br>• 100 GitHub stars<br>• 200 Matrix members |

---

## 4.5 Success Metrics (90 Days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **pnpm Downloads** | 5,000 cumulative | `pnpm trends spacegraphjs` |
| **GitHub Stars** | 100 | GitHub Insights |
| **GitHub Forks** | 25 | GitHub Insights |
| **External Contributors** | 10 | GitHub Contributors |
| **PRs Merged (external)** | 15 | GitHub PRs |
| **Matrix Members** | 200 | Matrix room info |
| **Article Views** | 5,000 cumulative | Dev.to/Hashnode stats |
| **Video Views** | 2,000 cumulative | YouTube Analytics |
| **Example Demos Forked** | 50 | GitHub fork count |
| **Issues Opened (external)** | 20 | GitHub Issues |

---

## 4.6 Phase 4 Deliverables Summary

### Content Strategy
✅ **Core narrative** defined (Vision-Closed Development)
✅ **5 content pillars** (Technical Deep Dives, Vision Demos, Examples, Releases, Showcase)
✅ **Launch content** planned (2 articles, 1 video, 10 demos)
✅ **12-week content calendar** scheduled

### Community Engagement
✅ **Matrix room structure** (4 rooms: main, help, contributors, showcase)
✅ **Bot integration** plan (GitHub, CI, Welcome)
✅ **GitHub Discussions** categories and templates
✅ **CONTRIBUTING.md** structure
✅ **Good First Issues** strategy

### 90-Day Go-to-Market Calendar
✅ **Month 1:** Foundation & Launch (pnpm, content, vision demo, examples)
✅ **Month 2:** Growth & Engagement (performance, community showcase, contributor push)
✅ **Month 3:** Momentum & Sustainability (vision models, roadmap, retrospective)

### Success Metrics
✅ **10 KPIs** defined (downloads, stars, forks, contributors, Matrix members, views)
```
