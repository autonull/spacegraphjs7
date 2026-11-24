// One host-callable quality floor. It reads a graph spec or a `RenderModel`, returns a report, and
// applies only measured, re-verified corrections. Preferences are reported but never flipped.
import { gradeFor, type VisionGrade } from '../vision/grade';

export type QualityPosition = readonly [number, number, number] | { readonly x: number; readonly y: number; readonly z?: number };

export interface QualityNode {
    readonly id: string;
    readonly label?: string;
    readonly position?: QualityPosition;
    readonly kind?: string;
    readonly type?: string;
    readonly visible?: boolean;
    readonly data?: Record<string, unknown>;
}

export interface QualityEdge {
    readonly id?: string;
    readonly source?: string;
    readonly target?: string;
}

export interface QualityModel {
    readonly nodes: readonly QualityNode[];
    readonly edges?: readonly QualityEdge[];
}

export type QualityCode =
    | 'overlap'
    | 'missing-label'
    | 'dom-budget'
    | 'edge-endpoint'
    | 'preference'
    | 'a11y-mirror'
    | 'a11y-missing-item'
    | 'a11y-role'
    | 'a11y-tabindex'
    | 'direction-mismatch'
    | 'motion-mismatch';

export interface QualityIssue {
    readonly code: QualityCode;
    readonly nodeIds: readonly string[];
    readonly message: string;
    readonly autofix: boolean;
}

export interface QualityReport {
    readonly score: number;
    readonly issues: readonly QualityIssue[];
    readonly budgets: { readonly domNodes: number; readonly maxDomNodes: number };
}

export interface QualityOptions {
    readonly minScore?: number;
    readonly maxDomNodes?: number;
    readonly overlapDistance?: number;
    readonly preferences?: readonly string[];
    /** The host's hidden DOM mirror. When supplied, accessibility assertions run against it. */
    readonly dom?: ParentNode;
    readonly direction?: 'ltr' | 'rtl';
    readonly reducedMotion?: boolean;
}

export interface CorrectionOutcome {
    readonly before: QualityReport;
    readonly after: QualityReport;
    readonly applied: readonly string[];
    readonly model: QualityModel;
}

const WEIGHTS: Record<QualityCode, number> = {
    overlap: 20,
    'missing-label': 10,
    'dom-budget': 25,
    'edge-endpoint': 15,
    preference: 0,
    'a11y-mirror': 15,
    'a11y-missing-item': 10,
    'a11y-role': 5,
    'a11y-tabindex': 5,
    'direction-mismatch': 10,
    'motion-mismatch': 10,
};

const point = (position: QualityNode['position']): [number, number, number] => {
    if (Array.isArray(position)) return [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
    if (position && typeof position === 'object') {
        const xyz = position as { readonly x: number; readonly y: number; readonly z?: number };
        return [xyz.x ?? 0, xyz.y ?? 0, xyz.z ?? 0];
    }
    return [0, 0, 0];
};

const isDomNode = (node: QualityNode): boolean =>
    node.kind === 'widget' ||
    node.type === 'HtmlNode' ||
    node.type === 'WidgetNode' ||
    Boolean(node.data?.html);

export function checkQuality(model: QualityModel, options: QualityOptions = {}): QualityReport {
    const maxDomNodes = options.maxDomNodes ?? 80;
    const overlapDistance = options.overlapDistance ?? 24;
    const nodes = model.nodes.filter((node) => node.visible !== false);
    const ids = new Set(nodes.map((node) => node.id));
    const points = nodes.map((node) => point(node.position));
    const issues: QualityIssue[] = [];
    const issue = (code: QualityCode, nodeIds: readonly string[], message: string, autofix = false) =>
        issues.push({ code, nodeIds, message, autofix });

    for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
            const a = points[first]!;
            const b = points[second]!;
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < overlapDistance) {
                const from = nodes[first]!.id;
                const to = nodes[second]!.id;
                issue('overlap', [from, to], `${from} and ${to} overlap at this zoom`, true);
            }
        }
    }

    for (const node of nodes) {
        if (!node.label) issue('missing-label', [node.id], `${node.id} has no accessible label`, true);
    }

    const domNodes = nodes.filter(isDomNode).length;
    if (domNodes > maxDomNodes)
        issue('dom-budget', [], `${domNodes} DOM cards exceed the ${maxDomNodes}-card budget`);

    for (const edge of model.edges ?? []) {
        if (!edge.source || !edge.target || !ids.has(edge.source) || !ids.has(edge.target))
            issue(
                'edge-endpoint',
                [edge.source ?? '', edge.target ?? ''].filter(Boolean),
                `${edge.id ?? 'edge'} does not connect two visible nodes`,
            );
    }

    for (const preference of options.preferences ?? [])
        issue('preference', [], `${preference} is a preference; log a human decision under ADR 0008`);

    if (options.dom) {
        const mirror = [...options.dom.querySelectorAll('[data-id]')];
        if (mirror.length === 0) issue('a11y-mirror', [], 'no hidden DOM mirror items were supplied');
        for (const node of nodes) {
            const item = mirror.find((element) => element.getAttribute('data-id') === node.id);
            if (!item) {
                issue('a11y-missing-item', [node.id], `${node.id} is absent from the DOM mirror`);
                continue;
            }
            if (!item.getAttribute('role') && item.tagName !== 'LI')
                issue('a11y-role', [node.id], `${node.id} has no role in the DOM mirror`);
            if (item.getAttribute('tabindex') === null)
                issue('a11y-tabindex', [node.id], `${node.id} is not keyboard reachable`);
        }
        const root = options.dom as Element;
        const direction = root.getAttribute?.('dir') ?? options.dom.querySelector('[dir]')?.getAttribute('dir');
        if (options.direction && direction && direction !== options.direction)
            issue('direction-mismatch', [], `DOM direction is ${direction}, expected ${options.direction}`);
        const reduced =
            root.getAttribute?.('data-reduced-motion') ??
            options.dom.querySelector('[data-reduced-motion]')?.getAttribute('data-reduced-motion');
        if (options.reducedMotion === true && reduced !== 'true')
            issue('motion-mismatch', [], 'reduced motion is requested but the host does not declare it');
    }

    const score = Math.max(0, 100 - issues.reduce((total, issue) => total + WEIGHTS[issue.code], 0));
    if (options.minScore !== undefined && score < options.minScore) {
        throw new Error(`quality floor ${options.minScore} not met (score ${score}): ${issues.map((issue) => issue.code).join(', ')}`);
    }
    return { score, issues, budgets: { domNodes, maxDomNodes } };
}

function clone(model: QualityModel): QualityModel {
    return {
        nodes: model.nodes.map((node) => ({
            ...node,
            position: point(node.position),
            visible: node.visible,
        })),
        edges: model.edges?.map((edge) => ({ ...edge })),
    };
}

const fix = (model: QualityModel, issue: QualityIssue): boolean => {
    if (issue.code === 'missing-label') {
        const node = model.nodes.find((candidate) => candidate.id === issue.nodeIds[0]);
        if (!node) return false;
        (node as { label?: string }).label = node.id;
        return true;
    }
    if (issue.code === 'overlap') {
        const node = model.nodes.find((candidate) => candidate.id === issue.nodeIds[1]);
        if (!node) return false;
        const [x, y, z] = point(node.position);
        (node as unknown as { position: [number, number, number] }).position = [x + 32, y, z];
        return true;
    }
    return false;
};

export interface SpaceGraphVisionReport extends QualityReport {
    readonly minScore: number;
    readonly passed: boolean;
    readonly grade: VisionGrade;
}

export interface VisionAssertions {
    noOverlap(): void;
    noMissingLabels(): void;
    noInvalidEdges(): void;
    withinDomBudget(): void;
    accessible(): void;
    meetsFloor(minScore?: number): void;
}

const checkOptionsOf = ({ minScore: _minScore, ...checkOptions }: QualityOptions): QualityOptions =>
    checkOptions;

export function spacegraphVision(model: QualityModel, options: QualityOptions = {}): SpaceGraphVisionReport {
    const minScore = options.minScore ?? 80;
    const report = checkQuality(model, checkOptionsOf(options));
    return { ...report, minScore, passed: report.score >= minScore, grade: gradeFor(report.score) };
}

export function visionAssert(model: QualityModel, options: QualityOptions = {}): VisionAssertions {
    const checkOptions = checkOptionsOf(options);
    const requireNo = (name: string, codes: readonly QualityCode[]) => {
        const found = checkQuality(model, checkOptions).issues.filter((issue) => codes.includes(issue.code));
        if (!found.length) return;
        const detail = found.map((issue) => `${issue.code}(${issue.nodeIds.join('+')})`).join(', ');
        throw new Error(`visionAssert.${name} failed: ${detail}`);
    };
    return {
        noOverlap: () => requireNo('noOverlap', ['overlap']),
        noMissingLabels: () => requireNo('noMissingLabels', ['missing-label']),
        noInvalidEdges: () => requireNo('noInvalidEdges', ['edge-endpoint']),
        withinDomBudget: () => requireNo('withinDomBudget', ['dom-budget']),
        accessible: () => requireNo('accessible', [
            'a11y-mirror',
            'a11y-missing-item',
            'a11y-role',
            'a11y-tabindex',
            'direction-mismatch',
            'motion-mismatch',
        ]),
        meetsFloor: (minScore = 80) => {
            const report = checkQuality(model, checkOptions);
            if (report.score < minScore) {
                throw new Error(`quality floor ${minScore} not met (score ${report.score}): ${report.issues.map((issue) => issue.code).join(', ')}`);
            }
        },
    };
}

export function correctQuality(model: QualityModel, options: QualityOptions & { maxEdits?: number } = {}): CorrectionOutcome {
    const maxEdits = options.maxEdits ?? 3;
    const checkOptions = checkOptionsOf(options);
    const working = clone(model);
    const before = checkQuality(working, checkOptions);
    let report = before;
    const applied: string[] = [];

    for (let edit = 0; edit < maxEdits; edit += 1) {
        const issue = report.issues.find((candidate) => candidate.autofix);
        if (!issue) break;
        const candidate = clone(working);
        if (!fix(candidate, issue)) break;
        const next = checkQuality(candidate, checkOptions);
        if (next.score <= report.score) break;
        Object.assign(working, candidate);
        report = next;
        applied.push(`${issue.code}:${issue.nodeIds.join('+')}`);
    }

    return { before, after: report, applied, model: working };
}
