# SpaceGraphJS — Strategy Reference

**Phase 1-5 Audits & Analysis**

---

## Phase 1: 6-U Framework SWOT

### VALUE (Economic & Functional ROI)

| Strengths                                      | Weaknesses                         |
| ---------------------------------------------- | ---------------------------------- |
| ✅ 175K LOC synthesized from 5 codebases       | ❌ No clear monetization initially |
| ✅ AI vision: 30min→30sec iteration (98% gain) | ❌ "General-purpose UI" too broad  |
| ✅ MIT license = low adoption friction         | ❌ Value prop buried in spec docs  |
| ✅ 60 FPS at 1000 nodes = measurable ROI       |                                    |

| Opportunities                           | Threats                                     |
| --------------------------------------- | ------------------------------------------- |
| 🚀 Position as "AI-native UI framework" | ⚠️ Competing with React Flow, Cytoscape, D3 |
| 🚀 Hardware revenue path                | ⚠️ MIT allows proprietary forks             |
| 🚀 Vision system as B2B product         | ⚠️ "General-purpose" = slow sales cycle     |

---

### USEFULNESS (Reliability, Features, Problem-Solution Fit)

| Strengths                                             | Weaknesses                                   |
| ----------------------------------------------------- | -------------------------------------------- |
| ✅ 18 node types, 8 edge types, 16 layouts            | ❌ No single "killer feature"                |
| ✅ Verlet physics, post-processing = production-ready | ❌ Feature union = potential bloat           |
| ✅ Automated visual regression = high reliability     | ❌ Incomplete docs = features undiscoverable |

---

### USABILITY (UX for End-Users, DX for Contributors)

| Strengths                                         | Weaknesses                          |
| ------------------------------------------------- | ----------------------------------- |
| ✅ TypeScript = better DX than JavaScript         | ❌ **Rating: 5/10**—Incomplete docs |
| ✅ SolidJS reactive state = modern DX             | ❌ No Time-to-Hello-World benchmark |
| ✅ Static factory pattern (`SpaceGraph.create()`) | ❌ No one-click demo                |
| ✅ Playwright visual verification                 | ❌ No onboarding checklist          |

---

### UBIQUITY (Platform Availability, Integrations, Distribution)

| Strengths                                    | Weaknesses                  |
| -------------------------------------------- | --------------------------- |
| ✅ Web-first (Three.js) = runs everywhere    | ❌ No npm package initially |
| ✅ Vite build = modern bundler compatibility | ❌ No CDN distribution      |
| ✅ Plugin architecture = extensible          | ❌ No integrations roadmap  |

---

### EXPOSURE (Visibility, SEO, Community, Marketing)

| Strengths                                 | Weaknesses                     |
| ----------------------------------------- | ------------------------------ |
| ✅ GitHub presence (4 repos)              | ❌ No Product Hunt launch plan |
| ✅ Technical depth = content potential    | ❌ No blog, tutorials, YouTube |
| ✅ AI vision angle = compelling narrative | ❌ No Matrix/Discord community |

---

### REMARKABILITY (Unique Hook, Worth Talking About)

| Strengths                                         | Weaknesses                                  |
| ------------------------------------------------- | ------------------------------------------- |
| ✅ **Vision-Closed Development** = industry-first | ❌ Buried in spec docs                      |
| ✅ 6 AI vision models                             | ❌ No demo video showing AI self-correcting |
| ✅ Self-building UI library = category creation   | ❌ "General-purpose UI" is forgettable      |

---

## Phase 2: Usability Strategy

### Time-to-Hello-World

**Target:** <5 minutes

**Current Path:**

1. Clone repo
2. ??? (no install instructions)
3. ??? (no build command)
4. ??? (no demo to run)
5. Read 1500-line spec

**Target Path:**

```bash
npm install spacegraphjs three
# Open browser, see graph
```

### Friction Log

| #      | Friction               | Severity    | Fix                 |
| ------ | ---------------------- | ----------- | ------------------- |
| F1     | No npm package         | 🔴 Critical | Publish alpha       |
| F2     | No quickstart          | 🔴 Critical | Write QUICKSTART.md |
| F3     | No live demo           | 🔴 Critical | Create CodeSandbox  |
| F4     | Vision not in workflow | 🔴 Critical | Vite plugin         |
| F5-F10 | Various                | 🟡🟢 Medium | Defer to Month 2    |

---

## Phase 3: Distribution Strategy

### Integration Priority

| Tier         | Integration            | When                |
| ------------ | ---------------------- | ------------------- |
| **P0**       | npm                    | Week 1              |
| **P0**       | Vite Plugin (Vision)   | Week 1              |
| **P1**       | TypeDoc                | Week 2              |
| **P1**       | Vitest Assertions      | Week 2              |
| **P1**       | Matrix/Element         | Week 2              |
| **P2**       | Open VSX               | Week 3-4 (optional) |
| **Deferred** | IPFS, CDN, Docker, Nix | Indefinitely        |

**Excluded (Proprietary Silos):**

- ❌ Vercel, Netlify
- ❌ CodeSandbox, StackBlitz
- ❌ GitHub Marketplace
- ❌ MS VSCode Marketplace

---

## Phase 4: Exposure Strategy

### Content Pillars

| Pillar                   | Format                       | Frequency    |
| ------------------------ | ---------------------------- | ------------ |
| **Technical Deep Dives** | Long-form blog (2000+ words) | 2x/month     |
| **Vision System Demos**  | Short video (2-5 min)        | 1x/month     |
| **Example Gallery**      | Interactive demos            | 10 at launch |
| **Release Notes**        | Changelog posts              | Per release  |
| **Community Showcase**   | User project highlights      | 1x/month     |

### 90-Day GTM Calendar

| Week          | Milestone       | Success Metric                      |
| ------------- | --------------- | ----------------------------------- |
| **Week 1**    | npm Launch      | 100 downloads, 10 Matrix            |
| **Week 2**    | Content Launch  | 500 article views, 5 stars          |
| **Week 3**    | Vision Demo     | 100 video views, 3 PRs              |
| **Week 4**    | Example Gallery | 20 demo forks, 1 community demo     |
| **Week 5-12** | Growth          | 5K downloads, 100 stars, 200 Matrix |

---

## Phase 5: Sustainability Strategy

### Licensing (Pure FOSS)

| Component            | License                    |
| -------------------- | -------------------------- |
| **Core Library**     | MIT                        |
| **Vision System**    | MIT                        |
| **Model Weights**    | CC-BY-4.0                  |
| **Plugins**          | MIT                        |
| **SpaceGraphOS**     | AGPL v3                    |
| **Hardware Designs** | CERN OHL v2 / CC-BY-SA 4.0 |
| **Documentation**    | CC-BY-SA 4.0               |

**No dual-licensing. No enterprise tiers. No restrictions.**

---

### Revenue Model (Value-Add, Not Restriction)

| Stream     | Month 6    | Month 12 | Month 36  |
| ---------- | ---------- | -------- | --------- |
| Hardware   | $5K        | $20K     | $60K      |
| Training   | $3K        | $10K     | $25K      |
| Consulting | $2K        | $8K      | $10K      |
| Donations  | $500       | $2K      | $3K       |
| Grants     | $0         | $5K      | $2K       |
| **Total**  | **$10.5K** | **$45K** | **$100K** |

---

### Governance Roadmap

| Phase       | Timeline    | Structure                      |
| ----------- | ----------- | ------------------------------ |
| **Phase 1** | Months 1-6  | Benevolent Dictator (founder)  |
| **Phase 2** | Months 6-12 | Core Team (3-5 maintainers)    |
| **Phase 3** | Year 2+     | Foundation (community-elected) |

**No corporate sponsors on the board.**

---

## Plan Analysis

### Time Allocation

| Phase            | Optimistic   | Realistic    | Conservative |
| ---------------- | ------------ | ------------ | ------------ |
| Week 1 (Build)   | 20 hours     | 30 hours     | 40 hours     |
| Week 2 (Polish)  | 10 hours     | 20 hours     | 30 hours     |
| Launch (Phase B) | 12 hours     | 16 hours     | 24 hours     |
| **TOTAL**        | **42 hours** | **66 hours** | **94 hours** |

**In calendar days (part-time, 4h/day):** 11-24 days

---

### Success Factor Coverage

| Factor                      | Weight | Coverage                   |
| --------------------------- | ------ | -------------------------- |
| **F1: Working Code**        | 40%    | ✅ Days 2-7, 11-12         |
| **F2: Easy Installation**   | 20%    | ✅ Days 1, 11-12           |
| **F3: Clear Documentation** | 15%    | ✅ Days 13-14              |
| **F4: Visible Progress**    | 15%    | ✅ Status overlay, logging |
| **F5: Community Presence**  | 10%    | ✅ Phase B                 |

**Total:** 100% coverage

---

### What Was Removed (Optimization)

| Component          | Original Time | Why Removed                    |
| ------------------ | ------------- | ------------------------------ |
| Vite Vision Plugin | 8h            | Doesn't affect F1-F5 for alpha |
| Content Calendar   | 6h            | No audience yet                |
| CI/CD Workflows    | 2h            | Manual tests work              |
| TypeDoc            | 2h            | JSDoc sufficient               |
| Release Checklist  | 1h            | Overkill for alpha             |
| CONTRIBUTING.md    | 2h            | No contributors until adoption |
| GitHub Actions     | 3h            | Doesn't affect working code    |

**Total Saved:** 24 hours → Reallocated to build quality

---

## Summary

| Dimension              | Status                                              |
| ---------------------- | --------------------------------------------------- |
| **6-U SWOT**           | ✅ Complete                                         |
| **Usability Strategy** | ✅ TTHW <5 min                                      |
| **Distribution**       | ✅ Open-only, P0/P1 prioritized                     |
| **Exposure**           | ✅ 90-day GTM calendar                              |
| **Sustainability**     | ✅ Pure FOSS, 5 revenue streams                     |
| **Plan Analysis**      | ✅ 66 hours realistic, 100% success factor coverage |

---

**Strategy complete. Ready to execute.** 🚀
