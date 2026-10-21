// P8.2 — a Solid binding over the renderer contract and the `spacegraphjs/control` view controller.
// It owns only the Solid lifecycle; the mount/update/dispose policy lives in the framework-agnostic
// `GraphBinding`. It is written without JSX so the same source runs under the headless vitest suite.

import { createEffect, onCleanup, onMount } from 'solid-js';
import type { GraphRenderer, RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import {
  bindingOptionsFrom,
  GraphBinding,
  type GraphViewPropsBase,
} from 'spacegraphjs/control';

export interface GraphViewProps extends GraphViewPropsBase<RenderTheme, GraphRenderer, RenderModel> {
  class?: string;
  style?: Record<string, string>;
}

export const GraphView = (props: GraphViewProps) => {
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  if (props.class) container.className = props.class;
  if (props.style) Object.assign(container.style, props.style);

  let binding: GraphBinding<RenderTheme> | undefined;

  onMount(() => {
    binding = new GraphBinding<RenderTheme>(bindingOptionsFrom(props));
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
