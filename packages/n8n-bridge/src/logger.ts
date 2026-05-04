export const pkgLogger = (prefix = '[n8n-bridge]') => ({
  info: (...args: unknown[]) => console.info(prefix, ...args),
  warn: (...args: unknown[]) => console.warn(prefix, ...args),
  error: (...args: unknown[]) => console.error(prefix, ...args),
});

export default pkgLogger();
