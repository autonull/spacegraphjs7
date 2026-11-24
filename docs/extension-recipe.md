# Extension recipe — a new domain and host as data

A fourth domain needs no library change. The workflow, filesystem, data and agent packages all use
the same `defineDomain` contract (`packages/kernel/src/domain.ts`) and the same generated layout.
`create-spacegraph-domain` produces that layout:

```bash
pnpm dlx create-spacegraph-domain ticket
```

The generator writes a domain package (`src/vocabulary.ts`, `mapping.ts`, `selectors.ts`, `facets.ts`,
`fixture.ts`, `conformance.test.ts`) and a host (`package.json`, `index.html`, `src/main.ts`,
`src/spine.ts`, `scripts/verify.ts`, `tests/spine.test.ts`, `tests/vision.spec.ts`). The domain is data:
fill the six vocabulary slots and the fixture; do not add a branch to the renderer, adapter or core.

Where the four existing domains prove the recipe:

| Domain      | Declaration                                      | Conformance gate                                      |
| ----------- | ------------------------------------------------ | ----------------------------------------------------- |
| workflow    | `packages/domain/workflow/src/vocabulary.ts:78`   | `packages/domain/workflow/src/conformance.test.ts`    |
| filesystem  | `packages/domain/filesystem/src/vocabulary.ts:94` | `packages/domain/filesystem/src/conformance.test.ts`  |
| data        | `packages/domain/data/src/vocabulary.ts:74`       | `packages/domain/data/src/conformance.test.ts`        |
| agent       | `packages/domain/agent/src/vocabulary.ts:91`      | `packages/domain/agent/src/agent.test.ts`             |

Gates before a new domain is considered shipped:

1. `pnpm run test:conformance` — the model-level suite keeps node and edge identity on every backend.
2. `pnpm run test:publish` — the domain is packed and imported from published bytes (agent is in the
   pack list alongside the original three).
3. `pnpm run test:demo-atlas` — the shared demo registry captures visual baselines.
4. `pnpm run test:extension` — the generated host maps 1,000 generated nodes within its own benchmark budget, alongside the domain's conformance suite and the one-way dependency guard. The generated host is the benchmark subject; the shared registry is not involved.

No renderer branch, no second position authority and no new published subpath are part of this recipe.
