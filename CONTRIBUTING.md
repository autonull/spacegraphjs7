# Contributing to SpaceGraphJS

Welcome to SpaceGraphJS! We're thrilled that you want to contribute to the first self-building UI framework. This guide provides an overview of our architecture, workflows, and the Vision-Closed Dev Loop.

## 🌟 The Vision-Closed Dev Loop

Before contributing, it's vital to understand the **Vision-Closed** development paradigm. In traditional UI development, developers write code, check the browser, adjust logic, and repeat. 

In SpaceGraphJS, **the AI builds with you**.

When you boot the local dev server (`npm run dev`), the `VisionManager` automatically layers on top of your graph. The manager continuously feeds screenshots of the DOM to ONNX machine-learning models (like LQ-Net for layout, ODN for overlap, etc.). When a visual regression is detected—such as poorly contrasted text or overlapping nodes—the AI generates semantic DOM patches automatically. 

**As a contributor**, your goal is to *extend* the graph rendering engine and *trust* the AI to verify visual invariants. 

## 🛠 Local Setup

To start contributing, set up your standard NodeJS environment.

1. **Fork & Clone**
   ```bash
   git clone https://github.com/autonull/spacegraphjs.git
   cd spacegraphjs
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Interactive Examples**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173/examples/index.html` to see the live templates, including the `VisionOverlayPlugin` in action.

## 🏗 Project Architecture

The workspace is split into core rendering and CLI tooling:

- `src/`: Core framework
  - `src/core/`: The `SpaceGraph` engine, camera controllers, and event dispatchers.
  - `src/nodes/`: Available 3D UI objects (`ShapeNode`, `TextMeshNode`, `IFrameNode`).
  - `src/edges/`: Linking behaviors (`DottedEdge`, `DynamicThicknessEdge`).
  - `src/plugins/`: Auto-layouts, Physics algorithms, and the `VisionOverlayPlugin`.
  - `src/vision/`: Playwright assertions (`visionAssert`), the Vite Plugin (`spacegraphVision`), and the ML analyzer.
- `packages/`: Additional workspaces
  - `packages/cli/`: `sg6 fix` CLI tool for auto-fixing code using AI telemetry.
  - `packages/create-spacegraph/`: `sg6 create` scaffolding tool.
- `examples/`: Sample `html` entry points used for local development and documentation.

## ✅ Pull Request Process

We maintain high quality standards. Before opening a PR, ensure you have:

1. **Written specific types** for any new payloads or options interfaces.
2. **Added unit tests**.
   - If adding rendering logic, update `test/spacegraph.test.ts`.
   - If adding visual layout logic, implement an invariant test inside `test/vision.spec.ts` using the `visionAssert` utility!
3. **Run CI checks locally**.
   ```bash
   npm run lint
   npm run format:check
   npm run test
   npm run vision
   ```
4. **Tested the build output**
   ```bash
   npm run build
   ```

After submitting a PR, wait for the GitHub Actions to complete. If the `Playwright Vision Tests` fail, it means your pull request introduced a visual defect (e.g. contrast failure) globally!

## 🚀 Good First Issues

If you are new to the project, the easiest way to start contributing is by adding or improving **Nodes**. Nodes are self-contained rendering primitives that extend `DOMNode` or `Node`.

1. **Check the `good-first-issue` label** on GitHub.
2. **Add a new Node type:** Look at simple implementations like `src/nodes/ShapeNode.ts` or `src/nodes/ImageNode.ts`. You can build new nodes (e.g., `CodeSnippetNode`, `BadgeNode`) by extending `DOMNode` and registering them in `PluginManager`.
3. **Enhance existing Nodes:** Help us add more configuration options to complex nodes like `src/nodes/ChartNode.ts` or `src/nodes/GlobeNode.ts`.

## 🧠 Training ONNX Vision Models

SpaceGraphJS relies on localized ONNX models to evaluate UI quality (Layout, Contrast, Overlap). If you are interested in ML/AI contributions, you can help improve our heuristics:

1. **Prerequisites:** You need Python 3 installed.
2. **Install ML dependencies:**
   ```bash
   pip install numpy scikit-learn skl2onnx
   ```
3. **Modify Training Data:** Open `train_vision_models.py`. You can adjust the synthetic data generation logic (e.g., inside `train_tla()` for Text Legibility or `train_odn()` for Overlap Detection) to better represent complex edge cases.
4. **Train and Export:**
   ```bash
   python3 train_vision_models.py
   ```
   This will output new `.onnx` files into the `public/` directory.
5. **Test locally:** Run `npm run test:vision` to see if your new weights improve the Playwright assertions.

## 🐞 Reporting Bugs

When reporting an issue, please answer the following:
1. Did the Vision API pick up the bug as poor telemetry? (e.g., was the Layout Score < 80?)
2. Does it replicate in a fresh `sg6 create` template? 
3. Include your browser console output if available.

---

> **Built with ❤️ for a visible, comprehensible, open future. Stop describing. Start specifying.**
