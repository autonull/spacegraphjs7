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
- Stores screenshots in `test/screenshots/`
- Visual regression testing ready

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

- **Screenshots**: `test/screenshots/{type}-{name}.png`
- **Error Reports**: Console output with detailed error messages
- **CI/CD**: Tests run automatically on PR checks

## Benefits

✅ **Zero Silent Failures**: All console errors caught automatically
✅ **Visual Verification**: Screenshots confirm correct rendering
✅ **Pre-commit Safety**: Run before committing
✅ **CI/CD Integration**: Automated testing on every push
✅ **Regression Detection**: Catch breaking changes early

## Demo Coverage

- **17 HTML Demos**: debug, empty, fractal, html, instanced, interaction, interaction-meta, large, layouts, n8n-workflow, plugins, quickstart, single-node, test-direct, verification-fixed, verification, working-test
- **8 TypeScript Demos**: activity, basic, edges, fingering, fractal, html-node, interactive, layout

**Total: 25 demos automatically tested**
