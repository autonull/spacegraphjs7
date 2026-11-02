# Refactoring Opportunities — Future Sessions

> Generated after refactoring pass on 2026-11-02. All tests passing (543), build successful.

---

## Completed This Session

| File                    | Change                                                                                                                      | Impact                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `SpaceGraph.ts`         | Extracted `commitCamera()`, `cameraToSpec()`, `specToCamera()` helpers; removed ~30 lines of duplicated camera update logic | -40 lines, unified pattern |
| `CameraControls.ts`     | Added `requestFrame()` helper; replaced 11 `this.sg?.requestFrame?.()` calls                                                | -100+ chars, cleaner       |
| `DepthController.ts`    | Use `sg.commitCamera()` instead of inline `reportViewport` + `requestFrame`                                                 | -15 lines                  |
| `LODPlugin.ts`          | Extracted `opacityForDistance()` helper; consolidated DOM/mesh visibility logic                                             | -50 lines                  |
| `DefaultInputConfig.ts` | Consolidated event arrays; extracted common action/binding logic                                                            | -96 lines (-77%)           |

---

## Immediate Next Steps (Pass 3 — High ROI)

### 1. `Graph.ts` — Delegation Boilerplate (382 lines, ~30 forwarding methods)

```typescript
// Current: 30+ methods like:
getNode(id: string): Node | undefined { return this.queryEngine.getNode(id); }
getEdges(): IterableIterator<Edge> { return this.queryEngine.getEdges(); }
query(predicate: (node: Node) => boolean): Node[] { return this.queryEngine.query(predicate); }
// ... etc for queryEngine, algo, ser
```

**Option A:** Use `Proxy` to auto-forward to `queryEngine`/`algo`/`ser`
**Option B:** Expose engines directly: `graph.queryEngine.getNode(id)` (breaking)
**Option C:** Keep as-is — delegation is explicit and testable

### 2. `CameraControls.ts` — Cached Vector Allocation (6 instance fields)

```typescript
private _camRight = new Vector3();
private _camForward = new Vector3();
private _camUp = new Vector3();
private _tempVec = new Vector3();
private _tempOffset = new Vector3();
private _tempSide = new Vector3();
```

**Fix:** Move to module-level `const` singletons (frame-local, not instance-local). Saves 6 allocations per instance.

### 3. `Node.ts` — Ergonomic Method Explosion (40+ 1-liner getters/setters)

```typescript
setOpacity(opacity: number): this { this.data.opacity = opacity; return this; }
setColor(color: number | string): this { this.data.color = color; return this; }
show(): this { this.visible = true; return this; }
hide(): this { this.visible = false; return this; }
// ... 35 more
```

**Fix:** Generate from descriptor array:

```typescript
const ergonomicMethods = [
    { name: 'setOpacity', path: 'data.opacity' },
    { name: 'setColor', path: 'data.color' },
    { name: 'show', path: 'visible', value: true },
    // ...
];
ergonomicMethods.forEach(({ name, path, value }) => {
    Node.prototype[name] = function (v) {
        set(this, path, v ?? value);
        return this;
    };
});
```

Saves ~200 lines.

### 4. `BaseLayout.ts` & `Node.ts` — `requestFrame` Helper

```typescript
// 8 remaining occurrences:
Graph.ts:2        this.sg?.requestFrame?.();
BaseLayout.ts:3   this.sg?.requestFrame?.();
Node.ts:2         this.sg?.requestFrame?.();
```

**Fix:** Add `requestFrame()` helper to `Graph` and `BaseLayout` (like CameraControls), or make it a mixin.

---

## Medium-Term (Pass 4 — Architectural)

### 5. `SpaceGraph.ts` — Controller Coupling

`setProjection`, `setDepth`, `setCardFacing`, `setZoom` all do similar renderer+cameraControls+event+commit pattern. Could unify:

```typescript
protected updateCameraState(fn: () => void): this {
  fn();
  return this.commitCamera();
}
```

### 6. `safeClone` Usage Consistency

Used in `SpaceGraph.export()`, `Graph.export()`, `Node.toJSON()`, `Edge.toJSON()` with slightly different signatures. Standardize.

### 7. Type Exports Cleanup

`src/types/index.ts` re-exports from 13 files + renderer types. Consider:

- `types/base.ts` → core primitives
- `types/domain.ts` → NodeData, EdgeData, GraphSpec
- `types/runtime.ts` → CameraViewport, Projection, events

---

## Low Priority / Controversial

### 8. `EventEmitter` — Batched vs Immediate

Two emit paths (`emit`/`emitBatched`) with similar logic. Could unify with a `batch` option.

### 9. `PluginManager` — Init Parallelization

`initAll()` runs all plugins in parallel but catches errors individually. Could use `Promise.allSettled` for clearer semantics.

### 10. `TypeRegistry` — Singleton vs Dependency Injection

Currently a global singleton. Could inject into `Graph` constructor for better testability.

---

## Metrics Baseline (Post-Pass)

| Metric                  | Value                 |
| ----------------------- | --------------------- |
| Test files              | 57                    |
| Tests passing           | 543                   |
| Build time              | ~5.5s                 |
| SpaceGraph bundle       | 248.8 kB (64.6 kB gz) |
| Lines removed this pass | ~250                  |

---

## Decision Log

- **Private vs public helpers:** Used public methods (`commitCamera`, `requestFrame`) instead of private (`#commitCamera`) because controllers need access. TypeScript private fields are class-bound.
- **Helper location:** Put `commitCamera` on `SpaceGraph` (not `CameraController`) because it coordinates renderer + cameraControls + events.
- **Generated ergonomic methods:** Deferred — saves most lines but adds abstraction. Wait for clearer pattern fatigue signal.

---

## Quick Wins for Next Session (15 min each)

1. Add `requestFrame()` to `Graph` and `BaseLayout` → removes 8 `sg?.requestFrame?.()` calls
2. Move CameraControls cached vectors to module scope → removes 6 allocations
3. Standardize `safeClone` calls across 4 files
4. Consolidate `SpaceGraph` camera update methods with `updateCameraState` helper
