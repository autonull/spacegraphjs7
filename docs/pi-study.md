# Five-task spatial navigation study

**Status:** protocol and harness implemented; participant recruitment pending. **Decision governed:**
whether any immersive mode graduates to a default (plan decision 4).

The flagship hypothesis is that spatial navigation through relationships beats linear navigation
through messages once agent activity is complex enough. The claim is decided by task performance on
five questions, not by visual appeal. If the graph loses, stop immersive work, publish the negative
result and keep the library.

---

## 1. Questions

| #   | Question                                        | Pinned answer (canonical fixture)                                |
| --- | ----------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Why did the agent change `src/auth/session.ts`? | The delegated edit produced the file after the failing test.     |
| 2   | Which tool calls led to the failing test?       | The read of `src/auth/session.ts` preceded the failing test run. |
| 3   | What did the subagent contribute?               | The delegated edit wrote `src/auth/session.ts`.                  |
| 4   | Which changes were made after the failing test? | `src/auth/session.ts` and `test-report.md`.                      |
| 5   | Where did the agent retry or change direction?  | The direction change recorded in the second turn.                |

The canonical fixture is provider-free and deterministic; it contains all five situations and their
pinned answers. No participant sees the answer key.

---

## 2. Design

- **Surfaces:** transcript (`log`), graph (`map`), hybrid. The hybrid keeps the transcript mounted:
  the participant chooses a question, not a mode.
- **Geometry axes:** surface × depth (`flat`, `layered`, `depth-stack`, `orbit`) × arrangement
  (`stacked`, `side`, `floating`). The full product is 36 cells; the harness samples 18 with a seeded
  cartesian matrix (seed 7, baseline plus surface/depth pairwise coverage).
- **Counterbalancing:** a Latin square rotates surfaces across task positions. Participant 2 sees the
  surface participant 1 saw at the previous position. Each participant sees each surface once per
  five-task block.
- **Sample:** n ≥ 5 participants, counterbalanced. Recruitment is external to the harness; the harness
  records whatever sample it is given and never fabricates participants.
- **Stop rule:** stop at n ≥ 5; a negative result is a valid outcome. No immersive mode becomes a
  default unless the graph or hybrid beats the transcript on success and time without a preference
  penalty.

---

## 3. What is recorded

Per task: success (answer found), elapsed time, wrong turns, preference (1–5) and a quote. Events are
neutral (`surfaceOpen`, `lensSwitch`, `why`, `answer`, `wrong-turn`); no event is a success criterion
unless the protocol declares it. The recorder is host-agnostic and uses the shared metrics harness.
The report prints the matrix, its sampling policy, per-surface means and an explicit negative-results
section. A surface losing to the transcript is reported as a negative result, not hidden.

---

## 4. Running it

```bash
PI_LOCAL_FEED=1 pnpm --filter pi dev        # local feed, no provider
# open http://localhost:5175/study.html
```

Enter a participant number, start the counterbalanced run, work through the five questions in the
embedded flagship, and record each answer. At the end the page renders the Markdown report and exposes
`window.__study` with `trials`, `assignments`, `matrix`, `graphLayout` and `report`. Copy the report
into the study record; do not edit captured results by hand.

For a pilot on an opt-in graph view, add `?studyGraphLayout=timeline` (or `timeline-rows`) to the
`study.html` URL. This applies one view for the whole run and records it in the question header, the
status line and `window.__study.graphLayout`. It does **not** add an axis to the 36-cell matrix, change
the Latin-square surface rotation, or change any default. An unpiloted run stays `freeform`.

Automated checks cover the protocol, not the outcome:

```bash
pnpm --filter pi test          # matrix determinism, Latin square, recorder, negative reporting
pnpm --filter pi test:e2e      # the page boots against the local feed
```

The study does not gate construction of the doc, second domain or scaffold. It gates the product
claim only.
