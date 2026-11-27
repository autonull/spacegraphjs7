/**
 * Build-time scan of the SpaceGraphJS API. The TypeScript compiler API stays in Node; the browser
 * receives only a small serializable snapshot consumed by `@spacegraphjs/source`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import type {
    SourceFileRecord,
    SourceImportRecord,
    SourceSnapshot,
    SourceSymbolKind,
    SourceSymbolRecord,
} from '../packages/domain/source/src/snapshot';

const workspace = resolve(import.meta.dirname, '..');
const outputFlag = process.argv.indexOf('--out');
const output = resolve(
    workspace,
    outputFlag >= 0 ? process.argv[outputFlag + 1]! : 'public/source-graph/source-api.json',
);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-demo', '.turbo', '.git', 'coverage']);

const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (SKIP_DIRS.has(entry.name)) return [];
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
            !entry.name.endsWith('.d.ts') &&
            !entry.name.endsWith('.test.ts') &&
            !entry.name.endsWith('.spec.ts')
            ? [full]
            : [];
    });

const packageNames = new Map(
    readdirSync(resolve(workspace, 'packages'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
            const manifest = resolve(workspace, 'packages', entry.name, 'package.json');
            if (!existsSync(manifest)) return [];
            const { name } = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
            return name ? ([[entry.name, name]] as const) : [];
        }),
);

const packageOf = (rel: string): string | undefined => {
    const path = rel.split(sep).join('/');
    if (path.startsWith('src/')) return 'spacegraphjs';
    const domain = /^packages\/domain\/([^/]+)\/src\//.exec(path);
    if (domain) return `@spacegraphjs/${domain[1]}`;
    const pkg = /^packages\/([^/]+)\/src\//.exec(path);
    return pkg ? packageNames.get(pkg[1]) : undefined;
};

const fileID = (rel: string): string =>
    relative(workspace, rel).split(sep).join('/').replace(/\.tsx?$/, '');

const sourceFiles = [...walk(resolve(workspace, 'src')), ...walk(resolve(workspace, 'packages'))]
    .filter((abs) => Boolean(packageOf(relative(workspace, abs))))
    .sort();

const ids = new Set(sourceFiles.map(fileID));
const byPackageAndPath = new Map<string, string>();
for (const id of ids) {
    const name = packageOf(`${id}.ts`);
    if (!name) continue;
    const path = id.includes('/src/') ? id.slice(id.indexOf('/src/') + 5) : id.slice(4);
    byPackageAndPath.set(`${name}:${path}`, id);
    if (path.endsWith('/index')) byPackageAndPath.set(`${name}:${path.slice(0, -'/index'.length)}`, id);
}

const resolveSpecifier = (fromID: string, specifier: string): string | undefined => {
    if (specifier.startsWith('.')) {
        const base = resolve(workspace, dirname(fromID), specifier);
        const rel = relative(workspace, base).split(sep).join('/');
        return [rel, `${rel}.ts`, `${rel}/index.ts`, `${rel}.tsx`, `${rel}/index.tsx`]
            .map((candidate) => candidate.replace(/\.tsx?$/, ''))
            .find((candidate) => ids.has(candidate));
    }
    if (specifier === 'spacegraphjs' || specifier.startsWith('spacegraphjs/')) {
        const sub = specifier === 'spacegraphjs' ? 'index' : specifier.slice('spacegraphjs/'.length);
        return byPackageAndPath.get(`spacegraphjs:${sub}`);
    }
    if (specifier.startsWith('@spacegraphjs/')) {
        const [name, ...rest] = specifier.slice(1).split('/');
        const sub = rest.length ? rest.join('/') : 'index';
        return byPackageAndPath.get(`@${name}:${sub}`);
    }
    return undefined;
};

const kindOf = (node: ts.Declaration): SourceSymbolKind | undefined => {
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isEnumDeclaration(node)) return 'enum';
    if (ts.isModuleDeclaration(node)) return 'namespace';
    if (ts.isVariableDeclaration(node)) return 'const';
    return undefined;
};

const signatureOf = (node: ts.Declaration, source: ts.SourceFile): string =>
    node
        .getText(source)
        .split('\n')[0]!
        .replace(/\s+/g, ' ')
        .slice(0, 180);

const docOf = (node: ts.Declaration, source: ts.SourceFile): string | undefined => {
    const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
    const comment = ranges.find((range) => range.kind === ts.SyntaxKind.MultiLineCommentTrivia);
    if (!comment) return undefined;
    const text = source.text
        .slice(comment.pos, comment.end)
        .replace(/^\/\*\*?|\*?\/$|\*/g, '')
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean);
    return text?.slice(0, 240);
};

const identifierNames = (node: ts.Node): string[] => {
    const names: string[] = [];
    let visited = 0;
    const stack: ts.Node[] = [node];
    while (stack.length && visited < 600 && names.length < 40) {
        const current = stack.pop()!;
        visited += 1;
        if (ts.isIdentifier(current)) names.push(current.text);
        ts.forEachChild(current, (child) => stack.push(child));
    }
    return [...new Set(names)];
};

const exportedDeclarations = (source: ts.SourceFile): ts.Declaration[] =>
    source.statements.flatMap((statement) => {
        if (!ts.canHaveModifiers(statement)) return [];
        const modifiers = ts.getModifiers(statement) ?? [];
        if (!modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return [];
        if (ts.isVariableStatement(statement)) return [...statement.declarationList.declarations];
        return [statement as ts.Declaration];
    });

const nameOf = (node: ts.Declaration): string | undefined =>
    node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;

const program = ts.createProgram(sourceFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
});

const rawSymbols: (SourceSymbolRecord & { readonly nameKey: string })[] = [];
const imports = new Map<string, SourceImportRecord[]>();

for (const abs of sourceFiles) {
    const id = fileID(abs);
    const source = program.getSourceFile(abs);
    if (!source) continue;
    const entries: SourceImportRecord[] = [];
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
            const specifier = statement.moduleSpecifier.text;
            const names: string[] = [];
            const clause = statement.importClause;
            if (clause?.name) names.push('default');
            if (clause?.namedBindings) {
                if (ts.isNamespaceImport(clause.namedBindings)) names.push('*');
                else
                    names.push(
                        ...clause.namedBindings.elements.map((element) => element.name.text),
                    );
            }
            const fileId = resolveSpecifier(id, specifier);
            if (fileId) entries.push({ specifier, fileId, names, kind: 'import' });
            continue;
        }
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
            const specifier = statement.moduleSpecifier.text;
            const names = statement.exportClause && ts.isNamedExports(statement.exportClause)
                ? statement.exportClause.elements.map((element) => element.name.text)
                : ['*'];
            const fileId = resolveSpecifier(id, specifier);
            if (fileId) entries.push({ specifier, fileId, names, kind: 'export' });
        }
    }
    imports.set(id, entries);

    for (const declaration of exportedDeclarations(source)) {
        const kind = kindOf(declaration);
        const name = nameOf(declaration);
        if (!kind || !name) continue;
        const line = source.getLineAndCharacterOfPosition(declaration.getStart(source)).line + 1;
        rawSymbols.push({
            name,
            kind,
            fileId: id,
            line,
            signature: signatureOf(declaration, source),
            ...(docOf(declaration, source) ? { doc: docOf(declaration, source)! } : {}),
            nameKey: `${id}:${name}`,
        });
    }
}

const byName = new Map<string, string[]>();
for (const symbol of rawSymbols) {
    const names = byName.get(symbol.name) ?? [];
    names.push(symbol.nameKey);
    byName.set(symbol.name, names);
}

const files: SourceFileRecord[] = sourceFiles.map((abs) => {
    const id = fileID(abs);
    return {
        id,
        path: relative(workspace, abs).split(sep).join('/'),
        packageId: packageOf(relative(workspace, abs))!,
        symbols: rawSymbols
            .filter((symbol) => symbol.fileId === id)
            .sort((a, b) => a.line - b.line)
            .map(({ nameKey: _nameKey, ...symbol }): SourceSymbolRecord => symbol),
        imports: (imports.get(id) ?? []).sort((a, b) => a.specifier.localeCompare(b.specifier)),
    };
});

/** A reference edge means "this exported declaration mentions that exported symbol". */
const records = new Map(
    files.flatMap((file) =>
        file.symbols.map((symbol): [string, SourceSymbolRecord] => [
            `${symbol.fileId}:${symbol.name}`,
            symbol,
        ]),
    ),
);
for (const file of files) {
    const source = program.getSourceFile(resolve(workspace, `${file.id}.ts`));
    if (!source) continue;
    for (const declaration of exportedDeclarations(source)) {
        const name = nameOf(declaration);
        if (!name) continue;
        const key = `${file.id}:${name}`;
        const record = records.get(key);
        if (!record) continue;
        const references = identifierNames(declaration)
            .flatMap((identifier) => byName.get(identifier) ?? [])
            .filter((target) => target !== key && !target.startsWith(`${file.id}:`))
            .slice(0, 6);
        if (references.length) Object.assign(record, { references });
    }
}

const snapshot: SourceSnapshot = {
    id: 'spacegraphjs',
    label: 'SpaceGraphJS API',
    files,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`);
const symbols = files.reduce((total, file) => total + file.symbols.length, 0);
const edges = files.reduce((total, file) => total + file.imports.length, 0);
console.log(
    `source snapshot: ${files.length} files, ${symbols} exported symbols, ${edges} import/export edges → ${relative(workspace, output)}`,
);
