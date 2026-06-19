# Content Templates

**Ready-to-use templates for articles, videos, and posts.**

---

## Article Template: Technical Deep Dive

````markdown
# [Title: Clear, Specific, Benefit-Driven]

**[Subtitle: One sentence expanding on the title]**

---

## The Problem

[2-3 paragraphs describing the problem your readers face. Make it visceral.]

**Example:**

We've all lived it:

1. You describe what you want to AI
2. AI generates code
3. You run it — it's wrong
4. You describe what's wrong
5. AI guesses again
6. Repeat 10-20 times

Each iteration: 30 minutes. Total: hours of back-and-forth. Exhausting. Imprecise.

The core issue: **AI can't see what it builds.**

---

## The Insight

[1-2 paragraphs describing the key insight that led to your solution.]

**Example:**

What if AI could see the output? Not just parse the code — see the actual rendered result. Measure quality. Detect issues. Self-correct.

This is vision-closed development.

---

## The Solution

[3-5 paragraphs explaining your solution. Include code examples.]

**Example:**

SpaceGraphJS embeds AI vision at every layer:

```typescript
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
````

On every build, six vision models analyze the output:

| Model  | Purpose                       |
| ------ | ----------------------------- |
| LQ-Net | Layout quality scoring        |
| TLA    | Text legibility analysis      |
| CHE    | Color harmony evaluation      |
| ODN    | Overlap detection             |
| VHS    | Visual hierarchy scoring      |
| EQA    | Ergonomics quality assessment |

---

## How It Works

[Technical deep dive: architecture, algorithms, trade-offs.]

### Architecture Overview

[Diagram or description of system architecture.]

### Key Components

[Break down the main components.]

### Performance

[Benchmarks, metrics, optimization techniques.]

---

## Results

[Quantifiable results from using this approach.]

**Example:**

| Metric         | Before   | After      | Improvement    |
| -------------- | -------- | ---------- | -------------- |
| Iteration time | 30 min   | 30 sec     | 60x faster     |
| Bug detection  | Manual   | Automatic  | 100% coverage  |
| Code quality   | Variable | Consistent | 95%+ pass rate |

---

## Try It Yourself

[Clear call to action with installation steps.]

```bash
pnpm install spacegraphjs@alpha
```

[Link to quickstart, docs, examples.]

---

## Join the Community

We're building [vision/mission]. Join us:

- **GitHub:** https://github.com/autonull/spacegraphjs
- **Matrix:** https://matrix.to/#/#spacegraphjs:matrix.org
- **Docs:** https://spacegraphjs.dev

---

## About the Author

[Brief bio with links.]

````

---

## Article Template: Manifesto

```markdown
# [Title: Bold, Contrarian, Visionary]

**[Subtitle: The world according to you]**

---

## The World Is Broken

[Describe the status quo. Why it sucks. Why everyone tolerates it.]

**Example:**

Your UI framework is lying to you.

It says "declarative." But you're writing imperative code to glue components together.

It says "composable." But you're copying boilerplate between projects.

It says "developer experience." But you're waiting 30 minutes for AI to guess what you meant.

We've accepted broken promises.

---

## The Lie We've Been Sold

[Call out the specific lies/misconceptions.]

**Example:**

**Lie #1: "AI will automate everything."**

No. AI that can't see its output is just a fancier autocomplete.

**Lie #2: "You need all these dependencies."**

No. You need a framework that gets out of your way.

**Lie #3: "This is just how it is."**

No. This is how it's been. Not how it must be.

---

## A Different Way

[Describe your vision. What the world looks like with your solution.]

**Example:**

Imagine a UI framework that:

- Sees what it builds
- Verifies quality autonomously
- Self-corrects in 30 seconds

Not after 10 iterations. On the first try.

This isn't a dream. It's SpaceGraphJS.

---

## The Principles

[Core beliefs that guide your approach.]

**Example:**

**1. Vision-Closed Development**

AI must see its output. No exceptions.

**2. Zero Friction**

If it takes more than 5 minutes to get started, we've failed.

**3. Pure FOSS**

No enterprise tiers. No feature gating. No bullshit.

**4. Community-Owned**

The people who build it should own it.

---

## The Invitation

[Call to action. What readers should do next.]

**Example:**

We're building a world where interfaces are visible, comprehensible, and alive.

You can watch from the sidelines. Or you can build with us.

**Get started:**
```bash
pnpm install spacegraphjs@alpha
````

**Join the conversation:**
https://matrix.to/#/#spacegraphjs:matrix.org

**Contribute:**
https://github.com/autonull/spacegraphjs

The future is self-building. Let's build it together.

---

## About

[Brief bio + mission statement.]

```

---

## Video Script Template: Demo

```

[0:00-0:05] HOOK
"Watch me fix a UI bug in 30 seconds — without touching the code."

[0:05-0:15] PROBLEM
[Show broken graph: overlapping nodes, illegible text]
"This graph has 12 overlaps and 3 illegible labels. Fixing this manually takes 20 minutes."

[0:15-0:25] SOLUTION
[Open terminal, run command]
"Instead, I'll run the vision fixer."

[0:25-0:35] MAGIC
[Show vision analysis running, auto-fix applying]
"The AI sees the overlaps, calculates optimal positions, and applies fixes."

[0:35-0:45] RESULT
[Show fixed graph side-by-side with original]
"Done. Zero overlaps. All text legible. 30 seconds."

[0:45-0:55] CALL TO ACTION
"This is vision-closed development. Try it yourself:"
[Show pnpm install command on screen]

[0:55-1:00] END SCREEN
[Links to GitHub, Matrix, docs]

```

---

## Video Script Template: Tutorial

```

[0:00-0:10] INTRO
"Today: Build your first SpaceGraph in 5 minutes."
[Show final result]

[0:10-0:30] PREREQUISITES
"You need Node.js 18+ and pnpm."
[Show terminal with node --version]

[0:30-1:00] INSTALL
"Step 1: Install the package."
[Show pnpm install spacegraphjs three]

[1:00-2:00] CREATE PROJECT
"Step 2: Create your first graph."
[Show code being typed, explain each line]

[2:00-3:00] RUN
"Step 3: Start the dev server."
[Show pnpm run dev, browser opening]

[3:00-4:00] INTERACT
"Try rotating, panning, zooming."
[Show interactions]

[4:00-4:30] NEXT STEPS
"Check out the examples for more node types, layouts, and features."
[Show examples directory]

[4:30-5:00] OUTRO
"Join the community on Matrix. Link in description."
[Show Matrix badge]

```

---

## Social Media Templates

### Twitter/LinkedIn Thread

```

🧵 [Hook: Bold claim or surprising fact]

SpaceGraphJS is the first self-building UI framework.

It sees what it builds, verifies quality autonomously, and self-corrects in 30 seconds.

98% faster than traditional AI iteration.

Here's how it works: 👇

[1/7]

---

[Problem setup]

Traditional AI development:

1. Describe → 2. AI codes → 3. You view → 4. AI guesses → Repeat (10-20x)

30 min per iteration. Exhausting.

[2/7]

---

[Solution]

Vision-closed development:

1. Specify → 2. AI builds → 3. Vision verifies → 4. AI self-corrects → Done

30 sec per iteration. Autonomous.

[3/7]

---

[Technical detail]

6 vision models analyze every build:
• LQ-Net: Layout quality
• TLA: Text legibility
• CHE: Color harmony
• ODN: Overlap detection
• VHS: Visual hierarchy
• EQA: Ergonomics

[4/7]

---

[Results]

Benchmarks:
• 60 FPS at 1000 nodes
• <100ms initial render
• 95%+ vision accuracy

[5/7]

---

[Social proof]

175,000 LOC synthesized from 5 production codebases.

TypeScript. Vision-verified. Pure FOSS.

[6/7]

---

[Call to action]

Try it:
pnpm install spacegraphjs@alpha

Docs: [link]
Community: [link]
GitHub: [link]

[7/7]

```

### Reddit Post

```

Title: I built the first self-building UI framework — AI that sees what it builds

Body:

Hey r/javascript,

After [X months/years] of development, I'm excited to share SpaceGraphJS.

**The problem:** AI can't see what it builds. You describe, it guesses, you correct, repeat. 30 minutes per iteration.

**The solution:** Embed AI vision at every layer. The framework sees the rendered output, measures quality, and self-corrects in 30 seconds.

**Key features:**

- 18 node types, 8 edge types, 16 layout engines
- 6 AI vision models (layout, legibility, color, overlap, hierarchy, ergonomics)
- 60 FPS at 1000 nodes
- Pure FOSS (MIT license)

**Try it:**

```bash
pnpm install spacegraphjs@alpha
```

**Docs:** [link]
**GitHub:** [link]
**Matrix:** [link]

Would love your feedback! Happy to answer questions.

````

---

## Release Notes Template

```markdown
# Release v6.0.0-alpha.1

**Date:** March 1, 2026

---

## What's New

### 🎨 New Features

- Added [feature name] with support for [capabilities]
- Introduced [new API] for [use case]

### 🔧 Improvements

- Improved [X] performance by [Y]%

### 🐛 Bug Fixes

- Fixed [issue] causing [symptom] (#123)
- Resolved [edge case] in [component]

### 📚 Documentation

- Added quickstart guide
- Updated API reference

---

## Breaking Changes

⚠️ **[Description of breaking change]**

**Before:**
```typescript
oldCode();
````

**After:**

```typescript
newCode();
```

---

## Migration Guide

[Step-by-step migration instructions if applicable]

---

## Contributors

Thanks to [@username1](link), [@username2](link) for contributions!

---

## Full Changelog

https://github.com/autonull/spacegraphjs/compare/v5.0.0...v6.0.0-alpha.1

```

---

## Usage Checklist

For each piece of content:

- [ ] Title is clear and compelling
- [ ] Hook grabs attention in first sentence
- [ ] Problem is visceral and relatable
- [ ] Solution is clearly explained
- [ ] Code examples are tested and working
- [ ] Call to action is specific
- [ ] Links are correct
- [ ] Proofread for typos
- [ ] SEO keywords included (for articles)
- [ ] Tags/categories set correctly
```
