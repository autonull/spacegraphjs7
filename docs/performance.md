# SpaceGraphJS Performance

## Performance Numbers (Measured, Not Estimated)

| Metric | Budget | Measured |
|--------|--------|----------|
| Model build (300 msg / 1201 nodes) | < 50 ms | ~27 ms |
| Full pipeline (5,001 msg / 20,005 nodes) | < 400 ms | 91.5 + 59.8 + 78.7 = 230 ms |
| Force layout (same stream) | — | 8.0 s uncapped; 0.2 s over 60-turn window |
| Lazy SpaceGraphJS chunk (gzip) | < 400 KB | 282 KB (incl. `three`) |

## Folded-vs-Unfolded Dividend

Measured via `packages/session-graph/script/folded-dividend.ts` — node/edge reduction when all groups collapsed at overview band vs execution/detail band:

| Messages | Total Turns | Window Turns | Unfolded Nodes | Folded Nodes | Node Reduction | Edge Reduction |
|----------|-------------|--------------|----------------|--------------|----------------|----------------|
| 102 | 34 | 34 | 138 | 92 | **33.3%** | **54.6%** |
| 1,002 | 334 | 60 | 1,155 | 514 | **55.5%** | **57.4%** |
| 5,001 | 1,667 | 60 | 2,368 | 461 | **80.5%** | **57.4%** |

**Interpretation:** The 60-turn window caps drawn turns; collapsing all groups at overview band hides cluster members. At 5k messages (2368 unfolded → 461 folded), the dividend is 80.5% fewer nodes drawn. Edge reduction stabilizes at ~57% because phase-cluster edges dominate. This is the "fractal dividend" — the graph scales by showing structure, not every node.

## Benchmark Commands

```bash
# Full pipeline benchmark (5,001 messages)
cd packages/session-graph && bun run script/folded-dividend.ts

# Graph scale benchmark
bun run graph:scale

# Strobe benchmarks (app perf)
cd packages/app && bun run perf
```