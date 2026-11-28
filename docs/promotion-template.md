# Promotion template — from experiment to component

One experiment, one page. Copy this into a component's card when a demo earns a second consumer.
The lab index links here; `script/check-lab-catalogue.ts` guards the catalogue invariants.

## JOB (before code)

One line in the demo source header: who does what, when, and what would prove it worked.

```html
<!-- JOB: A reader refocuses one console line and sees aligned rails; proof: a rail chip click changes the console focus. -->
```

## Template

1. **Metaphor** — one line. If it needs two, the experiment is too diffuse.
2. **Job** — the `JOB:` line above, unchanged from the demo header.
3. **Facts** — which committed fact does the read model derive from? "None" means decoration; keep it a demo.
4. **Pure primitive** — a function in `src/`, no DOM, no host imports.
5. **Unit test** — direct calls against real data, fixed seeds, no kernel mocks.
6. **Component** — typed props in a package; host owns placement and colors.
7. **Second consumer** — demo plus Pi Durable (or Pi Agent). One selector, one command id.
8. **E2E** — drive the gesture in Chromium and inspect the resulting state.
9. **Gates** — keyboard path, reduced-motion snap, negative cases (empty, missing id, canceled replay,
   unsafe markup, narrow viewport, RTL). A pointer-only gesture is not done.
10. **Card** — inputs, outputs, invariants, failure modes and consumers, beside the component.
11. **Retire** — remove the experiment only after the second consumer's E2E passes.

## Invariants

One committed fold; stable ids; text stays text; escaped-by-default markup; square corners;
one catalog of selectors; reduced motion snaps every transition. Reuse the leverage inventory in
`TODO20.md` §2 — do not add a second graph store, text index, command registry or renderer.

## Pattern card (one page per promoted component)

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| Metaphor       | one line                                         |
| Inputs         | typed props and the facts they read              |
| Outputs        | DOM, events, derived read model                  |
| Invariants     | from `TODO20.md` §3                              |
| Keyboard       | keys and focus order                             |
| Reduced motion | snap target                                      |
| Failure modes  | empty, missing id, canceled, unsafe, narrow, RTL |
| Consumers      | demo id + Pi Durable surface + E2E file          |
