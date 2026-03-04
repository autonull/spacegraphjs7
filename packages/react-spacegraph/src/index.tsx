import React, { useEffect, useRef } from 'react';
import { SpaceGraph } from 'spacegraphjs';
import type { GraphSpec, SpaceGraphOptions } from 'spacegraphjs';

export interface SpaceGraphProps {
    spec?: GraphSpec;
    url?: string;
    options?: SpaceGraphOptions;
    className?: string;
    style?: React.CSSProperties;
    onReady?: (sg: SpaceGraph) => void;
}

export const SpaceGraphComponent: React.FC<SpaceGraphProps> = ({ spec, url, options, className, style, onReady }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sgRef = useRef<SpaceGraph | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let isMounted = true;

        const init = async () => {
            if (url) {
                const sg = await SpaceGraph.fromURL(url, containerRef.current!, options);
                if (!isMounted) { sg.dispose(); return; }
                sgRef.current = sg;
                if (onReady) onReady(sg);
            } else {
                const sg = new SpaceGraph(containerRef.current!, options);
                if (spec) sg.graph.fromJSON(spec);
                sgRef.current = sg;
                if (onReady) onReady(sg);
            }
        };

        init();

        return () => {
            isMounted = false;
            if (sgRef.current) {
                sgRef.current.dispose();
                sgRef.current = null;
            }
        };
    }, [spec, url]); // Simple implementation. Advanced would diff spec.

    return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
};

export default SpaceGraphComponent;
