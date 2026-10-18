// P8.2 — a Solid binding over the renderer contract and the `spacegraphjs/control` view controller.
// It owns only the Solid lifecycle; the mount/update/dispose policy lives in the framework-agnostic
// `GraphBinding`. It is written without JSX so the same source runs under the headless vitest suite.

import { createEffect, onCleanup, onMount } from 'solid-js';
import type { GraphRenderer, Projection, RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import { GraphBinding, type ControlSnapshot, type GraphControllerOptions } from 'spacegraphjs/control';

export interface GraphViewProps {
  /** Builds an unmounted contract renderer. Called once per mount; the binding owns its lifecycle. */
  createRenderer: () => GraphRenderer;
  model: RenderModel;
  theme: RenderTheme;
  projection?: Projection;
  selection?: readonly string[];
  bands?: GraphControllerOptions['bands'];
  trailMaxDepth?: number;
  class?: string;
  style?: Record<string, string>;
  onReady?: (renderer: GraphRenderer) => void;
  onChange?: (snapshot: ControlSnapshot) => void;
  onError?: (error: unknown) => void;
}

export const GraphView = (props: GraphViewProps) => {
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  if (props.class) container.className = props.class;
  if (props.style) Object.assign(container.style, props.style);

  let binding: GraphBinding<RenderTheme> | undefined;

  onMount(() => {
    let renderer: GraphRenderer | undefined;
    binding = new GraphBinding<RenderTheme>({
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
    });
    void binding.mount(container);
  });

  createEffect(() => binding?.setModel(props.model));
  createEffect(() => binding?.setTheme(props.theme));
  createEffect(() => {
    const projection = props.projection;
    if (projection) binding?.setProjection(projection);
  });
  createEffect(() => binding?.setSelection(props.selection ?? []));

  onCleanup(() => {
    binding?.dispose();
    binding = undefined;
  });

  return container;
};
