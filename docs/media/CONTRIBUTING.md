# Contributing to SpaceGraphJS

**Welcome! We're building the first self-building UI framework together.**

---

## Quick Start

```bash
# 1. Fork the repo
# https://github.com/autonull/spacegraphjs/fork

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/spacegraphjs
cd spacegraphjs

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev

# 5. Make changes, then test
npm test

# 6. Run vision checks
npm run vision

# 7. Submit PR
```

---

## Where to Start

### 🟢 Good First Issues

Issues labeled [`good first issue`](https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are perfect for newcomers.

**Current examples:**

- Add example demo for HtmlNode
- Write TypeDoc comments for NodePlugin
- Fix typo in QUICKSTART.md
- Add unit tests for Edge types

### 🟡 Help Wanted

Issues labeled [`help wanted`](https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) need community assistance.

### 🔴 High Priority

Issues labeled [`priority`](https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22priority%22) are blocking progress.

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-123
```

**Branch naming:**

- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `test/` for test additions
- `refactor/` for code improvements

### 2. Make Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation as needed
- Run linter: `npm run lint`

### 3. Run Tests

```bash
# Unit tests
npm test

# Test coverage
npm run test:coverage

# Vision tests
npm run test:vision

# All checks
npm run lint
npm run format:check
npm test
```

### 4. Run Vision Analysis

```bash
# Check vision quality
npm run vision

# Auto-fix issues
npm run vision:fix
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add HtmlNode example demo

- Create examples/html-nodes/index.html
- Add README with usage instructions
- Include screenshot in docs

Closes #42"
```

**Commit message format:**

```
feat: add new feature
fix: fix bug in X
docs: update documentation
test: add tests for Y
refactor: improve Z performance
```

### 6. Submit PR

1. Push to your fork: `git push origin feature/your-feature`
2. Open PR on GitHub
3. Fill in PR template
4. Wait for review

---

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types on public APIs
- JSDoc comments on all public functions

```typescript
/**
 * Create a new node in the graph.
 * @param config - Node configuration
 * @returns The created node instance
 */
export function createNode(config: NodeConfig): Node {
    // Implementation
}
```

### Prettier

Auto-formatting is enforced. Run before committing:

```bash
npm run format
```

### ESLint

Linting is enforced in CI:

```bash
npm run lint
```

---

## Testing

### Unit Tests

```typescript
// tests/node.test.ts
import { describe, it, expect } from 'vitest';
import { createNode } from '../src/node';

describe('createNode', () => {
    it('creates a ShapeNode by default', () => {
        const node = createNode({ id: 'test', label: 'Test' });
        expect(node.type).toBe('ShapeNode');
    });

    it('creates nodes with correct position', () => {
        const node = createNode({
            id: 'test',
            position: [100, 200, 0],
        });
        expect(node.position).toEqual([100, 200, 0]);
    });
});
```

### Vision Tests

```typescript
// tests/vision/overlap.test.ts
import { describe, it, expect } from 'vitest';
import { visionAssert } from '../src/vision/test';

describe('Overlap Detection', () => {
    it('detects overlapping nodes', async () => {
        const graph = createTestGraph({
            nodes: [
                { id: 'a', position: [0, 0, 0] },
                { id: 'b', position: [5, 0, 0] }, // Overlaps with 'a'
            ],
        });

        const report = await visionAssert.analyze(graph);
        expect(report.overlaps).toHaveLength(1);
    });
});
```

### Visual Regression Tests

```typescript
// tests/e2e/basic-graph.test.ts
import { test, expect } from '@playwright/test';

test('renders basic graph', async ({ page }) => {
    await page.goto('http://localhost:5173/examples/basic');

    // Wait for canvas
    await page.waitForSelector('canvas');

    // Take screenshot
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot('basic-graph.png');
});
```

---

## Documentation

### TypeDoc Comments

All public APIs must have TypeDoc comments:

````typescript
/**
 * SpaceGraph main class.
 *
 * @example
 * ```typescript
 * const graph = SpaceGraph.create('#container', {
 *   nodes: [{ id: 'a', type: 'ShapeNode' }],
 *   edges: []
 * });
 * graph.render();
 * ```
 */
export class SpaceGraph {
    /**
     * Create a new SpaceGraph instance.
     * @param container - Container element or selector
     * @param spec - Graph specification
     * @returns SpaceGraph instance
     */
    static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph {
        // Implementation
    }
}
````

### README Updates

Update README.md when:

- Adding new features
- Changing APIs
- Adding examples

### QUICKSTART.md

Keep quickstart under 10 minutes. Test regularly.

---

## Vision Model Contributions

Contributing to vision models requires ML background.

### Getting Started

1. Read `docs/vision-models.md` for architecture overview
2. Review training data format in `vision/data/`
3. Set up local training environment (see `vision/README.md`)

### Adding New Checks

```typescript
// vision/checks/new-check.ts
import { VisionCheck } from './types';

export const newCheck: VisionCheck = {
    name: 'new-check',
    async analyze(frameBuffer: FrameBuffer): Promise<CheckReport> {
        // Analysis logic
    },
};
```

### Testing Vision Models

```bash
# Run vision test suite
npm run test:vision

# Generate test reports
npm run vision:test-reports
```

---

## Pull Request Template

```markdown
## Description

What does this PR do?

## Related Issues

Closes #123

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Test addition
- [ ] Refactor

## Testing

How did you test this?

- [ ] Unit tests pass
- [ ] Vision tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Vision analysis passes
```

---

## Join the Conversation

**Matrix:** https://matrix.to/#/#spacegraphjs:matrix.org

- `#sg6-help:matrix.org` - Get help
- `#sg6-contributors:matrix.org` - Dev coordination
- `#sg6-showcase:matrix.org` - Show what you made

---

## Questions?

- Check existing [issues](https://github.com/autonull/spacegraphjs/issues)
- Ask in `#sg6-help` on Matrix
- Start a [GitHub Discussion](https://github.com/autonull/spacegraphjs/discussions)

---

**Thank you for contributing to SpaceGraphJS!** 🚀
