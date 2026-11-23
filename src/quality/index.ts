// One host-callable quality floor. It reads a graph spec or a `RenderModel`, returns a report, and
// applies only measured, re-verified corrections. Preferences are reported but never flipped.
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

export type QualityCode = 'overlap' | 'missing-label' | 'dom-budget' | 'edge-endpoint' | 'preference';

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
    const issues: QualityIssue[] = [];

    for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
            const a = point(nodes[first]!.position);
            const b = point(nodes[second]!.position);
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < overlapDistance) {
                issues.push({
                    code: 'overlap',
                    nodeIds: [nodes[first]!.id, nodes[second]!.id],
                    message: `${nodes[first]!.id} and ${nodes[second]!.id} overlap at this zoom`,
                    autofix: true,
                });
            }
        }
    }

    for (const node of nodes) {
        if (!node.label) {
            issues.push({
                code: 'missing-label',
                nodeIds: [node.id],
                message: `${node.id} has no accessible label`,
                autofix: true,
            });
        }
    }

    const domNodes = nodes.filter(isDomNode).length;
    if (domNodes > maxDomNodes) {
        issues.push({
            code: 'dom-budget',
            nodeIds: [],
            message: `${domNodes} DOM cards exceed the ${maxDomNodes}-card budget`,
            autofix: false,
        });
    }

    for (const edge of model.edges ?? []) {
        if (!edge.source || !edge.target || !ids.has(edge.source) || !ids.has(edge.target)) {
            issues.push({
                code: 'edge-endpoint',
                nodeIds: [edge.source ?? '', edge.target ?? ''].filter(Boolean),
                message: `${edge.id ?? 'edge'} does not connect two visible nodes`,
                autofix: false,
            });
        }
    }

    for (const preference of options.preferences ?? []) {
        issues.push({
            code: 'preference',
            nodeIds: [],
            message: `${preference} is a preference; log a human decision under ADR 0008`,
            autofix: false,
        });
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

export function correctQuality(model: QualityModel, options: QualityOptions & { maxEdits?: number } = {}): CorrectionOutcome {
    const maxEdits = options.maxEdits ?? 3;
    const { minScore: _minScore, ...checkOptions } = options;
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
