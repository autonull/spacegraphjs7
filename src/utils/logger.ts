/**
 * Centralized logging utility for SpaceGraphJS
 * Provides structured logging with configurable levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

let currentLevel: LogLevel = 'info';

/**
 * Set the global log level
 * @param level - Minimum log level to display
 */
export function setLogLevel(level: LogLevel): void {
    currentLevel = level;
}

/**
 * Create a namespaced logger
 * @param namespace - Logger namespace (e.g., 'SpaceGraph', 'Vision', 'Plugin')
 */
export function createLogger(namespace: string): Logger {
    const prefix = `[${namespace}]`;

    const shouldLog = (level: LogLevel): boolean =>
        LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];

    return {
        debug: (message, ...args) => {
            if (shouldLog('debug')) {
                console.debug(prefix, message, ...args);
            }
        },
        info: (message, ...args) => {
            if (shouldLog('info')) {
                console.info(prefix, message, ...args);
            }
        },
        warn: (message, ...args) => {
            if (shouldLog('warn')) {
                console.warn(prefix, message, ...args);
            }
        },
        error: (message, ...args) => {
            if (shouldLog('error')) {
                console.error(prefix, message, ...args);
            }
        },
    };
}

// Default logger for core SpaceGraphJS usage
export const logger = createLogger('SpaceGraphJS');
