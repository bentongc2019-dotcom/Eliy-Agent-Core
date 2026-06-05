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

  // 2. 恢复存储的主题偏好
  initTheme();

  // 3. 绑定页面上的交互事件监听
  setupEventHandlers();

  // 4. 开启自适应高度输入区
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

  // 主题切换按钮
  const themeToggleBtn = $('#themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => toggleTheme());
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
    <p>你好，我是Eliy，你的主体型商业智能体。</p>
    <p>我不会给你空洞的鼓励。我会帮你看清问题、聚焦瓶颈、做出有依据的判断。</p>
    <p>先告诉我：你现在面临的最大挑战是什么？</p>
  `, true);
}

// === S'FOCUS Skill 激活与步骤引导修正 ===
function triggerSfocusSkill() {
  if (state.isStreaming) return;
  if (state.isSfocusMode) return;
  
  // 1. 以用户自然发言形式进入 S'FOCUS 协作
  appendMessage('user', "用 S'FOCUS 澄清这个经营问题");
  state.isSfocusMode = true;
  sfocusSkillBtn.classList.add('active');

  // 2. 界面展示排版优雅的步骤引导，不直接自动生成最终诊断结论
  appendMessage('assistant', `
    <p>我们可以用 S'FOCUS 来澄清这个经营问题。先从第一步开始：你现在要分析的系统是什么？这个系统的目标是什么？</p>
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
  let artifactPayload = null;

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
      artifactPayload = data.artifact || null;
    } else {
      throw new Error('API return non-200 status');
    }
  } catch (e) {
    console.warn('[API] 后端离线，采用 Mock 模式', e);
    // 前端 fallback 逻辑
    if (userText.includes('请基于当前成果生成一张下一步行动卡') || userText.includes('生成行动卡') || userText.includes('转成行动卡')) {
      response = `好的，我已基于当前成果为你生成了下一步行动卡草稿。`;
      artifactPayload = {
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
      artifactPayload = {
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
      artifactPayload = null;
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

  // 触发后台记录模块同步状态
  try {
    await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifact: artifactPayload
      })
    });
  } catch (e) {
    console.warn('[Recorder] 后台归档失败:', e);
  }

  // 直接从回复文本中检查并抽取渲染“成果卡”或“行动卡”
  detectAndRenderArtifact(typingDiv, response, userText, artifactPayload);
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

      const fields = artifactPayload.fields || {};
      const actionName = fields['行动名称'] || '待确认';
      const actionGoal = fields['行动目的'] || '待确认';
      const nextStep = fields['下一步动作'] || '待确认';
      const owner = fields['负责人'] || '待确认';
      const criteria = fields['完成标准'] || '待确认';
      const checkTime = fields['检查时间'] || '待确认';
      const extraInfo = fields['待补充信息'] || '待确认';

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

    // 字段提取逻辑，匹配失败则显示为“待确认”
    const getField = (fieldName) => {
      const regex = new RegExp(`${fieldName}：?\\s*\\n?([^\\n]+)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '待确认';
    };

    const actionName = getField('行动名称');
    const actionGoal = getField('行动目的');
    const nextStep = getField('下一步动作');
    const owner = getField('负责人');
    const criteria = getField('完成标准');
    const checkTime = getField('检查时间');
    const extraInfo = getField('待补充信息');

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
  });
}

function setStatus(text, ready) {
  $('#statusText').textContent = text;
  $('#statusDot').style.background = ready ? 'var(--color-success)' : 'var(--color-warning)';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
