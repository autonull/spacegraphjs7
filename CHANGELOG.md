# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0-alpha.1] - 2026-03-03

### Changed
- Core API: `SpaceGraph.create()` and `PluginManager.initAll()` now use strict `try/catch` and provide actionable console errors instead of silent failures.
- Core API: Exported `MapLayout` as a public alias for `GeoLayout` in `src/index.ts` to ensure consistency with internal plugin string aliases.
- Bundle Optimization: `MarkdownNode` now utilizes dynamic imports for heavy optional dependencies (`marked`), matching `MathNode` and `ChartNode`.
- Bundle Optimization: Moved `chart.js`, `katex`, and `marked` from direct `dependencies` to optional `peerDependencies` to ensure a minimal installation footprint by default.

### Added

- Core API: `SpaceGraph` class and `.create()` builder.
- WebGL & CSS3D dual-renderer architecture.
- Full node registry: `ShapeNode`, `InstancedShapeNode`, `HtmlNode`, `ImageNode`, `GroupNode`, `NoteNode`, `DataNode`, `CanvasNode`, `TextMeshNode`, `VideoNode`, `IFrameNode`, `ChartNode`, `MarkdownNode`, `GlobeNode`, `SceneNode`.
- Edge registry: `Edge`, `CurvedEdge`, `FlowEdge`, `LabeledEdge`, `DottedEdge`, `DynamicThicknessEdge`.
- Layout engines: `ForceLayout`, `CircularLayout`, `GridLayout`, `HierarchicalLayout`, `RadialLayout`.
- Core Plugins: `InteractionPlugin`, `LODPlugin`, `AutoLayoutPlugin`, `AutoColorPlugin`, `MinimapPlugin`, `ErgonomicsPlugin`, `PhysicsPlugin`.
- Performance systems: Object pooling via `MathPool`, frustum culling via `CullingManager`, optimized disposal via `ThreeDisposer`.
- E2E Vision tracking infrastructure with Playwright and layout heuristics (`noOverlap`, `wcagCompliance`).
