// A unified-diff patch as selectable DOM text: the file header with its counts, and the patch
// lines toned by their marker. The core owns the parsing and the rendering; the host owns the copy
// and the styling.

export type CodeDiffStatus = 'added' | 'deleted' | 'modified';

/** One changed file of a finished turn, as reported by the host's diff source. */
export interface CodeDiff {
    file: string;
    patch: string;
    additions: number;
    deletions: number;
    status: CodeDiffStatus;
}

/**
 * Host-provided loader for a finished turn's changed-file diffs. `from` is the turn's opening
 * message id; the source is already scoped to the current session, so the graph never holds a
 * session id.
 */
export interface CodeDiffSource {
    get: (from: string) => readonly CodeDiff[] | undefined;
    load: (from: string) => void;
}

/** The tone of a patch line, from its marker. */
export type DiffTone = 'added' | 'removed' | 'header' | 'context';

export interface DiffLine {
    text: string;
    tone: DiffTone;
}

/** The tone of one patch line: headers and hunk markers stay muted, additions and deletions stand out. */
export function diffTone(line: string): DiffTone {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'added';
    if (line.startsWith('-')) return 'removed';
    return 'context';
}

/** The patch as toned lines. The last empty line of a patch is dropped. */
export function parsePatch(patch: string): DiffLine[] {
    const lines = patch.split('\n');
    if (lines.at(-1) === '') lines.pop();

    return lines.map((text) => ({ text, tone: diffTone(text) }));
}

export interface CodeDiffRenderOptions {
    /** The class of a patch line, by its tone. */
    toneClass?: (tone: DiffTone) => string | undefined;
    /** The class of a file block. */
    fileClass?: string | undefined;
    /** The accessible name of a file header; defaults to the file path. */
    fileLabel?: (diff: CodeDiff) => string;
    /** Called when a file header is activated. */
    onSelect?: (diff: CodeDiff) => void;
}

/**
 * Renders the diffs into `container` as selectable DOM text. The patch text is written with
 * `textContent`, so a hostile file path or patch line is never markup.
 */
export function renderCodeDiff(
    container: HTMLElement,
    diffs: readonly CodeDiff[],
    options: CodeDiffRenderOptions = {},
): void {
    const root = document.createElement('div');
    root.setAttribute('data-slot', 'code-diff');
    const headers: HTMLElement[] = [];

    for (const diff of diffs) {
        const block = document.createElement('section');
        block.setAttribute('data-slot', 'code-diff-file');
        if (options.fileClass) block.className = options.fileClass;

        const header = document.createElement('header');
        header.setAttribute('data-slot', 'code-diff-header');

        const path = document.createElement('span');
        path.setAttribute('data-slot', 'code-diff-path');
        path.textContent = diff.file;
        path.title = diff.file;

        const additions = document.createElement('span');
        additions.setAttribute('data-slot', 'code-diff-additions');
        additions.textContent = `+${diff.additions}`;

        const deletions = document.createElement('span');
        deletions.setAttribute('data-slot', 'code-diff-deletions');
        deletions.textContent = `-${diff.deletions}`;

        header.append(path, additions, deletions);
        headers.push(header);
        block.append(header);

        const patch = document.createElement('pre');
        patch.setAttribute('data-slot', 'code-diff-patch');

        for (const line of parsePatch(diff.patch)) {
            const element = document.createElement('span');
            element.setAttribute('data-slot', 'code-diff-line');
            element.setAttribute('data-tone', line.tone);
            element.textContent = line.text || ' ';
            const toneClass = options.toneClass?.(line.tone);
            if (toneClass) element.className = toneClass;
            patch.append(element);
        }

        block.append(patch);
        root.append(block);
    }

    container.replaceChildren(root);

    if (!options.onSelect) return;

    for (const [index, header] of headers.entries()) {
        header.addEventListener('click', () => options.onSelect?.(diffs[index]!));
    }
}
