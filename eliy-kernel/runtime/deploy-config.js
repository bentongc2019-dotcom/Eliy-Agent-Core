import path from 'node:path';

const DEFAULT_ALLOWLIST = ['beta-user@example.com'];
const DEFAULT_INVITE_CODES = ['BETA-INVITE'];
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

export function parseCsvEnv(value, fallback = []) {
  if (!value) return [...fallback];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeCookieSameSite(value, defaultValue = 'Lax') {
  const normalized = String(value || defaultValue || '').trim().toLowerCase();
  if (!normalized) return 'Lax';
  if (normalized === 'lax') return 'Lax';
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'none') return 'None';
  throw new Error(`Invalid cookie SameSite value: ${value}. Use Lax, Strict, or None.`);
}

export function validateCookieSettings({ secure = false, sameSite = 'Lax' } = {}) {
  if (sameSite === 'None' && !secure) {
    throw new Error('ELIY_COOKIE_SAMESITE=None requires ELIY_COOKIE_SECURE=true and HTTPS.');
  }
}

export function resolveRuntimePaths({ env = process.env, rootDir = process.cwd() } = {}) {
  const runtimeDataDir = String(env.ELIY_RUNTIME_DATA_DIR || '').trim() || null;
  const accountStorageDir = String(env.ELIY_ACCOUNT_STORAGE_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'account-store') : path.join(rootDir, 'eliy-kernel', 'runtime', '.eliy-data'));
  const transcriptsDir = String(env.ELIY_TRANSCRIPTS_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'transcripts') : path.join(rootDir, 'eliy-kernel', 'transcripts'));
  const memoryDir = String(env.ELIY_MEMORY_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'memory') : path.join(rootDir, 'eliy-kernel', 'memory'));
  const reportsDir = String(env.ELIY_REPORTS_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'reports') : path.join(rootDir, 'experiments', 'openai-agents-ts-runtime', 'reports'));
  const stateDir = String(env.ELIY_STATE_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'state') : path.join(rootDir, 'experiments', 'openai-agents-ts-runtime', 'state'));
  const hlamtEvidenceDir = String(env.ELIY_EVIDENCE_DIR || '').trim()
    || (runtimeDataDir ? path.join(runtimeDataDir, 'hlamt') : path.join(rootDir, 'eliy-kernel', 'hlamt'));

  return {
    runtimeDataDir,
    accountStorageDir,
    transcriptsDir,
    memoryDir,
    reportsDir,
    stateDir,
    hlamtEvidenceDir
  };
}

export function resolveRuntimeConfig({ env = process.env, rootDir = process.cwd() } = {}) {
  const host = String(env.HOST || '127.0.0.1').trim() || '127.0.0.1';
  const parsedPort = Number.parseInt(String(env.PORT || '3001'), 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3001;
  const publicBaseUrl = String(env.ELIY_PUBLIC_BASE_URL || '').trim() || `http://localhost:${port}`;
  const sessionTtlParsed = Number.parseInt(String(env.ELIY_SESSION_TTL_MS || DEFAULT_SESSION_TTL_MS), 10);
  const sessionTtlMs = Number.isFinite(sessionTtlParsed) && sessionTtlParsed > 0 ? sessionTtlParsed : DEFAULT_SESSION_TTL_MS;
  const cookie = {
    secure: parseBooleanEnv(env.ELIY_COOKIE_SECURE, false),
    sameSite: normalizeCookieSameSite(env.ELIY_COOKIE_SAMESITE || 'Lax')
  };
  validateCookieSettings(cookie);
  if (cookie.secure && !publicBaseUrl.startsWith('https://')) {
    throw new Error('ELIY_COOKIE_SECURE=true requires ELIY_PUBLIC_BASE_URL to use https://');
  }

  return {
    host,
    port,
    publicBaseUrl,
    sessionTtlMs,
    allowlist: parseCsvEnv(env.ELIY_ALLOWLIST, DEFAULT_ALLOWLIST).map(normalizeLoginId),
    inviteCodes: parseCsvEnv(env.ELIY_INVITE_CODES, DEFAULT_INVITE_CODES).map((item) => item.trim()),
    cookie,
    paths: resolveRuntimePaths({ env, rootDir })
  };
}

export function resolveKernelRuntimePath(rootDir, relPath, paths = resolveRuntimePaths({ rootDir })) {
  if (relPath.startsWith('transcripts/')) {
    return path.join(paths.transcriptsDir, relPath.slice('transcripts/'.length));
  }
  if (relPath.startsWith('memory/')) {
    return path.join(paths.memoryDir, relPath.slice('memory/'.length));
  }
  if (relPath === 'hlamt/EVIDENCE.md') {
    return path.join(paths.hlamtEvidenceDir, 'EVIDENCE.md');
  }
  return path.join(rootDir, 'eliy-kernel', relPath);
}
