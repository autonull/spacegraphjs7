export interface SpaceGraphErrorOptions { namespace?: string; operation: string; reason?: string; cause?: unknown; }

export class SpaceGraphError extends Error {
    public readonly cause: unknown;
    public readonly operation: string;
    constructor(message: string, options: SpaceGraphErrorOptions) { super(message); this.name = 'SpaceGraphError'; this.operation = options.operation; this.cause = options.cause; }
}

export class NotImplementedError extends SpaceGraphError { constructor(feature = 'Not implemented') { super(feature, { operation: 'NotImplemented' }); this.name = 'NotImplementedError'; } }

export function wrapError(error: unknown, options: Omit<SpaceGraphErrorOptions, 'cause'> & { cause?: unknown }): SpaceGraphError {
    const namespace = options.namespace ?? 'SpaceGraph';
    const operation = options.operation;
    const reason = options.reason ?? (error instanceof Error ? error.message : String(error));
    const message = `[${namespace}] ${operation} Error: ${reason}`;
    return Object.assign(new SpaceGraphError(message, { ...options, cause: error }), { cause: error });
}

export function wrapAndThrow<T extends SpaceGraphErrorOptions>(error: unknown, options: T, logger?: { error(message: string, ...args: unknown[]): void }): never {
    const wrapped = wrapError(error, options); logger?.error(wrapped.message); throw wrapped;
}
