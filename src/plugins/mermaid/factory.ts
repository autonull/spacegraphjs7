import type { DiagramFormat, DiagramParseResult } from './types';
import { DOTParser } from './parsers/dot';
import { GraphMLParser } from './parsers/graphml';
import { JSONDiagramParser } from './parsers/json';
import { MermaidParser } from './parsers/mermaid';

export class DiagramParserFactory {
    private static parsers = {
        mermaid: new MermaidParser(),
        dot: new DOTParser(),
        graphml: new GraphMLParser(),
        json: new JSONDiagramParser(),
    };

    static parse(content: string, format?: DiagramFormat): DiagramParseResult {
        const detected = format ?? this.detectFormat(content);
        const parser = this.parsers[detected];

        return parser ? parser.parse(content) : this.parsers.mermaid.parse(content);
    }

    static getSupportedFormats(): DiagramFormat[] {
        return Object.keys(this.parsers) as DiagramFormat[];
    }

    static detectFormat(content: string): DiagramFormat {
        const trimmed = content.trim();

        if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ')) return 'mermaid';
        if (
            trimmed.startsWith('digraph') ||
            (trimmed.startsWith('graph') && trimmed.includes('->'))
        )
            return 'dot';
        if (trimmed.startsWith('<?xml') || trimmed.includes('<graphml')) return 'graphml';
        if (trimmed.startsWith('{')) return 'json';

        return 'mermaid';
    }
}
