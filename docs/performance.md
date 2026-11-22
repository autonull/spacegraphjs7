# SpaceGraphJS Performance

## Performance Numbers (Measured, Not Estimated)

| Metric                                   | Budget   | Measured                                  |
| ---------------------------------------- | -------- | ----------------------------------------- |
| Model build (300 msg / 1201 nodes)       | < 50 ms  | ~27 ms                                    |
| Full pipeline (5,001 msg / 20,005 nodes) | < 400 ms | 91.5 + 59.8 + 78.7 = 230 ms               |
| Force layout (same stream)               | —        | 8.0 s uncapped; 0.2 s over 60-turn window |
| Lazy SpaceGraphJS chunk (gzip)           | < 400 KB | 282 KB (incl. `three`)                    |

## Folded-vs-Unfolded Dividend

Historical measurement — node/edge reduction when all groups are collapsed at the overview band versus the execution/detail band. The current scale harness is the flagship one (`pnpm --filter pi scale`):

| Messages | Total Turns | Window Turns | Unfolded Nodes | Folded Nodes | Node Reduction | Edge Reduction |
| -------- | ----------- | ------------ | -------------- | ------------ | -------------- | -------------- |
| 102      | 34          | 34           | 138            | 92           | **33.3%**      | **54.6%**      |
| 1,002    | 334         | 60           | 1,155          | 514          | **55.5%**      | **57.4%**      |
| 5,001    | 1,667       | 60           | 2,368          | 461          | **80.5%**      | **57.4%**      |

**Interpretation:** The 60-turn window caps drawn turns; collapsing all groups at overview band hides cluster members. At 5k messages (2368 unfolded → 461 folded), the dividend is 80.5% fewer nodes drawn. Edge reduction stabilizes at ~57% because phase-cluster edges dominate. This is the "fractal dividend" — the graph scales by showing structure, not every node.

## Benchmark Commands

```bash
# Full pipeline, windowed layout, permalink and zoom-ladder budgets (300 / 5,001 messages)
pnpm --filter pi scale

# Unit and boundary suites
pnpm test
pnpm run test:boundaries
```

Legacy commands (`packages/session-graph`, `graph:scale`, `packages/app perf`) no longer exist in
this repository.

## Flagship visual language — frame-time evidence (2026-11-22)

Baseline after commit `8fcbf0c` (registered `FluxEdge`, field halos, grid-packed scopes). Commands
were run on 2026-11-22 from the repository root unless noted:

- `pnpm run check` — green (31 workspace typechecks).
- `cd app/pi && pnpm run verify:fast` — green: 140 unit tests, 16 Chrome e2e (`shell`, `orchestration`).
- `cd app/pi && pnpm run scale` — green: `playSession120Bodies: { "ms": 0.822, "settled": true }`.
  This is the play-frame number produced by the Node-side scope-simulation harness
  (`app/pi/scripts/scale.ts:83`); budget < 8 ms, met.
- The full suites were **not re-run** here: e2e 104/104, `verify:visual` 21/21 and `shots:all` 23/23
  were green immediately before `8fcbf0c`; that result is the recorded baseline, not a new claim.
- `strobe status` — CachyOS, Ryzen 7 2700, Chrome 157, **no `DISPLAY`/`WAYLAND_DISPLAY`**,
  `SCHED_IDLE` priority, SwiftShader software GPU.
- `strobe record 'http://localhost:5175/?shot=cockpit' --probes timing --for 8s --json` — refused
  `NoPresentSource` (a headed page needs a display).
- `strobe record 'http://localhost:5175/?shot=cockpit' --probes timing --for 8s --headless --json`
  → `rec_04babf`; `strobe query rec_04babf summary --json`. All presented-frame metrics were refused:
  `frames_refused: Headless: the page ran headless, so nothing it drew reached a display`. Recorded
  values: `main.busy 22.45%`, `main.paint 19.36 ms`, 16 long tasks over 8 s. No presented-frame p95
  is measurable on this host.
- Fallback real-browser rAF measurement: `cd app/pi && node /tmp/opencode/frame-measure.mjs`
  (temporary Playwright script, not tracked). It boots `http://localhost:5175/?shot=cockpit` with
  `PI_LOCAL_FEED=1`, waits for `window.__pi.ready` and a settled simulation, calls `__pi.loadFixture()`,
  and samples `requestAnimationFrame` timestamps for 1.2 s at rest and during
  `__pi.traverseEdge(__pi.edges()[0].id)`. Run twice, identical results:

  | Sample | Frames | Median ms | p95 ms | Max ms |
  | ------ | ------ | --------- | ------ | ------ |
  | At rest (`?shot=cockpit`) | 71 | 16.7 | 16.7 | 33.3 |
  | Camera flight (same route) | 18 | 66.7 | **99.9** | 99.9 |

  No page errors in either run.

### Verdict

| Metric | Budget | Measured | Result |
| ------ | ------ | -------- | ------ |
| Play frame (`scale`, Node simulation) | < 8 ms | 0.822 ms, settled | met |
| Browser rAF p95 during a flight | < 80 ms | 99.9 ms (headless Chromium, software GPU) | **missed** |
| Browser rAF p95 at rest | — | 16.7 ms | — |

The flight budget is missed. Likely host-side cause: `renderField()` (`app/pi/src/host.ts:1002`)
writes `data-kind`, `--field-kind`, `--field-size` and a transform for every visible node on each
paint, while the flux geometry buffers update on the same frames; the headless SwiftShader and
`SCHED_IDLE` environment amplifies that cost. Per TODO6 Phase 1.3 this is recorded as evidence only —
no code was changed. A display-backed GPU run is needed before attributing the 99.9 ms to the field
layer alone.

### Post-audit comparison (2026-11-22, after the four accepted TODO6 fixes)

Same host and commands as the baseline; the fixes changed CSS tokens, label typography and lens
placement, none of which are on the Node-side simulation path.

| Metric | Baseline | After fixes | Budget | Result |
| ------ | -------- | ----------- | ------ | ------ |
| Play frame (`scale`, Node simulation) | 0.822 ms | 1.177 ms | < 8 ms | met |
| 60-turn force layout (`scale`, isolated run) | ~200 ms | 1476 ms | < 1500 ms | met, tight |
| Browser rAF p95 at rest | 16.7 ms | 16.7 ms | — | unchanged |
| Browser rAF p95 during a flight | 99.9 ms | 99.9 ms | < 80 ms (gate 120) | still missed |

The rAF result is identical, so the audit fixes neither regressed nor improved flight cost. The
99.9 ms remains a headless SwiftShader / `SCHED_IDLE` measurement; a display-backed GPU run is still
needed before attributing it to `renderField()`.

`scale` is CPU-sensitive: runs while the Vite/op dev servers were alive reported 1519 ms and 1880 ms
and failed the 1500 ms budget; the run with those servers stopped passed at 1476 ms. CI runs `scale`
in an isolated job, as the harness comment requires.

Second follow-up (2026-11-22, scope tint + narrow HUD + chip names): `pnpm run scale` reported
`playSession120Bodies: 0.742 ms` with all budgets met. The rAF measurement was not repeated: these
changes affect edge color data, CSS and lens markup, not `renderField()` or the camera loop, so the
99.9 ms flight figure above remains the latest recorded browser measurement.

Verification note: the full Playwright suite was run with `--workers=2` because the host had ~2 GB
free RAM during the first attempt and fully parallel Chromium workers crashed with `Target crashed`
(16 failures, all crash-related). With two workers all 105 tests passed (2 flaky, green on retry);
`verify:visual` passed 21/21 separately. No crash was reproducible as an application error.
