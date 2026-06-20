import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeCookieSameSite,
  parseBooleanEnv,
  resolveRuntimePaths,
  validateCookieSettings
} from './deploy-config.js';

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ALLOWLIST = ['beta-user@example.com'];
const DEFAULT_INVITE_CODES = ['BETA-INVITE'];

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stableHash(input, length = 10) {
  return crypto.createHash('sha256').update(String(input).toLowerCase().trim()).digest('hex').slice(0, length);
}

function stableUserId(loginId) {
  return `user_${stableHash(loginId, 12)}`;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseCsv(value, fallback = []) {
  if (!value) return [...fallback];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDisplayName(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Beta User';
  const localPart = raw.includes('@') ? raw.split('@')[0] : raw;
  return localPart || 'Beta User';
}

function cookieValue(name, value, extra = {}) {
  const parts = [`${name}=${value}`, 'Path=/'];
  const sameSite = extra.sameSite || 'Lax';
  const secure = Boolean(extra.secure);
  if (extra.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${sameSite}`);
  if (secure) parts.push('Secure');
  if (Number.isFinite(extra.maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(extra.maxAge))}`);
  if (extra.domain) parts.push(`Domain=${extra.domain}`);
  return parts.join('; ');
}

function parseCookieHeader(header = '') {
  return header
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, chunk) => {
      const index = chunk.indexOf('=');
      if (index === -1) return acc;
      const key = chunk.slice(0, index).trim();
      const value = chunk.slice(index + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function initialState() {
  return {
    schemaVersion: 1,
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    runTraces: []
  };
}

function normalizeState(state) {
  const next = state && typeof state === 'object' ? state : {};
  return {
    schemaVersion: 1,
    users: Array.isArray(next.users) ? next.users : [],
    sessions: Array.isArray(next.sessions) ? next.sessions : [],
    conversations: Array.isArray(next.conversations) ? next.conversations : [],
    messages: Array.isArray(next.messages) ? next.messages : [],
    runTraces: Array.isArray(next.runTraces) ? next.runTraces : []
  };
}

function createError(code, message, retryable = false) {
  return {
    code,
    message,
    retryable
  };
}

function buildAuthEnvelopeError(code, message, retryable = false, traceId = null) {
  const error = createError(code, message, retryable);
  if (traceId) error.trace_id = traceId;
  return {
    reply: '',
    gate2: null,
    legacy_artifact: null,
    errors: [error],
    trace_id: traceId || null
  };
}

function conversationSortValue(item) {
  return new Date(item.updated_at || item.created_at || 0).getTime();
}

export function createAccountStore(options = {}) {
  const runtimePaths = resolveRuntimePaths({
    env: options.env || process.env,
    rootDir: options.rootDir || process.cwd()
  });
  const baseDir = options.baseDir || runtimePaths.accountStorageDir;
  const filePath = options.filePath || path.join(baseDir, 'account-store.json');
  const allowlist = new Set((options.allowlist ?? parseCsv(options.env?.ELIY_ALLOWLIST ?? process.env.ELIY_ALLOWLIST, DEFAULT_ALLOWLIST)).map(normalizeLoginId));
  const inviteCodes = new Set((options.inviteCodes ?? parseCsv(options.env?.ELIY_INVITE_CODES ?? process.env.ELIY_INVITE_CODES, DEFAULT_INVITE_CODES)).map((item) => item.trim()));
  const sessionTtlMs = Number(options.sessionTtlMs || options.env?.ELIY_SESSION_TTL_MS || process.env.ELIY_SESSION_TTL_MS || DEFAULT_SESSION_TTL_MS);
  const cookieSecure = typeof options.cookieSecure === 'boolean'
    ? options.cookieSecure
    : parseBooleanEnv(options.env?.ELIY_COOKIE_SECURE ?? process.env.ELIY_COOKIE_SECURE, false);
  const cookieSameSite = normalizeCookieSameSite(options.cookieSameSite || options.env?.ELIY_COOKIE_SAMESITE || process.env.ELIY_COOKIE_SAMESITE || 'Lax');
  validateCookieSettings({ secure: cookieSecure, sameSite: cookieSameSite });
  const runtimeLabel = options.runtimeLabel || 'eliy-kernel/runtime/server.js';

  function loadState() {
    return normalizeState(readJson(filePath, initialState()));
  }

  function saveState(state) {
    writeJsonAtomic(filePath, normalizeState(state));
  }

  function mutateState(mutator) {
    const state = loadState();
    const result = mutator(state);
    saveState(state);
    return result;
  }

  function seedUserFromLogin(loginId, displayName) {
    const normalizedLoginId = normalizeLoginId(loginId);
    const existing = loadState().users.find((item) => item.email_or_login_id === normalizedLoginId);
    if (existing) return existing;

    const user = {
      user_id: stableUserId(normalizedLoginId),
      display_name: displayName || normalizeDisplayName(normalizedLoginId),
      email_or_login_id: normalizedLoginId,
      created_at: nowIso(),
      updated_at: nowIso(),
      status: 'active'
    };

    mutateState((state) => {
      const duplicate = state.users.find((item) => item.email_or_login_id === normalizedLoginId);
      if (!duplicate) {
        state.users.push(user);
      }
      return user;
    });

    return user;
  }

  function findActiveSessionById(state, authSessionId) {
    const session = state.sessions.find((item) => item.auth_session_id === authSessionId);
    if (!session) return null;
    if (session.status === 'expired') {
      return { expired: true, session };
    }
    if (session.status === 'revoked') {
      return null;
    }
    if (session.status !== 'active') return null;
    const expired = new Date(session.expires_at).getTime() <= Date.now();
    if (expired) {
      session.status = 'expired';
      session.revoked_at = session.revoked_at || nowIso();
      session.updated_at = nowIso();
      return { expired: true, session };
    }
    return { expired: false, session };
  }

  function buildCookie(sessionId, expiresAt) {
    const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return cookieValue('ELIY_AUTH_SESSION_ID', sessionId, {
      httpOnly: true,
      maxAge,
      secure: cookieSecure,
      sameSite: cookieSameSite
    });
  }

  function clearCookie() {
    return cookieValue('ELIY_AUTH_SESSION_ID', '', {
      httpOnly: true,
      maxAge: 0,
      secure: cookieSecure,
      sameSite: cookieSameSite
    });
  }

  function getSessionFromRequest(req) {
    const cookies = parseCookieHeader(req.headers.cookie || '');
    const authSessionId = cookies.ELIY_AUTH_SESSION_ID;
    if (!authSessionId) return null;

    const state = loadState();
    const match = findActiveSessionById(state, authSessionId);
    if (!match) return null;
    if (match.expired) {
      saveState(state);
      return { expired: true, session: match.session, user: state.users.find((item) => item.user_id === match.session.user_id) || null };
    }
    const user = state.users.find((item) => item.user_id === match.session.user_id) || null;
    if (!user) return null;
    if (user.status !== 'active') {
      return { disabled: true, session: match.session, user };
    }
    return { session: clone(match.session), user: clone(user) };
  }

  function authenticateRequest(req) {
    const auth = getSessionFromRequest(req);
    if (!auth) {
      return { ok: false, error: buildAuthEnvelopeError('AUTH_SESSION_REQUIRED', 'Login required.', false) };
    }
    if (auth.expired) {
      return { ok: false, error: buildAuthEnvelopeError('AUTH_SESSION_EXPIRED', 'Session expired. Please log in again.', false) };
    }
    if (auth.disabled) {
      return { ok: false, error: buildAuthEnvelopeError('AUTH_USER_DISABLED', 'User is suspended or disabled.', false) };
    }
    return { ok: true, user: auth.user, session: auth.session };
  }

  function login({ email_or_login_id, invite_code, display_name, device_info = null } = {}) {
    const normalizedLoginId = normalizeLoginId(email_or_login_id);
    const normalizedInvite = String(invite_code || '').trim();
    if (!normalizedLoginId || !normalizedInvite) {
      return {
        ok: false,
        error: createError('AUTH_NOT_ALLOWED', 'User is not in allowlist or invite code is invalid.', false)
      };
    }
    if (!allowlist.has(normalizedLoginId) || !inviteCodes.has(normalizedInvite)) {
      return {
        ok: false,
        error: createError('AUTH_NOT_ALLOWED', 'User is not in allowlist or invite code is invalid.', false)
      };
    }

    return mutateState((state) => {
      let user = state.users.find((item) => item.email_or_login_id === normalizedLoginId) || null;
      if (user && user.status !== 'active') {
        return {
          ok: false,
          error: createError('AUTH_USER_DISABLED', 'User is suspended or disabled.', false)
        };
      }
      if (!user) {
        user = {
          user_id: stableUserId(normalizedLoginId),
          display_name: display_name || normalizeDisplayName(normalizedLoginId),
          email_or_login_id: normalizedLoginId,
          created_at: nowIso(),
          updated_at: nowIso(),
          status: 'active'
        };
        state.users.push(user);
      } else {
        user.updated_at = nowIso();
        user.display_name = display_name || user.display_name || normalizeDisplayName(normalizedLoginId);
      }

      const session = {
        auth_session_id: makeId('auth'),
        user_id: user.user_id,
        device_info,
        created_at: nowIso(),
        expires_at: new Date(Date.now() + sessionTtlMs).toISOString(),
        revoked_at: null,
        status: 'active',
        updated_at: nowIso()
      };
      state.sessions.push(session);
      return {
        ok: true,
        user: clone(user),
        session: clone(session),
        cookie: buildCookie(session.auth_session_id, session.expires_at)
      };
    });
  }

  function me(req) {
    const auth = authenticateRequest(req);
    if (!auth.ok) return auth;
    return {
      ok: true,
      user: auth.user,
      session: auth.session
    };
  }

  function revokeSession(sessionId) {
    return mutateState((state) => {
      const session = state.sessions.find((item) => item.auth_session_id === sessionId);
      if (!session) {
        return { ok: false };
      }
      session.status = 'revoked';
      session.revoked_at = nowIso();
      session.updated_at = nowIso();
      return { ok: true, cookie: clearCookie(), session: clone(session) };
    });
  }

  function expireSession(sessionId) {
    return mutateState((state) => {
      const session = state.sessions.find((item) => item.auth_session_id === sessionId);
      if (!session) return null;
      session.status = 'expired';
      session.revoked_at = session.revoked_at || nowIso();
      session.updated_at = nowIso();
      return clone(session);
    });
  }

  function createConversation(userId, input = {}) {
    return mutateState((state) => {
      const now = nowIso();
      const conversation = {
        conversation_id: makeId('conv'),
        user_id: userId,
        title: input.title || '新对话',
        created_at: now,
        updated_at: now,
        status: 'active',
        archived_at: null,
        deleted_at: null
      };
      state.conversations.push(conversation);
      return clone(conversation);
    });
  }

  function getConversation(userId, conversationId) {
    const state = loadState();
    const conversation = state.conversations.find((item) => item.conversation_id === conversationId && item.user_id === userId);
    if (!conversation || conversation.status === 'deleted') return null;
    return clone(conversation);
  }

  function listConversations(userId) {
    const state = loadState();
    return state.conversations
      .filter((item) => item.user_id === userId && item.status !== 'deleted')
      .sort((a, b) => conversationSortValue(b) - conversationSortValue(a))
      .map((conversation) => {
        const messageCount = state.messages.filter((item) => item.conversation_id === conversation.conversation_id).length;
        const lastMessage = [...state.messages]
          .filter((item) => item.conversation_id === conversation.conversation_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
        return clone({
          ...conversation,
          message_count: messageCount,
          last_message_at: lastMessage ? lastMessage.created_at : conversation.updated_at
        });
      });
  }

  function renameConversation(userId, conversationId, title) {
    return mutateState((state) => {
      const conversation = state.conversations.find((item) => item.conversation_id === conversationId && item.user_id === userId && item.status !== 'deleted');
      if (!conversation) return null;
      conversation.title = String(title || '').trim() || conversation.title;
      conversation.updated_at = nowIso();
      return clone(conversation);
    });
  }

  function archiveConversation(userId, conversationId) {
    return mutateState((state) => {
      const conversation = state.conversations.find((item) => item.conversation_id === conversationId && item.user_id === userId && item.status !== 'deleted');
      if (!conversation) return null;
      conversation.status = 'archived';
      conversation.archived_at = nowIso();
      conversation.updated_at = nowIso();
      return clone(conversation);
    });
  }

  function deleteConversation(userId, conversationId) {
    return mutateState((state) => {
      const conversation = state.conversations.find((item) => item.conversation_id === conversationId && item.user_id === userId);
      if (!conversation) return null;
      conversation.status = 'deleted';
      conversation.deleted_at = nowIso();
      conversation.updated_at = nowIso();
      return clone(conversation);
    });
  }

  function listMessages(userId, conversationId) {
    const state = loadState();
    const conversation = state.conversations.find((item) => item.conversation_id === conversationId && item.user_id === userId);
    if (!conversation || conversation.status === 'deleted') return [];
    return state.messages
      .filter((item) => item.conversation_id === conversationId && item.user_id === userId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((message) => clone(message));
  }

  function appendMessage(input) {
    return mutateState((state) => {
      const conversation = state.conversations.find((item) => item.conversation_id === input.conversation_id && item.user_id === input.user_id);
      if (!conversation || conversation.status === 'deleted') {
        return null;
      }

      const message = {
        message_id: input.message_id || makeId(input.role === 'assistant' ? 'msg_assistant' : 'msg_user'),
        conversation_id: input.conversation_id,
        user_id: input.user_id,
        role: input.role,
        content: input.content,
        created_at: input.created_at || nowIso(),
        updated_at: input.updated_at || nowIso(),
        run_id: input.run_id || null,
        trace_id: input.trace_id || null,
        status: input.status || 'sent',
        raw_envelope_summary: input.raw_envelope_summary || null,
        error_summary: input.error_summary || null
      };
      state.messages.push(message);
      conversation.updated_at = message.updated_at;
      if (conversation.title === '新对话' && message.role === 'user' && String(message.content || '').trim()) {
        conversation.title = String(message.content).trim().replace(/\s+/g, ' ').slice(0, 24);
      }
      return clone(message);
    });
  }

  function recordRunTrace(input) {
    return mutateState((state) => {
      const existing = state.runTraces.find((item) => item.run_id === input.run_id);
      const runTrace = {
        run_id: input.run_id,
        trace_id: input.trace_id,
        conversation_id: input.conversation_id,
        message_id: input.message_id,
        user_id: input.user_id,
        model_or_runtime: input.model_or_runtime || runtimeLabel,
        eval_summary: input.eval_summary ?? null,
        error_summary: input.error_summary ?? null,
        created_at: input.created_at || nowIso(),
        updated_at: nowIso()
      };
      if (existing) {
        Object.assign(existing, runTrace);
        return clone(existing);
      }
      state.runTraces.push(runTrace);
      return clone(runTrace);
    });
  }

  function chatTurn(input) {
    const userMessage = appendMessage({
      conversation_id: input.conversation_id,
      user_id: input.user_id,
      role: 'user',
      content: input.user_message,
      message_id: input.user_message_id,
      created_at: input.created_at || nowIso(),
      updated_at: input.updated_at || nowIso(),
      status: 'sent'
    });

    const assistantMessage = appendMessage({
      conversation_id: input.conversation_id,
      user_id: input.user_id,
      role: 'assistant',
      content: input.reply,
      message_id: input.assistant_message_id,
      run_id: input.run_id,
      trace_id: input.trace_id,
      status: input.status || 'sent',
      raw_envelope_summary: input.raw_envelope_summary || null,
      error_summary: input.error_summary || null
    });

    const trace = recordRunTrace({
      run_id: input.run_id,
      trace_id: input.trace_id,
      conversation_id: input.conversation_id,
      message_id: assistantMessage?.message_id || input.assistant_message_id,
      user_id: input.user_id,
      model_or_runtime: input.model_or_runtime,
      eval_summary: input.eval_summary || null,
      error_summary: input.error_summary || null,
      created_at: input.created_at || nowIso()
    });

    return { userMessage, assistantMessage, trace };
  }

  function ensureConversationForChat(userId, conversationId, title) {
    if (conversationId && conversationId !== 'none') {
      const existing = getConversation(userId, conversationId);
      if (existing) return existing;
      return null;
    }
    return createConversation(userId, { title: title || '新对话' });
  }

  return {
    filePath,
    loadState,
    saveState,
    login,
    me,
    revokeSession,
    expireSession,
    authenticateRequest,
    getSessionFromRequest,
    createConversation,
    getConversation,
    listConversations,
    renameConversation,
    archiveConversation,
    deleteConversation,
    listMessages,
    appendMessage,
    recordRunTrace,
    chatTurn,
    ensureConversationForChat,
    buildAuthEnvelopeError,
    createError,
    cookieValue
  };
}

export function createSessionCookie(sessionId, expiresAt, cookieOptions = {}) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const secure = typeof cookieOptions.secure === 'boolean'
    ? cookieOptions.secure
    : parseBooleanEnv(process.env.ELIY_COOKIE_SECURE, false);
  const sameSite = normalizeCookieSameSite(cookieOptions.sameSite || process.env.ELIY_COOKIE_SAMESITE || 'Lax');
  return cookieValue('ELIY_AUTH_SESSION_ID', sessionId, {
    httpOnly: true,
    maxAge,
    secure,
    sameSite
  });
}

export function clearSessionCookie(cookieOptions = {}) {
  const secure = typeof cookieOptions.secure === 'boolean'
    ? cookieOptions.secure
    : parseBooleanEnv(process.env.ELIY_COOKIE_SECURE, false);
  const sameSite = normalizeCookieSameSite(cookieOptions.sameSite || process.env.ELIY_COOKIE_SAMESITE || 'Lax');
  return cookieValue('ELIY_AUTH_SESSION_ID', '', {
    httpOnly: true,
    maxAge: 0,
    secure,
    sameSite
  });
}

export function parseAccountStoreCookies(header = '') {
  return parseCookieHeader(header);
}

export function deriveUserIdFromLogin(loginId) {
  return stableUserId(loginId);
}
