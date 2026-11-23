import { resolve } from 'node:path';
import ts from 'typescript';

/** TypeScript options from the repository config, with no emit. */
export function compilerOptions(root: string): ts.CompilerOptions {
    const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
    if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    return {
        ...ts.parseJsonConfigFileContent(config.config, ts.sys, root).options,
        noEmit: true,
    };
}

/** Exported names of each module, read from source or packed declarations by the same code. */
export function exportedNames(files: readonly string[], options: ts.CompilerOptions): Map<string, string[]> {
    const program = ts.createProgram([...files], options);
    const checker = program.getTypeChecker();
    return new Map(
        files.map((file) => {
            const source = program.getSourceFile(file);
            const symbol = source && checker.getSymbolAtLocation(source);
            const names = symbol
                ? checker.getExportsOfModule(symbol).map((exported) => exported.getName())
                : [];
            return [file, [...new Set(names)].filter((name) => name !== 'default').sort()];
        }),
    );
}
