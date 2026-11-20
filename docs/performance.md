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
