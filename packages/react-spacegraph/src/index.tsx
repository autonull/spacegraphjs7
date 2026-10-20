// P8.2 — a React binding over the renderer contract and the `spacegraphjs/control` view controller.
// It owns only the React lifecycle; the mount/update/dispose policy lives in the framework-agnostic
// `GraphBinding`. It is written without JSX so the same source runs under the headless vitest suite.

import { createElement, useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
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
  className?: string;
  style?: CSSProperties;
  onReady?: (renderer: GraphRenderer) => void;
  onChange?: (snapshot: ControlSnapshot) => void;
  onError?: (error: unknown) => void;
}

export const GraphView = (props: GraphViewProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bindingRef = useRef<GraphBinding<RenderTheme> | null>(null);

  // Mount once per container. Prop changes flow through the effects below; a StrictMode double-invoke
  // disposes the first binding, whose pending mount then disposes its own renderer.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: GraphRenderer | undefined;
    const binding = new GraphBinding<RenderTheme>({
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
    bindingRef.current = binding;
    void binding.mount(container);
    return () => {
      binding.dispose();
      if (bindingRef.current === binding) bindingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bindingRef.current?.setModel(props.model);
  }, [props.model]);

  useEffect(() => {
    bindingRef.current?.setTheme(props.theme);
  }, [props.theme]);

  useEffect(() => {
    if (props.projection) bindingRef.current?.setProjection(props.projection);
  }, [props.projection]);

  useEffect(() => {
    bindingRef.current?.setSelection(props.selection ?? []);
  }, [props.selection]);

  return createElement('div', {
    ref: containerRef,
    className: props.className,
    style: { width: '100%', height: '100%', ...props.style },
  });
};
