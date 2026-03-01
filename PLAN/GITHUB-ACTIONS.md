# GitHub Actions CI

**Copy these workflows to `.github/workflows/`**

---

## .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Format check
        run: npm run format:check
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Verify build output
        run: |
          test -d dist/
          test -f dist/spacegraphjs.js
          test -f dist/types/index.d.ts
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  vision:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run vision tests
        run: npm run test:vision
      
      - name: Upload vision reports
        uses: actions/upload-artifact@v4
        with:
          name: vision-reports
          path: vision/reports/
```

---

## .github/workflows/visual-regression.yml

```yaml
name: Visual Regression

on:
  pull_request:
    branches: [main]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Build
        run: npm run build
      
      - name: Start dev server
        run: npm run dev &
        env:
          PORT: 5173
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run visual regression tests
        run: npm run test:e2e
      
      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-screenshots
          path: tests/e2e/__screenshots__/
```

---

## .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run tests
        run: npm test
      
      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            dist/spacegraphjs.js
            dist/spacegraphjs.umd.cjs
```

---

## .github/workflows/vision-analysis.yml

```yaml
name: Vision Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  vision:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run vision analysis
        run: npm run vision
      
      - name: Check quality thresholds
        run: |
          # Parse vision report and check thresholds
          node scripts/check-vision-thresholds.js
      
      - name: Upload vision report
        uses: actions/upload-artifact@v4
        with:
          name: vision-report
          path: vision/report.json
```

---

## .github/ISSUE_TEMPLATE/bug-report.md

```yaml
name: Bug Report
description: Report a bug
title: '[Bug]: '
labels: ['bug']
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  
  - type: input
    id: version
    attributes:
      label: SpaceGraphJS Version
      placeholder: v6.0.0-alpha.1
    validations:
      required: true
  
  - type: input
    id: browser
    attributes:
      label: Browser
      placeholder: Chrome 120, Firefox 121, etc.
  
  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened?
    validations:
      required: true
  
  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction
      description: Steps to reproduce the behavior
      placeholder: |
        1. Create a graph with...
        2. Add nodes...
        3. Call render()
        4. See error...
    validations:
      required: true
  
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should happen instead?
    validations:
      required: true
  
  - type: input
    id: demo
    attributes:
      label: Demo Link
      description: Link to CodeSandbox or GitHub repo reproducing the issue
```

---

## .github/ISSUE_TEMPLATE/feature-request.md

```yaml
name: Feature Request
description: Suggest a new feature
title: '[Feature]: '
labels: ['enhancement']
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature!
  
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this solve?
    validations:
      required: true
  
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How should it work?
    validations:
      required: true
  
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other approaches did you think about?
  
  - type: textarea
    id: implementation
    attributes:
      label: Implementation Sketch
      description: Pseudocode or architecture ideas (optional)
  
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options:
        - Nice to have
        - Would be great
        - Important
        - Blocking
```

---

## .github/PULL_REQUEST_TEMPLATE.md

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

## Screenshots

If applicable, add screenshots.

## Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Vision analysis passes
- [ ] No new linting errors
```

---

## .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
    versioning-strategy: increase
  
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

---

## Setup Checklist

- [ ] Create `.github/workflows/` directory
- [ ] Copy `ci.yml` to `.github/workflows/ci.yml`
- [ ] Copy `visual-regression.yml` to `.github/workflows/visual-regression.yml`
- [ ] Copy `release.yml` to `.github/workflows/release.yml`
- [ ] Copy `vision-analysis.yml` to `.github/workflows/vision-analysis.yml`
- [ ] Create `.github/ISSUE_TEMPLATE/` directory
- [ ] Copy bug report template
- [ ] Copy feature request template
- [ ] Copy pull request template to `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Copy `dependabot.yml` to `.github/dependabot.yml`
- [ ] Add `NPM_TOKEN` secret to repository settings (for releases)
- [ ] Enable GitHub Actions in repository settings
