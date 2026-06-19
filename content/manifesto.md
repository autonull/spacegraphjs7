# Stop Describing UIs to AI. Start Specifying Them.

## The Broken Loop

We've all lived it:

1. Describe what you want to AI
2. AI generates code
3. You run it — it's wrong
4. You describe what's wrong
5. AI guesses again
6. Repeat 10-20 times

30 minutes per iteration. Exhausting. Imprecise.

## The Insight

What if AI could see what it builds?

Not just parse the code. See the actual output.
Measure quality. Detect issues. Self-correct.

## Vision-Closed Development

SpaceGraphJS embeds AI vision at every layer:

- LQ-Net evaluates layout quality
- TLA ensures text is legible
- ODN detects overlapping elements
- CHE analyzes color harmony
- VHS scores visual hierarchy
- EQA assesses interaction ergonomics

Result: 30-second iterations. 98% faster.

## The Architecture

SpaceGraphJS is built on a high-performance WebGL and CSS3D rendering engine utilizing Three.js. It integrates a local headless browser during the build process to evaluate actual rendered output visually. Overlaps, legibility, and layouts are corrected using force-directed physics layouts, automatically adapting before final build generation.

## Try It

```bash
pnpm install spacegraphjs@alpha
```

[See the Quickstart Guide](../QUICKSTART.md)

## Join Us

We're building a world where interfaces are visible, comprehensible, and alive.

- GitHub: https://github.com/autonull/spacegraphjs
- Matrix: https://matrix.to/#/#spacegraphjs:matrix.org
