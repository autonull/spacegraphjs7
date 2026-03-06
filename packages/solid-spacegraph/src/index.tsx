import { createEffect, onCleanup, onMount } from 'solid-js';
import { SpaceGraph } from 'spacegraphjs';
import type { GraphSpec, SpaceGraphOptions } from 'spacegraphjs';

export interface SpaceGraphProps {
    spec?: GraphSpec;
    url?: string;
    options?: SpaceGraphOptions;
    class?: string;
    style?: any;
    onReady?: (sg: SpaceGraph) => void;
}

export const SpaceGraphComponent = (props: SpaceGraphProps) => {
    let containerRef: HTMLDivElement | undefined;
    let sgInstance: SpaceGraph | null = null;

    onMount(() => {
        if (!containerRef) return;

        if (props.url) {
            SpaceGraph.fromURL(props.url, containerRef, props.options).then(sg => {
                sgInstance = sg;
                if (props.onReady) props.onReady(sg);
            });
        } else {
            sgInstance = new SpaceGraph(containerRef, props.options);
            if (props.spec) {
                sgInstance.graph.fromJSON(props.spec);
            }
            if (props.onReady) props.onReady(sgInstance);
        }
    });

    createEffect(() => {
        if (sgInstance && props.spec && !props.url) {
            // Very naive diffing: just replace the graph. 
            // Better implementations would map Solid's reactive state to SpaceGraph's mutable state natively.
            sgInstance.graph.clear();
            sgInstance.graph.fromJSON(props.spec);
        }
    });

    onCleanup(() => {
        if (sgInstance) {
            sgInstance.dispose();
            sgInstance = null;
        }
    });

    return (
        <div
            ref={containerRef}
            class={props.class}
            style={{ width: '100%', height: '100%', ...props.style }}
        />
    );
};

export default SpaceGraphComponent;
