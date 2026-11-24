# create-spacegraph

Scaffold a runnable SpaceGraphJS application or add a domain and host as data.

```bash
pnpm dlx create-spacegraph my-graph
cd my-graph
pnpm install
pnpm run dev
```

The app generator writes `package.json`, `index.html`, `src/main.ts`, `tsconfig.json`,
`vite.config.ts` and `README.md`. It declares a published `spacegraphjs` range, never a path into
the framework checkout, so the generated app consumes the same bytes a user installs. Set
`SPACEGRAPHJS_SPEC` to override that range, for example to test against a local tarball.

To add a domain plus a host with its conformance, benchmark, spine, verify and vision checks:

```bash
pnpm dlx create-spacegraph-domain my-domain workflow
```

The domain generator reads `templates/` at runtime; both directories ship in the published tarball.

Bins: `create-spacegraph` and `sg6` generate apps; `create-spacegraph-domain` generates domains.
See `docs/QUICKSTART.md` for the app walkthrough and `docs/extension-recipe.md` for the domain recipe.
