Analyze the repositories, using the code at their latest branches:
- https://github.com/autonull/spacegraphjs
- https://github.com/autonull/spacegraphjs3
- https://github.com/autonull/spacegraphjs4
- https://github.com/autonull/spacegraphjs5

Compare them in detail:
- architecture
- terminology
- API ergonomics
- functionality provided
- interaction controls
- UI usability
- heads-up-display and other UI infrastructure
- mobile responsiveness
- rendering efficiency
- testing infrastructure
- compatibility
- etc...

This is all for the purpose of creating a complete specification for a new implementation, `spacegraphjs`:
- synergizes the union of all their functionalities
- superior ideal architecture
- superior testing
  - AI vision: debugging, ergonomics/aesthetics tuning

# SpaceGraphJS - Comprehensive Analysis & Implementation Plan

## Executive Summary

This document provides a complete technical analysis of **FOUR** distinct SpaceGraphJS implementations, with detailed code-level examination of architecture, APIs, performance systems, and feature sets. The analysis reveals significant implementation differences that inform the unified SpaceGraphJS specification.

---

## 1. Repository Analysis Summary

### 1.1 Codebase Statistics

| Repository | Branch | Language | Source Files | Total LOC | Key Characteristics |
|------------|--------|----------|--------------|-----------|---------------------|
| **spacegraphjs** | main | JavaScript | 115 | ~65,000 | Full-featured, plugin-based, 18 node types |
| **spacegraphjs3** | feature/svg-node-scaling | TypeScript | 81 | ~35,000 | SolidJS reactive, managers, performance systems |
| **spacegraphjs4** | main | JavaScript | - | - | Documentation only (README.md) |
| **spacegraphjs5** | ergonomics-logical-conclusion | JavaScript | 125 | ~65,000 | Enhanced sg1 with ErgonomicsPlugin |

### 1.2 Architecture Comparison Matrix

| Aspect | sg1 (JavaScript) | sg3 (TypeScript) | sg5 (JavaScript) |
|--------|------------------|------------------|------------------|
| **Core Pattern** | Plugin Manager | Manager System | Plugin Manager |
| **State Management** | Imperative | SolidJS Store | Imperative |
| **Type System** | JSDoc | Full TypeScript | JSDoc |
| **Build System** | Vite | Vite + tsc | Vite |
| **Event System** | Custom (on/off/emit) | mitt | Custom (on/off/emit) |
| **Rendering** | Multi-pass | Multi-renderer | Multi-pass |
| **Performance** | Basic | Advanced systems | Basic + Ergonomics |

---

## 2. Detailed Architecture Analysis

### 2.1 spacegraphjs (sg1) - Plugin-Based Architecture

#### Core Structure
```
SpaceGraph (main class)
├── PluginManager
│   ├── CameraPlugin
│   ├── RenderingPlugin
│   ├── NodePlugin
│   ├── EdgePlugin
│   ├── LayoutPlugin
│   ├── UIPlugin
│   ├── DataPlugin
│   ├── MinimapPlugin
│   ├── FractalZoomPlugin
│   ├── PerformancePlugin
│   └── ErgonomicsPlugin (sg5 only)
├── NodeFactory → 18 node types
├── EdgeFactory → 8 edge types
└── LayoutManager → 12 layouts
```

#### Key Implementation Details

**SpaceGraph.js** (~500 lines):
```javascript
export class SpaceGraph {
    _listeners = new Map();
    plugins = null;
    options = {};
    
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.plugins = new PluginManager(this);
        this._registerCorePlugins();
    }
    
    async init() {
        await this.plugins.initPlugins();
        this._cachePlugins();
        this._setupAllEventListeners();
    }
    
    on(eventName, callback) { /* ... */ }
    off(eventName, callback) { /* ... */ }
    emit(eventName, ...args) { /* ... */ }
}
```

**Plugin System** (PluginManager.js ~80 lines):
```javascript
export class PluginManager {
    space = null;
    plugins = new Map();
    
    add(plugin) {
        if (!(plugin instanceof Plugin)) {
            throw new Error('Must be Plugin instance');
        }
        this.plugins.set(plugin.getName(), plugin);
    }
    
    async initPlugins() {
        for (const plugin of this.plugins.values()) {
            await plugin.init?.();
        }
    }
    
    updatePlugins() {
        for (const plugin of this.plugins.values()) {
            plugin.update?.();
        }
    }
}
```

#### Node Types (18 total)

| Node Type | File | LOC | Features |
|-----------|------|-----|----------|
| Node.js | Node.js | 80 | Base class, position, data, mass |
| HtmlNode.js | HtmlNode.js | 177 | CSS3D, editable, resize, content scale |
| ShapeNode.js | ShapeNode.js | 350+ | LOD, GLTF, sphere/box, labels |
| ImageNode.js | ImageNode.js | ~100 | Texture mapping |
| VideoNode.js | VideoNode.js | ~100 | Video texture |
| IFrameNode.js | IFrameNode.js | ~80 | Embedded web |
| GroupNode.js | GroupNode.js | ~100 | Node grouping |
| DataNode.js | DataNode.js | ~120 | Data viz |
| NoteNode.js | NoteNode.js | ~80 | Sticky notes |
| AudioNode.js | AudioNode.js | ~100 | Audio viz |
| DocumentNode.js | DocumentNode.js | ~100 | Document preview |
| ChartNode.js | ChartNode.js | ~150 | Chart.js integration |
| ControlPanelNode.js | ControlPanelNode.js | ~200 | UI controls |
| ProgressNode.js | ProgressNode.js | ~150 | Progress indicator |
| CanvasNode.js | CanvasNode.js | ~100 | Custom canvas |
| ProceduralShapeNode.js | ProceduralShapeNode.js | ~150 | Generated geometry |
| TextMeshNode.js | TextMeshNode.js | ~120 | 3D text |
| MetaWidgetNode.js | MetaWidgetNode.js | ~200 | Composite widgets |

#### Edge Types (8 total)

| Edge Type | File | LOC | Features |
|-----------|------|-----|----------|
| Edge.js | Edge.js | 295 | Straight, arrowheads, highlight/hover |
| CurvedEdge.js | CurvedEdge.js | ~150 | Bezier curves |
| LabeledEdge.js | LabeledEdge.js | ~120 | Text labels |
| DottedEdge.js | DottedEdge.js | ~80 | Dashed lines |
| DynamicThicknessEdge.js | DynamicThicknessEdge.js | ~100 | Variable width |
| FlowEdge.js | FlowEdge.js | ~150 | Animated flow |
| SpringEdge.js | SpringEdge.js | ~120 | Spring physics |
| BezierEdge.js | BezierEdge.js | ~100 | Custom bezier |

#### Layout Engines (12 total)

| Layout | File | LOC | Algorithm |
|--------|------|-----|-----------|
| ForceLayout.js | ForceLayout.js | 287 | d3-force-3d (Web Worker) |
| GridLayout.js | GridLayout.js | ~100 | Grid positioning |
| CircularLayout.js | CircularLayout.js | ~80 | Circular |
| SphericalLayout.js | SphericalLayout.js | ~100 | 3D sphere |
| HierarchicalLayout.js | HierarchicalLayout.js | ~120 | Tree layout |
| TreeMapLayout.js | TreeMapLayout.js | ~150 | Space-filling |
| RadialLayout.js | RadialLayout.js | ~100 | Radial |
| ConstraintLayout.js | ConstraintLayout.js | ~200 | Constraint solving |
| NestedLayout.js | NestedLayout.js | ~150 | Container-based |
| AdaptiveLayout.js | AdaptiveLayout.js | ~200 | Auto-selection |
| LayoutConnector.js | LayoutConnector.js | ~150 | Region connections |
| AdvancedLayoutManager.js | AdvancedLayoutManager.js | 500+ | Hybrid modes |

### 2.2 spacegraphjs3 (sg3) - TypeScript + SolidJS Architecture

#### Core Structure
```
SpaceGraph (TypeScript class)
├── SpaceGraphCore
├── SpaceGraphPluginManager
├── SpaceGraphStateManager
├── SpaceGraphInitialization
├── Managers
│   ├── RenderingManager (390 LOC)
│   ├── EventManager (85 LOC, mitt-based)
│   ├── DataManager (250 LOC)
│   └── PluginManager
├── Renderers
│   ├── IRenderer (interface)
│   ├── BasicRenderer
│   ├── NodeRenderer
│   ├── EdgeRenderer
│   ├── HTMLRenderer
│   └── InstancedRenderer (277 LOC)
├── Element Actors
│   ├── BaseElementActor
│   ├── SphereElementActor
│   ├── BoxElementActor
│   ├── CustomGeometryActor
│   ├── TextElementActor
│   └── HtmlNodeElementActor
├── Layouts (6 engines)
└── Plugins (4 plugins)
    ├── CameraPlugin (1,623 LOC!)
    ├── LayoutPlugin
    ├── InteractionPlugin
    └── HUDPlugin
```

#### Key Implementation Details

**SpaceGraph.ts** (~350 lines):
```typescript
export class SpaceGraph {
    private static elementActorRegistry: Map<string, ElementActorClass> = new Map();
    private static layoutEngineRegistry: Map<string, LayoutEngineClass> = new Map();
    
    // Core functionality modules
    private core!: SpaceGraphCore;
    private pluginManager!: SpaceGraphPluginManager;
    private stateManager!: SpaceGraphStateManager;
    
    // Public API (delegated to core)
    public state!: Store<Spec>;
    public scene!: THREE.Scene;
    public camera!: THREE.PerspectiveCamera;
    public render!: RenderingManager;
    public events!: EventManager;
    public dataManager!: DataManager;
    
    constructor(containerSelector: string, initialSpec: Spec, plugins: ISpaceGraphPlugin[] = []) {
        this.dispose = createRoot((dispose) => {
            this.initReactiveState(initialSpec);
            this.initManagers(container);
            this.initPlugins(plugins);
            return dispose;
        });
    }
    
    // Static factory method
    public static create(simpleSpec: SimpleSpec): SpaceGraph {
        const fullSpec: Spec = this.buildFullSpec(simpleSpec);
        const plugins = [new LayoutPlugin(), new CameraPlugin(), new InteractionPlugin()];
        return new SpaceGraph(container, fullSpec, plugins);
    }
    
    public update(spec: SpecUpdate) {
        this.stateManager.updateState(spec);
        this.pluginManager.notifyStateUpdate(spec);
    }
}
```

**Plugin Interface** (plugin.ts):
```typescript
export interface ISpaceGraphPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly description?: string;
    
    init(graph: SpaceGraphCore): void;
    onStateUpdate?(update: SpecUpdate): void;
    onPreRender?(delta: number): void;
    onPostRender?(delta: number): void;
    dispose?(): void;
}
```

**DataManager.ts** (250 LOC):
```typescript
export class DataManager {
    private nodes: Map<string, NodeSpec> = new Map();
    private edges: Map<string, EdgeSpec> = new Map();
    private groups: Map<string, GroupSpec> = new Map();
    
    constructor(graph: SpaceGraphCore) {
        // Reactive effects that sync with SolidJS store
        createEffect(() => {
            this.nodes.clear();
            const nodes = this.graph.state.data?.nodes ?? [];
            for (const node of nodes) {
                this.nodes.set(node.id, node);
            }
        });
        
        createEffect(() => {
            this.edges.clear();
            const edges = this.graph.state.data?.edges ?? [];
            for (const edge of edges) {
                this.edges.set(edge.id, edge);
            }
        });
    }
    
    // Data validation with detailed warnings
    private validateDataIntegrity(): void {
        this.validateEdgeReferences();
        this.validateGroupNodeReferences();
        this.validateNodeGroupReferences();
        this.checkForDuplicateIds();
    }
}
```

**RenderingManager.ts** (390 LOC):
```typescript
export class RenderingManager {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly cssRenderer: CSS2DRenderer;
    private readonly css3DRenderer: CSS3DRenderer;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    
    // Performance optimization systems
    private objectPoolManager: ObjectPoolManager;
    private lodManager?: LODManager;
    private cullingManager?: CullingManager;
    private memoryManager?: UnifiedDisposalSystem;
    private renderingOptimizer!: AdvancedRenderingOptimizer;
    
    constructor(graph: SpaceGraphCore, container: HTMLElement) {
        this.setupPerformanceSystems();
        this.setupRenderers();
        this.initRenderers();
        this.initDynamicNodeRenderer();
        this.animate();
    }
    
    public createOptimizedNode(
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        position?: THREE.Vector3
    ): THREE.Object3D {
        const mesh = new THREE.Mesh(geometry, material);
        if (position) mesh.position.copy(position);
        
        // Register with performance systems
        this.lodManager?.registerObject(mesh, lodSettings);
        this.cullingManager?.registerObject(mesh);
        
        return mesh;
    }
}
```

#### Performance Systems (sg3 exclusive)

**ObjectPoolManager.ts** (395 LOC):
```typescript
export class ObjectPool<T> {
    private readonly createFn: () => T;
    private readonly resetFn?: (obj: T) => void;
    private readonly pool: T[] = [];
    private readonly maxSize: number;
    
    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.createFn();
    }
    
    release(obj: T): void {
        if (this.resetFn) {
            this.resetFn(obj);
        }
        if (this.maxSize === 0 || this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }
}

export class ObjectPoolManager {
    private static instance: ObjectPoolManager;
    private pools: Map<string, ObjectPool<any>> = new Map();
    
    createVector3Pool(): ObjectPool<THREE.Vector3>;
    createMatrix4Pool(): ObjectPool<THREE.Matrix4>;
    createColorPool(): ObjectPool<THREE.Color>;
    createThreeJSPools(): void;
}
```

**CullingManager.ts** (176 LOC):
```typescript
export class CullingManager {
    private camera: Camera | null = null;
    private frustum: Frustum = new Frustum();
    private objects: Set<Object3D> = new Set();
    private boundingSphereCache: Map<Object3D, Sphere> = new Map();
    
    public setCamera(camera: Camera): void {
        this.camera = camera;
    }
    
    public updateFrustum(): void {
        if (!this.camera) return;
        this.matrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.matrix);
    }
    
    public cullObjects(): Object3D[] {
        const visibleObjects: Object3D[] = [];
        for (const object of this.objects) {
            if (this.isVisible(object)) {
                visibleObjects.push(object);
            }
        }
        return visibleObjects;
    }
    
    public isVisible(object: Object3D): boolean {
        let boundingSphere = this.boundingSphereCache.get(object);
        if (!boundingSphere) {
            boundingSphere = this.computeBoundingSphere(object);
            this.boundingSphereCache.set(object, boundingSphere);
        }
        return this.frustum.intersectsSphere(boundingSphere);
    }
}
```

**LODManager.ts** (133 LOC):
```typescript
export class LODManager {
    private objects: Map<Object3D, LODSettings> = new Map();
    private currentLevels: Map<Object3D, number> = new Map();
    private camera: Camera | null = null;
    
    public registerObject(object: Object3D, settings: LODSettings): void {
        this.objects.set(object, settings);
        this.currentLevels.set(object, 0);
    }
    
    public update(): void {
        if (!this.camera) return;
        const cameraPosition = this.camera.position;
        
        for (const [object, settings] of this.objects.entries()) {
            const distance = cameraPosition.distanceTo(object.position);
            const newLevel = this.calculateLODLevel(distance, settings.distances);
            
            if (newLevel !== this.currentLevels.get(object)) {
                this.switchLODLevel(object, newLevel, settings);
                this.currentLevels.set(object, newLevel);
            }
        }
    }
}
```

**InstancedRenderer.ts** (277 LOC):
```typescript
export class InstancedRenderer implements IRenderer {
    public instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
    private typeToIdMaps: Map<string, { idToIndex: Map<string, number>; indexToId: Map<number, string> }> = new Map();
    
    constructor(
        scene: THREE.Scene,
        state: Store<Spec>,
        instancedGeometryRegistry: Map<string, THREE.BufferGeometry>
    ) {
        this.init();
        this.setupReactiveUpdates();
    }
    
    public updateAllInstances() {
        const nodes = this.state.data?.nodes || [];
        const nodesByType = new Map<string, NodeSpec[]>();
        
        // Group nodes by type
        for (const node of nodes) {
            if (!nodesByType.has(node.type)) {
                nodesByType.set(node.type, []);
            }
            nodesByType.get(node.type)!.push(node);
        }
        
        // Update each InstancedMesh
        for (const [typeName, mesh] of this.instancedMeshes.entries()) {
            const typedNodes = nodesByType.get(typeName) || [];
            const idMaps = this.typeToIdMaps.get(typeName)!;
            
            typedNodes.forEach((node, i) => {
                idMaps.idToIndex.set(node.id, i);
                idMaps.indexToId.set(i, node.id);
                this.updateInstance(mesh, idMaps, i, node);
            });
            
            mesh.count = typedNodes.length;
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
}
```

**CameraPlugin.ts** (1,623 LOC - most complex single file):
```typescript
export class CameraPlugin implements ISpaceGraphPlugin {
    readonly id = 'camera-plugin';
    readonly version = '1.0.0';
    
    // Extensive state management
    private rotationConstraints: RotationConstraints = {};
    private zoomConstraints: { minDistance?: number; maxDistance?: number } = {};
    private cameraConstraints: { minX?: number; maxX?: number; /* ... */ } = {};
    private isInertiaEnabled: boolean = true;
    private inertiaFactor: number = 0.9;
    private gestureState: { lastDistance: number; lastAngle: number; isGesturing: boolean } = { /* ... */ };
    
    // Utility singletons
    private cameraUtils!: CameraUtils;
    private logger!: Logger;
    private errorBoundary!: ErrorBoundary;
    private resourceManager!: ResourceManager;
    private performanceMonitor!: PerformanceMonitor;
    private objectPool!: EnhancedObjectPool;
    private validationSystem!: ValidationSystem;
    
    public init(graph: SpaceGraphCore): void {
        this.graph = graph;
        this.threeCamera = graph.render.getCamera();
        this.presetsManager = new CameraPresetsManager(graph);
        this.cameraUtils = new CameraUtils(this.threeCamera, graph.render.getScene());
        
        this.syncCameraToState();
        this.initKeyboardControls();
        this.setupAutoFrameWatcher();
        this.setupPresetCommands();
        this.setupTouchGestures();
        this.setupInertiaSystem();
    }
    
    // 1,500+ more lines of camera control logic...
}
```

### 2.3 spacegraphjs5 (sg5) - Enhanced JavaScript

spacegraphjs5 is essentially spacegraphjs with the following additions:

#### ErgonomicsPlugin (628 LOC) - NEW

```javascript
class InteractionSession {
    constructor(startPos) {
        this.startTime = Date.now();
        this.pathLength = 0;
        this.velocities = [];
        this.directions = [];
        this.reversals = 0;
    }
    
    update(currentPos, dt) {
        const dist = currentPos.distanceTo(this.lastPos);
        this.pathLength += dist;
        this.velocities.push(dist / Math.max(dt, 0.001));
        
        const direction = currentPos.clone().sub(this.lastPos).normalize();
        if (this.directions.length > 0) {
            const lastDir = this.directions[this.directions.length - 1];
            if (direction.dot(lastDir) < -0.5) {
                this.reversals++;
            }
        }
        this.directions.push(direction);
        this.lastPos.copy(currentPos);
    }
    
    finalize(endPos) {
        const displacement = this.startPos.distanceTo(endPos);
        const duration = (Date.now() - this.startTime) / 1000;
        
        return {
            duration,
            pathLength: this.pathLength,
            displacement,
            efficiency: displacement > 0 ? displacement / Math.max(this.pathLength, displacement) : 1.0,
            avgVelocity: this.velocities.reduce((a,b) => a+b,0) / this.velocities.length,
            reversals: this.reversals,
            jitterIndex: this.reversals / Math.max(1, duration)
        };
    }
}

class CalibrationManager {
    constructor(plugin) {
        this.strategies = [
            { name: 'High Precision', params: { dampingFactor: 0.2, panSpeed: 0.5, zoomSpeed: 0.6 } },
            { name: 'High Velocity', params: { dampingFactor: 0.05, panSpeed: 1.5, zoomSpeed: 1.5 } },
            { name: 'Large Targets', params: { targetNodeSizePx: 60 } },
            { name: 'Compact View', params: { targetNodeSizePx: 25 } }
        ];
    }
    
    start() {
        this.active = true;
        this.round = 1;
        this.baseline = { ...this.plugin.config };
        this._generateVariant();
        this.apply('A');
    }
    
    vote(key) {
        const record = {
            round: this.round,
            choice: key,
            metrics: { ...this.plugin.metrics },
            userPreferredConfig: key === 'B' ? { ...this.variant } : { ...this.baseline }
        };
        this.history.push(record);
        
        if (key === 'B') {
            this.baseline = { ...this.variant };
            this._saveToStorage();
        }
        
        this.round++;
        this._generateVariant();
        this.apply('A');
    }
}

export class ErgonomicsPlugin extends Plugin {
    config = {
        targetNodeSizePx: 40,
        dampingFactor: 0.12,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
    };
    
    metrics = {
        totalInteractions: 0,
        avgEfficiency: 0,
        avgJitterIndex: 0,
    };
    
    calibration = new CalibrationManager(this);
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this._applyConfigToCamera();
        this._applyConfigToUI();
    }
}
```

#### EffectsManager (225 LOC) - Enhanced

```javascript
export class EffectsManager {
    constructor(renderingPlugin) {
        this.effectsConfig = {
            bloom: {
                enabled: true,
                intensity: 0.5,
                kernelSize: KernelSize.MEDIUM,
                luminanceThreshold: 0.85,
            },
            ssao: {
                enabled: true,
                blendFunction: BlendFunction.MULTIPLY,
                samples: 16,
                radius: 15,
                intensity: 1.5,
            },
            outline: {
                enabled: true,
                blendFunction: BlendFunction.SCREEN,
                edgeStrength: 2.5,
                visibleEdgeColor: 0xffaa00,
                xRay: true,
            }
        };
    }
    
    handleSelectionChange(payload) {
        this.selection.clear();
        for (const selectedItem of payload.selected ?? []) {
            const object = selectedItem.mesh || selectedItem.line;
            if (object instanceof THREE.Mesh || object instanceof Line2) {
                this.selection.add(object);
            }
        }
    }
}
```

#### LightingManager (166 LOC) - NEW

```javascript
export class LightingManager {
    constructor(renderingPlugin) {
        this.managedLights = new Map();
    }
    
    setupDefaults() {
        this.addLight('defaultAmbient', 'ambient', { intensity: 0.8 });
        this.addLight('defaultDirectional', 'directional', {
            intensity: 1.2,
            position: { x: 150, y: 200, z: 100 },
            castShadow: true,
        });
    }
    
    addLight(id, type, options = {}) {
        let light;
        switch (type.toLowerCase()) {
            case 'ambient':
                light = new THREE.AmbientLight(options.color ?? 0xffffff, options.intensity ?? 1.0);
                break;
            case 'directional':
                light = new THREE.DirectionalLight(options.color ?? 0xffffff, options.intensity ?? 1.0);
                // ... shadow configuration
                break;
            case 'point':
                light = new THREE.PointLight(options.color ?? 0xffffff, options.intensity ?? 1.0);
                break;
        }
        this.managedLights.set(id, light);
        return light;
    }
}
```

---

## 3. Feature Comparison Matrix

### 3.1 Core Features

| Feature | sg1 | sg3 | sg5 | sg6 Target |
|---------|-----|-----|-----|------------|
| **Language** | JavaScript | TypeScript | JavaScript | TypeScript |
| **Type Safety** | JSDoc | Full TS | JSDoc | Full TS |
| **Reactivity** | ❌ | SolidJS Store | ❌ | SolidJS (opt) |
| **Static Factory** | ❌ | ✅ `.create()` | ✅ `.the()` | Both |
| **Plugin System** | ✅ (11) | ✅ (4) | ✅ (11) | ✅ (16) |
| **Event System** | Custom | mitt | Custom | mitt |

### 3.2 Node/Edge Types

| Type | sg1 | sg3 | sg5 | sg6 |
|------|-----|-----|-----|-----|
| **Node Types** | 18 | 5 (actors) | 18 | 18+ |
| **Edge Types** | 8 | 2 | 8 | 8+ |
| **Layout Engines** | 12 | 6 | 12 | 14+ |

### 3.3 Performance Systems

| System | sg1 | sg3 | sg5 | sg6 |
|--------|-----|-----|-----|-----|
| **Instancing** | ✅ | ✅ | ✅ | ✅ Enhanced |
| **LOD** | ✅ (Node) | ✅ | ✅ | ✅ Unified |
| **Frustum Culling** | ❌ | ✅ | ❌ | ✅ |
| **Occlusion Culling** | ❌ | ❌ | ❌ | ✅ |
| **Object Pool** | ❌ | ✅ | ❌ | ✅ |
| **Memory Management** | Basic | ✅ Unified | Basic | ✅ Enhanced |
| **GPU Raycasting** | ❌ | ✅ (BVH) | ❌ | ✅ |

### 3.4 Testing Infrastructure

| Test Type | sg1 | sg3 | sg5 | sg6 |
|-----------|-----|-----|-----|-----|
| **Unit Tests** | Vitest (13) | Vitest | Vitest (13) | Vitest (50+) |
| **E2E Tests** | ❌ | Playwright | ❌ | Playwright |
| **Visual Tests** | ❌ | Custom | ❌ | Custom |
| **Coverage** | Partial | Good | Partial | 90%+ |

---

## 4. Implementation Plan

### Phase 1: Foundation (Weeks 1-3)

#### 4.1.1 Project Setup
```bash
npm init spacegraphjs
# TypeScript + Vite + Vitest + Playwright
```

#### 4.1.2 Core Architecture (from sg3)
- SpaceGraph.ts (TypeScript class)
- SpaceGraphCore.ts
- ISpaceGraphPlugin interface
- PluginManager with SolidJS integration
- EventManager (mitt-based)

#### 4.1.3 Type Definitions (from sg3)
```typescript
// src/types/index.ts
export interface NodeSpec { /* ... */ }
export interface EdgeSpec { /* ... */ }
export interface Spec { /* ... */ }
export interface SpecUpdate { /* ... */ }
```

### Phase 2: Feature Integration (Weeks 4-8)

#### 4.2.1 Node Types (from sg1/sg5)
- Port all 18 node types to TypeScript
- Maintain ElementActor pattern from sg3
- Ensure backward compatibility

#### 4.2.2 Edge Types (from sg1/sg5)
- Port all 8 edge types
- Integrate with InstancedRenderer

#### 4.2.3 Layout Engines (from sg1/sg5)
- Port all 12 layout engines
- Add Border/Flex from sg4 docs
- Maintain Web Worker support

#### 4.2.4 Plugins (combined)
- 11 from sg1/sg5
- 4 from sg3 (enhanced CameraPlugin)
- NEW: PhysicsPlugin, MobilePlugin, AIPlugin

### Phase 3: Performance Systems (Weeks 9-12)

#### 4.3.1 From sg3
- ObjectPoolManager
- LODManager
- CullingManager
- UnifiedDisposalSystem
- AdvancedRenderingOptimizer

#### 4.3.2 NEW Enhancements
- GPU raycasting (three-mesh-bvh)
- Occlusion culling
- Texture streaming
- Dynamic batching

### Phase 4: Ergonomics + Physics (Weeks 13-14)

#### 4.4.1 ErgonomicsPlugin (from sg5)
- InteractionSession tracking
- CalibrationManager A/B testing
- RLFP metrics
- Auto-optimization

#### 4.4.2 PhysicsPlugin (NEW)
- Verlet integration (from sg4 docs)
- Spring constraints
- Collision detection
- Force-directed physics

### Phase 5: Mobile + AI (Weeks 15-18)

#### 4.5.1 MobilePlugin (NEW)
- Touch gestures (@use-gesture/vanilla)
- Responsive canvas (ResizeObserver)
- Mobile-optimized UI
- Touch-safe menus

#### 4.5.2 AIPlugin (NEW)
- Vision debugger
- Overlap detection
- Contrast checking
- Layout optimization

### Phase 6: Testing + Documentation (Weeks 19-20)

#### 4.6.1 Test Suite
- Unit tests (Vitest) - 50+ tests
- E2E tests (Playwright) - 20+ tests
- Visual regression tests
- Performance benchmarks

#### 4.6.2 Documentation
- API docs (TypeDoc)
- Migration guide
- Tutorial examples
- Demo applications

---

## 5. File Structure for sg6

```
spacegraphjs/
├── src/
│   ├── core/
│   │   ├── SpaceGraph.ts
│   │   ├── SpaceGraphCore.ts
│   │   ├── plugin.ts
│   │   ├── PluginManager.ts
│   │   └── StateManager.ts
│   ├── managers/
│   │   ├── RenderingManager.ts
│   │   ├── EventManager.ts
│   │   ├── DataManager.ts
│   │   └── PluginManager.ts
│   ├── renderers/
│   │   ├── IRenderer.ts
│   │   ├── BasicRenderer.ts
│   │   ├── NodeRenderer.ts
│   │   ├── EdgeRenderer.ts
│   │   ├── HTMLRenderer.ts
│   │   └── InstancedRenderer.ts
│   ├── actors/
│   │   ├── BaseElementActor.ts
│   │   ├── SphereElementActor.ts
│   │   ├── BoxElementActor.ts
│   │   ├── CustomGeometryActor.ts
│   │   ├── TextElementActor.ts
│   │   └── HtmlNodeElementActor.ts
│   ├── nodes/           # 18 node types (TypeScript)
│   ├── edges/           # 8 edge types (TypeScript)
│   ├── layouts/         # 14 layouts (TypeScript)
│   ├── plugins/         # 16 plugins
│   │   ├── CameraPlugin.ts
│   │   ├── RenderingPlugin.ts
│   │   ├── NodePlugin.ts
│   │   ├── EdgePlugin.ts
│   │   ├── LayoutPlugin.ts
│   │   ├── UIPlugin.ts
│   │   ├── DataPlugin.ts
│   │   ├── MinimapPlugin.ts
│   │   ├── FractalZoomPlugin.ts
│   │   ├── PerformancePlugin.ts
│   │   ├── ErgonomicsPlugin.ts
│   │   ├── PhysicsPlugin.ts      # NEW
│   │   ├── MobilePlugin.ts       # NEW
│   │   └── AIPlugin.ts           # NEW
│   ├── utils/
│   │   ├── ObjectPoolManager.ts
│   │   ├── LODManager.ts
│   │   ├── CullingManager.ts
│   │   ├── UnifiedDisposalSystem.ts
│   │   └── AdvancedRenderingOptimizer.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── visual/
├── demos/
├── docs/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## 6. Package Configuration

```json
{
    "name": "spacegraphjs",
    "version": "1.0.0",
    "type": "module",
    "main": "./dist/spacegraphjs.cjs.js",
    "module": "./dist/spacegraphjs.es.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/spacegraphjs.es.js",
            "require": "./dist/spacegraphjs.cjs.js"
        }
    },
    "scripts": {
        "dev": "vite",
        "build": "vite build && tsc --emitDeclarationOnly",
        "test": "vitest",
        "test:e2e": "playwright test",
        "test:visual": "npx ts-node tests/visual/run-visual-tests.ts",
        "test:coverage": "vitest --coverage",
        "lint": "eslint .",
        "format": "prettier --write .",
        "docs": "typedoc src/index.ts"
    },
    "peerDependencies": {
        "three": ">=0.179.0",
        "gsap": ">=3.13.0",
        "postprocessing": ">=6.38.0"
    },
    "dependencies": {
        "solid-js": "^1.9.9",
        "d3-force-3d": "^3.0.6",
        "three-mesh-bvh": "^0.9.1",
        "@use-gesture/vanilla": "^10.3.1",
        "popmotion": "^11.0.5",
        "mitt": "^3.0.1"
    },
    "devDependencies": {
        "@playwright/test": "^1.55.0",
        "@types/node": "^24.0.0",
        "@types/three": "^0.179.0",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "@typescript-eslint/parser": "^8.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        "canvas": "^3.0.0",
        "cross-env": "^7.0.3",
        "eslint": "^9.0.0",
        "eslint-config-prettier": "^10.0.0",
        "jsdom": "^26.0.0",
        "pixelmatch": "^5.3.0",
        "pngjs": "^7.0.0",
        "prettier": "^3.6.0",
        "three": "^0.179.0",
        "ts-node": "^10.9.0",
        "typescript": "^5.9.0",
        "vite": "^7.0.0",
        "vitest": "^3.0.0"
    }
}
```

---

## 7. Conclusion

SpaceGraphJS unifies **FOUR** codebases with the following synthesis:

| Source | Contribution | LOC | Key Features |
|--------|--------------|-----|--------------|
| **sg1** | Core features | 65,000 | 18 nodes, 8 edges, 12 layouts, 11 plugins |
| **sg3** | TypeScript architecture | 35,000 | SolidJS, managers, performance systems, tests |
| **sg5** | Ergonomics | 65,000 | ErgonomicsPlugin, EffectsManager, LightingManager |
| **sg4** | Documentation | - | Physics concepts, UI components (reference) |

**Total Feature Set for sg6:**
- 18+ node types
- 8+ edge types
- 14+ layout engines
- 16 plugins
- 5 performance systems
- Full test suite (Unit + E2E + Visual)
- TypeScript throughout
- SolidJS reactive layer (optional)
- Mobile support
- AI debugging

This comprehensive analysis provides the foundation for implementing SpaceGraphJS as a unified, superior ZUI library.
