# Pattern card — `GraphWindow`

| Field          | Value                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metaphor       | A node is a window with a title bar, tabs and an inner widget area.                                                                                                                                             |
| Inputs         | `GraphWindowProps`: id, title, status, tone, tabs, activeTab, focused, band, escaped body markup.                                                                                                               |
| Outputs        | A string of shell markup for `HtmlNode.data.html`; taskbar markup for host chrome.                                                                                                                              |
| State          | `reduceGraphWindow(state, event)` for tab / focus / hide transitions; drag and resize stay in `HtmlNode`.                                                                                                       |
| Invariants     | One committed fold; stable ids; escaped text; square corners; one selector catalog; reduced motion snaps.                                                                                                       |
| Keyboard       | Native buttons in the title/tab/action strip and taskbar; hosts bind global keys to the same actions.                                                                                                           |
| Reduced motion | `graph-window.css` drops transitions and animations under `prefers-reduced-motion`.                                                                                                                             |
| Failure modes  | Missing id degrades to no node; far zoom collapses to a title card; hidden windows leave no stale edges.                                                                                                        |
| Consumers      | Demo: `app/demo/html/interaction/window-desktop.html`. Pi Durable: `?labs=1` session window (`app/pi-durable/src/host.ts`). E2E: `test/e2e/window-desktop.spec.ts`, `app/pi-durable/tests/labs-window.spec.ts`. |

The shell owns chrome only. Hosts supply body markup from their own read model: the demo uses
`innerPlacements`, Pi Durable uses committed kernel facts. The window's size is arrangement, never a
fact; the `contains` edge to its parent is the only structural addition.
