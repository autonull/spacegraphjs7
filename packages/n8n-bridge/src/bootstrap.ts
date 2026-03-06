// packages/n8n-bridge/src/bootstrap.ts
// ============================================================
// This file MUST be imported before any n8n-* module.
// It (a) sets all environment knobs, (b) prototype-patches
// any services that ignore env vars, and (c) wipes any
// stale SQLite DB that might retain user/owner state.
// ============================================================
import fs from 'node:fs';

// ── 1. Environment vars ──────────────────────────────────────
const killSwitches: Record<string, string> = {
  // Headless / library mode
  N8N_UI_DISABLED:                         'true',
  EXECUTIONS_MODE:                         'regular',

  // Auth / user management
  N8N_USER_MANAGEMENT_DISABLED:            'true',
  N8N_BASIC_AUTH_ACTIVE:                   'false',
  N8N_JWT_AUTH_ACTIVE:                     'false',
  N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN:'true',

  // Telemetry & diagnostics
  N8N_DIAGNOSTICS_ENABLED:                 'false',
  N8N_VERSION_NOTIFICATIONS_ENABLED:       'false',
  N8N_TEMPLATES_ENABLED:                   'false',
  EXTERNAL_FRONTEND_HOOKS_URLS:            '',
  N8N_DIAGNOSTICS_CONFIG_FRONTEND:         '',
  N8N_DIAGNOSTICS_CONFIG_BACKEND:          '',

  // License SDK noise
  N8N_LOG_LEVEL:                           'warn',

  // Sandbox safety
  N8N_BLOCK_ENV_ACCESS_IN_NODE:            'true',

  // Temp DB — no persisted user state
  DB_TYPE:                                 'sqlite',
  DB_SQLITE_DATABASE:                      '/tmp/spacegraph-n8n.sqlite',
};

for (const [k, v] of Object.entries(killSwitches)) {
  process.env[k] = v;
}

// ── 2. Wipe stale SQLite (no owner row leaks) ────────────────
fs.rmSync('/tmp/spacegraph-n8n.sqlite', { force: true });

// ── 3. Prototype patches (last-resort overrides) ─────────────
// Applied after env-set so static ctors pick up env first;
// patches cover the cases where services ignore env at runtime.

// Patch DiagnosticsService — no-op all event sends
import('n8n-core').then(({ DiagnosticsService }) => {
  if (DiagnosticsService?.prototype?.sendEvent) {
    DiagnosticsService.prototype.sendEvent = () => {};
    DiagnosticsService.prototype.init      = async () => {};
  }
}).catch(() => { /* module path varies by n8n version — safe to ignore */ });

// Patch license SDK — no-op init & renewal
import('@n8n_io/license-sdk').then(({ LicenseManager }) => {
  if (LicenseManager?.prototype) {
    LicenseManager.prototype.init  = async () => {};
    LicenseManager.prototype.renew = async () => {};
  }
}).catch(() => { /* community build may not ship this package */ });

// Patch UserManagementService if it loads anyway
import('n8n-core').then(({ UserManagementService }) => {
  if (UserManagementService?.prototype?.isOwnerSetupCompleted) {
    UserManagementService.prototype.isOwnerSetupCompleted = async () => true;
  }
}).catch(() => {});
