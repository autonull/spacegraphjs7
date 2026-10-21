// P8.2 — a React binding over the renderer contract and the `spacegraphjs/control` view controller.
// It owns only the React lifecycle; the mount/update/dispose policy lives in the framework-agnostic
// `GraphBinding`. It is written without JSX so the same source runs under the headless vitest suite.

import { createElement, useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import type { GraphRenderer, RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import {
  bindingOptionsFrom,
  GraphBinding,
  type GraphViewPropsBase,
} from 'spacegraphjs/control';

export interface GraphViewProps extends GraphViewPropsBase<RenderTheme, GraphRenderer, RenderModel> {
  className?: string;
  style?: CSSProperties;
}

export const GraphView = (props: GraphViewProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bindingRef = useRef<GraphBinding<RenderTheme> | null>(null);

  // Mount once per container. Prop changes flow through the effects below; a StrictMode double-invoke
  // disposes the first binding, whose pending mount then disposes its own renderer.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const binding = new GraphBinding<RenderTheme>(bindingOptionsFrom(props));
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
