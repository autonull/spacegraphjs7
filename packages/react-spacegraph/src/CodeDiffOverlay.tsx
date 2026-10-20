// A unified-diff patch as selectable DOM text: the file header with its counts, and the patch lines
// toned by their marker. The core owns the parsing and the rendering; this binding owns the
// lifecycle and the host's styling.

import { createElement, useEffect, useRef, type ReactElement } from 'react';
import { renderCodeDiff, type CodeDiff, type DiffTone } from 'spacegraphjs/overlays';

export interface CodeDiffOverlayProps {
    /** The changed files of the diff. */
    diffs: readonly CodeDiff[];
    /** The class of a patch line, by its tone. */
    toneClass?: (tone: DiffTone) => string | undefined;
    /** The class of a file block. */
    fileClass?: string | undefined;
    /** Called when a file header is activated. */
    onSelect?: (diff: CodeDiff) => void;
}

export const CodeDiffOverlay = (props: CodeDiffOverlayProps): ReactElement => {
    const host = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!host.current) return;
        renderCodeDiff(host.current, props.diffs, {
            toneClass: props.toneClass,
            fileClass: props.fileClass,
            onSelect: props.onSelect,
        });
    });

    return createElement('div', { ref: host, 'data-slot': 'code-diff-host' });
};
