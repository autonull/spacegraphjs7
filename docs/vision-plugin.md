# Vision Plugin

The Vite plugin integrates AI vision analysis into your build process. SpaceGraphJS enables true Vision-Closed Development: the compiler renders your user interface headless, processes it through ONNX neural networks, and generates a visual quality report at build-time.

## Installation

```bash
pnpm install spacegraphjs
```

## Configuration

Import the plugin in your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
    plugins: [
        spacegraphVision({
            enabled: true,
            autoFix: true, // Generate a JSON patch of suggested fixes
            thresholds: {
                layout: 80,
                legibility: 85,
            },
        }),
    ],
});
```

## Options

| Option                | Type    | Default | Description              |
| --------------------- | ------- | ------- | ------------------------ |
| `enabled`             | boolean | `true`  | Enable or disable the build-time vision analysis. |
| `autoFix`             | boolean | `false` | If true, the plugin will generate a `spacegraph-autofix-patch.json` file in your root directory containing semantic JSON patches to fix detected visual errors. |
| `thresholds.layout`   | number  | 80      | Minimum acceptable layout score (0-100). Build will warn if below this. |
| `thresholds.legibility`| number  | 85      | Minimum acceptable legibility score (0-100). Checks WCAG AA contrast. |

## How It Works

1. **Build Hook**: The Vite plugin hooks into the `closeBundle` lifecycle event.
2. **Headless Render**: It scans the `dist/` directory for HTML files and launches a headless Playwright instance.
3. **In-Browser Analysis**: It runs the compiled SpaceGraph instances inside the browser context.
4. **ONNX Evaluation**: Graph nodes are evaluated against six localized ONNX models (Layout Quality, Text Legibility, Color Harmony, Overlap Detection, Visual Hierarchy, Ergonomics Constraint).
5. **Reporting**: The final report dictates if the UI build passes visual quality checks.

## Troubleshooting

### Playwright Required
Because the analyzer requires a browser to realistically render the HTML context, ensure you have Playwright browsers installed:

```bash
pnpm dlx playwright install
```

### Path Errors
If the plugin cannot locate your built HTML files, verify your build output is mapping correctly to the expected directory (`dist/` by default).

### CI Workflows
We recommend generating the autofix patch sequentially via a CI hook and storing it as a build artifact for manual review, rather than mutating production databases automatically.
