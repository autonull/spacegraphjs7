# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0-alpha.1] - 2026-03-03

### Added

- Core API: `SpaceGraph` class and `.create()` builder.
- WebGL & CSS3D dual-renderer architecture.
- Full node registry: `ShapeNode`, `InstancedShapeNode`, `HtmlNode`, `ImageNode`, `GroupNode`, `NoteNode`, `DataNode`, `CanvasNode`, `TextMeshNode`, `VideoNode`, `IFrameNode`, `ChartNode`, `MarkdownNode`, `GlobeNode`, `SceneNode`.
- Edge registry: `Edge`, `CurvedEdge`, `FlowEdge`, `LabeledEdge`, `DottedEdge`, `DynamicThicknessEdge`.
- Layout engines: `ForceLayout`, `CircularLayout`, `GridLayout`, `HierarchicalLayout`, `RadialLayout`.
- Core Plugins: `InteractionPlugin`, `LODPlugin`, `AutoLayoutPlugin`, `AutoColorPlugin`, `MinimapPlugin`, `ErgonomicsPlugin`, `PhysicsPlugin`.
- Performance systems: Object pooling via `MathPool`, frustum culling via `CullingManager`, optimized disposal via `ThreeDisposer`.
- E2E Vision tracking infrastructure with Playwright and layout heuristics (`noOverlap`, `wcagCompliance`).
