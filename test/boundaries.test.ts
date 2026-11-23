// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// L1.34: enforce the dependency direction from §4.1. The core stays pure, the contract has no
// runtime dependencies, and the adapters stay leaves.
// Type-only imports from @spacegraphjs/renderer are allowed in core (shared contract types).

const root = resolve(__dirname, '..');
const STATIC_IMPORT = /(?:^|\n)\s*import\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;

function staticImportsIn(dir: string): string[] {
    const base = resolve(root, dir);
    return readdirSync(base, { recursive: true, encoding: 'utf8' })
        .filter((entry) => /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
        .flatMap((entry) =>
            [...readFileSync(resolve(base, entry), 'utf8').matchAll(STATIC_IMPORT)].map(
                (m) => m[1]!,
            ),
        );
}

const CORE_FORBIDDEN = [
    '@spacegraphjs/spacegraph-renderer',
    '@spacegraphjs/cytoscape-renderer',
    '@spacegraphjs/svg-renderer',
    'cytoscape',
];

// @spacegraphjs/renderer type-only imports are allowed in core
function hasRuntimeImport(specifier: string, content: string): boolean {
    const importRegex = new RegExp(`import\\s+(?:[^\\n]*?\\s)?from\\s*['"]${specifier}['"]`, 'g');
    const match = content.match(importRegex);
    // If there's no 'import type' prefix, it's a runtime import
    return match?.some((m) => !m.includes('import type')) ?? false;
}

const PROMOTIONS: readonly { helper: string; source: string }[] = [
    { helper: 'representationRung', source: 'src/salience/representation.ts' },
    { helper: 'createPhysicsPlaySession', source: 'src/world/PhysicsPlaySession.ts' },
    { helper: 'createCameraMotionHandlers', source: 'src/motion/camera-handlers.ts' },
];

describe('promoted helper reuse', () => {
    const piSources = readdirSync(resolve(root, 'app/pi/src'), { encoding: 'utf8' })
        .filter((entry) => /\.ts$/.test(entry))
        .map((entry) => readFileSync(resolve(root, 'app/pi/src', entry), 'utf8'))
        .join('\n');

    for (const { helper, source } of PROMOTIONS) {
        it(`${helper} has one library definition and two host callers`, () => {
            const library = readFileSync(resolve(root, source), 'utf8');
            expect(library).toContain(helper);
            expect(readFileSync(resolve(root, 'app/pi/src/host.ts'), 'utf8')).toContain(helper);
            expect(readFileSync(resolve(root, 'app/demo/second-host.ts'), 'utf8')).toContain(
                helper,
            );
            expect(piSources).not.toContain(`export const ${helper}`);
            expect(piSources).not.toContain(`export function ${helper}`);
        });
    }
});

describe('touch recognizer promotion', () => {
    it('has one library definition and two host consumers', () => {
        expect(readFileSync(resolve(root, 'src/input/TouchRecognizer.ts'), 'utf8')).toContain(
            'export class TouchRecognizer',
        );
        expect(readFileSync(resolve(root, 'app/pi/src/touch.ts'), 'utf8')).toContain(
            'TouchRecognizer',
        );
        expect(readFileSync(resolve(root, 'app/demo/second-host.ts'), 'utf8')).toContain(
            'TouchRecognizer',
        );
        expect(readFileSync(resolve(root, 'app/pi/src/touch.ts'), 'utf8')).not.toContain(
            'export class TouchRecognizer',
        );
    });
});

describe('instrument kit promotion', () => {
    it('has one library definition and two host consumers', () => {
        expect(readFileSync(resolve(root, 'src/widgets/instrument-kit.ts'), 'utf8')).toContain(
            'export const createInstrumentKit',
        );
        expect(readFileSync(resolve(root, 'app/pi/src/host.ts'), 'utf8')).toContain(
            'createInstrumentKit(',
        );
        expect(
            readFileSync(resolve(root, 'app/demo/html/layout/graph-ide.html'), 'utf8'),
        ).toContain('createInstrumentKit(');
    });
});

describe('package boundaries', () => {
    it('keeps the core free of the contract, adapters, and Cytoscape', () => {
        const coreImports = staticImportsIn('src');
        for (const specifier of CORE_FORBIDDEN) {
            expect(coreImports).not.toContain(specifier);
        }
        // @spacegraphjs/renderer type-only imports are allowed; check no runtime imports
        const rendererImportContent = readdirSync(resolve(root, 'src'), {
            recursive: true,
            encoding: 'utf8',
        })
            .filter((entry) => /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
            .flatMap((entry) => readFileSync(resolve(root, 'src', entry), 'utf8'))
            .join('\n');
        expect(hasRuntimeImport('@spacegraphjs/renderer', rendererImportContent)).toBe(false);
    });

    it('keeps the contract dependency-free', () => {
        // The contract may use its own modules; it may not reach for a package or a bare specifier.
        expect(
            staticImportsIn('packages/renderer/src').filter(
                (specifier) => !specifier.startsWith('.'),
            ),
        ).toEqual([]);
    });

    it('keeps the kernel dependency-free', () => {
        expect(
            staticImportsIn('packages/kernel/src').filter(
                (specifier) => !specifier.startsWith('.'),
            ),
        ).toEqual([]);
    });

    it('keeps the Cytoscape adapter off the core', () => {
        for (const specifier of ['spacegraphjs', 'spacegraphjs/core', 'spacegraphjs/activity']) {
            expect(staticImportsIn('packages/cytoscape-renderer/src')).not.toContain(specifier);
        }
    });

    it('keeps the SVG renderer on the contract only', () => {
        for (const specifier of [
            'spacegraphjs',
            'spacegraphjs/core',
            'spacegraphjs/activity',
            'cytoscape',
        ]) {
            expect(staticImportsIn('packages/svg-renderer/src')).not.toContain(specifier);
        }
    });

    it('keeps the model adapter on the contract only', () => {
        const imports = staticImportsIn('packages/adapter/src');
        expect(imports).toContain('@spacegraphjs/renderer');
        for (const specifier of [
            'spacegraphjs',
            'spacegraphjs/core',
            'spacegraphjs/activity',
            'cytoscape',
        ]) {
            expect(imports).not.toContain(specifier);
        }
    });

    it('only the SpaceGraph adapter imports the core and the contract together', () => {
        const imports = staticImportsIn('packages/spacegraph-renderer/src');
        expect(imports).toContain('@spacegraphjs/renderer');
        expect(imports).toContain('spacegraphjs/activity');
    });

    it('keeps the framework bindings on the contract and the controller, not core internals', () => {
        for (const dir of ['packages/react-spacegraph/src', 'packages/solid-spacegraph/src']) {
            const imports = staticImportsIn(dir);
            expect(imports).toContain('@spacegraphjs/renderer');
            expect(imports).toContain('spacegraphjs/control');
            for (const specifier of [
                'spacegraphjs',
                'spacegraphjs/core',
                'spacegraphjs/activity',
            ]) {
                expect(imports).not.toContain(specifier);
            }
        }
    });
});
