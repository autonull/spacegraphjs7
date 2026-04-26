export interface SpaceGraphErrorOptions {
  namespace?: string;
  operation: string;
  reason?: string;
  cause?: unknown;
  recoverable?: boolean;
}

export class SpaceGraphError extends Error {
  public readonly cause: unknown;
  public readonly operation: string;
  public readonly recoverable: boolean;

  constructor(message: string, options: SpaceGraphErrorOptions) {
    super(message);
    this.name = 'SpaceGraphError';
    this.operation = options.operation;
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? true;
  }
}

export class NotImplementedError extends SpaceGraphError {
  constructor(feature = 'Not implemented') {
    super(feature, { operation: 'NotImplemented', recoverable: false });
    this.name = 'NotImplementedError';
  }
}

export class ValidationError extends SpaceGraphError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, { operation: 'Validation', recoverable: true });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends SpaceGraphError {
  constructor(message: string) {
    super(message, { operation: 'Configuration', recoverable: false });
    this.name = 'ConfigurationError';
  }
}

export function wrapError(error: unknown, options: Omit<SpaceGraphErrorOptions, 'cause'> & { cause?: unknown }, _logger?: { error(message: string, ...args: unknown[]): void }): SpaceGraphError {
  const namespace = options.namespace ?? 'SpaceGraph';
  const operation = options.operation;
  const reason = options.reason ?? (error instanceof Error ? error.message : String(error));
  const message = `[${namespace}] ${operation} Error: ${reason}`;
  return Object.assign(new SpaceGraphError(message, { ...options, cause: error }), { cause: error });
}

export function wrapAndThrow<T extends SpaceGraphErrorOptions>(error: unknown, options: T, logger?: { error(message: string, ...args: unknown[]): void }): never {
  const wrapped = wrapError(error, options);
  logger?.error(wrapped.message);
  throw wrapped;
}

export function createErrorFactory(namespace: string) {
  return {
    validation: (field: string, message: string) => new ValidationError(field, message),
    configuration: (message: string) => new ConfigurationError(`[${namespace}] ${message}`),
    notImplemented: (feature: string) => new NotImplementedError(feature),
    wrap: (error: unknown, operation: string, reason?: string) =>
      wrapError(error, { namespace, operation, reason }),
  };
}
