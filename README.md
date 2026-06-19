# SpaceGraphJS

[![pnpm](https://img.shields.io/pnpm/v/spacegraphjs.svg)](https://www.npmjs.com/package/spacegraphjs)
[![Matrix](https://img.shields.io/matrix/spacegraphjs:matrix.org)](https://matrix.to/#/#spacegraphjs:matrix.org)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/autonull)](https://github.com/sponsors/autonull)

## The First Self-Building UI Framework

SpaceGraphJS is a Zoomable User Interface (ZUI) library powered by AI vision.
It sees what it builds, verifies quality autonomously, and self-corrects in 30 seconds.

## Quickstart

```bash
pnpm install spacegraphjs three
```

[See QUICKSTART.md](./QUICKSTART.md) for a 5-minute guide.

## Features

- 🎨 18 node types, 8 edge types, 16 layout engines
- 👁️ 6 AI vision models (LQ-Net, TLA, CHE, ODN, VHS, EQA)
- ⚡ 60 FPS at 1000 nodes
- 🔧 Vision-closed development (self-correcting UI)
- 📦 Pure FOSS (MIT license)

## Examples

Check out the interactive examples in the `demo/` directory or run `pnpm run dev` to see them in action.

## Documentation

- **[ROADMAP.md](./ROADMAP.md)** — What's built, what's next (start here for software work)
- [Vision Plugin](./docs/vision-plugin.md) — AI vision integration guide
- [QUICKSTART.md](./QUICKSTART.md) — 5-minute getting started guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) — How to contribute
- [PLAN/SPACEGRAPH_OS.md](./PLAN/SPACEGRAPH_OS.md) — Fractal ZUI & OS architecture vision

## Community

- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
- GitHub: https://github.com/autonull/spacegraphjs

---

**Install:**

```bash
pnpm install spacegraphjs three
```

---

### 🔧 Hardware: The Most Open Dev Platform

**For Researchers & Engineers:**

SpaceGraph Mini — A pocket-sized computer running SpaceGraphOS.

**Specs:**

- 🧠 RK3588 SoC with **12 TOPS NPU** (6x faster than competitors)
- 💾 **32GB RAM** (4x more than competitors)
- 🌡️ **<40°C passive** cooling (20°C cooler)
- ⚡ **<8 second** boot time
- 🔓 **Fully open** (schematics, CAD, BOM published)
- 💰 **$249** (40% cheaper)

**Everything Open:**

- ✅ Schematics (CERN OHL v2)
- ✅ CAD files (CC-BY-SA)
- ✅ Firmware (MIT)
- ✅ OS (AGPL v3)

**Pre-order:** Coming Month 4

---

### 📚 Research: Seminal Contribution

**For Academics:**

**4 Research Papers:**

1. **Vision-Closed Development** (CHI/UIST 2026) — 60x faster AI iteration
2. **ZUI Performance** (WebSci/WWW 2026) — 60 FPS at 1000 nodes
3. **Open Hardware** (TEI/ISWC 2026) — Accessible AI research platform

**2 Open Datasets:**

- **Layout Quality Corpus** — 100K+ labeled graph layouts (CC-BY-4.0)
- **UI Vision Benchmark** — 10K UI screenshots (MIT + CC-BY-4.0)

---

## Why This Exists

### The Problem

**AI-assisted development has a fundamental flaw:**

The AI cannot see what it builds.

```
Traditional AI Development:
Human describes → AI codes → Human views → Human describes → AI guesses → Repeat (10-20x)
                                ↓
                        30 minutes per iteration
                        Exhausting. Imprecise. Discouraging.
```

### The Solution

**Vision-Closed Development:**

```
Vision-Closed Development:
Human specifies → AI builds → Vision verifies → AI self-corrects → Done
                                ↓
                        30 seconds per iteration
                        Autonomous. Precise. Empowering.
```

**6 AI Vision Models:**

- **LQ-Net** — Layout quality scoring
- **TLA** — Text legibility analysis
- **CHE** — Color harmony evaluation
- **ODN** — Overlap detection
- **VHS** — Visual hierarchy scoring
- **EQA** — Ergonomics quality assessment

---

## How to Contribute

### Developers

```bash
# 1. Clone
git clone https://github.com/autonull/spacegraphjs
cd spacegraphjs

# 2. Install
pnpm install

# 3. Run demo
pnpm run dev

# 4. Find a good first issue
# https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

# 5. Submit PR
```

### Researchers

**Interested in collaboration?**

Email: research@spacegraphjs.dev

**Topics:**

- Vision-Closed Development paradigm
- AI-assisted software engineering
- ZUI performance optimization
- Open hardware for AI research

### Hardware Enthusiasts

**Want to build your own?**

All designs published under open licenses:

- Schematics: [github.com/autonull/spacegraph-hardware](https://github.com/autonull/spacegraph-hardware)
- CAD files: CC-BY-SA 4.0
- BOM: Fully documented

---

## Community

| Channel    | Link                                                                         | Members             |
| ---------- | ---------------------------------------------------------------------------- | ------------------- |
| **Matrix** | [#spacegraphjs:matrix.org](https://matrix.to/#/#spacegraphjs:matrix.org)     | 200+ target         |
| **GitHub** | [github.com/autonull/spacegraphjs](https://github.com/autonull/spacegraphjs) | 2,000+ stars target |
| **pnpm**    | [npmjs.com/package/spacegraphjs](https://npmjs.com/package/spacegraphjs)     | 25K+/month target   |

---

## License

| Component            | License                    |
| -------------------- | -------------------------- |
| **Software**         | MIT                        |
| **Vision Models**    | MIT                        |
| **Model Weights**    | CC-BY-4.0                  |
| **Documentation**    | CC-BY-SA 4.0               |
| **Hardware Designs** | CERN OHL v2 / CC-BY-SA 4.0 |
| **SpaceGraphOS**     | AGPL v3                    |

**Pure FOSS. No enterprise tiers. No restrictions.**

---

## Start Now

```bash
# Install
pnpm install spacegraphjs three

# Quickstart
# See QUICKSTART.md for 5-minute guide

# Documentation
# See PLAN/ for complete strategy

# Community
# Join Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
```

---

## The Ultimate Goal

**We are building a world where:**

- Interfaces are **visible**, not hidden
- Computing is **comprehensible**, not opaque
- Development is **autonomous**, not exhausting
- Hardware is **open**, not proprietary
- Research is **accessible**, not gatekept

**This is not just a library. This is a paradigm shift.**

**Stop describing. Start specifying.**

---

## Quick Links

| I Want To...                 | Go Here                                                  |
| ---------------------------- | -------------------------------------------------------- |
| **Get started in 5 min**     | [QUICKSTART.md](./QUICKSTART.md)                         |
| **Understand the full plan** | [PLAN/INDEX.md](./PLAN/INDEX.md)                         |
| **See ambitious targets**    | [PLAN/AMBITIOUS-SUCCESS.md](./PLAN/AMBITIOUS-SUCCESS.md) |
| **Contribute code**          | [CONTRIBUTING.md](./CONTRIBUTING.md)                     |
| **Read research program**    | [PLAN/ACADEMIC-RESEARCH.md](./PLAN/ACADEMIC-RESEARCH.md) |
| **Track outcomes**           | [PLAN/OUTCOMES-TRACKING.md](./PLAN/OUTCOMES-TRACKING.md) |

---

**SpaceGraphJS — The First Self-Building UI Framework**
