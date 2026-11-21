# SpaceGraphJS Demo

The complete SpaceGraphJS demo app. One pnpm consumer owns every demo surface: the capability
gallery, the programmatic showcase, the static feature pages, the runtime explorer and the
published-package proof.

```bash
pnpm --filter demo dev          # http://localhost:5173
pnpm --filter demo test         # capability suite (Vitest)
pnpm --filter demo test:e2e     # Playwright against the app's own dev server
pnpm --filter demo test:publish # published-tarball proof
pnpm --filter demo build
```

## Pages

| Page                            | What it shows                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                             | One model through all three renderers, with every library capability exercised and reported |
| `/learn.html`                   | How the system fits together, with real snippets and a live capability map                  |
| `/learn.html#capabilities`      | The live gallery: every entry runs against the real model                                   |
| `/showcase.html`                | The 44 programmatic demos, switchable without a rebuild                                     |
| `/html/interaction/scopes.html` | Scoped overlays and the vision overlap assertion                                            |
| `/explorer.html`                | Every discoverable config axis against both contract and demo models                        |
| `/html/core/contract.html`      | The host-neutral renderer contract                                                          |
| `/html/layout/graph-ide.html`   | Graph IDE reference host: filesystem graph plus live file/diff rectangles and gated senses  |
| `/*.html`                       | The standalone feature pages: layouts, interaction, plugins, media, vision and more         |

`src/` holds the demo host: a plain-TypeScript model of a release pipeline, its adapter and
controller, and the capability gallery that runs each library surface against that model. The
feature pages import only the published library surface through the `spacegraphjs` and
`@spacegraphjs/*` aliases. All media is bundled under `public/media/`, so the demo runs and deploys
without network access. The build emits relative asset paths and works from any subpath.
