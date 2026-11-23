# TODO11 — A library developers can build on

Purpose: SpaceGraphJS already has unusually broad mechanisms — three renderers, two framework
bindings, four domain vocabularies, a layout catalogue, a plugin system and a vision loop. What it
does not yet have is a dependable path from "I have data" to "I have an application I can ship and
upgrade". The quickstart contains a broken command (`docs/QUICKSTART.md:28`), the README advertises
Vue bindings that do not exist, the scaffold is undocumented and unreferenced, the public surface has
no enforced stability story, and backend parity is asserted rather than proven in one place. This
plan builds the developer-facing foundations. The vision loop is one track here — a differentiator
that should become a host-callable capability — not the organising goal.

Definition of done for this plan: a developer can go from install to a rendering, accessible,
quality-checked application on a chosen backend without reading host internals; add a new domain as
data; and upgrade without breakage. No default flip or product verdict is claimed.

---

## 0. Baseline (verified)

- **Three entry modes are documented** (`README.md`: full engine, lean `activity` entry, renderer
  contract) with React/Solid bindings, three renderers (SpaceGraph, Cytoscape, SVG) and packaged
  workflow/filesystem/data domains. There is no Vue binding package despite `README.md:31`.
- **Onboarding is not executable.** `docs/QUICKSTART.md:28` says `pnpm create -y`; line 10 says
  "pnpm or pnpm". The scaffold package `create-spacegraph` has a bin but no README, and the quickstart
  never invokes it. `pnpm run test:publish` proves published bytes work, but only for a hand-written
  consumer, not for a documented user journey.
- **Compatibility is reviewed, not enforced.** `docs/api-compatibility-review.md` lists aliases to
  annotate at the next minor; ADR 0013 defines additive versioning; `test/package-exports.test.ts`
  checks the manifest against `LIBRARY_ENTRIES`. Nothing fails on an unannounced removal or tests an
  upgrade from the previous published surface.
- **Parity is scattered.** `packages/adapter/src/conformance.ts` validates adapters;
  `app/demo/tests/{host,second-host,world-host}.test.ts` are host-specific. There is no single suite
  proving that the same model draws correctly across all three renderers and both bindings.
- **Quality mechanisms are host-local.** `src/vision` has analyzers, `createVisionLoop` and a partial
  `VisionAutoFixer`; `src/a11y` has a DOM mirror; RTL and reduced motion are tested in Pi. None of
  this is a single quality floor an application author can opt into.
- **Evidence is split** across `experiments.json`, `reports/*-comparison.json` and `review.json`;
  `EXPERIMENT_TEMPLATES` are inert descriptors; `packages/trace` classifies but does not record.
- Root `check`/`tsc`/`test`, Pi checks, demo specs, `test:demo-atlas` and `test:publish` are green.

---

## 1. Principles

1. **The docs are the interface.** A documented command is a contract: if it appears in a guide, CI
   runs it verbatim against published bytes. Correct claims that the packages cannot support.
2. **Stability is a feature.** The public surface, its aliases and the renderer contract are
   machine-checked, so upgrading is a decision rather than an archaeology exercise.
3. **Versatility is tested, not claimed.** Every backend and binding passes one model-level
   conformance suite; differences are declared capabilities, not surprises.
4. **Extension is data.** A new domain or host is declared and verified through the scaffold, not
   written as a special case in library code.
5. **Quality is opt-in but real.** An application can check accessibility, performance and visual
   quality with one import. Measured defects may be corrected automatically; preferences still
   require a logged human decision under ADR 0008.
6. Human verdicts and study recruitment remain external dependencies. No default flip here.
7. **Verify at the lowest sufficient tier.** The ladder in §4 says which suite a change needs; never
   rerun a release suite to confirm a docs-only fix.
8. **One harness per concern.** Reuse `script/publish-check/pack.ts`, adapter conformance,
   `tests/boot.ts`, the atlas kit and `shot.ts` instead of building parallel scaffolding.

---

## 2. Foundations

| ID  | Foundation                                  | Exit evidence                                                                                     | Priority |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| D1  | Executable onboarding                        | `pnpm run test:quickstart` runs the guide verbatim in a temp consumer; `create-spacegraph` produces a runnable app; broken command fixed; README claims match published packages | critical |
| D2  | Enforced contract stability                  | `pnpm run check:compat` fails on unannounced export removal; alias/deprecation manifest from the compatibility review is machine-readable; upgrade test consumes the previous published surface | critical |
| D3  | Backend and binding parity                   | `pnpm run test:conformance` runs one model-level suite across SpaceGraph, Cytoscape and SVG renderers and React/Solid bindings; capability matrix documents intentional differences | high |
| D4  | Quality floor for applications (vision track) | One import exposes `check(model)` → report, a11y/RTL/reduced-motion assertions and a perf/DOM budget; bounded auto-correction applies only to measured defects and re-verifies; preferences never auto-flip | high |
| D5  | Extension proof                              | A fourth domain and host are added through `create-spacegraph` as data, passing conformance, publish and benchmark gates; recipe written, no library special case | medium |
| D6  | Minimal evidence record                      | One machine-readable experiment record with writer and integrity gate; nine entries migrated; no new published subpath | medium |

D1 and D2 are prerequisites: a library that cannot be started or upgraded is not useful regardless
of its mechanisms. D3 and D4 make it versatile and trustworthy; D5 proves the claim; D6 is process
glue, deliberately small.

---

## 3. Execution

**Cross-cutting process wins — land with Phase 1.** They are small and pay off in every later phase:

- `check:generated`: regenerate the demo registry and library manifest into a temp directory and diff;
  fail on stale generated files. This is the exact drift that cost a manual fix in TODO10.
- `check:paths`: assert every `Shot.file` and every documented screenshot path resolves to a tracked
  file, and that no `.prev` is tracked. Two path migrations in TODO10 were manual; this makes the next
  one mechanical.
- `verify:library`: one command chaining `test:quickstart`, `check:compat`, `test:conformance`,
  `check:generated` and `check:paths`. One gate answers "is the library surface healthy?". Wire it
  into `.github/workflows/ci.yml` as its own job so Tier 1 runs on every pull request, before the
  heavier build and publish jobs.
- Docs command lint: every `pnpm …` in the quickstart and README must exist in a workspace manifest,
  so a guide cannot rot silently.
- Public-surface snapshot: commit a small exported-names JSON as the D2 baseline. The existing
  `test/fixtures/dist` is local-only and untracked, so it cannot serve as a previous published version.
- One change set per phase, one verification run per change set. Record flakes in §6 rather than in
  gate logs; never retry to green.

**Phase 1 — enter and upgrade (M).** D1: fix `QUICKSTART.md` and the README claim, write the scaffold
README, make the guide use `create-spacegraph`, and add `test:quickstart` that executes the commands
in a clean consumer against published bytes — reusing `script/publish-check/pack.ts` rather than a
parallel harness. D2: turn `docs/api-compatibility-review.md` into a manifest with deprecation
metadata, add `check:compat` to root `check`, and add an upgrade test against the last published
surface. Exit: a user can enter and stay current.

**Phase 2 — work everywhere, safely (L).** D3: generalise the adapter conformance fixture into one
suite the three renderers and both bindings run; publish a capability matrix (SVG is static, depth
and emphasis are negotiated). D4: expose the vision/report and a11y/perf checks as a single
host-callable quality floor; finish the bounded auto-correction path and encode the
defect-versus-preference boundary. Stop rules: if a backend cannot meet parity, document the missing
capability rather than special-case it; if a correction cannot be verified to improve the score, do
not apply it.

**Phase 3 — prove generality and close the bookkeeping (M).** D5: add the fourth domain through the
scaffold as data, with conformance, publish and benchmark gates green, and write the recipe. D6:
migrate the nine pending entries into one record with a writer and integrity gate. Exit: versatility
is a demonstrated property and decisions are traceable.

**After this plan — the loop.** Observe (opt-in local traces, still absent), measure (D4), correct
defects (D4), and log preference decisions (D6). That is a consumer of these foundations, not their
purpose. No default flip is scheduled here.

---

## 4. Verification

Run the lowest tier that covers the change. Do not escalate to a higher tier to confirm a lower-tier
fix; that duplication is the main source of wasted verification time in this repo.

| Tier | When | Gates |
| ---- | ---- | ----- |
| 0 | every change | `pnpm check`, affected package tests |
| 1 | docs, API, generated files, config | `pnpm run verify:library` → `test:quickstart`, `check:compat`, `test:conformance`, `check:generated`, `check:paths` |
| 2 | visual or behavioural change | targeted Playwright specs; affected shots via `pnpm --filter pi shot <ids>`; changed compare pairs only |
| 3 | release | `pnpm run verify:visual`, `pnpm run test:demo-atlas`, `pnpm run test:publish` |

`pnpm --filter pi check:fast` and `tests/shell.spec.ts`/`tests/readable.spec.ts`/`tests/study.spec.ts`
are Tier 0/2 companions when flagship behaviour is touched. Use `--workers=1` on constrained hosts.
A green retry is not a gate; record flakes in §6. Each new gate must fail on a deliberately broken
guide, export, backend or path before it is trusted.

---

## 5. Non-goals

No default flip or product verdict; no search for one optimal configuration; no new visual idea
before existing pairs are judged; no renderer branch or second position authority for a visual idea;
no hosted service, realtime transport, workerization, XR/sound/haptics; no second flagship. Traces,
if added later, stay local and opt-in. Vue/Svelte bindings are out of scope — correct the claim
instead of inventing a binding.

---

## 6. Progress (not started)

| Phase | Landed (file:line) | Commands | Gate | Non-goal honored |
| ----- | ------------------ | -------- | ---- | ---------------- |
| 1 | — | — | — | — |
| 2 | — | — | — | — |
| 3 | — | — | — | — |

Fill a row when the phase lands. A human verdict or study result is never recorded as developer work
completed.

---

## 7. Open gates and deferred work

1. **Phases 1–2 (blocking for the definition of done).** Onboarding, compatibility, parity and the
   quality floor must pass before the plan can be called complete.
2. **E3 (next minor).** Apply the `@deprecated` pointers in `docs/api-compatibility-review.md` at the
   minor boundary; keep the aliases until then. D2 makes the manifest ready but does not flip it.
3. **Local trace and replay (deferred).** The loop's observation side; add after D4 proves the
   measurement side is trustworthy.
4. **Human verdicts and recruitment (external).** The nine pending entries and the n ≥ 5 study. No
   default from a screenshot alone.
