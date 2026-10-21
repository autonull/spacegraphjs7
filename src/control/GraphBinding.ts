// P8.2 — the framework-agnostic half of a binding. It owns the renderer lifecycle and the controller
// for one container, and pushes model/theme/projection/selection into the renderer. React and Solid
// components are thin lifecycle wrappers over this; nothing here touches a framework.
//
// Like `GraphController`, it speaks to the renderer through structural types, so the core never imports
// the renderer contract. A contract `GraphRenderer` is assignment-compatible with `BindingRenderer`.

import {
  GraphController,
  type ControlModel,
  type ControlProjection,
  type ControlRenderer,
  type ControlSnapshot,
  type GraphControllerOptions,
} from './GraphController';

/** The renderer surface a binding drives. A contract `GraphRenderer` satisfies it. */
export interface BindingRenderer<TTheme = unknown> extends ControlRenderer {
  mount(container: HTMLElement, options: { theme: TTheme; projection: ControlProjection }): Promise<void>;
  setModel(model: ControlModel): void;
  setTheme(theme: TTheme): void;
  setProjection(projection: ControlProjection): void;
  dispose(): void;
}

export interface GraphBindingOptions<TTheme = unknown> {
  createRenderer: () => BindingRenderer<TTheme>;
  theme: TTheme;
  model?: ControlModel;
  projection?: ControlProjection;
  selection?: readonly string[];
  bands?: GraphControllerOptions['bands'];
  trailMaxDepth?: number;
  onReady?: (binding: GraphBinding<TTheme>) => void;
  onChange?: (snapshot: ControlSnapshot) => void;
  onError?: (error: unknown) => void;
}

/**
 * The props a framework binding takes. The framework owns the lifecycle; the binding owns the
 * renderer. Each framework adds its own container props — `className` against `class`, the style
 * type — so those stay out of here.
 */
export interface GraphViewPropsBase<
  TTheme = unknown,
  TRenderer extends BindingRenderer<TTheme> = BindingRenderer<TTheme>,
  TModel extends ControlModel = ControlModel,
> {
  createRenderer: () => TRenderer;
  model: TModel;
  theme: TTheme;
  projection?: ControlProjection;
  selection?: readonly string[];
  bands?: GraphControllerOptions['bands'];
  trailMaxDepth?: number;
  onReady?: (renderer: TRenderer) => void;
  onChange?: (snapshot: ControlSnapshot) => void;
  onError?: (error: unknown) => void;
}

/**
 * The binding options for a set of binding props. The renderer the factory builds is handed to
 * `onReady` once the binding mounts.
 */
export function bindingOptionsFrom<
  TTheme,
  TRenderer extends BindingRenderer<TTheme>,
  TModel extends ControlModel,
>(props: GraphViewPropsBase<TTheme, TRenderer, TModel>): GraphBindingOptions<TTheme> {
  let renderer: TRenderer | undefined;
  return {
    createRenderer: () => {
      renderer = props.createRenderer();
      return renderer;
    },
    theme: props.theme,
    model: props.model,
    projection: props.projection,
    selection: props.selection,
    bands: props.bands,
    trailMaxDepth: props.trailMaxDepth,
    onReady: () => {
      if (renderer) props.onReady?.(renderer);
    },
    onChange: props.onChange,
    onError: props.onError,
  };
}

const EMPTY_MODEL: ControlModel = { nodes: [], edges: [] };

// One binding owns one container: `mount` creates the renderer and binds the controller, the setters
// push changes, and `dispose` tears both down. Mounting is generation-guarded so a mount that resolves
// after an unmount disposes its own renderer instead of leaking it (React StrictMode double-invokes
// effects, so this path is exercised on every mount in development).
export class GraphBinding<TTheme = unknown> {
  readonly controller: GraphController;

  #createRenderer: () => BindingRenderer<TTheme>;
  #renderer: BindingRenderer<TTheme> | undefined;
  #theme: TTheme;
  #projection: ControlProjection;
  #model: ControlModel;
  #selection: readonly string[];
  #unsubscribeChange: (() => void) | undefined;
  #generation = 0;
  #disposed = false;
  #onReady: GraphBindingOptions<TTheme>['onReady'];
  #onError: GraphBindingOptions<TTheme>['onError'];

  constructor(options: GraphBindingOptions<TTheme>) {
    this.#createRenderer = options.createRenderer;
    this.#theme = options.theme;
    this.#projection = options.projection ?? '2d';
    this.#model = options.model ?? EMPTY_MODEL;
    this.#selection = [...(options.selection ?? [])];
    this.#onReady = options.onReady;
    this.#onError = options.onError;
    this.controller = new GraphController({
      bands: options.bands,
      trailMaxDepth: options.trailMaxDepth,
      selection: this.#selection,
    });
    this.controller.setModel(this.#model);
    if (options.onChange) this.#unsubscribeChange = this.controller.onChange(options.onChange);
  }

  get renderer(): BindingRenderer<TTheme> | undefined {
    return this.#renderer;
  }

  get ready(): boolean {
    return this.#renderer !== undefined;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.#disposed || this.#renderer) return;
    const current = ++this.#generation;
    const renderer = this.#createRenderer();
    try {
      await renderer.mount(container, { theme: this.#theme, projection: this.#projection });
    } catch (error) {
      if (current === this.#generation && !this.#disposed) this.#onError?.(error);
      return;
    }
    if (this.#disposed || current !== this.#generation) {
      renderer.dispose();
      return;
    }
    this.#renderer = renderer;
    this.controller.bind(renderer);
    renderer.setModel(this.#model);
    renderer.setSelection(this.#selection);
    this.#onReady?.(this);
  }

  setModel(model: ControlModel): void {
    this.#model = model;
    this.controller.setModel(model);
    this.#renderer?.setModel(model);
  }

  setTheme(theme: TTheme): void {
    this.#theme = theme;
    this.#renderer?.setTheme(theme);
  }

  setProjection(projection: ControlProjection): void {
    this.#projection = projection;
    this.#renderer?.setProjection(projection);
  }

  // A host-driven selection mirrors into the controller (which applies it to the renderer) but does not
  // extend the trail, matching a renderer-originated selection's trail semantics.
  setSelection(ids: readonly string[]): void {
    this.#selection = [...ids];
    this.controller.select(ids, false);
  }

  fit(ids?: readonly string[]): void {
    this.controller.fit(ids);
  }

  focus(id?: string): void {
    this.controller.focus(id);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#generation++;
    this.#unsubscribeChange?.();
    this.#unsubscribeChange = undefined;
    this.controller.dispose();
    this.#renderer?.dispose();
    this.#renderer = undefined;
  }
}
