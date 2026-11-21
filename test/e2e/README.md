# Demo Integration Tests

This directory contains automated tests for all demos to ensure system integrity.

## Test Types

### 1. Error Detection (`demo-errors.spec.ts`)

- Automatically discovers all demos
- Loads each demo
- Monitors console for errors
- Fails if any console errors detected
- Catches issues BEFORE manual testing

### 2. Screenshots & Verification (`demo-screenshots.spec.ts`)

- Takes screenshot of each demo
- Verifies page loaded correctly
- Checks for console errors
- Stores screenshots in `screenshots/`
- Visual regression testing ready

## Interaction atlas (`interaction-atlas.spec.ts`)

One fast, headless run drives every explorer control axis through `window.__explorer` and writes
labelled key-point frames plus `atlas.json` (state, node counts, hashes, duplicates, notes) to
`docs/screenshots/atlas/`. The capture layer lives in `atlas-kit.ts`; a shot is pure data (`set` values,
presets, comparison, theme, selection, timed captures). Shape shots are derived from the declared
`shape` axis at boot — `by-kind` renders several shapes in one graph, and diamond/hexagon/pill/
triangle/star use the SVG renderer's `data.visualShape` channel. No browser rebuild, no fixed
sleeps, one reused page (~16s).

```bash
pnpm run test:atlas                        # curated key-point atlas (40 frames)
SG_ATLAS_DIR=/tmp/atlas pnpm run test:atlas # choose the output directory
SG_ATLAS_FULL=1 pnpm run test:atlas         # add the per-axis sweep and WebGL showcase
```

Both the sweep and the shape shots derive values from the declared `[data-axis][data-value]`
controls, so they track new axes without test edits. `sweep.json` reports `noOp` frames identical
to the baseline; `showcase/` captures the WebGL `node-shape`, `node-group` and
`system-architecture` demos (the eight meshes behind the contract's box/circle mapping).

## Inner-node layouts (`inner-layout.spec.ts`)

`pnpm run test:inner-layout` drives the `inner-layout` showcase demo, whose `GroupNode` container
holds nine children declaring `data.parent`. It switches grid/column/row modes through
`window.__innerLayoutDemo`, asserts the child-position signatures (columns × rows) are distinct,
and captures one frame per mode plus a report in `docs/screenshots/inner-layout/index.html`.

```bash
pnpm run test:inner-layout
SG_INNER_LAYOUT_DIR=/tmp/inner pnpm run test:inner-layout
```

## Full-scope demo atlas (`demo-atlas.spec.ts`)

`pnpm run test:demo-atlas` discovers every demo from `app/demo/src/registry.ts` — 37 standalone HTML
pages under `app/demo/html/<category>/`, 43 showcase modules under `app/demo/demos/<category>/` and
all 19 `window.__demo` capabilities — captures 99 frames and writes a self-contained browsable
report to `docs/screenshots/demo-atlas/index.html`. Each card shows the frame, its registry category,
pass/fail, evidence lines and console errors. Failures are recorded per card, not fatal.

```bash
pnpm run test:demo-atlas                          # all 99 frames (~2.2 min)
SG_DEMO_ATLAS_FILTER=mermaid pnpm run test:demo-atlas # iterate on one surface
SG_DEMO_ATLAS_DIR=/tmp/demo-atlas pnpm run test:demo-atlas
```

Both screenshot specs and `demo-errors.spec.ts` now import the same registry, so adding a demo to a
category folder automatically adds it to every test and to the report. Regenerate the registry with
`pnpm exec tsx script/generate-demo-registry.ts` after adding or recategorizing a demo. The older
`demo-verification.spec.ts` and five overlapping `verification/capture_*.ts` scripts were retired;
`pnpm run verify` now uses the single parameterized `verification/capture.ts`.

## Further development

Run the whole visual gate with `pnpm run verify:visual`. Each suite writes under `docs/screenshots/`,
outside Playwright's `test-results/` output directory, so reports survive later runs.

To add a demo:

1. Put the module in `app/demo/demos/<category>/` or the page in `app/demo/html/<category>/`.
2. Run `pnpm run generate:registry` — every test and the report discover demos from the registry.
3. Add a named export to `app/demo/demos/index.ts` for module demos.
4. Run `pnpm run verify:visual`, then open `docs/screenshots/demo-atlas/index.html`.

`SG_DEMO_ATLAS_FILTER=<name>` limits the atlas to one demo while iterating.

## Usage

```bash
# Run error detection on all demos
pnpm run test:demo-errors

# Take screenshots and verify all demos
pnpm run test:screenshots

# Run both
pnpm run test:all-demos
```

## Output

- **Screenshots**: `screenshots/verified-{name}.png` (generated, gitignored — not committed)
- **Curated gallery**: `docs/screenshots/` (tracked; includes the Pi flagship captures)
- **Error Reports**: Console output with detailed error messages
- **CI/CD**: Tests run automatically on PR checks

## Benefits

✅ **Zero Silent Failures**: All console errors caught automatically
✅ **Visual Verification**: Screenshots confirm correct rendering
✅ **Pre-commit Safety**: Run before committing
✅ **CI/CD Integration**: Automated testing on every push
✅ **Regression Detection**: Catch breaking changes early

## Demo Coverage

Driven by `app/demo/src/registry.ts`:

- **37 HTML demos** in `app/demo/html/{core,interaction,layout,rendering,plugins,smoke}/`
- **43 showcase modules** in `app/demo/demos/{core,interaction,layout,rendering,plugins,smoke}/`
- **19 host capabilities** in `app/demo/src/gallery.ts`, run through `window.__demo`

**Total: 99 demo surfaces automatically tested.** `smoke` demos (empty, single-node, debug,
verification*, hardening, benchmark, …) are grouped separately from capability demos.
