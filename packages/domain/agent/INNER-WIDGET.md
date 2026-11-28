# Pattern card — `InnerWidget`, `FoldableNode`

| Field          | Value                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metaphor       | An inner widget can become a first-class node; folding a container is a view transform, not a fact.                                                                                                         |
| Inputs         | `InnerWidgetModel` (container id, items with percent placements), `InnerWidgetState` (folded, detached ids).                                                                                                |
| Outputs        | `innerWidgetHTML` / `foldableNodeHTML` chrome, `innerWidgetEdges` contains edges, `innerWidgetStats`, `reduceInnerWidgets` transitions, `foldPlacement` interpolation.                                      |
| Facts          | Detach commits a stable `inner:<container>:<id>` node plus a `contains` edge; reattach removes both by id. Fold/unfold only changes a read model.                                                           |
| Invariants     | Stable ids through fold and detach; outer edges keep their ids; escaped markup; square corners; one catalog of `data-inner-*` selectors; reduced motion snaps fold.                                         |
| Keyboard       | Native fold/detach/reattach buttons; hosts bind a global key to open the inner view and keep every action focusable.                                                                                        |
| Reduced motion | `inner-widget.css` drops transitions; hosts pass `reducedMotion` to `playRepresentationChanges` so fold snaps to its target.                                                                                |
| Failure modes  | Empty model renders no widgets; duplicate detach is a no-op; missing id leaves edges unchanged; unsafe labels and details are escaped.                                                                      |
| Consumers      | Demos: `app/demo/html/interaction/fold-unfold.html`, `widget-detach.html`. Pi Durable: `?labs=1` session window inner tab. E2E: `test/e2e/inner-widget.spec.ts`, `app/pi-durable/tests/labs-inner.spec.ts`. |

The package owns the read model and chrome only. Hosts keep node placement, camera and commit paths;
`contains` is the only structural addition and it is derived from the same ids the kernel stores.
