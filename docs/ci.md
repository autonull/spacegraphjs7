# SpaceGraphJS CI Pipeline

The canonical verification gate for SpaceGraphJS is `pnpm vitest run` (all packages) plus the contract conformance suite.

## Test Commands

```bash
# All packages
cd spacegraphjs && pnpm vitest run

# Contract conformance (shared renderer contract)
cd spacegraphjs && pnpm vitest run packages/renderer/test/contract.test.ts

# Package boundaries (no core → contract/Cytoscape imports)
cd spacegraphjs && pnpm vitest run packages/renderer/test/boundaries.test.ts

# View controller + framework bindings
cd spacegraphjs && pnpm vitest run packages/control/test/

# Overlay core
cd spacegraphjs && pnpm vitest run packages/overlays/test/

# Navigation core
cd spacegraphjs && pnpm vitest run packages/navigation/test/

# Second host (framework-free)
cd spacegraphjs && pnpm vitest run test/second-host/

# Contract package
cd spacegraphjs && pnpm vitest run packages/renderer/

# Model adapter
cd spacegraphjs && pnpm vitest run packages/adapter/

# Adapter performance budget
cd spacegraphjs && pnpm vitest run packages/adapter/test/performance.test.ts

# SpaceGraph adapter
cd spacegraphjs && pnpm vitest run packages/spacegraph-renderer/

# SVG renderer
cd spacegraphjs && pnpm vitest run packages/svg-renderer/

# Boundary tests (enforce dependency rules)
cd spacegraphjs && bun run test:boundaries
```

## Full Fork Gate (`graph:verify`)

The fork's `bun run graph:verify` includes all SpaceGraphJS tests plus OpenCode integration tests:

1. Library build — `spacegraphjs` builds all packages (types + dist)
2. Contract conformance — shared renderer contract suite against both adapters
3. Package boundaries — no core → contract/Cytoscape imports
4. View controller + framework bindings — React/Solid bindings
5. Overlay core — scope, focus, diff
6. Navigation core — search, minimap
7. Second host — framework-free host outside OpenCode
8. Contract package — `@spacegraphjs/renderer` unit tests
9. Model adapter — `@spacegraphjs/adapter` tests
10. Adapter performance budget — `@spacegraphjs/adapter` performance tests
11. SpaceGraph adapter — `@spacegraphjs/spacegraph-renderer` tests
12. SVG renderer — `@spacegraphjs/svg-renderer` tests
13. session-graph unit tests
14. session-ui graph unit tests
15. session-graph component contract (Storybook-backed Playwright)
16. App e2e graph (Playwright)
17. Graph capture verify (pixel-diff, advisory)
18. Published packages — clean consumer check (`test:publish`)
19. Bundle size measurement
20. Documentation truth check

## CI Pin

The GitHub Actions workflow (`.github/workflows/graph.yml`) reads the SpaceGraphJS gitlink (`git ls-tree HEAD spacegraphjs`) at runtime. This ensures reproducible builds without hardcoded SHAs.