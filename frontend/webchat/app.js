/**
 * Eliy Chat-first Client — app.js (v0.3.2-test)
 * 纯 JS 实现的商业智能体交互与状态引擎 (轻量扁平版)
 */

// === 全局状态 ===
const state = {
  sessionId: null,
  activeModel: 'Eliy v0.3.2',
  isStreaming: false,
  messageCount: 0,
  attachedFile: null,
  isSfocusMode: false,
  currentConversation: null,
  serverContextInitialized: false,
  conversationSource: 'unknown',
  serverConversations: [],
  userId: null,
  authSessionId: null,
  lastSubmittedUserText: ''
};

const RECENT_CONVERSATIONS_KEY = 'ELIY_RECENT_CONVERSATIONS';
const MAX_RECENT_CONVERSATIONS = 10;

// === DOM 元素缓存 ===
const $ = (sel) => document.querySelector(sel);
const msgList = $('#messageList');
const userInput = $('#userInput');
const sendBtn = $('#sendBtn');
const newChatBtn = $('#newChatBtn');
const sfocusSkillBtn = $('#sfocusSkillBtn');
const historyList = $('#historyList');
const dropdownTrigger = $('#dropdownTrigger');
const dropdownMenu = $('#dropdownMenu');
const menuToggle = $('#menuToggle');
const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebarOverlay');
const sidebarCloseBtn = $('#sidebarCloseBtn');
const chatMain = $('#chatMain');
const attachBtn = $('#attachBtn');
const fileInput = $('#fileInput');
const frontSkillMode = $('#frontSkillMode');
const backendSkillMode = $('#backendSkillMode');
const skillTriggerSource = $('#skillTriggerSource');

function syncComposerState() {
  if (!sendBtn) return;
  const hasText = Boolean(userInput?.value.trim());
  const disabled = state.isStreaming || !hasText;
  sendBtn.disabled = disabled;
  sendBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function refreshAssistantMessageSelectors() {
  const assistantMessages = Array.from(msgList.querySelectorAll('.message.assistant'));
  assistantMessages.forEach((messageEl, index) => {
    messageEl.setAttribute('data-testid', index === assistantMessages.length - 1 ? 'latest-assistant-message' : 'assistant-message');
    if (!messageEl.getAttribute('data-message-id')) {
      const fallbackId = messageEl.dataset.messageId || messageEl.getAttribute('data-message-id');
      if (fallbackId) messageEl.setAttribute('data-message-id', fallbackId);
    }
  });
}

// === 初始化入口 ===
document.addEventListener('DOMContentLoaded', async () => {
  state.sessionId = 'sess_' + Date.now();

  initTheme();
  setupEventHandlers();
  setupAutoResize();
  syncComposerState();

  await initUserContext();
  await bootstrapConversationState();
});

// === 用户上下文与安全拦截守卫 ===
async function initUserContext() {
  try {
    const me = await apiJson('/api/auth/me', { method: 'GET' });
    const user = me.user || {};
    const session = me.auth_session || {};
    state.userId = user.user_id || null;
    state.authSessionId = session.auth_session_id || null;
    const name = user.display_name || user.email_or_login_id || '用户';

    localStorage.setItem('ELIY_USER_NAME', name);
    if (state.userId) localStorage.setItem('ELIY_USER_ID', state.userId);
    if (state.authSessionId) localStorage.setItem('ELIY_AUTH_SESSION_ID', state.authSessionId);

    $('#userNameText').textContent = name;
    const firstChar = name.trim().charAt(0).toUpperCase();
    $('#userAvatar').textContent = firstChar || 'U';
    return true;
  } catch (error) {
    console.warn('[Auth] 登录态恢复失败，跳转登录页:', error);
    window.location.replace('./login.html');
    return false;
  }
}

// === 前端交互事件绑定 ===
function setupEventHandlers() {
  // 点击发送与回车发送逻辑
  sendBtn.addEventListener('click', () => submitMessage());
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  });

  // 登出逻辑：二次确认后才清理登录态
  $('#logoutBtn').addEventListener('click', async () => {
    const confirmed = window.confirm('确定要退出 Eliy 内测登录吗？当前聊天上下文可能会中断。');
    if (!confirmed) return;

    try {
      await apiJson('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('[Auth] 服务端登出失败，仍执行本地清理:', error);
    }
    localStorage.removeItem('ELIY_AUTH_TOKEN');
    localStorage.removeItem('ELIY_USER_NAME');
    localStorage.removeItem('ELIY_USER_ID');
    localStorage.removeItem('ELIY_AUTH_SESSION_ID');
    window.location.href = './login.html';
  });

  // 模型选择下拉菜单切换展示
  dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  const dropdownItems = document.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('disabled')) return;
      dropdownItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const text = item.textContent.split('(')[0].trim();
      $('.model-name').textContent = text;
      state.activeModel = text;
      dropdownMenu.classList.remove('show');
    });
  });

  // 新建对话逻辑
  newChatBtn.addEventListener('click', () => {
    void startNewSession();
    closeSidebar();
  });

  // 点击左侧增强技能 S'FOCUS Skill 逻辑
  sfocusSkillBtn.addEventListener('click', () => {
    triggerSfocusSkill();
    closeSidebar();
  });

  // 响应式侧边栏折叠 toggle
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  sidebarCloseBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  chatMain.addEventListener('click', () => {
    if (isMobileSidebar() && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });
  window.addEventListener('resize', () => {
    if (!isMobileSidebar()) closeSidebar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // ＋ 按钮选择上传附件（仅服务当前对话）
  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  // 主题切换按钮
  const themeToggleBtn = $('#themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => toggleTheme());
  }
}

function isMobileSidebar() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  sidebarOverlay.setAttribute('aria-hidden', 'false');
  menuToggle.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  sidebarOverlay.setAttribute('aria-hidden', 'true');
  menuToggle.setAttribute('aria-expanded', 'false');
}

function toggleSidebar() {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// === 主题初始化与切换 ===
function initTheme() {
  const saved = localStorage.getItem('ELIY_THEME') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('ELIY_THEME', next);
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  const icon = $('#themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function normalizeConversationList(list = []) {
  return list
    .map(item => ({
      id: item.conversation_id || item.id,
      title: item.title || '新对话',
      updatedAt: Date.parse(item.updated_at || item.updatedAt || new Date().toISOString()),
      serverContextInitialized: true,
      status: item.status || 'active',
      messages: Array.isArray(item.messages) ? item.messages : []
    }))
    .filter(item => !!item.id)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function isAuthErrorPayload(payload) {
  return Array.isArray(payload?.errors) && payload.errors.some(err => String(err?.code || '').startsWith('AUTH_'));
}

function redirectToLogin() {
  localStorage.removeItem('ELIY_AUTH_TOKEN');
  localStorage.removeItem('ELIY_USER_NAME');
  localStorage.removeItem('ELIY_USER_ID');
  localStorage.removeItem('ELIY_AUTH_SESSION_ID');
  window.location.replace('./login.html');
}

async function fetchConversationListFromServer() {
  try {
    const data = await apiJson('/api/conversations', { method: 'GET' });
    const conversations = normalizeConversationList(data.conversations || []);
    state.conversationSource = 'server';
    state.serverConversations = conversations;
    setRecentConversations(conversations);
    return conversations;
  } catch (error) {
    if (error?.status === 401 && isAuthErrorPayload(error.payload)) {
      redirectToLogin();
      return [];
    }
    console.warn('[Conversation] 服务端列表读取失败，回退本地缓存:', error);
    state.conversationSource = 'local';
    const conversations = getRecentConversations();
    renderRecentConversations();
    return conversations;
  }
}

async function fetchConversationMessagesFromServer(conversationId) {
  const data = await apiJson(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'GET' });
  return {
    conversation: data.conversation || null,
    messages: Array.isArray(data.messages) ? data.messages : []
  };
}

async function bootstrapConversationState() {
  const conversations = await fetchConversationListFromServer();
  if (conversations.length > 0) {
    await loadConversation(conversations[0].id);
    return;
  }
  await startNewSession();
}

function getGate2Adapter() {
  return window.EliyGate2Adapter || null;
}

function normalizeGate2Envelope(rawEnvelope = {}, context = {}) {
  const adapter = getGate2Adapter();
  if (adapter?.normalizeChatResponseEnvelope) {
    return adapter.normalizeChatResponseEnvelope(rawEnvelope, context);
  }

  return {
    reply: String(rawEnvelope.reply || ''),
    gate2: rawEnvelope.gate2 || null,
    legacy_artifact: rawEnvelope.legacy_artifact || rawEnvelope.artifact || null,
    errors: Array.isArray(rawEnvelope.errors) ? rawEnvelope.errors : [],
    trace_id: rawEnvelope.trace_id || context.trace_id || null,
    run_id: rawEnvelope.run_id || context.run_id || null,
    message_id: rawEnvelope.message_id || context.message_id || null,
    conversation_id: rawEnvelope.conversation_id || context.conversation_id || null,
    user_id: rawEnvelope.user_id || context.user_id || null,
    auth_session_id: rawEnvelope.auth_session_id || context.auth_session_id || null
  };
}

function createLocalMessageId(prefix = 'msg') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createLocalRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createLocalTraceId(runId) {
  return `trace_${runId || Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function renderGate2ErrorBanner(bubble, errors, onRetry, originalUserText) {
  if (!errors || errors.length === 0) return;
  const banner = document.createElement('div');
  banner.className = 'gate2-error-banner';

  const retryable = errors.some(err => err.retryable);
  const traceId = errors.find(err => err.trace_id)?.trace_id || '';
  const errorItems = errors.map(err => `<li><code>${escapeHTML(err.code)}</code> ${escapeHTML(err.message)}</li>`).join('');

  banner.innerHTML = `
    <div class="gate2-panel-header">
      <span class="gate2-panel-title">错误</span>
      ${traceId ? `<span class="gate2-trace-chip" data-testid="trace-chip" data-trace-id="${escapeHTML(traceId)}" aria-label="trace chip">${escapeHTML(traceId)}</span>` : ''}
    </div>
    <ul class="gate2-error-list">${errorItems}</ul>
    ${retryable ? `<button class="gate2-inline-btn" type="button" id="gate2RetryBtn">重试</button>` : ''}
  `;
  bubble.appendChild(banner);

  const retryBtn = banner.querySelector('#gate2RetryBtn');
  if (retryBtn && typeof onRetry === 'function') {
    retryBtn.addEventListener('click', () => onRetry(originalUserText));
  }
}

function renderGate2TraceChip(bubble, traceId) {
  if (!traceId) return;
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'gate2-trace-chip';
  chip.setAttribute('data-testid', 'trace-chip');
  chip.setAttribute('aria-label', 'trace chip');
  chip.textContent = traceId;
  chip.title = '点击复制 trace_id';
  chip.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(traceId);
      setStatus('trace_id 已复制', true);
    } catch (err) {
      console.warn('[Gate2] trace_id copy failed:', err);
    }
  });
  bubble.appendChild(chip);
}

function renderGate2ConfirmationPanel(bubble, request, traceId, onAction) {
  if (!request) return;
  const panel = document.createElement('div');
  panel.className = 'gate2-panel gate2-confirmation-panel';
  const summary = request.summary || '需要用户确认';
  const proposalId = request.proposal_id || 'unknown';

  panel.innerHTML = `
    <div class="gate2-panel-header">
      <span class="gate2-panel-title">需要确认</span>
      ${traceId ? `<span class="gate2-trace-chip" data-testid="trace-chip" data-trace-id="${escapeHTML(traceId)}" aria-label="trace chip">${escapeHTML(traceId)}</span>` : ''}
    </div>
    <div class="gate2-panel-body">
      <p class="gate2-summary">${escapeHTML(summary)}</p>
      <p class="gate2-meta">proposal: <code>${escapeHTML(proposalId)}</code></p>
      <div class="gate2-actions">
        <button type="button" class="gate2-action-btn confirm" data-action="confirm">确认</button>
        <button type="button" class="gate2-action-btn reject" data-action="reject">拒绝</button>
        <button type="button" class="gate2-action-btn defer" data-action="defer">延后</button>
      </div>
    </div>
  `;

  panel.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const statusLine = document.createElement('div');
      statusLine.className = 'gate2-panel-status';
      statusLine.textContent = `已记录 ${action}（占位，尚未接入后端确认端点）`;
      panel.appendChild(statusLine);
      if (typeof onAction === 'function') onAction(action, request);
    });
  });

  bubble.appendChild(panel);
}

function renderGate2PendingChangePanel(bubble, patch) {
  if (!patch) return;
  const panel = document.createElement('div');
  panel.className = 'gate2-panel gate2-pending-panel';
  const proposedValue = typeof patch.proposed_value === 'string'
    ? patch.proposed_value
    : JSON.stringify(patch.proposed_value);

  panel.innerHTML = `
    <div class="gate2-panel-header">
      <span class="gate2-panel-title">候选变更（未生效）</span>
      <span class="gate2-panel-pill">pending</span>
    </div>
    <div class="gate2-panel-body">
      <p><strong>目标路径：</strong><code>${escapeHTML(patch.target_path || 'unknown')}</code></p>
      <p><strong>提议值：</strong>${escapeHTML(String(proposedValue || ''))}</p>
      <p><strong>风险等级：</strong>${escapeHTML(patch.risk_level || 'unknown')}</p>
      <p class="gate2-muted">在确认前，原状态保持不变。</p>
    </div>
  `;

  bubble.appendChild(panel);
}

function renderGate2ReframeCandidatePanel(bubble, candidate) {
  if (!candidate) return;
  const panel = document.createElement('div');
  panel.className = 'gate2-panel gate2-candidate-panel';
  panel.innerHTML = `
    <div class="gate2-panel-header">
      <span class="gate2-panel-title">候选重构（假设层）</span>
      <span class="gate2-panel-pill">candidate</span>
    </div>
    <div class="gate2-panel-body">
      <p><strong>当前假设：</strong>${escapeHTML(candidate.current_assumption || '')}</p>
      <p><strong>新证据：</strong>${escapeHTML((candidate.new_evidence || []).join('；') || '无')}</p>
      <p><strong>冲突：</strong>${escapeHTML(candidate.conflict || '')}</p>
      <p><strong>候选重构：</strong>${escapeHTML(candidate.candidate_reframe || '')}</p>
      <p class="gate2-muted">这只是候选假设调整，不表示目标已被改写。</p>
    </div>
  `;

  bubble.appendChild(panel);
}

function renderLegacyArtifactFallback(parentDiv, envelope, originalUserText) {
  const bubble = parentDiv.querySelector('.bubble');
  if (!bubble) return;

  const badge = document.createElement('div');
  badge.className = 'gate2-legacy-fallback';
  badge.textContent = 'Legacy artifact fallback';
  bubble.appendChild(badge);

  const artifact = envelope.legacy_artifact || envelope.artifact || null;
  if (artifact) {
    detectAndRenderArtifact(parentDiv, envelope.reply || '', originalUserText, artifact);
  }
}

function renderGate2Envelope(parentDiv, envelope, options = {}) {
  const bubble = parentDiv.querySelector('.bubble');
  if (!bubble) return;

  const adapter = getGate2Adapter();
  const plan = adapter?.buildGate2RenderPlan ? adapter.buildGate2RenderPlan(envelope) : envelope;
  const traceId = plan.trace_id || envelope.trace_id || '';
  const gate2 = plan.gate2 || envelope.gate2 || null;
  const errors = plan.errors || envelope.errors || [];
  const originalUserText = options.originalUserText || '';

  if (errors.length > 0) {
    renderGate2ErrorBanner(bubble, errors, options.onRetry, originalUserText);
  }

  if (gate2 && (gate2.requires_confirmation || gate2.confirmation_request)) {
    renderGate2ConfirmationPanel(bubble, gate2.confirmation_request || {
      confirmation_type: 'approval',
      summary: '需要确认',
      options: ['confirm', 'reject', 'defer'],
      default_action: 'confirm',
      proposal_id: null,
      evidence_refs: []
    }, traceId, options.onGate2Action);
  }

  if (gate2 && gate2.proposed_state_patch) {
    renderGate2PendingChangePanel(bubble, gate2.proposed_state_patch);
  }

  if (gate2 && gate2.reframe_candidate) {
    renderGate2ReframeCandidatePanel(bubble, gate2.reframe_candidate);
  }

  if (traceId) {
    renderGate2TraceChip(bubble, traceId);
  }

  if (!gate2 && (plan.legacy_artifact || envelope.legacy_artifact || envelope.artifact)) {
    renderLegacyArtifactFallback(parentDiv, envelope, originalUserText);
  }
}

function renderGate2MessageAdapter(parentDiv, rawEnvelope, options = {}) {
  const envelope = normalizeGate2Envelope(rawEnvelope, options.binding || {});
  return renderGate2Envelope(parentDiv, envelope, options);
}

// === 开始新对话会话 ===
async function startNewSession() {
  if (state.isStreaming) return;

  let conversation = null;
  try {
    const payload = await apiJson('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: '新对话' })
    });
    conversation = payload.conversation || null;
    if (conversation) {
      state.conversationSource = 'server';
      const normalized = normalizeConversationList([conversation])[0];
      state.serverConversations = [normalized, ...state.serverConversations.filter(item => item.id !== normalized.id)];
      setRecentConversations(state.serverConversations);
    }
  } catch (error) {
    console.warn('[Conversation] 服务端新建会话失败，回退本地模式:', error);
    state.conversationSource = 'local';
    conversation = null;
  }

  const conversationId = conversation?.conversation_id || createConversationId();
  state.sessionId = conversationId;
  state.messageCount = 0;
  state.isSfocusMode = false;
  state.serverContextInitialized = false;
  state.currentConversation = {
    id: conversationId,
    title: conversation?.title || '新对话',
    updatedAt: conversation?.updated_at ? Date.parse(conversation.updated_at) : Date.now(),
    messages: [],
    serverContextInitialized: false
  };

  if (state.conversationSource !== 'server') {
    const conversations = getRecentConversations().filter(item => item.id !== state.currentConversation.id);
    conversations.unshift(state.currentConversation);
    setRecentConversations(conversations);
  }

  sfocusSkillBtn.classList.remove('active');
  updateSkillObserver();
  const activeHistory = historyList.querySelector('.history-item.active');
  if (activeHistory) activeHistory.classList.remove('active');

  msgList.innerHTML = '';
  appendMessage('assistant', getWelcomeMessageHTML(), true);
  renderRecentConversations();

  return state.currentConversation;
}

// === S'FOCUS Skill 激活与步骤引导修正 ===
function triggerSfocusSkill() {
  if (state.isStreaming) return;
  if (state.isSfocusMode) return;
  
  // 1. 以用户自然发言形式进入 S'FOCUS 协作
  appendMessage('user', "用 S'FOCUS 澄清这个经营问题", false, { persist: true });
  state.isSfocusMode = true;
  sfocusSkillBtn.classList.add('active');
  updateSkillObserver();

  // 2. 界面展示排版优雅的步骤引导，不直接自动生成最终诊断结论
  appendMessage('assistant', `
    <p>我们可以用 S'FOCUS 来澄清这个经营问题。先从第一步开始：你现在要分析的系统是什么？这个系统的目标是什么？</p>
  `, true, { persist: true });
}

// === 附件选择与预览条展示（仅服务当前对话） ===
function handleFileSelected(file) {
  state.attachedFile = file;
  
  const oldPreview = $('.file-preview-bar');
  if (oldPreview) oldPreview.remove();

  // 构造轻量预览 DOM 插入在输入框之上
  const previewBar = document.createElement('div');
  previewBar.className = 'file-preview-bar';
  previewBar.innerHTML = `
    <span class="file-preview-icon">📎</span>
    <span class="file-preview-name">${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
    <button class="file-preview-remove" id="removeFileBtn">✕</button>
  `;
  
  $('.chat-footer').insertBefore(previewBar, $('.input-container'));
  
  $('#removeFileBtn').addEventListener('click', () => {
    previewBar.remove();
    state.attachedFile = null;
    fileInput.value = '';
  });
}

// === 消息收发与处理 ===
function submitMessage(directText = '') {
  const text = directText || userInput.value.trim();
  if (!text || state.isStreaming) return;

  let finalMessageText = text;
  
  // 仅在当前对话流中附带文件名
  if (state.attachedFile) {
    const file = state.attachedFile;
    finalMessageText = `[当前会话附件: ${file.name}]\n\n${text}`;
    
    const preview = $('.file-preview-bar');
    if (preview) preview.remove();
    state.attachedFile = null;
    fileInput.value = '';
  }

  const userMessageId = createLocalMessageId('msg_user');
  state.lastSubmittedUserText = finalMessageText;
  appendMessage('user', finalMessageText, false, {
    persist: true,
    messageId: userMessageId,
    userId: state.userId,
    authSessionId: state.authSessionId,
    conversationId: getCurrentConversationId()
  });
  userInput.value = '';
  userInput.style.height = 'auto';
  syncComposerState();

  simulateEliyResponse(finalMessageText, { userMessageId });
}

// === 渲染消息气泡 ===
function appendMessage(role, content, isHTML = false, options = {}) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const avatarText = role === 'assistant' ? 'E' : '你';
  const resolvedMessageId = options.messageId || (role === 'assistant' ? createLocalMessageId('msg_assistant') : null);
  if (resolvedMessageId) {
    div.setAttribute('data-message-id', resolvedMessageId);
  }
  if (role === 'assistant') {
    div.setAttribute('data-message-role', 'assistant');
  }
  div.innerHTML = `
    <div class="avatar">${avatarText}</div>
    <div class="bubble">${isHTML ? content : formatText(content)}</div>
  `;
  msgList.appendChild(div);
  refreshAssistantMessageSelectors();
  msgList.scrollTop = msgList.scrollHeight;
  state.messageCount++;
  if (options.persist) {
    persistConversationMessage({
      role,
      content,
      isHTML,
      artifact: options.artifact || null,
      legacy_artifact: options.legacy_artifact || null,
      gate2: options.gate2 || null,
      errors: options.errors || [],
      messageId: resolvedMessageId,
      runId: options.runId || null,
      traceId: options.traceId || null,
      userId: options.userId || state.userId || null,
      authSessionId: options.authSessionId || state.authSessionId || null,
      conversationId: options.conversationId || getCurrentConversationId(),
      originalUserText: options.originalUserText || null
    });
  }
  return div;
}

function createConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getRecentConversations() {
  if (state.conversationSource === 'server' && Array.isArray(state.serverConversations)) {
    return [...state.serverConversations];
  }
  try {
    const raw = localStorage.getItem(RECENT_CONVERSATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[History] 最近对话读取失败:', e);
    return [];
  }
}

function setRecentConversations(conversations) {
  const next = conversations
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_RECENT_CONVERSATIONS);
  state.serverConversations = [...next];
  localStorage.setItem(RECENT_CONVERSATIONS_KEY, JSON.stringify(next));
}

function persistConversationMessage(message) {
  if (!state.currentConversation) return;

  const now = Date.now();
  const safeMessage = {
    role: message.role,
    content: message.content,
    isHTML: !!message.isHTML,
    artifact: message.artifact || null,
    legacy_artifact: message.legacy_artifact || message.artifact || null,
    gate2: message.gate2 || null,
    errors: Array.isArray(message.errors) ? message.errors : [],
    messageId: message.messageId || null,
    runId: message.runId || null,
    traceId: message.traceId || null,
    userId: message.userId || state.userId || null,
    authSessionId: message.authSessionId || state.authSessionId || null,
    conversationId: message.conversationId || state.currentConversation?.id || state.sessionId || null,
    originalUserText: message.originalUserText || null,
    createdAt: now
  };

  state.currentConversation.messages.push(safeMessage);
  state.currentConversation.updatedAt = now;

  if (state.currentConversation.title === '新对话' && message.role === 'user') {
    state.currentConversation.title = createConversationTitle(message.content);
  }

  const conversations = getRecentConversations().filter(item => item.id !== state.currentConversation.id);
  conversations.unshift(state.currentConversation);
  setRecentConversations(conversations);
  renderRecentConversations();
}

function createConversationTitle(text) {
  const cleaned = String(text)
    .replace(/^\[当前会话附件:[\s\S]*?\]\s*/m, '')
    .replace(/\s+/g, '')
    .trim();
  return cleaned.slice(0, 16) || '新对话';
}

function renderRecentConversations() {
  const conversations = getRecentConversations();
  historyList.innerHTML = '';

  if (conversations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = '暂无最近对话';
    historyList.appendChild(empty);
    return;
  }

  conversations.forEach(conversation => {
    const item = document.createElement('div');
    item.className = `history-item${conversation.id === state.sessionId ? ' active' : ''}`;
    item.dataset.conversationId = conversation.id;
    item.innerHTML = `
      <span class="history-icon">💬</span>
      <div class="history-details">
        <span class="history-title">${escapeHTML(conversation.title || '新对话')}</span>
        <span class="history-time">${formatHistoryTime(conversation.updatedAt)}</span>
      </div>
    `;
    item.addEventListener('click', () => {
      loadConversation(conversation.id);
      closeSidebar();
    });
    historyList.appendChild(item);
  });
}

async function loadConversation(conversationId) {
  let conversation = null;
  let messages = [];

  if (state.conversationSource === 'server') {
    try {
      const payload = await fetchConversationMessagesFromServer(conversationId);
      conversation = payload.conversation;
      messages = payload.messages;
    } catch (error) {
      if (error?.status === 401 && isAuthErrorPayload(error.payload)) {
        redirectToLogin();
        return;
      }
      console.warn('[Conversation] 读取服务端消息失败，回退本地缓存:', error);
      state.conversationSource = 'local';
    }
  }

  if (!conversation) {
    const localConversation = getRecentConversations().find(item => item.id === conversationId);
    if (!localConversation) return;
    conversation = {
      conversation_id: localConversation.id,
      user_id: state.userId,
      title: localConversation.title,
      created_at: new Date(localConversation.updatedAt || Date.now()).toISOString(),
      updated_at: new Date(localConversation.updatedAt || Date.now()).toISOString(),
      status: 'active'
    };
    messages = Array.isArray(localConversation.messages) ? localConversation.messages : [];
  }

  state.sessionId = conversation.conversation_id || conversationId;
  state.messageCount = 0;
  state.isSfocusMode = false;
  state.serverContextInitialized = true;
  state.currentConversation = {
    id: conversation.conversation_id || conversationId,
    title: conversation.title || '新对话',
    updatedAt: Date.parse(conversation.updated_at || new Date().toISOString()),
    messages: Array.isArray(messages) ? messages : [],
    serverContextInitialized: true
  };

  sfocusSkillBtn.classList.remove('active');
  updateSkillObserver();
  msgList.innerHTML = '';

  if (state.currentConversation.messages.length === 0) {
    appendMessage('assistant', getWelcomeMessageHTML(), true);
  } else {
    state.currentConversation.messages.forEach(message => {
      const messageDiv = appendMessage(message.role, message.content, !!message.isHTML);
      if (message.role === 'assistant') {
        const storedEnvelope = normalizeGate2Envelope({
          reply: message.content,
          gate2: message.gate2 || null,
          legacy_artifact: message.legacy_artifact || message.artifact || null,
          errors: message.errors || [],
          trace_id: message.traceId || message.trace_id || null,
          run_id: message.runId || null,
          message_id: message.messageId || null,
          conversation_id: message.conversationId || conversationId,
          user_id: message.userId || state.userId || null,
          auth_session_id: message.authSessionId || state.authSessionId || null
        }, {
          trace_id: message.traceId || null,
          run_id: message.runId || null,
          message_id: message.messageId || null,
          conversation_id: message.conversationId || conversationId,
          user_id: message.userId || state.userId || null,
          auth_session_id: message.authSessionId || state.authSessionId || null
        });

        if (storedEnvelope.gate2 || storedEnvelope.errors.length > 0 || storedEnvelope.trace_id || storedEnvelope.legacy_artifact) {
          renderGate2Envelope(messageDiv, storedEnvelope, {
            originalUserText: '',
            onRetry: () => simulateEliyResponse(message.originalUserText || message.content || '')
          });
        } else if (message.artifact) {
          detectAndRenderArtifact(messageDiv, message.content, '', message.artifact);
        }
      }
    });
  }

  renderRecentConversations();
  refreshAssistantMessageSelectors();
  return state.currentConversation;
}

function getWelcomeMessageHTML() {
  return `
    <p>你好，我是Eliy，你的主体型商业智能体。</p>
    <p>我不会给你空洞的鼓励。我会帮你看清问题、聚焦瓶颈、做出有依据的判断。</p>
    <p>先告诉我：你现在面临的最大挑战是什么？</p>
  `;
}

function formatHistoryTime(timestamp) {
  if (!timestamp) return '刚刚';
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// === 消息格式化转换 ===
function formatText(text) {
  let cleaned = text
    .replace(/Mode: real LLM\nModel: DeepSeek V4 Flash/gi, '')
    .replace(/Mode: generic fallback baseline/gi, '')
    .replace(/Mode: generic fallback/gi, '')
    .replace(/^\[Mock\]\s*/i, '');
    
  return cleaned.split('\n').map(line => {
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/`(.*?)`/g, '<code style="background:rgba(155,140,255,0.15);padding:0.1rem 0.35rem;border-radius:4px;font-size:0.85rem;color:var(--color-eliy)">$1</code>');
    return `<p>${line}</p>`;
  }).join('');
}

function getActiveSkill() {
  return state.isSfocusMode ? 'sfocus' : 'default';
}

function getServerContextScope() {
  return state.serverContextInitialized ? 'existing_conversation' : 'new_conversation';
}

function getCurrentConversationId() {
  return state.currentConversation?.id || state.sessionId;
}

function markServerContextInitialized() {
  state.serverContextInitialized = true;
  if (state.currentConversation) {
    state.currentConversation.serverContextInitialized = true;
    const conversations = getRecentConversations().filter(item => item.id !== state.currentConversation.id);
    conversations.unshift(state.currentConversation);
    setRecentConversations(conversations);
    renderRecentConversations();
  }
}

function updateSkillObserver(debugMeta = null) {
  if (frontSkillMode) frontSkillMode.textContent = getActiveSkill();
  if (backendSkillMode) backendSkillMode.textContent = debugMeta?.skillModeObserved || '未返回';
  if (skillTriggerSource) skillTriggerSource.textContent = debugMeta?.triggerSource || 'none';
}

function normalizeActionCardFields(artifactPayload = {}, assistantText = '', originalUserText = '') {
  const sourceFields = artifactPayload.fields || {};
  const aliases = {
    '行动名称': ['行动名称', 'name', 'title', 'action_name', 'actionName'],
    '行动目的': ['行动目的', 'purpose', 'goal', 'action_goal', 'actionGoal'],
    '下一步动作': ['下一步动作', 'next_step', 'nextAction', 'next_action', 'nextStep'],
    '负责人': ['负责人', 'owner', 'assignee', 'responsible_person'],
    '完成标准': ['完成标准', 'success_criteria', 'done_definition', 'completion_criteria', 'acceptance_criteria'],
    '检查时间': ['检查时间', 'check_time', 'review_time', 'checkTime'],
    '待补充信息': ['待补充信息', 'missing_info', 'additional_info', 'extra_info']
  };

  const normalized = {};
  Object.keys(aliases).forEach(label => {
    normalized[label] = pickActionCardField(sourceFields, aliases[label]) ||
      extractActionCardTextField(assistantText, label) ||
      '待确认';
  });

  if (isAllActionCardFieldsPending(normalized)) {
    const fallback = buildConservativeActionCardFallback(artifactPayload.title, assistantText, originalUserText);
    Object.assign(normalized, fallback);
  }

  return normalized;
}

function pickActionCardField(fields, keys) {
  for (const key of keys) {
    const value = fields[key];
    if (isMeaningfulActionCardValue(value)) return String(value).trim();
  }
  return '';
}

function extractActionCardTextField(text, fieldName) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}[：:]\\s*([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match && isMeaningfulActionCardValue(match[1]) ? match[1].trim() : '';
}

function isMeaningfulActionCardValue(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== '待确认';
}

function isAllActionCardFieldsPending(fields) {
  return Object.values(fields).every(value => !isMeaningfulActionCardValue(value));
}

function buildConservativeActionCardFallback(title = '', assistantText = '', originalUserText = '') {
  const sourceText = `${title}\n${assistantText}\n${originalUserText}`;
  const bottleneckMatch = sourceText.match(/(?:选|选择|候选瓶颈[：:]?)\\s*([^，。\\n]+?)(?:作为|为|$)/);
  const titleSeed = title.replace(/^下一步行动卡[｜|:：]?/, '').trim();
  const bottleneck = (bottleneckMatch && bottleneckMatch[1].trim()) || titleSeed || '当前候选瓶颈';

  return {
    '行动名称': `根据当前候选瓶颈整理：${bottleneck}`,
    '行动目的': `用最小证据确认“${bottleneck}”是否真的是当前最值得优先处理的瓶颈。`,
    '下一步动作': `围绕“${bottleneck}”补齐一组可观察事实，并记录最直接的下一步行动。`,
    '负责人': '待确认',
    '完成标准': '至少形成一条可在下轮检查的最小行动记录，并说明是否缓解当前候选瓶颈。',
    '检查时间': '待确认',
    '待补充信息': '待确认'
  };
}

// === 模拟智能体响应流 ===
async function simulateEliyResponse(userText, context = {}) {
  state.isStreaming = true;
  setStatus('思考中...', false);
  syncComposerState();

  const typingDiv = appendMessage('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>', true);
  const userMessageId = context.userMessageId || createLocalMessageId('msg_user');
  let assistantMessageId = createLocalMessageId('msg_assistant');
  const runId = createLocalRunId();
  const traceId = createLocalTraceId(runId);

  let response = '';
  let legacyArtifactPayload = null;
  let gate2Payload = null;
  let errors = [];
  const contextScope = getServerContextScope();
  const conversationId = getCurrentConversationId();
  console.info('[Client Context]', {
    event: 'send_chat',
    conversationId,
    contextScope,
    serverContextInitialized: state.serverContextInitialized,
    activeSkill: getActiveSkill()
  });

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: userText,
        model: 'deepseek-v4-flash',
        activeSkill: getActiveSkill(),
        contextScope,
        conversationId,
        userId: state.userId,
        authSessionId: state.authSessionId,
        messageId: userMessageId,
        runId,
        traceId,
        history: [{ role: 'user', content: userText }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      const envelope = normalizeGate2Envelope(data, {
        trace_id: traceId,
        run_id: runId,
        message_id: assistantMessageId,
        conversation_id: conversationId,
        user_id: state.userId,
        auth_session_id: state.authSessionId
      });
      response = envelope.reply;
      legacyArtifactPayload = envelope.legacy_artifact || null;
      gate2Payload = envelope.gate2 || null;
      errors = envelope.errors || [];
      assistantMessageId = envelope.message_id || assistantMessageId;
      updateSkillObserver(data.debug_meta || null);
    } else {
      const errorData = await res.json().catch(() => null);
      if (errorData && typeof errorData === 'object') {
        if (res.status === 401 && isAuthErrorPayload(errorData)) {
          redirectToLogin();
          return;
        }
        const envelope = normalizeGate2Envelope(errorData, {
          trace_id: traceId,
          run_id: runId,
          message_id: assistantMessageId,
          conversation_id: conversationId,
          user_id: state.userId,
          auth_session_id: state.authSessionId
        });
        response = envelope.reply;
        legacyArtifactPayload = envelope.legacy_artifact || null;
        gate2Payload = envelope.gate2 || null;
        errors = envelope.errors.length > 0 ? envelope.errors : [{
          code: 'CHAT_API_NON_200',
          message: `API returned ${res.status}`,
          retryable: true,
          trace_id: envelope.trace_id || traceId
        }];
        assistantMessageId = envelope.message_id || assistantMessageId;
        updateSkillObserver(errorData.debug_meta || null);
      } else {
        const errorText = await res.text().catch(() => '');
        throw new Error(`API return non-200 status${errorText ? `: ${errorText}` : ''}`);
      }
    }
  } catch (e) {
    if (e?.status === 401 && isAuthErrorPayload(e.payload)) {
      redirectToLogin();
      return;
    }
    console.warn('[API] 后端离线，采用 Mock 模式', e);
    errors = [{
      code: 'CHAT_BACKEND_FALLBACK',
      message: e instanceof Error ? e.message : String(e),
      retryable: true,
      trace_id: traceId
    }];
    // 前端 fallback 逻辑
    if (userText.includes('请基于当前成果生成一张下一步行动卡') || userText.includes('生成行动卡') || userText.includes('转成行动卡')) {
      response = `好的，我已基于当前成果为你生成了下一步行动卡草稿。`;
      legacyArtifactPayload = {
        schema_version: "0.1",
        type: "next_action_card",
        title: "下一步行动卡｜整理获客成本关键数据",
        status: "suggested",
        fields: {
          "行动名称": "整理获客成本关键数据",
          "行动目的": "确认获客成本上升主要来自投放端、销售转化端，还是两者共同作用。",
          "下一步动作": "请先整理过去三个月的广告费用、咨询量、成交量和线索跟进数据。",
          "负责人": "待确认",
          "完成标准": "至少补齐广告费用、咨询量、成交量三项数据，并能按月份对比。",
          "检查时间": "待确认",
          "待补充信息": "线索来源、销售跟进记录、成交周期。"
        }
      };
    } else if (userText.includes('整理成成果卡') || userText.includes('整理成待办') || userText.includes('整理成果') || userText.includes('当前成果') || userText.includes('待办事项版本') || userText.includes('形成当前成果')) {
      response = `我先根据你已提供的信息整理一个当前版本；缺失的信息放在待补充项里。`;
      legacyArtifactPayload = {
        schema_version: "0.1",
        type: "current_result_card",
        title: "当前成果卡｜待办事项草稿",
        status: "suggested",
        sections: [
          {
            label: "已知情况",
            content: "广告账户结构老化，点击成本上升，销售跟进转化不足。"
          },
          {
            label: "当前判断",
            content: "获客成本上升可能同时受投放端和销售转化端影响。"
          },
          {
            label: "待补充信息",
            content: "近三个月广告费用、咨询量、成交量和线索跟进数据。"
          },
          {
            label: "下一步行动",
            content: "先整理关键数据。"
          }
        ]
      };
    } else {
      response = `我先根据你已提供的信息整理一个当前版本；缺失的信息放在待补充项里。请描述一下你当前面临的核心误区或拗力。`;
      legacyArtifactPayload = null;
    }
  }

  // 过滤成果卡触发前的机械追问文案
  const isArtifactTrigger = userText.includes('整理成成果卡') || 
                            userText.includes('整理成待办') || 
                            userText.includes('整理成行动') || 
                            userText.includes('当前成果') || 
                            userText.includes('待办事项版本') ||
                            userText.includes('整理成果');
  if (isArtifactTrigger && response.includes('请提供更多业务细节')) {
    response = `我先根据你已提供的信息整理一个当前版本；缺失的信息放在待补充项里。`;
  }

  // 智能体消息流式渲染
  const bubble = typingDiv.querySelector('.bubble');
  bubble.innerHTML = '';
  for (let i = 0; i < response.length; i++) {
    bubble.innerHTML = formatText(response.substring(0, i + 1));
    msgList.scrollTop = msgList.scrollHeight;
    await sleep(10 + Math.random() * 12);
  }

  state.isStreaming = false;
  setStatus('连接就绪', true);
  syncComposerState();

  // 触发后台记录模块同步状态
  try {
    await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifact: legacyArtifactPayload,
        legacy_artifact: legacyArtifactPayload,
        activeSkill: getActiveSkill(),
        contextScope,
        conversationId,
        userId: state.userId,
        authSessionId: state.authSessionId,
        messageId: assistantMessageId,
        runId,
        traceId
      })
    });
    markServerContextInitialized();
  } catch (e) {
    console.warn('[Recorder] 后台归档失败:', e);
  }

  // 先渲染 Gate 2/legacy envelope，再保留旧 artifact fallback
  const envelope = normalizeGate2Envelope({
    reply: response,
    gate2: gate2Payload,
    legacy_artifact: legacyArtifactPayload,
    errors,
    trace_id: traceId,
    run_id: runId,
    message_id: assistantMessageId,
    conversation_id: conversationId,
    user_id: state.userId,
    auth_session_id: state.authSessionId
  });
  renderGate2MessageAdapter(typingDiv, envelope, {
    originalUserText: userText,
    onRetry: simulateEliyResponse,
    binding: {
      trace_id: traceId,
      run_id: runId,
      message_id: assistantMessageId,
      conversation_id: conversationId,
      user_id: state.userId,
      auth_session_id: state.authSessionId
    }
  });

  // 兼容旧的 artifact 文本识别路径：仅在没有 gate2 且没有 legacy artifact 时才会继续补渲染
  if (!gate2Payload && !legacyArtifactPayload) {
    detectAndRenderArtifact(typingDiv, response, userText, null);
  }

  // ownerTestPreserveTraceChipAfterArtifactDetection: keep trace chip visible for normal assistant replies.
  const ownerTestTraceBubble = typingDiv.querySelector('.bubble');
  if (traceId && ownerTestTraceBubble && !typingDiv.querySelector('[data-testid="trace-chip"]')) {
    renderGate2TraceChip(ownerTestTraceBubble, traceId);
  }

  persistConversationMessage({
    role: 'assistant',
    content: response,
    isHTML: false,
    artifact: legacyArtifactPayload,
    legacy_artifact: legacyArtifactPayload,
      gate2: gate2Payload,
      errors,
      messageId: assistantMessageId,
      runId,
      traceId,
      userId: state.userId,
      authSessionId: state.authSessionId,
      conversationId,
      originalUserText: state.lastSubmittedUserText || userText
    });
}

// === 直接从回复文本中检测成果卡/行动卡 (无文件系统依赖) ===
function detectAndRenderArtifact(parentDiv, text, originalUserText = '', artifactPayload = null) {
  if (artifactPayload) {
    if (artifactPayload.type === 'current_result_card') {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'artifact-card';
      
      const sectionsHtml = artifactPayload.sections.map(sec => {
        return `<p><strong>${sec.label}：</strong>${sec.content}</p>`;
      }).join('');

      cardDiv.innerHTML = `
        <div class="card-header">
          <span class="card-title">✦ ${artifactPayload.title || '当前成果卡｜待办事项草稿'}</span>
          <span class="card-status pending">建议版本</span>
        </div>
        <div class="card-body">
          <div style="line-height:2;font-size:0.88rem;">
            ${sectionsHtml}
          </div>
        </div>
        <div class="card-actions">
          <button class="card-btn approve" id="btnApprove">采用这个版本</button>
          <button class="card-btn modify" id="btnModify">继续修改</button>
          <button class="card-btn freeze" id="btnFreeze">转成行动卡</button>
        </div>
      `;

      const bubble = parentDiv.querySelector('.bubble');
      bubble.appendChild(cardDiv);
      msgList.scrollTop = msgList.scrollHeight;

      // 绑定交互按钮响应
      cardDiv.querySelector('#btnApprove').addEventListener('click', () => {
        const actions = cardDiv.querySelector('.card-actions');
        actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-success); font-weight: 600;">✓ 已采用这个版本</div>`;
        cardDiv.querySelector('.card-status').className = 'card-status accepted';
        cardDiv.querySelector('.card-status').textContent = '已采用';
        
        submitMessage('确认，采用这个版本。');
      });

      cardDiv.querySelector('#btnFreeze').addEventListener('click', () => {
        const actions = cardDiv.querySelector('.card-actions');
        actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-eliy); font-weight: 600;">✦ 已生成下一步行动卡</div>`;
        cardDiv.querySelector('.card-status').className = 'card-status converted';
        
        submitMessage('请基于当前成果生成一张下一步行动卡。');
      });

      cardDiv.querySelector('#btnModify').addEventListener('click', () => {
        userInput.value = '我想继续修改：';
        userInput.focus();
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
      });
      return;
    } else if (artifactPayload.type === 'next_action_card') {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'artifact-card action-card';

      const fields = normalizeActionCardFields(artifactPayload, text, originalUserText);
      const actionName = fields['行动名称'];
      const actionGoal = fields['行动目的'];
      const nextStep = fields['下一步动作'];
      const owner = fields['负责人'];
      const criteria = fields['完成标准'];
      const checkTime = fields['检查时间'];
      const extraInfo = fields['待补充信息'];

      cardDiv.innerHTML = `
        <div class="card-header">
          <span class="card-title">⚡ ${artifactPayload.title || '下一步行动卡｜整理获客成本关键数据'}</span>
          <span class="card-status pending">建议版本</span>
        </div>
        <div class="card-body">
          <div style="line-height:1.8;font-size:0.88rem;">
            <p><strong>行动名称：</strong>${actionName}</p>
            <p><strong>行动目的：</strong>${actionGoal}</p>
            <p><strong>下一步动作：</strong>${nextStep}</p>
            <p><strong>负责人：</strong>${owner}</p>
            <p><strong>完成标准：</strong>${criteria}</p>
            <p><strong>检查时间：</strong>${checkTime}</p>
            <p><strong>待补充信息：</strong>${extraInfo}</p>
          </div>
        </div>
        <div class="card-actions">
          <div style="font-size: 0.78rem; color: var(--color-text-muted); font-weight: 500;">已生成下一步行动卡</div>
        </div>
      `;

      const bubble = parentDiv.querySelector('.bubble');
      bubble.appendChild(cardDiv);
      msgList.scrollTop = msgList.scrollHeight;
      return;
    }
  }

  // 只匹配明确的整理/生成语义，删除泛化的“卡”匹配
  const keywords = [
    '整理成待办',
    '整理成行动',
    '整理成成果卡',
    '待办事项版本',
    '生成行动卡',
    '转成行动卡',
    '当前成果',
    '整理成果',
    '形成当前成果'
  ];

  const hasKeyword = keywords.some(kw => text.includes(kw) || originalUserText.includes(kw));
  const hasArtifact = text.includes('候选版本：') || 
                      text.includes('候補改寫版本') || 
                      text.includes('候选版本') || 
                      text.includes('识别到的问题：') ||
                      text.includes('下一步行动卡') ||
                      text.includes('行动卡') ||
                      hasKeyword;

  const isUserTriggered = !text.includes('候选版本') && !text.includes('候補改寫版本') && hasKeyword;
  
  if (!hasArtifact) return;

  // 1. 判断是否为行动卡
  const isActionCard = text.includes('下一步行动卡') || text.includes('行动卡') || originalUserText.includes('行动卡') || originalUserText.includes('转成行动卡');
  if (isActionCard) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'artifact-card action-card';

    const fields = normalizeActionCardFields({ title: '下一步行动卡草稿', fields: {} }, text, originalUserText);
    const actionName = fields['行动名称'];
    const actionGoal = fields['行动目的'];
    const nextStep = fields['下一步动作'];
    const owner = fields['负责人'];
    const criteria = fields['完成标准'];
    const checkTime = fields['检查时间'];
    const extraInfo = fields['待补充信息'];

    cardDiv.innerHTML = `
      <div class="card-header">
        <span class="card-title">⚡ 下一步行动卡草稿</span>
        <span class="card-status pending">建议版本</span>
      </div>
      <div class="card-body">
        <div style="line-height:1.8;font-size:0.88rem;">
          <p><strong>行动名称：</strong>${actionName}</p>
          <p><strong>行动目的：</strong>${actionGoal}</p>
          <p><strong>下一步动作：</strong>${nextStep}</p>
          <p><strong>负责人：</strong>${owner}</p>
          <p><strong>完成标准：</strong>${criteria}</p>
          <p><strong>检查时间：</strong>${checkTime}</p>
          <p><strong>待补充信息：</strong>${extraInfo}</p>
        </div>
      </div>
      <div class="card-actions">
        <div style="font-size: 0.78rem; color: var(--color-text-muted); font-weight: 500;">已生成下一步行动卡</div>
      </div>
    `;

    const bubble = parentDiv.querySelector('.bubble');
    bubble.appendChild(cardDiv);
    msgList.scrollTop = msgList.scrollHeight;
    return;
  }

  // 2. 否则渲染成果卡
  let artifactName = '当前成果卡｜待办事项草稿';
  if (text.toLowerCase().includes('todo') || text.includes('待办')) {
    artifactName = '当前成果卡｜待办事项草稿';
  } else if (text.toLowerCase().includes('email') || text.includes('邮件')) {
    artifactName = '当前成果卡｜优化后的邮件内容';
  } else if (text.toLowerCase().includes('meeting') || text.includes('会议')) {
    artifactName = '当前成果卡｜会议纪要草稿';
  } else if (text.toLowerCase().includes('action') || text.includes('行动')) {
    artifactName = '当前成果卡｜下一步行动建议';
  } else if (text.toLowerCase().includes('plan') || text.includes('计划')) {
    artifactName = '当前成果卡｜执行路线草稿';
  }

  const candidate = extractCandidateText(text);
  const cardDiv = document.createElement('div');
  cardDiv.className = 'artifact-card';
  
  // 承接已有材料逻辑：检测是否包含获客、投放、销售等
  const checkText = (originalUserText + ' ' + text).toLowerCase();
  const hasBusinessDetails = checkText.includes('获客') || checkText.includes('广告') || 
                             checkText.includes('投放') || checkText.includes('销售') || 
                             checkText.includes('转化') || checkText.includes('老化') ||
                             checkText.includes('瓶颈');

  let displayContent = '';
  if (isUserTriggered) {
    if (hasBusinessDetails) {
      displayContent = `<div style="line-height:2;font-size:0.88rem;">
        <p><strong>1. 已知情况</strong>：广告账户结构老化，点击成本上升，销售跟进转化不足。</p>
        <p><strong>2. 当前判断</strong>：获客成本上升可能同时受投放端和销售转化端影响。</p>
        <p><strong>3. 待补充信息</strong>：近三个月广告费用、咨询量、成交量和线索跟进数据。</p>
        <p><strong>4. 下一步行动</strong>：先整理关键数据。</p>
       </div>`;
    } else {
      displayContent = `<div style="line-height:2;font-size:0.88rem;">
        <p><strong>1. 已知情况</strong>：已收到你的项目基本面描述。</p>
        <p><strong>2. 当前判断</strong>：主系统痛点 and 目标基本清晰，我先根据你已提供的信息整理一个当前版本；缺失的信息放在待补充项里。</p>
        <p><strong>3. 待补充信息</strong>：业务主体、目标衡量指标、核心约束条件。</p>
        <p><strong>4. 下一步行动</strong>：请你补充以上信息后决定。</p>
       </div>`;
    }
  } else {
    displayContent = candidate.replace(/\n/g, '<br>');
  }
  
  cardDiv.innerHTML = `
    <div class="card-header">
      <span class="card-title">✦ ${artifactName}</span>
      <span class="card-status pending">建议版本</span>
    </div>
    <div class="card-body">
      ${displayContent}
    </div>
    <div class="card-actions">
      <button class="card-btn approve" id="btnApprove">采用这个版本</button>
      <button class="card-btn modify" id="btnModify">继续修改</button>
      <button class="card-btn freeze" id="btnFreeze">转成行动卡</button>
    </div>
  `;

  const bubble = parentDiv.querySelector('.bubble');
  bubble.appendChild(cardDiv);
  msgList.scrollTop = msgList.scrollHeight;

  // 绑定交互按钮响应
  cardDiv.querySelector('#btnApprove').addEventListener('click', () => {
    const actions = cardDiv.querySelector('.card-actions');
    actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-success); font-weight: 600;">✓ 已采用这个版本</div>`;
    cardDiv.querySelector('.card-status').className = 'card-status accepted';
    cardDiv.querySelector('.card-status').textContent = '已采用';
    
    submitMessage('确认，采用这个版本。');
  });

  cardDiv.querySelector('#btnFreeze').addEventListener('click', () => {
    const actions = cardDiv.querySelector('.card-actions');
    actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-eliy); font-weight: 600;">✦ 已生成下一步行动卡</div>`;
    cardDiv.querySelector('.card-status').className = 'card-status converted';
    
    submitMessage('请基于当前成果生成一张下一步行动卡。');
  });

  cardDiv.querySelector('#btnModify').addEventListener('click', () => {
    userInput.value = '我想继续修改：';
    userInput.focus();
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });
}

// === 提取文本中的候选版内容 ===
function extractCandidateText(fullText) {
  const matchRealLLM = fullText.match(/(?:候选版本|候補版本|候选版本为|候補版本為)[：:\s\n]+([\s\S]+?)(?=\n请确认是否采用|\n請確認是否採用|\n\n请确认|\n\n請確認|$)/i);
  if (matchRealLLM) {
    return matchRealLLM[1].trim();
  }

  const matchDashes = fullText.match(/---\s*\n+([\s\S]+?)\n+---/);
  if (matchDashes) {
    return matchDashes[1].trim();
  }

  const matchSpecial = fullText.match(/候補改寫版本.*?[\s\S]*?[：:]\s*\n+([\s\S]+?)(?=\n\n請告訴我|\n\n请告诉我|$)/i);
  if (matchSpecial) {
    return matchSpecial[1].trim();
  }

  return fullText
    .replace(/已收到。我識別了當前版本中的一個可優化點，以下是候補改寫版本（Mode: generic fallback）：\n\n/i, '')
    .replace(/\n\n請告訴我是否要採用這個版本，或說明希望繼續修改的方向。/i, '')
    .replace(/請確認是否採用，或說明希望继续修改的方向。/i, '')
    .replace(/请确认是否采用，或说明希望继续修改的方向。/i, '')
    .trim();
}

// === 辅助工具函数 ===
function setupAutoResize() {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
    syncComposerState();
  });
}

function setStatus(text, ready) {
  $('#statusText').textContent = text;
  $('#statusDot').style.background = ready ? 'var(--color-success)' : 'var(--color-warning)';
  syncComposerState();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
