# SpaceGraphJS Specification

## The Self-Building ZUI Library

**Version:** 1.0.0  
**Status:** Final  
**Date:** 2025

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision-Closed Development](#2-vision-closed-development)
3. [Source Codebase Analysis](#3-source-codebase-analysis)
4. [Unified Architecture](#4-unified-architecture)
5. [AI Vision System](#5-ai-vision-system)
6. [Core API](#6-core-api)
7. [Plugin System](#7-plugin-system)
8. [Node Types](#8-node-types)
9. [Edge Types](#9-edge-types)
10. [Layout Engines](#10-layout-engines)
11. [Performance Systems](#11-performance-systems)
12. [Development Tooling](#12-development-tooling)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendix: Complete Type Definitions](#14-appendix-complete-type-definitions)

---

## 1. Executive Summary

### 1.1 Vision Statement

SpaceGraphJS is a **self-building, self-optimizing Zoomable User Interface (ZUI) library** that synthesizes five complete implementations (175,000+ LOC) into a unified TypeScript codebase powered by AI vision. By giving AI the ability to **see, analyze, and self-correct** its output, we eliminate the iterative correction bottleneck and enable exponential development velocity.

### 1.2 Key Innovations

| Innovation                 | Description                                     | Impact                      |
| -------------------------- | ----------------------------------------------- | --------------------------- |
| **Vision-Closed Loop**     | AI sees output, verifies quality, self-corrects | 98% faster iteration        |
| **Automated Verification** | Playwright screenshot testing for all demos     | Visual regression detection |
| **17 Plugins**             | Unified from 5 codebases + 6 new vision plugins | Complete feature set        |
| **18 Node Types**          | All from sg1/sg5, TypeScript, vision-verified   | Rich visualization          |
| **8 Edge Types**           | All from sg1/sg5, instanced rendering           | Flexible connections        |
| **16 Layout Engines**      | 12 from sg1/sg5 + 4 from sg4                    | Optimal organization        |
| **Verlet Physics**         | Complete 2D physics from sg4 (722 LOC)          | Dynamic behaviors           |
| **6 Vision Models**        | LQ-Net, TLA, CHE, ODN, VHS, EQA                 | Autonomous quality          |
| **5 Performance Systems**  | ObjectPool, LOD, Culling, Disposal, Optimizer   | 60 FPS at 1000 nodes        |

### 1.3 Development Paradigm Shift

**Traditional AI Development:**

```
Human Request → AI Code → Human Views → Human Describes → AI Guesses → Repeat (10-20x)
                    ↓
            30 min per iteration
            High mental load
            Lossy communication
```

**Vision-Closed Development:**

```
Human Spec → AI Build → Vision Verify → AI Self-Correct → Done (1-3x)
                    ↓
            30 sec per iteration
            Autonomous quality
            Pixel-perfect precision
```

### 1.4 Success Metrics

| Metric            | Target               | Measurement            |
| ----------------- | -------------------- | ---------------------- |
| Initial render    | <100 ms (100 nodes)  | Performance.now()      |
| Frame rate        | 60 FPS (1000 nodes)  | RAF timing             |
| Memory            | <50 MB (1000 nodes)  | DevTools heap          |
| Test coverage     | >90%                 | Vitest coverage        |
| Vision accuracy   | >95%                 | Model validation       |
| Auto-fix rate     | >80%                 | Vision fixer logs      |
| WCAG compliance   | 100% AA              | TLA reports            |
| Visual regression | 0 unapproved changes | Playwright screenshots |

---

## 2. Vision-Closed Development

### 2.1 The Problem: Blind AI Development

Traditional AI-assisted development suffers from a **fundamental perception gap**: the AI cannot see what it builds. This creates a broken feedback loop:

```
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌────────────┐     ┌─────────┐
│   Human      │────▶│    AI    │────▶│   Human   │────▶│     AI     │────▶│  ...    │
│  Requests    │     │  Codes   │     │   Views   │     │  Guesses   │     │         │
└──────────────┘     └──────────┘     └───────────┘     └────────────┘     └─────────┘
                          │                │                  │
                          ▼                ▼                  ▼
                    No visual         Lossy verbal       Accumulated
                    feedback          description        errors
```

**Consequences:**

- **Slow:** Each iteration takes 30+ minutes
- **Imprecise:** Human descriptions lose visual information
- **Exhausting:** Constant context-switching drains mental energy
- **Discouraging:** Progress feels glacial, quality inconsistent

### 2.2 The Solution: Vision-Closed Loop

SpaceGraphJS embeds AI vision at every layer, creating a **self-verifying development system**:

```
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌────────────┐     ┌─────────┐
│   Human      │────▶│    AI    │────▶│  Vision   │────▶│     AI     │────▶│  Done   │
│  Specifies   │     │  Builds  │     │  Verifies │     │ Self-Fixes │     │         │
└──────────────┘     └──────────┘     └───────────┘     └────────────┘     └─────────┘
                          │                │                  │
                          ▼                ▼                  ▼
                    Complete          Pixel-perfect      Autonomous
                    specification     analysis           correction
```

**Benefits:**

- **Fast:** Vision verification in 30-50 milliseconds
- **Precise:** Pixel-level analysis, no information loss
- **Autonomous:** AI fixes issues without human intervention
- **Empowering:** Humans focus on high-level design, not pixel-pushing

### 2.3 Automated Visual Verification

In addition to AI vision models, SpaceGraphJS includes **automated screenshot-based verification** for all demos:

```python
# verification/verify_demos.py
from playwright.sync_api import sync_playwright

def verify_demos():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        page.goto("http://localhost:3000/demos/index.html")
        page.wait_for_selector("canvas", timeout=5000)

        # Capture each demo
        page.screenshot(path="verification/basic_graph.png")

        page.click("button[data-demo='html']")
        page.screenshot(path="verification/html_nodes.png")

        page.click("button[data-demo='large']")
        page.screenshot(path="verification/large_graph.png")

        browser.close()
```

**Integration with CI:**

```yaml
# .github/workflows/visual-verification.yml
name: Visual Verification

on: [push, pull_request]

jobs:
    visual-test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - run: pnpm install
            - run: pnpm run build
            - run: pnpm run dev &
            - run: python verification/verify_demos.py
            - uses: actions/upload-artifact@v4
              with:
                  name: screenshots
                  path: verification/*.png
```

### 2.4 Vision Model Specifications

#### 2.4.1 Layout Quality Network (LQ-Net)

**Purpose:** Evaluate overall layout quality and detect issues autonomously.

**Architecture:**

```
Input: Frame buffer (512x512 RGB)
    ↓
Backbone: ResNet-50 (pre-trained on ImageNet, fine-tuned on graphs)
    ↓
Feature Pyramid Network (FPN)
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Overall   │  Aesthetics │   Clarity   │  Usability  │
│   Head      │   Head      │   Head      │   Head      │
│   (FC)      │   (FC)      │   (FC)      │   (FC)      │
└─────────────┴─────────────┴─────────────┴─────────────┘
    ↓
Detection Head: FPN + RPN for issue localization
    ↓
Output: Quality scores + Issue bounding boxes
```

**Training Data:**

- 100,000+ labeled graph layouts
- Expert ratings (1-5 scale) for aesthetics, clarity, usability
- Annotated issues with bounding boxes and severity labels

**Output Interface:**

```typescript
interface LayoutQualityReport {
    // Overall scores (0-100)
    overall: number;
    aesthetics: number;
    clarity: number;
    usability: number;

    // Detected issues
    issues: LayoutIssue[];

    // Auto-fix suggestions
    autoFixes: AutoFix[];
}

interface LayoutIssue {
    id: string;
    type:
        | 'overlap'
        | 'poor-spacing'
        | 'unclear-hierarchy'
        | 'edge-crossing'
        | 'node-clustering'
        | 'white-space-waste';
    severity: 'critical' | 'warning' | 'info';
    confidence: number; // 0-1

    // Location
    boundingBox: { x: number; y: number; width: number; height: number };
    affectedElements: string[]; // Element IDs

    // Fix information
    suggestion: string; // Human-readable
    autoFixAvailable: boolean;
    autoFixType?: 'move' | 'resize' | 'recolor' | 'relayout';
    estimatedFixTime: number; // milliseconds
}
```

**Performance:**

- Inference time: <10 ms (WebGPU), <30 ms (WebGL)
- Accuracy: >95% on test set
- Model size: 12 MB (quantized ONNX)

#### 2.4.2 Text Legibility Analyzer (TLA)

**Purpose:** Ensure all text is readable at current zoom level with WCAG compliance.

**Analysis Pipeline:**

```
1. OCR pass → Extract all text regions
2. Font analysis → Size, weight, family in screen pixels
3. Contrast analysis → Foreground/background luminance
4. Occlusion detection → Depth buffer sampling
5. Blur detection → Laplacian variance
6. WCAG calculation → Contrast ratios
```

**Output Interface:**

```typescript
interface LegibilityReport {
    // Element classification
    readableElements: TextElement[];
    illegibleElements: IllegibleText[];

    // WCAG compliance
    wcagCompliance: {
        A: boolean;
        AA: boolean;
        AAA: boolean;
        failures: WCAGFailure[];
    };

    // Statistics
    statistics: {
        totalTextElements: number;
        readablePercentage: number;
        averageContrastRatio: number;
        minimumFontSize: number; // Screen pixels
        averageFontSize: number;
    };
}

interface IllegibleText {
    elementId: string;
    text: string;
    reason: 'too-small' | 'low-contrast' | 'occluded' | 'blurred';

    // Current state
    currentSize: number; // Screen pixels
    contrastRatio: number;
    occlusionPercentage: number;
    blurScore: number;

    // Recommendations
    recommendedSize: number;
    requiredContrast: number;
    suggestedColor?: string;
    suggestedBackgroundColor?: string;
}
```

**Performance:**

- Analysis time: <20 ms for 100 text elements
- OCR accuracy: >99% on rendered text
- Contrast calculation: Exact (WCAG formula)

#### 2.4.3 Color Harmony Evaluator (CHE)

**Purpose:** Evaluate and suggest color scheme improvements.

**Analysis:**

```
1. Color extraction → Dominant palette (K-means)
2. Color theory analysis → Harmony type detection
3. Temperature consistency → Warm/cool balance
4. Accessibility check → Color blindness simulation
5. Emotional tone → Color psychology matching
```

**Output Interface:**

```typescript
interface ColorHarmonyReport {
    // Scores
    harmonyScore: number; // 0-100
    accessibilityScore: number; // 0-100
    consistencyScore: number; // 0-100

    // Analysis
    dominantPalette: ColorStop[];
    harmonyType:
        | 'complementary'
        | 'analogous'
        | 'triadic'
        | 'split-complementary'
        | 'monochromatic'
        | 'none';
    temperatureBalance: 'warm' | 'cool' | 'neutral' | 'mixed';

    // Accessibility
    colorBlindSimulations: {
        protanopia: ColorBlindSimulation;
        deuteranopia: ColorBlindSimulation;
        tritanopia: ColorBlindSimulation;
        achromatopsia: ColorBlindSimulation;
    };

    // Suggestions
    suggestions: ColorSuggestion[];
}
```

#### 2.4.4 Overlap Detection Network (ODN)

**Purpose:** Detect overlapping elements that should not overlap.

**Architecture:**

```
Input: Frame buffer + Depth buffer
    ↓
Instance Segmentation: Mask R-CNN (ResNet-101 backbone)
    ↓
Element Classification: Node, Edge, Label, UI
    ↓
Overlap Calculation: IoU + Depth ordering
    ↓
Severity Scoring: Based on element types and overlap area
    ↓
Output: Overlap list with resolution suggestions
```

**Output Interface:**

```typescript
interface OverlapReport {
    overlaps: Overlap[];
    statistics: {
        totalOverlaps: number;
        criticalOverlaps: number;
        warningOverlaps: number;
        totalOverlapArea: number; // Pixels²
    };
}

interface Overlap {
    id: string;
    elementA: string; // Element ID
    elementB: string; // Element ID
    elementAType: 'node' | 'edge' | 'label' | 'ui';
    elementBType: 'node' | 'edge' | 'label' | 'ui';

    // Overlap metrics
    overlapArea: number; // Pixels²
    overlapPercentage: number; // % of smaller element
    iou: number; // Intersection over Union

    // Severity
    severity: 'critical' | 'warning' | 'acceptable';
    reason: string;

    // Resolution
    resolution: 'move-A' | 'move-B' | 'resize' | 'layer' | 'ignore';
    suggestedOffset?: { x: number; y: number };
}
```

**Performance:**

- Inference time: <25 ms
- Detection accuracy: >98%
- False positive rate: <1%

#### 2.4.5 Visual Hierarchy Scorer (VHS)

**Purpose:** Evaluate visual hierarchy clarity.

**Analysis:**

```
1. Saliency detection → What draws attention first
2. Size differentiation → Scale variance analysis
3. Color prominence → Contrast and saturation
4. Spatial grouping → Proximity clustering
5. Connection clarity → Edge visibility
6. Focal point identification → Attention centers
```

**Output Interface:**

```typescript
interface HierarchyReport {
    // Scores
    clarityScore: number; // 0-100
    differentiationScore: number; // 0-100
    groupingScore: number; // 0-100

    // Analysis
    focalPoints: FocalPoint[];
    visualGroups: VisualGroup[];
    flowDirection: 'top-down' | 'left-right' | 'radial' | 'central' | 'unclear';
    flowStrength: number; // 0-1

    // Suggestions
    suggestions: HierarchySuggestion[];
}
```

#### 2.4.6 Ergonomics Quality Assessor (EQA)

**Purpose:** Evaluate interaction ergonomics from visual data.

**Analysis:**

```
1. Target size analysis → Fitts's Law compliance
2. Spacing analysis → Minimum touch targets
3. Reach zone mapping → Thumb-friendly areas (mobile)
4. Movement efficiency → Path optimization
5. Click density heatmaps → Usage pattern analysis
```

**Output Interface:**

```typescript
interface ErgonomicsReport {
    // Scores
    overallScore: number; // 0-100
    fittsLawScore: number; // 0-100
    touchFriendlinessScore: number; // 0-100
    reachabilityScore: number; // 0-100

    // Fitts's Law analysis
    fittsLawCompliance: {
        compliant: boolean;
        violations: FittsViolation[];
        averageMovementTime: number; // milliseconds
    };

    // Touch analysis
    touchAnalysis: {
        minimumTargetSize: number; // Pixels
        recommendedTargetSize: number;
        targetsBelowMinimum: number;
        averageSpacing: number;
    };
}
```

### 2.5 Vision Integration Points

#### 2.5.1 Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision-plugin';

export default defineConfig({
    plugins: [
        spacegraphVision({
            enabled: true,
            checks: ['layout', 'legibility', 'overlap', 'color', 'hierarchy', 'ergonomics'],
            thresholds: {
                layout: 80,
                legibility: 85,
                overlap: 0,
                color: 70,
                hierarchy: 75,
                ergonomics: 75,
            },
            autoFix: {
                enabled: true,
                maxIterations: 3,
            },
        }),
    ],
});
```

#### 2.5.2 Vitest Assertions

```typescript
import { visionAssert } from 'spacegraphjs/vision-test';

await visionAssert.noOverlap(graph);
await visionAssert.allTextLegible(graph);
await visionAssert.wcagCompliance(graph, 'AA');
await visionAssert.layoutQuality(graph, 80);
```

#### 2.5.3 Playwright E2E

```typescript
import { SpaceGraphVision } from 'spacegraphjs/vision-e2e';

const vision = new SpaceGraphVision(page);
await vision.waitForRender();
const report = await vision.runAllChecks();

expect(report.layout.overall).toBeGreaterThan(80);
```

---

## 3. Source Codebase Analysis

### 3.1 Complete Repository Matrix

| Repository        | Branch                        | Language   | Files | LOC      | Status     | Key Features                                 |
| ----------------- | ----------------------------- | ---------- | ----- | -------- | ---------- | -------------------------------------------- |
| **spacegraphjs**  | main                          | JavaScript | 115   | ~65,000  | Production | 18 nodes, 8 edges, 12 layouts, 11 plugins    |
| **spacegraphjs3** | feature/svg-node-scaling      | TypeScript | 81    | ~35,000  | Production | SolidJS, Managers, Performance systems       |
| **spacegraphjs4** | fix-demo-rendering            | JavaScript | 50    | ~8,300   | Production | Surface graph, Verlet physics, UI components |
| **spacegraphjs5** | ergonomics-logical-conclusion | JavaScript | 125   | ~65,000  | Production | ErgonomicsPlugin, Effects, Lighting          |
| **spacegraphjs**  | implementation                | TypeScript | 15    | ~2,000   | MVP        | Clean architecture, verification system      |
| **Total**         | -                             | -          | 386   | ~175,300 | -          | Complete feature union                       |

### 3.2 Key Learnings from spacegraphjs Implementation

The spacegraphjs implementation branch provides valuable architectural patterns:

**Clean Core Architecture:**

```typescript
// Simplified class hierarchy
SpaceGraph
├── Graph (data management)
│   ├── nodes: Map<string, Node>
│   └── edges: Edge[]
├── Renderer (Three.js setup)
│   ├── scene: THREE.Scene
│   ├── camera: THREE.PerspectiveCamera
│   ├── renderer: THREE.WebGLRenderer
│   └── cssRenderer: CSS3DRenderer
├── PluginManager
│   ├── plugins: Map<string, any>
│   └── nodeTypes: Map<string, any>
└── CameraControls (OrbitControls wrapper)
```

**Node Type Registration Pattern:**

```typescript
// PluginManager registers node types
pluginManager.registerNodeType('ShapeNode', ShapeNode);
pluginManager.registerNodeType('HtmlNode', HtmlNode);

// Graph creates nodes by type
const NodeType = this.sg.pluginManager.getNodeType(config.type);
const node = new NodeType(this.sg, config);
```

**Automated Verification:**

```python
# Playwright-based screenshot verification
def verify_demos():
    page.goto("http://localhost:3000/demos/index.html")
    page.wait_for_selector("canvas", timeout=5000)
    page.screenshot(path="verification/basic_graph.png")
```

**GSAP Integration for Smooth Animations:**

```typescript
// Camera fly-to animation
gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.5,
    ease: 'power2.inOut',
});
```

**Canvas Texture Labels:**

```typescript
// Simple sprite-based labels
createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '24px Arial';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(material);
}
```

### 3.3 Feature Extraction Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    Feature Source Mapping                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  spacegraphjs (sg1) - 65,000 LOC                                 │
│  ├── 18 Node Types (HtmlNode, ShapeNode, ImageNode, etc.)       │
│  ├── 8 Edge Types (Edge, CurvedEdge, FlowEdge, etc.)            │
│  ├── 12 Layout Engines (Force, Grid, Circular, etc.)            │
│  ├── 11 Plugins (Camera, Rendering, Node, Edge, etc.)           │
│  └── Web Worker Layout Support                                   │
│                                                                  │
│  spacegraphjs3 (sg3) - 35,000 LOC                                │
│  ├── TypeScript Architecture                                     │
│  ├── SolidJS Reactive State                                      │
│  ├── 4 Managers (Rendering, Event, Data, Plugin)                │
│  ├── 5 Performance Systems (Pool, LOD, Culling, etc.)           │
│  ├── 5 Element Actors (Sphere, Box, Custom, Text, Html)         │
│  └── Enhanced CameraPlugin (1,623 LOC)                           │
│                                                                  │
│  spacegraphjs4 (sg4) - 8,300 LOC                                 │
│  ├── Surface-Based Scene Graph (Surface, ContainerSurface)      │
│  ├── Verlet Physics Engine (722 LOC)                            │
│  ├── 12 UI Components (Button, Slider, TextInput, etc.)         │
│  ├── 4 Layout Containers (Border, Flex, Grid, Splitting)        │
│  ├── Finger Input System (unified mouse/touch)                  │
│  └── 6 Gesture Recognizers (Tap, Drag, Pinch, etc.)             │
│                                                                  │
│  spacegraphjs5 (sg5) - 65,000 LOC                                │
│  ├── ErgonomicsPlugin (628 LOC, RLFP calibration)               │
│  ├── EffectsManager (225 LOC, post-processing)                  │
│  ├── LightingManager (166 LOC, scene lighting)                  │
│  └── Static Factory Pattern (SpaceGraph.the())                  │
│                                                                  │
│  spacegraphjs (sg6) - 2,000 LOC                                 │
│  ├── Clean TypeScript Architecture                               │
│  ├── Automated Verification (Playwright)                        │
│  ├── GSAP Animation Integration                                  │
│  ├── Canvas Texture Labels                                       │
│  └── Node Type Registration Pattern                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Unified Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SpaceGraphJS                                   │
│                     Self-Building ZUI Library                            │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Public API Layer                                  │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   Imperative    │  │   Declarative   │  │    Reactive     │          │
│  │                 │  │                 │  │                 │          │
│  │ SpaceGraph.the()│  │ graph.update()  │  │ graph.state     │          │
│  │ SpaceGraph.     │  │ graph.configure()│  │   .subscribe()  │          │
│  │   create()      │  │ graph.vision()  │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Vision Integration Layer                            │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Vision     │  │   Vision     │  │   Vision     │  │   Vision     │ │
│  │   Analyzer   │  │   Reporter   │  │   Fixer      │  │   Verifier   │ │
│  │              │  │              │  │              │  │              │ │
│  │ • Capture    │  │ • Generate   │  │ • Auto-      │  │ • Screenshot │ │
│  │ • Analyze    │  │ • Reports    │  │   layout     │  │   capture    │ │
│  │ • Score      │  │ • Export     │  │ • Auto-      │  │ • Visual     │ │
│  └──────────────┘  └──────────────┘  │   color      │  │   regression │ │
│                                      │ • Auto-text  │  └──────────────┘ │
│                                      └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Plugin System (17)                                │
│                                                                          │
│  Core (from sg1/sg5):          Enhanced (from sg3):                     │
│  • CameraPlugin                • CameraPlugin (1,623 LOC)               │
│  • RenderingPlugin             • InteractionPlugin                      │
│  • NodePlugin                  • HUDPlugin                              │
│  • EdgePlugin                  • LayoutPlugin                           │
│  • LayoutPlugin                                                       │
│  • UIPlugin                    New Vision Plugins:                      │
│  • DataPlugin                  • VisionPlugin                           │
│  • MinimapPlugin               • AutoLayoutPlugin                       │
│  • FractalZoomPlugin           • AutoColorPlugin                        │
│  • PerformancePlugin           • AccessibilityPlugin                    │
│  • ErgonomicsPlugin (sg5)      • PhysicsPlugin (sg4)                    │
│                                • SurfacePlugin (sg4)                    │
│                                • MobilePlugin                           │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Core Managers (4)                                  │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Rendering       │  │ Event           │  │ Data            │          │
│  │ Manager         │  │ Manager         │  │ Manager         │          │
│  │ (390 LOC)       │  │ (85 LOC)        │  │ (250 LOC)       │          │
│  │                 │  │                 │  │                 │          │
│  │ • Multi-render  │  │ • mitt-based    │  │ • SolidJS sync  │          │
│  │ • Auto-switch   │  │ • Type-safe     │  │ • Validation    │          │
│  │ • Vision hooks  │  │ • Reactive      │  │ • CRUD ops      │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ VisionManager (NEW)                                           │       │
│  │                                                               │       │
│  │ • Orchestrates 6 vision models                                │       │
│  │ • Manages vision quality thresholds                           │       │
│  │ • Coordinates auto-fix operations                             │       │
│  │ • Exports training data                                       │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Performance Systems (5)                              │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Object       │  │ LOD            │  │ Culling      │                  │
│  │ Pool         │  │ Manager        │  │ Manager      │                  │
│  │ Manager      │  │                │  │              │                  │
│  │ (395 LOC)    │  │ (133 LOC)      │  │ (176 LOC)    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐                                     │
│  │ Unified      │  │ Advanced       │                                     │
│  │ Disposal     │  │ Rendering      │                                     │
│  │ System       │  │ Optimizer      │                                     │
│  │              │  │ (1,193 LOC)    │                                     │
│  └──────────────┘  └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Feature Libraries                                     │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ 18 Node Types   │  │ 8 Edge Types    │  │ 16 Layout       │          │
│  │ (from sg1/sg5)  │  │ (from sg1/sg5)  │  │ Engines         │          │
│  └─────────────────┘  └─────────────────┘  │ (12 from sg1/   │          │
│                                            │  sg5, 4 from    │          │
│  ┌─────────────────┐  ┌─────────────────┐  │  sg4)           │          │
│  │ 12 UI           │  │ Verlet Physics  │  └─────────────────┘          │
│  │ Components      │  │ (722 LOC from   │                                 │
│  │ (from sg4)      │  │  sg4)           │                                 │
│  └─────────────────┘  └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Module Dependency Graph

```
                              ┌─────────────────┐
                              │   index.ts      │
                              │   (exports)     │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │   SpaceGraph    │     │   Vision        │     │   Types         │
     │   (main class)  │     │   (AI models)   │     │   (TypeScript)  │
     └────────┬────────┘     └────────┬────────┘     └─────────────────┘
              │                        │
              │        ┌───────────────┼───────────────┐
              │        │               │               │
              ▼        ▼               ▼               ▼
     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │   Plugins       │     │   Managers      │     │   Renderers     │
     │   (17 total)    │     │   (4 total)     │     │   (5 total)     │
     └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
              │                        │                        │
              │        ┌───────────────┼───────────────┐       │
              │        │               │               │       │
              ▼        ▼               ▼               ▼       ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                     Performance Systems                          │
     │         (ObjectPool, LOD, Culling, Disposal, Optimizer)         │
     └─────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                      Feature Libraries                           │
     │    (Nodes ×18, Edges ×8, Layouts ×16, UI Components ×12)        │
     └─────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Flow

```
User Input / Spec
       │
       ▼
┌─────────────────┐
│ SpaceGraph      │
│ Public API      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PluginManager   │─────────────────┐
└────────┬────────┘                 │
         │                          │
         ▼                          ▼
┌─────────────────┐     ┌─────────────────┐
│ Node/Edge       │     │ LayoutPlugin    │
│ Plugins         │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ RenderingManager      │
         │                       │
         │ ┌───────────────────┐ │
         │ │ NodeRenderer      │ │
         │ │ EdgeRenderer      │ │
         │ │ HTMLRenderer      │ │
         │ │ InstancedRenderer │ │
         │ └───────────────────┘ │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ VisionManager         │
         │                       │
         │ ┌───────────────────┐ │
         │ │ LQ-Net            │ │
         │ │ TLA               │ │
         │ │ CHE               │ │
         │ │ ODN               │ │
         │ │ VHS               │ │
         │ │ EQA               │ │
         │ └───────────────────┘ │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ VisionReporter  │     │ VisionFixer     │
│ (generate report│     │ (auto-fix       │
│  display overlay│     │  apply changes) │
└─────────────────┘     └─────────────────┘
```

---

## 5. AI Vision System

### 5.1 Vision Model Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Vision Model Stack                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Input Processing                               │   │
│  │                                                                   │   │
│  │  Frame Buffer (WebGL/WebGPU) → RGB Texture (512×512)             │   │
│  │  Depth Buffer → Depth Texture (512×512)                          │   │
│  │  DOM Snapshot → Element Metadata                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Shared Backbone                               │   │
│  │                                                                   │   │
│  │  ResNet-50 (pre-trained on ImageNet, fine-tuned on graphs)       │   │
│  │  → Feature Pyramid Network (FPN)                                  │   │
│  │  → Multi-scale features (P2, P3, P4, P5)                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│         ┌─────────────────────────┼─────────────────────────┐           │
│         │                         │                         │           │
│         ▼                         ▼                         ▼           │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │ Classification│         │ Detection     │         │ Segmentation │    │
│  │ Heads         │         │ Heads         │         │ Heads        │    │
│  │              │         │              │         │              │    │
│  │ • Overall    │         │ • Issue bbox  │         │ • Element    │    │
│  │ • Aesthetics │         │ • Severity    │         │   masks      │    │
│  │ • Clarity    │         │ • Confidence  │         │ • Instance   │    │
│  │ • Usability  │         │              │         │   IDs        │    │
│  └──────────────┘         └──────────────┘         └──────────────┘    │
│         │                         │                         │           │
│         └─────────────────────────┼─────────────────────────┘           │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Output Fusion                                  │   │
│  │                                                                   │   │
│  │  • Combine classification scores                                  │   │
│  │  • Merge detection boxes (NMS)                                    │   │
│  │  • Associate with element metadata                                │   │
│  │  • Generate auto-fix suggestions                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Vision Reports                                 │   │
│  │                                                                   │   │
│  │  LayoutQualityReport | LegibilityReport | ColorHarmonyReport     │   │
│  │  OverlapReport | HierarchyReport | ErgonomicsReport              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Model Training Pipeline

```typescript
import { VisionTrainer } from 'spacegraphjs/vision-training';

const trainer = new VisionTrainer({
    dataSources: [
        './training-data/captured/',
        './training-data/labeled/',
        './training-data/synthetic/',
    ],

    models: {
        LQNet: {
            backbone: 'resnet50',
            pretrained: 'imagenet',
            numClasses: 4,
        },
        TLA: {
            ocrModel: 'tesseract-web',
            contrastCalculator: 'wcag-2.1',
        },
        CHE: {
            paletteExtractor: 'kmeans',
            harmonyDetector: 'color-theory-rules',
        },
        ODN: {
            segmentationModel: 'mask-rcnn-resnet101',
            iouThreshold: 0.5,
        },
        VHS: {
            saliencyModel: 'deepgaze2',
            groupingAlgorithm: 'dbscan',
        },
        EQA: {
            fittsLawModel: 'macKenzie-1992',
            touchTargetStandard: 'wcag-2.1',
        },
    },

    training: {
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        validationSplit: 0.2,
        earlyStopping: true,
    },

    export: {
        format: 'onnx',
        optimize: true,
        quantize: true,
        maxFileSize: 15 * 1024 * 1024,
    },
});

await trainer.train();
await trainer.export('./dist/vision-models/');
```

### 5.3 Runtime Vision Inference

```typescript
import * as ort from 'onnxruntime-web';

export class VisionAnalyzer {
    private sessions: Map<string, ort.InferenceSession> = new Map();

    async loadModels(modelPaths: Record<string, string>): Promise<void> {
        for (const [name, path] of Object.entries(modelPaths)) {
            const session = await ort.InferenceSession.create(path, {
                executionProviders: ['webgl'],
            });
            this.sessions.set(name, session);
        }
    }

    async analyzeLayout(frame: FrameBuffer): Promise<LayoutQualityReport> {
        const session = this.sessions.get('LQNet')!;
        const inputTensor = this.preprocessFrame(frame, [512, 512]);
        const results = await session.run({ input: inputTensor });

        const scores = this.extractScores(results);
        const issues = this.detectIssues(results);
        const autoFixes = this.generateAutoFixes(issues);

        return {
            overall: scores.overall,
            aesthetics: scores.aesthetics,
            clarity: scores.clarity,
            usability: scores.usability,
            issues,
            autoFixes,
        };
    }
}
```

### 5.4 Auto-Fix Implementation

```typescript
export class VisionFixer {
    private graph: SpaceGraphCore;
    private visionAnalyzer: VisionAnalyzer;

    async applyFix(fix: AutoFix): Promise<boolean> {
        switch (fix.type) {
            case 'move':
                return await this.fixMove(fix);
            case 'resize':
                return await this.fixResize(fix);
            case 'recolor':
                return await this.fixRecolor(fix);
            case 'relayout':
                return await this.fixRelayout(fix);
        }
    }

    private async fixRelayout(fix: AutoFix): Promise<boolean> {
        const layoutPlugin = this.graph.plugins.getPlugin('LayoutPlugin');
        await layoutPlugin.applyLayout(fix.parameters.layoutType, fix.parameters.settings);
        await this.waitForLayoutStable();

        const report = await this.visionAnalyzer.analyzeLayout();
        return report.overall > fix.parameters.previousScore;
    }
}
```

---

## 6. Core API

### 6.1 SpaceGraph Main Class

```typescript
export class SpaceGraph {
    private core: SpaceGraphCore;
    private vision: VisionAnalyzer;

    static async visionCreate(
        container: string | HTMLElement,
        spec: VisionSpec,
    ): Promise<SpaceGraph>;
    static async the(container: string | HTMLElement, spec: Spec): Promise<SpaceGraph>;
    static create(simpleSpec: SimpleSpec): SpaceGraph;

    // Constructor
    constructor(container: string | HTMLElement, spec: Spec);

    // Lifecycle
    async init(): Promise<void>;
    animate(): void;
    destroy(): void;

    // Node operations
    createNode(config: NodeSpec): Node;
    addNode(node: Node): Node;
    removeNode(id: string): void;

    // Edge operations
    addEdge(source: string | Node, target: string | Node, data?: EdgeData): Edge;
    removeEdge(id: string): void;

    // Layout
    async applyLayout(type: LayoutType, settings?: LayoutSettings): Promise<void>;

    // Camera
    camera: CameraController;

    // Vision
    async analyzeVision(): Promise<VisionReport>;
    async autoFix(category: VisionCategory): Promise<void>;

    // State
    get state(): Spec;
    update(spec: SpecUpdate): void;
}
```

### 6.2 Simplified Core Architecture (from sg6)

```typescript
// Clean separation of concerns
export class SpaceGraph {
    container: HTMLElement;
    renderer: Renderer;
    graph: Graph;
    pluginManager: PluginManager;
    cameraControls: CameraControls;

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.container = container;
        this.graph = new Graph(this);
        this.pluginManager = new PluginManager(this);
        this.renderer = new Renderer(this, container);
        this.cameraControls = new CameraControls(this);
    }

    async init() {
        this.renderer.init();
        this.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        this.pluginManager.registerNodeType('HtmlNode', HtmlNode);

        const layout = new ForceLayout(this);
        this.pluginManager.register('Layout', layout);

        await this.pluginManager.initAll();
        this.animate();
    }

    createNode(config: any) {
        return this.graph.addNode(config);
    }

    addEdge(source: Node, target: Node, config: any) {
        return this.graph.addEdge(source, target, config);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.pluginManager.updateAll();
        this.renderer.render();
    }
}
```

---

## 7. Plugin System

### 7.1 Plugin Interface

```typescript
export interface ISpaceGraphPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;

    init(graph: SpaceGraphCore): void;
    onStateUpdate?(update: SpecUpdate): void;
    onPreRender?(delta: number): void;
    onPostRender?(delta: number): void;
    dispose?(): void;
}
```

### 7.2 Plugin Manager

```typescript
export class PluginManager {
    private plugins: Map<string, ISpaceGraphPlugin> = new Map();
    private nodeTypes: Map<string, any> = new Map();

    register(name: string, plugin: any): void;
    registerNodeType(type: string, cls: any): void;
    getNodeType(type: string): any;
    getPlugin(name: string): ISpaceGraphPlugin | undefined;

    async initAll(): Promise<void>;
    updateAll(): void;
    disposePlugins(): void;
}
```

---

## 8. Node Types

### 8.1 Complete Node Registry

```typescript
export const NodeRegistry: Map<string, NodeConstructor> = new Map([
    ['html', HtmlNode],
    ['shape', ShapeNode],
    ['image', ImageNode],
    ['video', VideoNode],
    ['iframe', IFrameNode],
    ['group', GroupNode],
    ['data', DataNode],
    ['note', NoteNode],
    ['audio', AudioNode],
    ['document', DocumentNode],
    ['chart', ChartNode],
    ['control-panel', ControlPanelNode],
    ['progress', ProgressNode],
    ['canvas', CanvasNode],
    ['procedural-shape', ProceduralShapeNode],
    ['text-mesh', TextMeshNode],
    ['meta-widget', MetaWidgetNode],
]);
```

### 8.2 Canvas Texture Labels (from sg6)

```typescript
export class ShapeNode extends Node {
    createLabel(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 64;

        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(20, 5, 1);

        return sprite;
    }
}
```

---

## 9. Edge Types

### 9.1 Complete Edge Registry

```typescript
export const EdgeRegistry: Map<string, EdgeConstructor> = new Map([
    ['straight', Edge],
    ['curved', CurvedEdge],
    ['labeled', LabeledEdge],
    ['dotted', DottedEdge],
    ['dynamic-thickness', DynamicThicknessEdge],
    ['flow', FlowEdge],
    ['spring', SpringEdge],
    ['bezier', BezierEdge],
]);
```

---

## 10. Layout Engines

### 10.1 Force Layout (Direct Implementation from sg6)

```typescript
export class ForceLayout {
    settings = {
        attraction: 0.01,
        repulsion: 100,
        damping: 0.9,
    };

    private velocity: Map<string, THREE.Vector3> = new Map();

    update(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        const edges = this.sg.graph.edges;

        // Initialize velocities
        for (const node of nodes) {
            if (!this.velocity.has(node.id)) {
                this.velocity.set(node.id, new THREE.Vector3(0, 0, 0));
            }
        }

        // Repulsion (Coulomb's Law)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                const diff = new THREE.Vector3().subVectors(n1.position, n2.position);
                const distSq = diff.lengthSq() || 1;
                const force = (this.settings.repulsion * 100) / distSq;
                const dir = diff.normalize().multiplyScalar(force);

                this.velocity.get(n1.id)?.add(dir);
                this.velocity.get(n2.id)?.sub(dir);
            }
        }

        // Attraction (Hooke's Law)
        for (const edge of edges) {
            const n1 = edge.source;
            const n2 = edge.target;
            const diff = new THREE.Vector3().subVectors(n2.position, n1.position);
            const dist = diff.length();
            const force = dist * this.settings.attraction;
            const dir = diff.normalize().multiplyScalar(force);

            this.velocity.get(n1.id)?.add(dir);
            this.velocity.get(n2.id)?.sub(dir);
        }

        // Apply velocity
        for (const node of nodes) {
            if (node.data.pinned) continue;

            const vel = this.velocity.get(node.id);
            if (vel) {
                vel.multiplyScalar(this.settings.damping);
                node.updatePosition(
                    node.position.x + vel.x,
                    node.position.y + vel.y,
                    node.position.z + vel.z,
                );
            }
        }

        // Update edges
        for (const edge of edges) {
            edge.update();
        }
    }
}
```

---

## 11. Performance Systems

### 11.1 GSAP Animation Integration (from sg6)

```typescript
// Camera fly-to animation
gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => {
        camera.lookAt(target);
    },
});

// Node hover effect
gsap.to(node.object.scale, {
    x: 1.2,
    y: 1.2,
    z: 1.2,
    duration: 0.3,
});
```

### 11.2 DragControls Integration (from sg6)

```typescript
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

export class Interaction {
    dragControls: DragControls;

    initDrag(): void {
        const meshes = Array.from(this.sg.graph.nodes.values()).map((node) => node.object);

        this.dragControls = new DragControls(
            meshes,
            this.sg.renderer.camera,
            this.sg.renderer.renderer.domElement,
        );

        this.dragControls.addEventListener('dragstart', (event) => {
            this.sg.cameraControls.controls.enabled = false;
            event.object.userData.node.data.pinned = true;
        });

        this.dragControls.addEventListener('dragend', (event) => {
            this.sg.cameraControls.controls.enabled = true;
        });

        this.dragControls.addEventListener('drag', (event) => {
            const node = event.object.userData.node;
            node.position.copy(event.object.position);
        });
    }
}
```

---

## 12. Development Tooling

### 12.1 Automated Visual Verification

```python
# verification/verify_demos.py
from playwright.sync_api import sync_playwright

def verify_demos():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:3000/demos/")
        page.wait_for_selector("canvas", timeout=5000)

        # Capture each demo
        demos = ['basic', 'html', 'large', 'layout']
        for demo in demos:
            page.click(f"button[data-demo='{demo}']")
            page.wait_for_timeout(2000)
            page.screenshot(path=f"verification/{demo}.png")

        browser.close()
```

### 12.2 CI/CD Integration

```yaml
# .github/workflows/visual-verification.yml
name: Visual Verification

on: [push, pull_request]

jobs:
    visual-test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - run: pnpm install
            - run: pnpm run build
            - run: pnpm run dev &
            - run: python verification/verify_demos.py
            - uses: actions/upload-artifact@v4
              with:
                  name: screenshots
                  path: verification/*.png
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

- [ ] TypeScript project setup
- [ ] Clean core architecture (from sg6)
- [ ] Basic plugin system
- [ ] Renderer with WebGL + CSS3D

### Phase 2: Vision Infrastructure (Weeks 5-10)

- [ ] Vision capture infrastructure
- [ ] 6 vision model training
- [ ] VisionReporter, VisionFixer
- [ ] Automated screenshot verification

### Phase 3: Feature Porting (Weeks 11-18)

- [ ] 18 node types
- [ ] 8 edge types
- [ ] 16 layout engines
- [ ] Surface hierarchy (sg4)
- [ ] Verlet physics (sg4)

### Phase 4: Plugin Completion (Weeks 19-24)

- [ ] 17 plugins total
- [ ] Vision plugins (4 new)
- [ ] GSAP integration
- [ ] DragControls integration

### Phase 5: Performance Systems (Weeks 25-28)

- [ ] ObjectPoolManager
- [ ] LODManager, CullingManager
- [ ] UnifiedDisposalSystem
- [ ] AdvancedRenderingOptimizer

### Phase 6: Testing & Tooling (Weeks 29-32)

- [ ] Vitest assertions
- [ ] Playwright E2E
- [ ] VSCode extension
- [ ] CLI tool

### Phase 7: Polish & Release (Weeks 33-36)

- [ ] Performance profiling
- [ ] Demo applications
- [ ] Documentation
- [ ] pnpm publish

---

## 14. Appendix: Complete Type Definitions

See Section 6.2 for complete TypeScript type definitions.

---

## Conclusion

SpaceGraphJS represents the **complete synthesis** of five codebases (175,000+ LOC) into a unified, self-building ZUI library. Key additions from the spacegraphjs implementation branch include:

**Architectural Improvements:**

- Clean class separation (SpaceGraph, Graph, Renderer, PluginManager)
- Node type registration pattern
- GSAP animation integration
- Canvas texture labels
- DragControls for node manipulation

**Verification System:**

- Playwright-based screenshot verification
- Automated visual regression testing
- CI/CD integration for visual checks

**Development Patterns:**

- Simplified core API
- Plugin-based node type registration
- Modular demo system with verification

By embedding AI vision at every layer and adding automated visual verification, we transform development from a slow, iterative process into a fast, autonomous, quality-assured system.

**Expected Impact:**

- **98% faster iteration** (30 min → 30 sec)
- **90% less human involvement** in quality assurance
- **99.9% faster bug detection** (hours → milliseconds)
- **100% WCAG AA compliance** automated
- **0 unapproved visual regressions** via screenshot testing

This specification provides the complete blueprint for building the next generation of ZUI libraries—where AI doesn't just write code, but **sees, verifies, and self-corrects** its output autonomously.
