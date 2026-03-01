# Release Checklist

**Use this for every release (alpha, beta, stable).**

---

## Pre-Release (1-2 days before)

### □ Code Quality

- [ ] All tests pass: `npm test`
- [ ] Vision tests pass: `npm run test:vision`
- [ ] No linting errors: `npm run lint`
- [ ] Formatting is correct: `npm run format:check`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Bundle size is acceptable: `ls -lh dist/`

### □ Documentation

- [ ] CHANGELOG.md is updated
- [ ] README.md reflects new version
- [ ] QUICKSTART.md is tested and working
- [ ] API docs generated: `npm run docs`
- [ ] Migration guide added (if breaking changes)
- [ ] Code examples are up to date

### □ Vision Analysis

- [ ] Run vision analysis: `npm run vision`
- [ ] All quality thresholds met
- [ ] Vision report saved to `vision/reports/v6.0.0-alpha.1.json`

### □ Version Bump

```bash
# Update version in package.json
# Follow semver:
# - MAJOR.MINOR.PATCH
# - alpha/beta/rc prereleases: 6.0.0-alpha.1

# Current version: ____
# New version: ____
```

- [ ] package.json version updated
- [ ] Git tag prepared: `v6.0.0-alpha.1`

---

## Release Day

### □ Final Verification

```bash
# Clean install test
rm -rf node_modules package-lock.json
npm install
npm run build
npm test
```

- [ ] Clean install works
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Vision analysis passes

### □ Create Git Tag

```bash
# Create annotated tag
git tag -a v6.0.0-alpha.1 -m "Release v6.0.0-alpha.1"

# Verify tag
git tag -v v6.0.0-alpha.1

# Push tag
git push origin v6.0.0-alpha.1
```

- [ ] Tag created
- [ ] Tag pushed to GitHub
- [ ] GitHub Actions release workflow triggered

### □ Publish to npm

```bash
# Login (if session expired)
npm login

# For alpha/beta releases
npm publish --tag alpha

# For stable releases
npm publish --access public

# Verify on npmjs.com
# https://www.npmjs.com/package/spacegraphjs
```

- [ ] Published to npm
- [ ] Package visible on npmjs.com
- [ ] Version tag is correct
- [ ] Install test works: `npm install spacegraphjs@<version>`

### □ GitHub Release

```bash
# Go to: https://github.com/autonull/spacegraphjs/releases
# Click "Draft a new release"
# Select tag: v6.0.0-alpha.1
# Generate release notes
# Add build artifacts if needed
# Publish release
```

- [ ] Release created
- [ ] Release notes generated
- [ ] Artifacts attached (if applicable)
- [ ] Release published

---

## Post-Release (within 24 hours)

### □ Announce Release

**Matrix:**
```
🚀 SpaceGraphJS v6.0.0-alpha.1 is here!

What's new:
• [Feature 1]
• [Feature 2]
• [Bug fix]

Install: npm install spacegraphjs@alpha
Changelog: https://github.com/autonull/spacegraphjs/releases/tag/v6.0.0-alpha.1
```

- [ ] Posted to `#sg6-announcements`
- [ ] Posted to `#sg6-general`

**GitHub Discussions:**
- [ ] Announcement post created
- [ ] Pinned to top

**Twitter/LinkedIn:**
- [ ] Thread posted
- [ ] Links included

**Dev.to/Hashnode:**
- [ ] Release article published (if major)

### □ Update Documentation

- [ ] Docs site deployed (if applicable)
- [ ] Version selector updated
- [ ] "Latest" badge points to new version

### □ Monitor for Issues

- [ ] Watch GitHub notifications
- [ ] Monitor Matrix for bug reports
- [ ] Respond to questions promptly

---

## Release Notes Template

```markdown
# Release v6.0.0-alpha.1

**Date:** March 1, 2026

## Highlights

• [Major feature or improvement]
• [Another highlight]
• [Third highlight]

## What's New

### Features

- [Feature description] ([#PR](link))

### Improvements

- [Improvement description] ([#PR](link))

### Bug Fixes

- [Fix description] ([#Issue](link))

### Breaking Changes

⚠️ [Description]

**Migration:**
```typescript
// Before
oldCode();

// After
newCode();
```

## Stats

- [X] commits
- [Y] files changed
- [Z] contributors

## Install

```bash
npm install spacegraphjs@alpha
```

## Full Changelog

https://github.com/autonull/spacegraphjs/compare/v5.0.0...v6.0.0-alpha.1
```

---

## Emergency Rollback Procedure

If a critical bug is discovered post-release:

### □ Assess Severity

- [ ] Bug documented in GitHub issue
- [ ] Severity assessed (critical/major/minor)
- [ ] Decision made: rollback or hotfix

### □ Rollback (if critical)

```bash
# Deprecate version on npm
npm deprecate spacegraphjs@6.0.0-alpha.1 "Critical bug, use v6.0.0-alpha.2"

# Delete tag (if not yet widely adopted)
git tag -d v6.0.0-alpha.1
git push origin :refs/tags/v6.0.0-alpha.1

# Delete release on GitHub
# https://github.com/autonull/spacegraphjs/releases
```

- [ ] Version deprecated on npm
- [ ] Tag deleted (if applicable)
- [ ] Release deleted (if applicable)
- [ ] Announcement posted

### □ Hotfix (if not critical)

```bash
# Create hotfix branch
git checkout -b hotfix/issue-123

# Fix bug, test, release as patch version
```

- [ ] Hotfix branch created
- [ ] Fix implemented and tested
- [ ] Patch release scheduled

---

## Release Frequency

| Release Type | Frequency | Example |
|--------------|-----------|---------|
| **Alpha** | Weekly | v6.0.0-alpha.1, alpha.2, ... |
| **Beta** | Monthly | v6.0.0-beta.1, beta.2, ... |
| **RC** | As needed | v6.0.0-rc.1, rc.2, ... |
| **Stable** | Quarterly | v6.0.0, v6.1.0, v7.0.0 |

---

## Version Numbering

```
MAJOR.MINOR.PATCH-PRERELEASE

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
PRERELEASE: alpha, beta, rc

Examples:
6.0.0-alpha.1  → First alpha of v6
6.0.0-beta.1   → First beta of v6
6.0.0-rc.1     → First release candidate
6.0.0          → Stable v6
6.0.1          → Patch for v6
6.1.0          → Minor feature release
7.0.0          → Breaking changes
```

---

## Release Metrics

Track these for each release:

| Metric | Target | Actual |
|--------|--------|--------|
| npm downloads (week 1) | 500 | ___ |
| GitHub stars (week 1) | 10 | ___ |
| Issues opened (week 1) | <5 | ___ |
| Matrix growth (week 1) | 20 | ___ |
| Time to first bug report | >48h | ___ |

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Release Manager | _______ | ___ |
| QA Lead | _______ | ___ |
| Docs Lead | _______ | ___ |

**Release approved for publication.**
