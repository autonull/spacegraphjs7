# app/demo

The non-agent reference app. It is a private pnpm workspace consumer that owns its Vite config,
tests and publish check. It proves SpaceGraphJS works with a domain the library has never heard of.

```bash
pnpm --filter demo dev          # http://localhost:5174
pnpm --filter demo test         # capability suite (Vitest)
pnpm --filter demo test:e2e     # Playwright against the app's own dev server
pnpm --filter demo test:publish # published-tarball proof
pnpm --filter demo build
```

The source in `src/` is the framework-free second host. It imports only published library surfaces;
no OpenCode or framework module appears here.
