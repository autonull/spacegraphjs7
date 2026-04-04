import { InferenceSession, env } from 'onnxruntime-web';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('VisionModelLoader');

export interface ModelLoadResult {
    success: boolean;
    modelKey: string;
    error?: string;
}

export class VisionModelLoader {
    private readonly sessions: Map<string, InferenceSession> = new Map();
    private readonly executionProviders: string[];

    constructor(executionProviders: string[] = ['wasm']) {
        this.executionProviders = executionProviders;
    }

    public get isLoaded(): boolean {
        return this.sessions.size > 0;
    }

    public getSession(key: string): InferenceSession | undefined {
        return this.sessions.get(key);
    }

    public getAvailableModels(): string[] {
        return Array.from(this.sessions.keys());
    }

    async loadModels(modelPaths: Record<string, string>): Promise<ModelLoadResult[]> {
        const results: ModelLoadResult[] = [];

        for (const [key, path] of Object.entries(modelPaths)) {
            try {
                const session = await InferenceSession.create(path, {
                    executionProviders: this.executionProviders,
                });
                this.sessions.set(key, session);
                results.push({ success: true, modelKey: key });
                logger.info('Loaded ONNX model %s from %s', key, path);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                results.push({ success: false, modelKey: key, error: message });
                logger.error('Failed to load ONNX model %s: %s', key, message);
            }
        }

        return results;
    }

    static configureWasmPaths(wasmPaths: string): void {
        env.wasm.wasmPaths = wasmPaths;
    }
}
