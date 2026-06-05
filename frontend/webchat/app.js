/**
 * Eliy Chat-first Client — app.js (v0.3.1-test)
 * 纯 JS 实现的商业智能体交互与状态引擎 (轻量扁平版)
 */

// === 全局状态 ===
const state = {
  sessionId: null,
  activeModel: 'Eliy v0.3.1',
  isStreaming: false,
  messageCount: 0,
  attachedFile: null,
  isSfocusMode: false,
};

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
const attachBtn = $('#attachBtn');
const fileInput = $('#fileInput');

// === 初始化入口 ===
document.addEventListener('DOMContentLoaded', () => {
  // 1. 生成会话 ID 并读取本地用户信息进行重定向守卫
  state.sessionId = 'sess_' + Date.now();
  initUserContext();

  // 2. 绑定页面上的交互事件监听
  setupEventHandlers();

  // 3. 开启自适应高度输入区
  setupAutoResize();
});

// === 用户上下文与安全拦截守卫 ===
function initUserContext() {
  const token = localStorage.getItem('ELIY_AUTH_TOKEN');
  const name = localStorage.getItem('ELIY_USER_NAME') || '用户';
  
  if (!token) {
    window.location.replace('./login.html');
    return;
  }
  
  // 设置侧边栏底部的登录账户展示
  $('#userNameText').textContent = name;
  const firstChar = name.trim().charAt(0).toUpperCase();
  $('#userAvatar').textContent = firstChar;
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

  // 登出逻辑：清理 localStorage 凭证并返回登录页
  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('ELIY_AUTH_TOKEN');
    localStorage.removeItem('ELIY_USER_NAME');
    window.location.replace('./login.html');
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
  newChatBtn.addEventListener('click', () => startNewSession());

  // 点击左侧增强技能 S'FOCUS Skill 逻辑
  sfocusSkillBtn.addEventListener('click', () => triggerSfocusSkill());

  // 响应式侧边栏折叠 toggle
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
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
}

// === 开始新对话会话 ===
function startNewSession() {
  if (state.isStreaming) return;
  state.sessionId = 'sess_' + Date.now();
  state.messageCount = 0;
  state.isSfocusMode = false;
  
  sfocusSkillBtn.classList.remove('active');
  const activeHistory = historyList.querySelector('.history-item.active');
  if (activeHistory) activeHistory.classList.remove('active');

  // 重置消息区为初始对话词
  msgList.innerHTML = '';
  appendMessage('assistant', `
    <p>新对话已开启。你好，我是 <strong>Eliy</strong>，你的商业诊断教练。</p>
    <p>我已经准备好接收你的项目输入，请描述你当前需要解决的核心商业问题或瓶颈。</p>
  `, true);
}

// === S'FOCUS Skill 激活与步骤引导修正 ===
function triggerSfocusSkill() {
  if (state.isStreaming) return;
  
  // 1. 提示用户进入 S'FOCUS 协作方式
  appendMessage('user', '⚡ 启用 S’FOCUS 协作分析');
  state.isSfocusMode = true;
  sfocusSkillBtn.classList.add('active');

  // 2. 界面展示排版优雅的步骤引导，不直接自动生成最终诊断结论
  appendMessage('assistant', `
    <p>已开启 <strong>S’FOCUS 协作分析模式</strong>。让我们按步骤排查你的项目要素，以锁定核心约束：</p>
    <div style="margin: 0.6rem 0; padding-left: 0.8rem; border-left: 2px solid var(--color-eliy); color: var(--color-text-muted);">
      <p>1. 你的<strong>业务系统</strong>是什么？（如：销售漏斗、研发交付线）</p>
      <p>2. 你的核心<strong>目标</strong>是什么？（如：月营收翻倍、提高交付速率）</p>
      <p>3. 当前存在哪些<strong>不良效应 (UDE)</strong>？（如：CAC 过高、流失严重）</p>
      <p>4. 你的<strong>制约因素 (Constraint)</strong> 可能在什么位置？</p>
      <p>5. 下一步需要优先控制什么<strong>投料 (Input)</strong>？</p>
    </div>
    <p>请首先告诉我们：<strong>你的业务系统和你的核心目标分别是什么？</strong></p>
  `, true);
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

  appendMessage('user', finalMessageText);
  userInput.value = '';
  userInput.style.height = 'auto';

  simulateEliyResponse(finalMessageText);
}

// === 渲染消息气泡 ===
function appendMessage(role, content, isHTML = false) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const avatarText = role === 'assistant' ? 'E' : '你';
  div.innerHTML = `
    <div class="avatar">${avatarText}</div>
    <div class="bubble">${isHTML ? content : formatText(content)}</div>
  `;
  msgList.appendChild(div);
  msgList.scrollTop = msgList.scrollHeight;
  state.messageCount++;
  return div;
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

// === 模拟智能体响应流 ===
async function simulateEliyResponse(userText) {
  state.isStreaming = true;
  setStatus('思考中...', false);

  const typingDiv = appendMessage('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>', true);

  let response = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: userText,
        model: 'deepseek-v4-flash',
        history: [{ role: 'user', content: userText }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      response = data.reply;
    } else {
      throw new Error('API return non-200 status');
    }
  } catch (e) {
    console.warn('[API] 后端离线，采用 Mock 模式', e);
    response = `已收到。为了定位约束，我们需要再次确认你的核心业务参数。请补充 CAC 或获客转化率细节。`;
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

  // 触发后台记录模块同步状态
  try {
    await fetch('/api/record', { method: 'POST' });
  } catch (e) {
    console.warn('[Recorder] 后台归档失败:', e);
  }

  // 不再使用 `/eliy-kernel/memory/ARTIFACT_STATUS.md`
  // 直接从回复文本中检查并抽取渲染“成果卡”
  detectAndRenderArtifact(typingDiv, response);
}

// === 直接从回复文本中检测成果卡 (无文件系统依赖) ===
function detectAndRenderArtifact(parentDiv, text) {
  const hasArtifact = text.includes('候选版本：') || 
                      text.includes('候補改寫版本') || 
                      text.includes('候选版本') || 
                      text.includes('识别到的问题：');
                      
  if (!hasArtifact) return;

  // 提取卡片类型名称
  let artifactName = '改写成果';
  if (text.toLowerCase().includes('todo') || text.includes('待办')) {
    artifactName = '改写后的待办事项';
  } else if (text.toLowerCase().includes('email') || text.includes('邮件')) {
    artifactName = '优化后的邮件内容';
  } else if (text.toLowerCase().includes('meeting') || text.includes('会议')) {
    artifactName = '提炼后的会议纪要';
  } else if (text.toLowerCase().includes('action') || text.includes('行动')) {
    artifactName = '明确的下一步行动';
  } else if (text.toLowerCase().includes('plan') || text.includes('计划')) {
    artifactName = '细化的执行路线';
  }

  const candidate = extractCandidateText(text);

  const cardDiv = document.createElement('div');
  cardDiv.className = 'artifact-card';
  
  cardDiv.innerHTML = `
    <div class="card-header">
      <span class="card-title">💎 ${artifactName}</span>
      <span class="card-status pending">等待确认</span>
    </div>
    <div class="card-body">
      ${candidate.replace(/\n/g, '<br>')}
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
    // 隐藏卡片交互按钮，展示已采用标签
    const actions = cardDiv.querySelector('.card-actions');
    actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-success); font-weight: 600;">✓ 已采用这个版本</div>`;
    cardDiv.querySelector('.card-status').className = 'card-status accepted';
    cardDiv.querySelector('.card-status').textContent = '已采用';
    
    submitMessage('确认，采用这个版本。');
  });

  cardDiv.querySelector('#btnFreeze').addEventListener('click', () => {
    // 隐藏卡片交互按钮，展示已转为行动卡标签
    const actions = cardDiv.querySelector('.card-actions');
    actions.innerHTML = `<div style="font-size: 0.78rem; color: var(--color-eliy); font-weight: 600;">✦ 已转为行动卡</div>`;
    cardDiv.querySelector('.card-status').className = 'card-status converted';
    cardDiv.querySelector('.card-status').textContent = '已转换';
    
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
  });
}

function setStatus(text, ready) {
  $('#statusText').textContent = text;
  $('#statusDot').style.background = ready ? 'var(--color-success)' : 'var(--color-warning)';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
