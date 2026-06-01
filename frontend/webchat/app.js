/**
 * Eliy WebChat — 前端交互逻辑
 * 纯 JS，无框架依赖（MVP 阶段）
 */

// === 状态 ===
const state = {
  sessionId: null,
  currentPhase: 'INTAKE',
  isStreaming: false,
  isRecording: false,
  pendingHITL: null,
  radarScores: { '获客能力': 0, '转化效率': 0, '交付质量': 0, '客户留存': 0, '团队能力': 0, '财务健康': 0 },
  messageCount: 0,
};

// === DOM ===
const $ = (sel) => document.querySelector(sel);
const msgList = $('#messageList');
const userInput = $('#userInput');
const sendBtn = $('#sendBtn');
const voiceBtn = $('#voiceBtn');
const phaseSteps = document.querySelectorAll('.phase-step');
const hitlBar = $('#hitlBar');
const hitlContent = $('#hitlContent');
const reportBtn = $('#generateReport');
const menuToggle = $('#menuToggle');
const sidebar = $('#sidebar');

// === 初始化 ===
document.addEventListener('DOMContentLoaded', () => {
  state.sessionId = 'sess_' + Date.now();
  drawRadar();
  setupAutoResize();
});

// === 发送消息 ===
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
  const text = userInput.value.trim();
  if (!text || state.isStreaming) return;
  appendMessage('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';
  simulateEliyResponse(text);
}

// === 消息渲染 ===
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
  // silent 能力采集：消息数量达到阈值后启用报告按钮
  if (state.messageCount >= 4) reportBtn.disabled = false;
  return div;
}

function cleanStreamingTags(text) {
  return text
    .replace(/\*\*我的判断：\*\*/g, '')
    .replace(/\*\*我的判斷：\*\*/g, '')
    .replace(/\*\*小行动：\*\*/g, '')
    .replace(/\*\*小行動：\*\*/g, '')
    .replace(/\*\*下次复盘看：\*\*/g, '')
    .replace(/\*\*下次複盤看：\*\*/g, '');
}

function formatText(text) {
  const cleaned = cleanStreamingTags(text);
  return cleaned.split('\n').map(line => {
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/`(.*?)`/g, '<code style="background:rgba(91,106,191,0.2);padding:0.1rem 0.3rem;border-radius:4px;font-size:0.82rem">$1</code>');
    return `<p>${line}</p>`;
  }).join('');
}

// === Real & Streaming 交互（替代纯前端 Mock 模拟，打通后端闭环） ===
async function simulateEliyResponse(userText) {
  state.isStreaming = true;
  setStatus('思考中...', false);

  // 显示打字指示器
  const typingDiv = appendMessage('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>', true);

  let response = '';
  try {
    // 请求本地 API 进行智能体对话与 transcript 记录
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
      throw new Error('Server returned error status');
    }
  } catch (e) {
    console.warn('[API] 无法连接到后端 /api/chat，降级使用本地 Mock', e);
    response = generatePhaseResponse(userText);
  }

  // streaming 渲染
  const bubble = typingDiv.querySelector('.bubble');
  bubble.innerHTML = '';
  for (let i = 0; i < response.length; i++) {
    bubble.innerHTML = formatText(response.substring(0, i + 1));
    msgList.scrollTop = msgList.scrollHeight;
    await sleep(12 + Math.random() * 18);
  }

  // 更新雷达图（silent 采集）
  silentCollect(userText);
  drawRadar();

  // 阶段推进检查
  checkPhaseAdvance();

  state.isStreaming = false;
  setStatus('就绪', true);

  // 触发后台记录模块并重新载入 NEXT_CONTEXT.md，完成闭环交互测试
  try {
    console.log('[Recorder] 正在触发后台记录模块...');
    const recRes = await fetch('/api/record', { method: 'POST' });
    if (recRes.ok) {
      console.log('[Recorder] 后台记录处理完成！');
      const nextCtxRes = await fetch('/eliy-kernel/memory/NEXT_CONTEXT.md');
      if (nextCtxRes.ok) {
        const nextCtxText = await nextCtxRes.text();
        console.log('[Context Reload] 成功读取下一轮 NEXT_CONTEXT.md 内容:\n', nextCtxText);
      }
    }
  } catch (e) {
    console.warn('[Recorder] 触发后台记录或重载 NEXT_CONTEXT 失败:', e);
  }
}

// === 基于投料阶段的响应生成 ===
function generatePhaseResponse(userText) {
  const responses = {
    INTAKE: [
      `收到。让我确认一下你的处境：\n\n你提到了「${userText.substring(0, 20)}...」。在我深入分析之前，需要再确认几个点：\n\n1. **你的业务目前处于什么阶段？**（MVP验证/早期增长/规模化）\n2. **团队规模**大概多少人？\n3. **这个问题已经持续多久了？**\n\n这些信息会帮助我更精准地定位瓶颈。`,
      `好，这是个好的起点。但我需要更多具体数据才能给出有依据的判断，而不是空洞的建议。\n\n你能提供以下信息吗：\n- 月营收范围\n- 获客成本（CAC）大概是多少\n- 客户留存率\n\n**没有数据，我不会猜。**`
    ],
    FRAMING: [
      `根据你提供的信息，我初步构建了这个问题框架：\n\n**表面问题**: ${userText.substring(0, 30)}...\n**可能的根因假设**（置信度: 🟡 中）：\n1. 价值链中存在瓶颈环节\n2. 资源分配未聚焦在核心约束上\n\n**推翻条件**: 如果你的转化率高于行业平均 2 倍，则假设 1 不成立。\n\n你觉得这个方向对吗？还是我漏掉了什么？`,
    ],
    DIAGNOSIS: [
      `我使用 **TP-Lite 瓶颈诊断** 分析了你的情况：\n\n🔴 **核心瓶颈**: 获客到转化的漏斗效率（置信度: 🟡 65%）\n\n**依据**:\n- 你提到获客成本持续上升 → 获客渠道可能饱和\n- 团队精力分散在多个方向 → S'FOCUS 显示聚焦度不足\n\n**推翻条件**: 如果实际 LTV/CAC > 3，则瓶颈可能不在获客端。\n\n⚠️ 这个判断需要你确认。`,
    ],
    PRESCRIPTION: [
      `基于诊断结果，分阶段行动建议：\n\n🔴 **P0 立即执行**:\n- 暂停所有非核心获客渠道，集中资源到 ROI 最高的 1-2 个\n\n🟡 **P1 本周启动**:\n- 量化每个渠道的真实 CAC（含隐性成本）\n\n🔵 **P2 中期**:\n- 建立转化漏斗监控仪表盘\n\n**确认等级: L3** — 需要你明确确认后才会记录为行动方案。`,
    ],
    FOLLOW_UP: [
      `距离上次行动建议已过去一段时间。让我们复盘：\n\n1. P0 行动执行了吗？结果如何？\n2. 获客成本有变化吗？\n3. 有没有发现新的瓶颈？\n\n复盘不是为了追责，而是为了进化认知。`,
    ],
  };

  const pool = responses[state.currentPhase] || responses.INTAKE;
  return pool[Math.floor(Math.random() * pool.length)];
}

// === 投料阶段管理 ===
function setPhase(phase) {
  state.currentPhase = phase;
  const phases = ['INTAKE', 'FRAMING', 'DIAGNOSIS', 'PRESCRIPTION', 'FOLLOW_UP'];
  const idx = phases.indexOf(phase);
  phaseSteps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    if (i < idx) step.classList.add('done');
    if (i === idx) step.classList.add('active');
  });
}

function checkPhaseAdvance() {
  // 简单规则：每 3 轮对话推进一个阶段
  const phases = ['INTAKE', 'FRAMING', 'DIAGNOSIS', 'PRESCRIPTION', 'FOLLOW_UP'];
  const idx = phases.indexOf(state.currentPhase);
  if (state.messageCount > 0 && state.messageCount % 6 === 0 && idx < phases.length - 1) {
    setPhase(phases[idx + 1]);
    // 进入 DIAGNOSIS 时显示 HITL 确认
    if (phases[idx + 1] === 'DIAGNOSIS') showHITL('Eliy 正在使用 TP-Lite 进行瓶颈诊断，是否确认进入深度分析？');
  }
}

// === HITL 确认 ===
function showHITL(message) {
  hitlBar.style.display = 'flex';
  hitlContent.textContent = message;
  state.pendingHITL = { id: 'j_' + Date.now(), statement: message };
}

function hitlRespond(decision) {
  hitlBar.style.display = 'none';
  if (decision === 'APPROVE') {
    appendMessage('assistant', `✅ 已确认。${state.pendingHITL?.statement ?? ''}\n\n继续深度分析...`, false);
  } else if (decision === 'REJECT') {
    appendMessage('assistant', '已记录你的反对意见。请告诉我你的想法，我会重新评估。', false);
  }
  state.pendingHITL = null;
}

// === Silent 能力采集 ===
function silentCollect(text) {
  const len = text.length;
  // 根据消息长度和深度微调雷达图（置信度很低，仅供参考）
  if (len > 100) { state.radarScores['获客能力'] = Math.min(1, state.radarScores['获客能力'] + 0.05); }
  if (text.includes('收入') || text.includes('营收') || text.includes('利润')) {
    state.radarScores['财务健康'] = Math.min(1, state.radarScores['财务健康'] + 0.08);
  }
  if (text.includes('团队') || text.includes('员工') || text.includes('招聘')) {
    state.radarScores['团队能力'] = Math.min(1, state.radarScores['团队能力'] + 0.08);
  }
  if (text.includes('客户') || text.includes('用户') || text.includes('留存')) {
    state.radarScores['客户留存'] = Math.min(1, state.radarScores['客户留存'] + 0.08);
  }
  // 每次小幅随机提升，模拟数据积累
  Object.keys(state.radarScores).forEach(k => {
    state.radarScores[k] = Math.min(1, state.radarScores[k] + Math.random() * 0.03);
  });
}

// === 雷达图渲染 ===
function drawRadar() {
  const canvas = document.getElementById('radarCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35;
  const labels = Object.keys(state.radarScores);
  const values = Object.values(state.radarScores);
  const n = labels.length;
  const step = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, w, h);

  // 网格
  for (let lv = 1; lv <= 5; lv++) {
    const lr = r * (lv / 5);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i * step - Math.PI / 2;
      const x = cx + lr * Math.cos(a), y = cy + lr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(42,51,80,0.6)';
    ctx.stroke();
  }

  // 轴线 + 标签
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#8892a8';
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const a = i * step - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(42,51,80,0.4)';
    ctx.stroke();
    const lx = cx + (r + 22) * Math.cos(a), ly = cy + (r + 22) * Math.sin(a);
    ctx.fillText(labels[i], lx, ly + 4);
  }

  // 数据区域
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const a = idx * step - Math.PI / 2;
    const v = Math.max(0, Math.min(1, values[idx]));
    const x = cx + r * v * Math.cos(a), y = cy + r * v * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(91,106,191,0.2)';
  ctx.fill();
  ctx.strokeStyle = '#5b6abf';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 数据点
  for (let i = 0; i < n; i++) {
    const a = i * step - Math.PI / 2;
    const v = Math.max(0, Math.min(1, values[i]));
    ctx.beginPath();
    ctx.arc(cx + r * v * Math.cos(a), cy + r * v * Math.sin(a), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#5b6abf';
    ctx.fill();
    ctx.strokeStyle = '#e8eaf0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// === 语音输入（Web Speech API） ===
voiceBtn.addEventListener('click', toggleVoice);
function toggleVoice() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('浏览器不支持语音识别');
    return;
  }
  if (state.isRecording) { stopRecording(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = 'zh-CN';
  recognition.interimResults = true;
  recognition.onresult = (e) => {
    const text = Array.from(e.results).map(r => r[0].transcript).join('');
    userInput.value = text;
  };
  recognition.onend = () => stopRecording();
  recognition.start();
  state.isRecording = true;
  voiceBtn.classList.add('recording');
  voiceBtn.textContent = '⏹';
  window._recognition = recognition;
}
function stopRecording() {
  if (window._recognition) window._recognition.stop();
  state.isRecording = false;
  voiceBtn.classList.remove('recording');
  voiceBtn.textContent = '🎤';
}

// === 报告生成 ===
reportBtn.addEventListener('click', () => {
  const modal = $('#reportModal');
  const frame = $('#reportFrame');
  frame.src = '../../eliy-kernel/artifacts/diagnosis_report.html';
  modal.style.display = 'flex';
});
function closeReport() { $('#reportModal').style.display = 'none'; }

// === 侧边栏 toggle ===
menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

// === 输入框自动高度 ===
function setupAutoResize() {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  });
}

// === 状态指示 ===
function setStatus(text, ready) {
  $('#statusText').textContent = text;
  $('#statusDot').style.background = ready ? '#34d399' : '#fbbf24';
}

// === 工具函数 ===
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
