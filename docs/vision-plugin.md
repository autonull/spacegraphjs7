# Vision Plugin

The Vite plugin integrates AI vision analysis into your build process.

## Installation

```bash
npm install spacegraphjs
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
    plugins: [
        spacegraphVision({
            enabled: true,
            autoFix: true,
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
| enabled               | boolean | true    | Enable/disable analysis  |
| autoFix               | boolean | false   | Auto-fix issues          |
| thresholds.layout     | number  | 80      | Minimum layout score     |
| thresholds.legibility | number  | 85      | Minimum legibility score |

## Troubleshooting

- **Vision plugin not working**: Ensure `enabled: true` in your configuration.
- **Reports missing**: Check the build output terminal for vision reports. Ensure thresholds are reasonable (0-100).
