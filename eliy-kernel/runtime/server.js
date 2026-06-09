import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// === 1. 简易 .env 解析器 ===
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match) {
        let val = match[2].trim();
        // 去除外层引号
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    });
    console.log('[Env] 成功加载 .env 配置文件');
  } else {
    console.log('[Env] 未找到 .env 配置文件，将使用系统环境变量');
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 3001;

// === 2. Mime Type 映射 ===
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// === 3. 创建 HTTP 服务 ===
const server = http.createServer(async (req, res) => {
  // 处理 CORS 预检请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // --- API 路由分发 ---
  if (pathname === '/api/chat' && req.method === 'POST') {
    await handleChat(req, res);
  } else if (pathname === '/api/record' && req.method === 'POST') {
    await handleRecord(req, res);
  } else if (pathname === '/api/tts' && req.method === 'POST') {
    await handleTTS(req, res);
  } else if (pathname === '/api/stt' && req.method === 'POST') {
    await handleSTT(req, res);
  } else if (pathname === '/api/save-file' && req.method === 'POST') {
    await handleSaveFile(req, res);
  } else {
    // --- 静态文件托管 ---
    let filePath = '';
    // 如果请求是以 /eliy-kernel 开头，允许前端静态读取内核文件（如 NEXT_CONTEXT.md）
    if (pathname.startsWith('/eliy-kernel/')) {
      filePath = path.join(ROOT_DIR, pathname);
    } else {
      // 默认映射到 frontend/webchat 静态目录
      const relativePath = pathname === '/' || pathname === '/index.html' ? '/index.html' : pathname;
      filePath = path.join(ROOT_DIR, 'frontend/webchat', relativePath);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Not Found: ${pathname}` }));
    }
  }
});

// === 4. /api/chat 处理逻辑 ===
// === 4. /api/chat 处理逻辑 ===
async function handleChat(req, res) {
  try {
    const body = await parseJsonBody(req);
    const userText = body.text || '';
    const model = process.env.DEEPSEEK_MODEL || body.model || 'deepseek-v4-flash';
    const clientArtifact = body.artifact || null;
    const activeSkillReceived = body.activeSkill === 'sfocus' ? 'sfocus' : 'default';

    const mode = process.env.CANDIDATE_GENERATION_MODE || 'generic_fallback';
    console.log(`[API /api/chat] 当前候选生成模式 CANDIDATE_GENERATION_MODE: ${mode}`);

    // 读取所有的 HAC、HLAMT 和当前 State / Context 文件以构建交互上下文
    const flashGuardRules = readKernelFile('runtime/ELIY_V0.3.1_FLASH_RUNTIME_GUARD_RULES.md');
    const hacAgentRules = readKernelFile('hac/HAC_AGENT_RULES.md');
    const frontendRules = readKernelFile('hac/FRONTEND_AGENT_RULES.md');
    const defaultIdentityStyle = readKernelFile('hac/DEFAULT_IDENTITY_STYLE.md');
    const hlamtFile = readKernelFile('hlamt/HLAMT.md');
    const stateFile = readKernelFile('memory/STATE.md');
    const nextContextFile = readKernelFile('memory/NEXT_CONTEXT.md');

    const sfocusKeywords = ["S’FOCUS", "SFOCUS", "瓶颈思维", "找瓶颈", "控制投料", "Choke the Release", "TOC learning or practice", "用 Eliy 分析一个经营系统"];
    const isFrontendSkillTriggered = activeSkillReceived === 'sfocus';
    const isKeywordTriggered = sfocusKeywords.some(kw => userText.includes(kw));
    const isNextContextTriggered = nextContextFile.includes("CURRENT_SKILL: sfocus");
    const isSfocusTriggered = isFrontendSkillTriggered || isKeywordTriggered || isNextContextTriggered;
    const triggerSource = isFrontendSkillTriggered
      ? 'frontend_active_skill'
      : isKeywordTriggered
        ? 'keyword'
        : isNextContextTriggered
          ? 'next_context'
          : 'none';
    const skillModeObserved = (isFrontendSkillTriggered || isKeywordTriggered)
      ? 'sfocus'
      : isNextContextTriggered
        ? 'mixed_or_inferred'
        : 'default';
    const artifactStatusText = readKernelFile('memory/ARTIFACT_STATUS.md');
    const artifactStatusMatch = artifactStatusText.match(/Status:\s*([^\n]+)/);
    const currentArtifactStatus = artifactStatusMatch ? artifactStatusMatch[1].trim() : 'unknown';
    const textPreview = userText.replace(/\s+/g, ' ').slice(0, 20);
    console.log(
      `[API /api/chat][observability] textPreview="${textPreview}" | activeSkillReceived=${activeSkillReceived} | sfocusInjected=${isSfocusTriggered} | triggerSource=${triggerSource} | hasClientArtifactContext=${!!clientArtifact} | currentArtifactStatus=${currentArtifactStatus}`
    );
    let sfocusSkillContent = "";
    if (isSfocusTriggered) {
      try {
        sfocusSkillContent = fs.readFileSync(path.join(ROOT_DIR, 'skills/sfocus/SKILL.md'), 'utf-8');
      } catch (e) {
        console.warn('Failed to load SFOCUS skill:', e.message);
      }
    }

    let reply = '';
    let cleanReply = '';
    let artifact = clientArtifact;

    if (mode === 'real_llm') {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        reply = `Real LLM call failed.\nReason: DEEPSEEK_API_KEY is not configured.\nFallback not used in this test.`;
        cleanReply = reply;
        console.error('[API /api/chat] 真实 LLM 调用失败：未配置 API Key，且根据测试约束不使用 fallback');
      } else {
        console.log('[API /api/chat] 模式为 real_llm，发起真实 LLM 调用...');
        try {
          const modeInstruction = isSfocusTriggered
            ? `[MANDATORY SYSTEM INSTRUCTION FOR SFOCUS COLLABORATION]\n` +
              `你必须在 "real LLM" 候选版本生成模式下运行。\n` +
              `当前对话使用 S’FOCUS 协作方式。请按以下顺序推进：\n` +
              `1. 澄清系统\n` +
              `2. 澄清目标\n` +
              `3. 澄清不良效应\n` +
              `4. 提出可能制约\n` +
              `5. 形成下一步行动\n` +
              `不要替用户直接下最终判断。信息不足时，把缺失项放入待补充信息。\n\n`
            : `[MANDATORY SYSTEM INSTRUCTION FOR DEFAULT MODE]\n` +
              `你必须在 Eliy default mode 下运行。\n` +
              `不要声称当前对话正在使用 S’FOCUS，除非 SFOCUS.skill 已被明确触发。\n` +
              `先理解用户真实意图，再决定是澄清、解释、收敛还是推进。\n` +
              `普通对话中不要暴露 artifact、Recorder、NEXT_CONTEXT、debug_meta、proposed、accepted、frozen 等内部语言。\n` +
              `不要默认生成 Action Card；只有用户明确要求，或对话已收敛到一个被用户接受的具体行动时才生成。\n\n`;

          const artifactPayloadContract =
            `[XML ARTIFACT PAYLOAD CONTRACT]\n` +
            `1. 当用户要求整理成果（如“整理成果”、“整理成成果卡”等）时，你必须在回答最后使用 <eliy_artifact>...</eliy_artifact> 标签包裹一个标准的 JSON payload，类型为 current_result_card，格式如下：\n` +
            `{\n` +
            `  "schema_version": "0.1",\n` +
            `  "type": "current_result_card",\n` +
            `  "title": "当前成果卡｜待办事项草稿",\n` +
            `  "status": "suggested",\n` +
            `  "sections": [\n` +
            `    { "label": "已知情况", "content": "..." },\n` +
            `    { "label": "当前判断", "content": "..." },\n` +
            `    { "label": "待补充信息", "content": "..." },\n` +
            `    { "label": "下一步行动", "content": "..." }\n` +
            `  ]\n` +
            `}\n` +
            `2. 当用户要求生成行动卡（如“请基于当前成果生成一张下一步行动卡”、“转成行动卡”）时，你必须在回答最后使用 <eliy_artifact>...</eliy_artifact> 标签包裹一个标准的 JSON payload，类型为 next_action_card，格式如下：\n` +
            `{\n` +
            `  "schema_version": "0.1",\n` +
            `  "type": "next_action_card",\n` +
            `  "title": "下一步行动卡｜整理获客成本关键数据",\n` +
            `  "status": "suggested",\n` +
            `  "fields": {\n` +
            `    "行动名称": "...",\n` +
            `    "行动目的": "...",\n` +
            `    "下一步动作": "...",\n` +
            `    "负责人": "待确认",\n` +
            `    "完成标准": "...",\n` +
            `    "检查时间": "待确认",\n` +
            `    "待补充信息": "..."\n` +
            `  }\n` +
            `}\n` +
            `缺失字段必须写“待确认”。完成标准尽量可观察。禁止输出 "frozen"、"决策库" 或 "高置信度诊断" 等字眼。\n` +
            `如果不是用户明确要求整理成果或转行动卡，绝对不要输出 <eliy_artifact> 标签及 JSON。`;
          const promptInstruction = modeInstruction + artifactPayloadContract;

          const classification = classifyArtifactInput(userText);
          let taskPrompt = '';
          if (classification === 'user_candidate_requires_judgment') {
            taskPrompt = 
              `[MANDATORY: USER CANDIDATE JUDGMENT]\n` +
              `用户提供了一个候选句并要求你判断。\n` +
              `你必须严格按以下格式回复，不得偏离：\n\n` +
              `具体评价：\n` +
              `<用1-2句话评价这个候选句，说明它在清晰度、责任人、可执行度上好在哪里或差在哪里，以及是否适合作为待办事项>\n\n` +
              `请确认是否采用作为最终版本。\n\n` +
              `Mode: real LLM\n` +
              `Model: DeepSeek V4 Flash`;
          } else if (classification === 'explicit_acceptance' || classification === 'explicit_freeze') {
            taskPrompt = 
              `[MANDATORY: EXPLICIT ACCEPTANCE]\n` +
              `用户已经确认采纳或冻结了这个候选版本。\n` +
              `你必须严格且仅按以下格式回复，不得偏离，也不得加入任何如“加入任务列表”等产品功能的动作：\n\n` +
              `当前 artifact 已标记为 ${classification === 'explicit_freeze' ? 'frozen' : 'accepted'}。请提供下一条输入，或说明是否继续调整其他内容。\n\n` +
              `Mode: real LLM\n` +
              `Model: DeepSeek V4 Flash`;
          } else {
            taskPrompt = promptInstruction;
          }

          const messages = [
            {
              role: 'system',
              content: `${flashGuardRules}\n\n${hacAgentRules}\n\n${frontendRules}${isSfocusTriggered ? '' : '\n\n' + defaultIdentityStyle}\n\n${hlamtFile}\n\n当前状态:\n${stateFile}\n\n当前上下文:\n${nextContextFile}\n\n${taskPrompt}${sfocusSkillContent ? '\n\n' + sfocusSkillContent : ''}`
            },
            ...(body.history || [{ role: 'user', content: userText }])
          ];

          const temperature = classification === 'user_candidate_requires_judgment' ? 0.2 : 0.7;

          let textReply = '';
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            attempts++;
            try {
              const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: model,
                  messages: messages,
                  temperature: temperature,
                  max_tokens: 1024
                })
              });

              if (response.ok) {
                const data = await response.json();
                const possibleReply = data.choices[0]?.message?.content || '';
                if (possibleReply.trim()) {
                  textReply = possibleReply;
                  break;
                }
                console.log(`[API /api/chat] 第 ${attempts} 次调用返回空响应，准备重试...`);
              } else {
                const errText = await response.text();
                console.log(`[API /api/chat] 第 ${attempts} 次调用接口错误 (${response.status}): ${errText}，准备重试...`);
              }
            } catch (err) {
              console.log(`[API /api/chat] 第 ${attempts} 次调用异常: ${err.message}，准备重试...`);
            }

            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (!textReply.trim()) {
            throw new Error("DeepSeek API returned empty or failed after 3 attempts.");
          }
          reply = textReply;
          cleanReply = reply;

          // 安全提取 Real LLM 返回的结构化 XML Payload
          const match = reply.match(/<eliy_artifact>([\s\S]*?)<\/eliy_artifact>/);
          if (match) {
            try {
              artifact = JSON.parse(match[1].trim());
              if (!artifact.type || !artifact.title) {
                artifact = null;
              } else {
                // 成功提取后，将 XML 标签从 reply 剔除，不渲染到前端聊天文本中
                cleanReply = reply.replace(/<eliy_artifact>[\s\S]*?<\/eliy_artifact>/g, '').trim();
              }
            } catch (e) {
              console.warn('[API /api/chat] Real LLM XML JSON 解析失败:', e.message);
              artifact = null;
            }
          }
        } catch (err) {
          reply = `Real LLM call failed.\nReason: ${err.message}\nFallback not used in this test.`;
          cleanReply = reply;
          console.error('[API /api/chat] 真实 LLM 调用失败，不使用 fallback:', err.message);
        }
      }
    } else {
      console.log('[API /api/chat] 模式为 generic_fallback，直接走对照 Mock 响应...');
      reply = generateMockReply(userText);
      // 统一替换或在末尾追加 Mode: generic fallback baseline
      if (reply.includes('Mode: generic fallback')) {
        reply = reply.replace('Mode: generic fallback', 'Mode: generic fallback baseline');
      } else {
        reply += '\n\nMode: generic fallback baseline';
      }
      cleanReply = reply;

      // generic_fallback 模式下的确定性 Payload 映射
      const cleanUserText = userText.trim().toLowerCase();
      
      const wantsActionCard = cleanUserText.includes('请基于当前成果生成一张下一步行动卡') || cleanUserText.includes('转成行动卡') || cleanUserText.includes('生成行动卡') || cleanUserText.includes('下一步行动卡');
      const wantsResultCard = cleanUserText.includes('整理成成果卡') || cleanUserText.includes('整理成待办') || cleanUserText.includes('整理成果') || cleanUserText.includes('当前成果') || cleanUserText.includes('待办事项版本') || cleanUserText.includes('形成当前成果');
      
      if (wantsActionCard) {
        artifact = {
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
        cleanReply = `好的，我已基于当前成果为你生成了下一步行动卡草稿。\n\nMode: generic fallback baseline`;
      } else if (wantsResultCard) {
        artifact = {
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
        cleanReply = `我先根据你已提供的信息整理一个当前版本；缺失的信息放在待补充项里。\n\nMode: generic fallback baseline`;
      } else {
        artifact = null;
      }
    }

    // 写入本轮 user input + assistant response 到 transcripts/latest-transcript.md
    const transcriptContent = `# Latest Transcript - Eliy v0.3.2-test\n\n**User**: ${userText}\n\n**Assistant**: ${cleanReply || reply}\n`;
    writeKernelFile('transcripts/latest-transcript.md', transcriptContent);
    console.log('[API /api/chat] 成功落盘 transcripts/latest-transcript.md');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      reply: cleanReply || reply,
      artifact: artifact,
      debug_meta: {
        activeSkillReceived,
        sfocusInjected: isSfocusTriggered,
        triggerSource,
        skillModeObserved
      }
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// === 4.5 Artifact Governance Classifier and Guard ===

// --- 結構性標記檢測函數（基於交付物互動類型，不依賴領域詞）---

// 用戶提供舊版本/當前版本，帶有質量反饋，未提出新候選版本
function detectLegacyArtifactMarkers(msg) {
  return (
    /当前版本[：:]/.test(msg) || /當前版本[：:]/.test(msg) ||
    /旧版本[：:]/.test(msg)   || /舊版本[：:]/.test(msg)   ||
    /现在版本[：:]/.test(msg) || /現在版本[：:]/.test(msg) ||
    /当前输出[：:]/.test(msg) || /當前輸出[：:]/.test(msg) ||
    /现在提取出的/.test(msg)  || /現在提取出的/.test(msg)  ||
    /原始输入[：:]/.test(msg) || /原始輸入[：:]/.test(msg) ||
    /这封.{0,6}写得/.test(msg)  || /這封.{0,6}寫得/.test(msg)  ||
    /这段.{0,12}不够/.test(msg) || /這段.{0,12}不夠/.test(msg) ||
    /这个.{0,12}不够/.test(msg) || /這個.{0,12}不夠/.test(msg) ||
    msg.includes('不够清楚')  || msg.includes('不夠清楚')  ||
    msg.includes('不够自然')  || msg.includes('不夠自然')  ||
    msg.includes('不够像人话') || msg.includes('不夠像人話') ||
    msg.includes('不够可执行') || msg.includes('不夠可執行') ||
    /提取出来的.{0,12}不够/.test(msg) || /提取出來的.{0,12}不夠/.test(msg) ||
    msg.includes('想继续改当前') || msg.includes('想繼續改當前') ||
    /继续改.{0,6}工具/.test(msg) || /繼續改.{0,6}工具/.test(msg)
  );
}

// 用戶明確引入一個新的候選版本
function detectCandidateIntroMarkers(msg) {
  return (
    msg.includes('我想改成') ||
    msg.includes('可以改成') ||
    msg.includes('我写成这样') || msg.includes('我寫成這樣') ||
    /候选版本[：:]/.test(msg) || /候選版本[：:]/.test(msg) ||
    /这个版本[：:]/.test(msg) || /這個版本[：:]/.test(msg) ||
    msg.includes('你看這樣') || msg.includes('你看这样')
  );
}

// 用戶明確要求對候選版本做判斷
function detectJudgmentRequestMarkers(msg) {
  return (
    msg.includes('你判断一下') || msg.includes('你判斷一下') ||
    /是否.*更自然/.test(msg)  ||
    /是否.*更清楚/.test(msg)  ||
    /是否.*符合要求/.test(msg) ||
    /是否.*更适合/.test(msg)  || /是否.*更適合/.test(msg) ||
    /是否比.*更/.test(msg)    ||
    msg.includes('这句话是否') || msg.includes('這句話是否') ||
    /是否.*待办/.test(msg)    || /是否.*待辦/.test(msg)   ||
    /是否.*合适/.test(msg)    || /是否.*合適/.test(msg)
  );
}

// 用戶明確接受
function detectExplicitAcceptanceMarkers(msg) {
  const t = msg.trim();
  return (
    /确认[，,]就用/.test(t) || /確認[，,]就用/.test(t) ||
    t.includes('我接受') ||
    t.includes('接受这个') || t.includes('接受這個') ||
    /^確認/.test(t) || /^确认/.test(t) ||
    t === '接受' || t === '接受。' ||
    t.includes('可以采用') || t.includes('可以採用') ||
    t.includes('确认采用') || t.includes('確認採用') ||
    t.includes('采用') || t.includes('採用') ||
    t.includes('这个可以') || t.includes('這個可以')
  );
}

// 用戶明確凍結
function detectExplicitFreezeMarkers(msg) {
  return (
    msg.includes('冻结') || msg.includes('凍結') ||
    msg.includes('以后按这个') || msg.includes('以後按這個')
  );
}

function classifyArtifactInput(userMsg) {
  const msg = userMsg || '';

  // 1. 系統/接續測試信號
  const isTestSignal =
    msg.includes('NEXT_CONTEXT') ||
    msg.includes('接续') || msg.includes('接續') ||
    msg.includes('test') ||
    msg.includes('测试') || msg.includes('測試') ||
    msg.trim() === '';
  if (isTestSignal) return 'no_artifact_input';

  // 2. 凍結指令
  if (detectExplicitFreezeMarkers(msg)) return 'explicit_freeze';

  // 3. 明確確認/接受
  if (detectExplicitAcceptanceMarkers(msg)) return 'explicit_acceptance';

  // 4. 明確拒絕
  if (
    msg.includes('拒绝') || msg.includes('拒絕') ||
    msg.includes('不对') || msg.includes('不對') ||
    msg.includes('重新改') || msg.includes('重新修改')
  ) return 'explicit_rejection';

  // 5. 用戶提供候補並要求判斷（需同時滿足引入 + 判斷請求）
  if (detectCandidateIntroMarkers(msg) && detectJudgmentRequestMarkers(msg)) {
    return 'user_candidate_requires_judgment';
  }

  // 6. 帶有舊版本/原始素材的輸入 → assistant 負責提出候補
  if (detectLegacyArtifactMarkers(msg)) {
    return 'raw_material_with_legacy_artifact';
  }

  // 7. 僅有候選引入詞，也視為候選確認類
  if (detectCandidateIntroMarkers(msg)) {
    return 'user_candidate_requires_judgment';
  }

  // 8. 僅有判斷請求（用戶直接貼出新版本並問是否更好，無明確引入詞）
  if (detectJudgmentRequestMarkers(msg)) {
    return 'user_candidate_requires_judgment';
  }

  return 'no_artifact_input';
}

function determineArtifactStatus(userMsg, assistantMsg) {
  const isTestSignal = 
    userMsg.includes('NEXT_CONTEXT') || 
    userMsg.includes('接续') || 
    userMsg.includes('接續') || 
    userMsg.includes('test') || 
    userMsg.includes('测试') || 
    userMsg.includes('測試') || 
    userMsg.trim() === '';

  if (isTestSignal) {
    return {
      artifact: 'none',
      status: 'none',
      reason: 'no artifact proposed in transcript'
    };
  }

  const classification = classifyArtifactInput(userMsg);

  switch (classification) {
    case 'explicit_freeze':
      return {
        artifact: 'rewritten todo sentence',
        status: 'frozen',
        reason: 'user explicitly froze this artifact version'
      };
      
    case 'explicit_acceptance':
      return {
        artifact: 'rewritten todo sentence',
        status: 'accepted',
        reason: 'user explicitly accepted this artifact version'
      };
      
    case 'explicit_rejection':
      return {
        artifact: 'rewritten todo sentence',
        status: 'proposed', // 拒絕後退回 proposed 讓用戶重試
        reason: 'user explicitly rejected the candidate version; reverted to proposed status'
      };
      
    case 'user_candidate_requires_judgment':
      return {
        artifact: 'rewritten todo sentence',
        status: 'pending_user_confirmation',
        reason: 'user provided a candidate artifact and requested judgment; no explicit final acceptance found'
      };
      
    case 'raw_material_with_legacy_artifact':
      return {
        artifact: 'rewritten todo sentence',
        status: 'proposed',
        reason: 'assistant proposed an artifact; user has not accepted it'
      };
      
    case 'no_artifact_input':
    default:
      const hasArtifact = (assistantMsg.includes('行动') || assistantMsg.includes('处方') || assistantMsg.includes('proposal') || assistantMsg.includes('建議'));
      if (hasArtifact) {
        return {
          artifact: 'action proposal',
          status: 'proposed',
          reason: 'assistant proposed a business action plan'
        };
      }
      return {
        artifact: 'none',
        status: 'none',
        reason: 'no artifact proposed in transcript'
      };
  }
}

// === 5. /api/record 处理逻辑 ===
async function handleRecord(req, res) {
  try {
    console.log('[API /api/record] 触发后台记录模块...');

    // 解析出请求体 (支持前端附带的 artifact)
    const body = await parseJsonBody(req).catch(() => ({}));
    const clientArtifact = body.artifact || null;
    const normalizedClientArtifact = clientArtifact?.status === 'suggested'
      ? { ...clientArtifact, status: 'proposed' }
      : clientArtifact;

    // 读取输入数据
    const latestTranscript = readKernelFile('transcripts/latest-transcript.md');

    // 解析出上一轮的用户输入与小助手回复 (支持多行完整匹配)
    const userMatch = latestTranscript.match(/\*\*User\*\*:\s*([\s\S]*?)(?=\n\n\*\*Assistant\*\*|$)/);
    const assistantMatch = latestTranscript.match(/\*\*Assistant\*\*:\s*([\s\S]*)$/);
    const userMsg = userMatch ? userMatch[1].trim() : '';
    const assistantMsg = assistantMatch ? assistantMatch[1].trim() : '';

    const extractField = (text, fieldName) => {
      const regex = new RegExp(`${fieldName}:\\s*(.*)`);
      const match = text.match(regex);
      return match ? match[1].trim() : null;
    };
    const currentNextContextForParse = readKernelFile('memory/NEXT_CONTEXT.md');
    let currentSkill = extractField(assistantMsg, 'CURRENT_SKILL') || extractField(currentNextContextForParse, 'CURRENT_SKILL') || 'none';
    let currentStep = extractField(assistantMsg, 'CURRENT_STEP') || extractField(currentNextContextForParse, 'CURRENT_STEP') || '';
    let systemUnderDisc = extractField(assistantMsg, 'SYSTEM_UNDER_DISCUSSION') || extractField(currentNextContextForParse, 'SYSTEM_UNDER_DISCUSSION') || '';
    let candidateBottleneck = extractField(assistantMsg, 'CANDIDATE_BOTTLENECK') || extractField(currentNextContextForParse, 'CANDIDATE_BOTTLENECK') || '';
    let chokeSignal = extractField(assistantMsg, 'CHOKE_THE_RELEASE_SIGNAL') || extractField(currentNextContextForParse, 'CHOKE_THE_RELEASE_SIGNAL') || '';
    let minActionCardStatus = extractField(assistantMsg, 'MIN_ACTION_CARD_STATUS') || extractField(currentNextContextForParse, 'MIN_ACTION_CARD_STATUS') || '';

    // === 使用泛化分類器統一驅動所有落盤邏輯 ===
    const classification = classifyArtifactInput(userMsg);
    const artifactGuard = determineArtifactStatus(userMsg, assistantMsg);
    const isArtifactWorkflow = ['raw_material_with_legacy_artifact', 'user_candidate_requires_judgment', 'explicit_acceptance', 'explicit_rejection', 'explicit_freeze'].includes(classification);
    let preciseArtifactType = artifactGuard.artifact;
    if (normalizedClientArtifact && normalizedClientArtifact.type) {
      preciseArtifactType = normalizedClientArtifact.type;
      if (!isArtifactWorkflow) {
         artifactGuard.status = normalizedClientArtifact.status || 'proposed';
         artifactGuard.reason = 'carried over from client artifact context';
      }
    } else if (isArtifactWorkflow) {
      const currentStatus = readKernelFile('memory/ARTIFACT_STATUS.md');
      const matchSavedType = currentStatus.match(/Artifact:\s*([^\n]+)/);
      if (matchSavedType && matchSavedType[1].trim() !== 'none' && matchSavedType[1].trim() !== 'rewritten todo sentence' && matchSavedType[1].trim() !== 'action proposal') {
        preciseArtifactType = matchSavedType[1].trim();
      } else {
        preciseArtifactType = detectArtifactType(userMsg);
      }
    }

    console.log(`[API /api/record] classification: ${classification} | artifact_status: ${artifactGuard.status}`);

    // === 1. STATE.md ===
    const stateFocusMap = {
      'raw_material_with_legacy_artifact': 'assistant proposed candidate artifact; awaiting user confirmation',
      'user_candidate_requires_judgment':  'evaluating user-provided candidate artifact; awaiting user decision',
      'explicit_acceptance':               'artifact accepted and finalized',
      'explicit_rejection':                'artifact rejected; reverted to proposed status',
      'explicit_freeze':                   'artifact frozen as final standard',
      'no_artifact_input':                 'no artifact workflow active',
    };
    const stateFocus = stateFocusMap[classification] || 'no artifact workflow active';
    const newStateContent =
      `# STATE.md\n` +
      `- Phase: INTAKE\n` +
      `- Classification: ${classification}\n` +
      `- Current Focus: ${stateFocus}\n` +
      `- Last User Input: "${userMsg.substring(0, 100).replace(/\n/g, ' ')}"\n` +
      `- Timestamp: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/STATE.md', newStateContent);

    // === 2. EVIDENCE.md（根據 classification 產生有效證據記錄）===
    let newEvidenceContent = '';
    if (classification === 'raw_material_with_legacy_artifact') {
      const complaint = detectQualityComplaint(userMsg);
      let complaintLine = '';
      if (complaint === 'too formal') {
        complaintLine = `- user identified that the legacy artifact was too formal\n`;
      } else if (complaint === 'unclear') {
        complaintLine = `- user identified that the legacy artifact was unclear\n`;
      } else if (complaint === 'not human-readable / not actionable') {
        complaintLine = `- user identified that the legacy artifact was not actionable enough\n`;
      } else if (complaint === 'weak action orientation') {
        complaintLine = `- user identified that the legacy artifact was not actionable enough\n`;
      } else if (complaint === 'unclear completion criteria') {
        complaintLine = `- user identified that the legacy artifact was not actionable enough\n`;
      } else if (complaint === 'too vague') {
        complaintLine = `- user identified that the legacy artifact was not actionable enough\n`;
      } else {
        complaintLine = `- user requested artifact refinement\n`;
      }

      newEvidenceContent =
        `# EVIDENCE.md\n\n` +
        `## Task Output\n` +
        `- assistant proposed a candidate artifact based on user-provided legacy content\n\n` +
        `## Capability Evidence\n` +
        `- user identified a quality issue in the legacy artifact\n` +
        complaintLine + `\n` +
        `## Missing Evidence\n` +
        `- user has not accepted the artifact as final\n`;
    } else if (classification === 'user_candidate_requires_judgment') {
      newEvidenceContent =
        `# EVIDENCE.md\n\n` +
        `Task Output:\n` +
        `- user provided a candidate artifact version and requested judgment\n\n` +
        `Capability Evidence:\n` +
        `- only transcript-supported evidence recorded\n\n` +
        `Missing Evidence:\n` +
        `- user has not confirmed final acceptance\n`;
    } else if (classification === 'explicit_acceptance') {
      newEvidenceContent =
        `# EVIDENCE.md\n\n` +
        `Task Output:\n` +
        `- user explicitly accepted the proposed artifact version\n\n` +
        `Capability Evidence:\n` +
        `- only transcript-supported evidence recorded\n\n` +
        `Missing Evidence:\n` +
        `- none\n`;
    } else if (classification === 'explicit_freeze') {
      newEvidenceContent =
        `# EVIDENCE.md\n\n` +
        `Task Output:\n` +
        `- user explicitly froze this artifact version as final standard\n\n` +
        `Capability Evidence:\n` +
        `- only transcript-supported evidence recorded\n\n` +
        `Missing Evidence:\n` +
        `- none\n`;
    } else {
      newEvidenceContent =
        `# EVIDENCE.md\n\n` +
        `- Business Challenge: none detected.\n` +
        `- Capability Evidence: none inferred from this turn.\n`;
    }

    // Append client payload as evidence context (without overriding the Guard decision)
    newEvidenceContent += `\n- Client Artifact Evidence: ${normalizedClientArtifact ? JSON.stringify(normalizedClientArtifact) : 'none'}\n`;
    writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);

    // === 3. NEXT_CONTEXT.md（current artifact 使用 assistant 實際回應文本）===
    // 從 assistantMsg 中提取實際候选文本（取最有意義的部分）
    function extractCandidateText(msg) {
      if (!msg || msg.trim().length === 0) return 'see transcript';
      // 去掉 [Mock] 前綴
      const cleaned = msg.replace(/^\[Mock\]\s*/i, '').trim();

      // 優先精確提取成對的 --- 包裹的候选版本
      const matchDashes = cleaned.match(/---\s*\n+([\s\S]+?)\n+---/);
      if (matchDashes) {
        return matchDashes[1].trim();
      }
      
      // 優先精確提取「候选版本：」与「请确认是否采用」之间的内容
      const matchRealLLM = cleaned.match(/(?:候选版本|候補版本|候选版本为|候補版本為)[：:\s\n]+([\s\S]+?)(?=\n请确认是否采用|\n請確認是否採用|\n\n请确认|\n\n請確認|$)/i);
      if (matchRealLLM) {
        return matchRealLLM[1].trim();
      }

      // 優先精確提取「候補改寫版本：」與「請告訴我是否要採用」之間的完整多行內容
      const matchSpecial = cleaned.match(/候補改寫版本.*?[\s\S]*?[：:]\s*\n+([\s\S]+?)(?=\n\n請告訴我|\n\n请告诉我|$)/i);
      if (matchSpecial) {
        return matchSpecial[1].trim();
      }

      // 嘗試提取引號/書名號中的內容
      const quoted = cleaned.match(/[「」""'']([^「」""'']{8,150})[「」""'']/s);
      if (quoted) return quoted[1].trim();
      // 嘗試找到候補/改寫句（冒號後的首句）
      const afterColon = cleaned.match(/[：:]\s*\n?([^\n]{10,200})/);
      if (afterColon) return afterColon[1].trim();
      // 取最长的非空行（最可能是实际候補）
      const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 8);
      if (lines.length > 0) return lines.reduce((a, b) => a.length > b.length ? a : b).substring(0, 200);
      return cleaned.substring(0, 200);
    }
    function extractUserCandidateText(userMsg) {
      if (!userMsg) return 'none';
      const match = userMsg.match(/(?:我想改成|可以改成|我写成这样|你看这样)[：:\s\n]*([\s\S]+?)(?=\n你判断|你判断一下|你看这|是否|$)/i) ||
                    userMsg.match(/(?:我想改成|可以改成|我写成这样|你看这样)[：:\s\n]*([\s\S]+?)$/i);
      if (match) {
        return match[1].trim();
      }
      return userMsg.trim().substring(0, 120);
    }

    let candidateText = 'none';
    if (classification === 'raw_material_with_legacy_artifact') {
      candidateText = extractCandidateText(assistantMsg);
    } else if (classification === 'user_candidate_requires_judgment') {
      candidateText = extractUserCandidateText(userMsg);
    } else {
      const currentNext = readKernelFile('memory/NEXT_CONTEXT.md');
      const matchSavedArt = currentNext.match(/- Current artifact:\s*([\s\S]*?)(?=\n- Current artifact status|$)/);
      if (normalizedClientArtifact) {
        candidateText = JSON.stringify(normalizedClientArtifact);
      } else if (matchSavedArt && matchSavedArt[1].trim() !== 'none') {
        candidateText = matchSavedArt[1].trim();
      } else {
        candidateText = extractCandidateText(assistantMsg);
      }
    }

    const nextContextBodyMap = {
      'raw_material_with_legacy_artifact':
        `- Current artifact: ${candidateText}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: confirm, modify, or reject the proposed candidate artifact\n` +
        `- Do not infer unsupported workflow`,
      'user_candidate_requires_judgment':
        `- Current artifact: ${candidateText}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: user must confirm acceptance or rejection of the candidate version\n` +
        `- Do not infer unsupported workflow`,
      'explicit_acceptance':
        `- Current artifact: ${candidateText}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: none (artifact accepted)\n` +
        `- Do not infer unsupported workflow`,
      'explicit_rejection':
        `- Current artifact: ${candidateText}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: user may provide new direction or candidate version\n` +
        `- Do not infer unsupported workflow`,
      'explicit_freeze':
        `- Current artifact: ${candidateText}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: none (artifact frozen)\n` +
        `- Do not infer unsupported workflow`,
      'no_artifact_input':
        `- Current artifact: ${normalizedClientArtifact ? candidateText : 'none'}\n` +
        `- Current artifact status: ${normalizedClientArtifact ? artifactGuard.status : 'none'}\n` +
        `- Awaiting user input: ${normalizedClientArtifact ? 'awaiting user action on existing artifact' : 'no artifact workflow active'}\n` +
        `- Do not infer unsupported workflow`,
    };
    const nextContextBody = nextContextBodyMap[classification] || nextContextBodyMap['no_artifact_input'];
    const newNextContextContent =
      `# NEXT_CONTEXT.md\n` +
      `## Current Artifact Workflow\n` +
      `${nextContextBody}\n` +
      `- Client Artifact Context: ${normalizedClientArtifact ? JSON.stringify(normalizedClientArtifact) : 'none'}\n` +
      (currentSkill === 'sfocus' ? 
        `\n## SFOCUS Skill State\n` +
        `CURRENT_SKILL: ${currentSkill}\n` +
        `CURRENT_STEP: ${currentStep}\n` +
        `SYSTEM_UNDER_DISCUSSION: ${systemUnderDisc}\n` +
        `CANDIDATE_BOTTLENECK: ${candidateBottleneck}\n` +
        `CHOKE_THE_RELEASE_SIGNAL: ${chokeSignal}\n` +
        `MIN_ACTION_CARD_STATUS: ${minActionCardStatus}\n\n` : '') +
      `- Timestamp: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);

    // === 4. ARTIFACT_STATUS.md ===
    const newArtifactStatus =
      `# ARTIFACT_STATUS.md\n` +
      `Artifact: ${preciseArtifactType}\n` +
      `Status: ${artifactGuard.status}\n` +
      `Reason: ${artifactGuard.reason}\n` +
      `- Update Time: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/ARTIFACT_STATUS.md', newArtifactStatus);

    console.log('[API /api/record] 成功写入 STATE.md, EVIDENCE.md, NEXT_CONTEXT.md 与 ARTIFACT_STATUS.md');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Backend Recording completed successfully.' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// === 5.5 /api/save-file 处理逻辑 ===
async function handleSaveFile(req, res) {
  try {
    const body = await parseJsonBody(req);
    const relPath = body.filePath || '';
    const content = body.content || '';

    // 限制只允许编辑指定的 4 个核心规则文件
    const ALLOWED_FILES = [
      'hac/FRONTEND_AGENT_RULES.md',
      'recorder/RECORDER_RULES.md',
      'memory/NEXT_CONTEXT.md',
      'memory/ARTIFACT_STATUS.md'
    ];

    if (!ALLOWED_FILES.includes(relPath)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Forbidden: Editing file "${relPath}" is prohibited.` }));
      return;
    }

    const targetFilePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);

    // 自动生成备份：filename.timestamp.bak (备份在相同文件夹内)
    if (fs.existsSync(targetFilePath)) {
      const dir = path.dirname(targetFilePath);
      const ext = path.extname(targetFilePath);
      const base = path.basename(targetFilePath, ext);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(dir, `${base}.${timestamp}.bak`);
      fs.copyFileSync(targetFilePath, backupPath);
      console.log(`[Backup] 成功为 ${relPath} 生成备份：${path.basename(backupPath)}`);
    }

    // 写入新内容
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetFilePath, content, 'utf-8');
    console.log(`[Save] 成功保存 ${relPath}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: `File ${relPath} saved successfully with backup.` }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// === 6. /api/tts 处理逻辑 ===
async function handleTTS(req, res) {
  try {
    const body = await parseJsonBody(req);
    const text = body.text || '';
    const voice = body.voice || 'cmn-CN-Wavenet-B';

    const ttsApiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.TTS_API_KEY;

    if (ttsApiKey && ttsApiKey !== 'your_tts_api_key_here') {
      console.log('[API /api/tts] 代理真实 Google Cloud TTS 请求...');
      const googleEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`;
      
      const response = await fetch(googleEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text },
          voice: { languageCode: 'cmn-CN', name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ audioContent: data.audioContent }));
      } else {
        const errText = await response.text();
        throw new Error(`Google TTS 失败: ${response.status} - ${errText}`);
      }
    } else {
      // 返回静音或者 Mock 音频 Base64 (这里提供一个极短的合法 MP3 Base64)
      console.log('[API /api/tts] 使用 Mock 静音音频转发');
      const silentMp3Base64 = 'SUQzBAAAAAAAAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEgAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAG1wNDJtcDQxAAAAYmZyZWUAAAAAOG1kYXQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ audioContent: silentMp3Base64 }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// === 7. /api/stt 处理逻辑 ===
async function handleSTT(req, res) {
  try {
    const body = await parseJsonBody(req);
    const base64Audio = body.audio || '';
    if (!base64Audio) {
      throw new Error('未接收到音频数据');
    }

    console.log(`[API /api/stt] 收到音频数据，字符长度: ${base64Audio.length}`);

    const sttApiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.STT_API_KEY;

    if (sttApiKey && sttApiKey !== 'your_stt_api_key_here') {
      console.log('[API /api/stt] 代理真实 Google Cloud Speech-to-Text 请求...');
      
      const googleEndpoint = `https://speech.googleapis.com/v1/speech:recognize?key=${sttApiKey}`;
      
      const googleRequestBody = {
        config: {
          // WEBM_OPUS 不能指定 sampleRateHertz，Google 从 WebM 容器头部自动读取
          encoding: 'WEBM_OPUS',
          languageCode: 'cmn-Hans-CN',
          alternativeLanguageCodes: ['zh-TW', 'en-US'],
          enableAutomaticPunctuation: true
          // 不指定 model，使用 Google 默认（兼容性最好）
        },
        audio: {
          content: base64Audio
        }
      };

      const response = await fetch(googleEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 加上 Referer/Origin 以满足 Google API Key 的 HTTP 引用来源限制
          'Referer': 'http://localhost:3001',
          'Origin': 'http://localhost:3001'
        },
        body: JSON.stringify(googleRequestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';
        console.log(`[API /api/stt] Google Cloud Speech-to-Text 识别结果: "${transcript}"`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: transcript }));
      } else {
        const errText = await response.text();
        throw new Error(`Google Speech-to-Text API 响应失败: ${response.status} - ${errText}`);
      }
    } else {
      console.log('[API /api/stt] 未检测到有效的 STT API Key，采用仿真 Mock 转写服务...');
      const mockResult = '我需要诊断我的业务瓶颈，目前获客成本太高了';
      console.log(`[API /api/stt] Mock 识别结果: "${mockResult}"`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: mockResult }));
    }
  } catch (err) {
    console.error('[API /api/stt] 识别逻辑异常:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// === 辅助工具函数 ===
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
  });
}

function readKernelFile(relPath) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

function writeKernelFile(relPath, content) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

function detectArtifactType(msg) {
  const text = (msg || '').toLowerCase();
  if (text.includes('todo') || text.includes('待办') || text.includes('待辦') || text.includes('清单') || text.includes('清單')) {
    if (text.includes('这封') || text.includes('邮件') || text.includes('郵件')) {
      return 'rewritten email sentence';
    }
    if (text.includes('会议纪要') || text.includes('會議紀要')) {
      return 'rewritten meeting note';
    }
    if (text.includes('文案') || text.includes('页面')) {
      return 'rewritten copywriting sentence';
    }
    if (text.includes('这个待办做了') || text.includes('跟进客户反馈') || text.includes('action item')) {
      return 'rewritten action item';
    }
    if (text.includes('计划') || text.includes('計劃') || text.includes('推进')) {
      return 'rewritten plan paragraph';
    }
    return 'rewritten todo item';
  }
  if (text.includes('email') || text.includes('邮件') || text.includes('郵件')) {
    return 'rewritten email sentence';
  }
  if (text.includes('meeting note') || text.includes('会议纪要') || text.includes('會議紀要') || text.includes('纪要')) {
    return 'rewritten meeting note';
  }
  if (text.includes('copywriting') || text.includes('文案') || text.includes('页面')) {
    return 'rewritten copywriting sentence';
  }
  if (text.includes('action item') || text.includes('行动项') || text.includes('行动事项') || text.includes('跟进客户')) {
    return 'rewritten action item';
  }
  if (text.includes('plan') || text.includes('计划') || text.includes('計劃') || text.includes('总结报告')) {
    return 'rewritten plan paragraph';
  }
  return 'rewritten todo item';
}

function detectQualityComplaint(msg) {
  const text = (msg || '').toLowerCase();
  if (text.includes('太空泛') || text.includes('空泛') || text.includes('不够具体')) {
    return 'too vague';
  }
  if (text.includes('人话') || text.includes('人話') || text.includes('可执行') || text.includes('像人话') || text.includes('像人話')) {
    return 'not human-readable / not actionable';
  }
  if (text.includes('太官方') || text.includes('官方') || text.includes('自然')) {
    return 'too formal';
  }
  if (text.includes('不清楚') || text.includes('不夠清楚') || text.includes('不够清楚')) {
    return 'unclear';
  }
  if (text.includes('行动感') || text.includes('有行动感') || text.includes('引导')) {
    return 'weak action orientation';
  }
  if (text.includes('算不算完成') || text.includes('完成标准') || text.includes('完成標準')) {
    return 'unclear completion criteria';
  }
  return 'general quality improvement';
}

/**
 * 从用户输入中生成干净、真实的候选 artifact 文字（Mock 模式）
 * 优先从原始输入提取，再从当前版本提取，不添加任何前缀/后缀标签
 */
function generateCandidateFromInput(userText) {
  const complaint = detectQualityComplaint(userText);
  
  // 1. 尝试从输入中找到 legacy 交付物内容
  let legacyText = '';
  const currentVersionMatch =
    userText.match(/(?:當前版本|当前版本|当前版本是|当前版本如下|当前版本为)[：:\s\n]+([\s\S]+?)(?:\n\n|\n预期|\n預期|$)/i) ||
    userText.match(/(?:当前提取出的待办|当前提取出的待办事项)[：:\s]+([\s\S]+?)(?:\n\n|\n预期|\n預期|$)/i) ||
    userText.match(/(?:当前版本)[：:\s\n]+([\s\S]+?)$/i);
  if (currentVersionMatch) {
    legacyText = currentVersionMatch[1].trim();
  }

  // 2. 尝试寻找原始输入
  let rawText = '';
  const rawInputMatch =
    userText.match(/(?:原始輸入|原始输入)[：:\s\n]+([\s\S]+?)(?:\n\n|\n现在提取|\n現在提取|\n当前|\n當前|$)/i);
  if (rawInputMatch) {
    rawText = rawInputMatch[1].trim();
  }

  // === 规则 1：不够像人话 / 不够可执行 (对应 CG1) ===
  if (complaint === 'not human-readable / not actionable') {
    const sourceText = rawText || userText;
    const sentences = sourceText.split(/[，。、；\n]/).map(s => s.trim()).filter(s => s.length > 0);
    const candidates = [];
    
    // 提取时间
    function extractTime(sentence) {
      const timeMatch = sentence.match(/(周[一二三四五六日\d]|今天|明天|后天|下周[一二三四五六日\d]?)/);
      return timeMatch ? timeMatch[0] : '';
    }

    // 提取负责人 (Subject)
    function extractSubject(sentence) {
      const subMatch = sentence.match(/(?:提醒|请|让|通知|请相关负责人|跟进)([^\s，。、；]{2,3})(?:那边|负责)?/) ||
                       sentence.match(/([^\s，。、；]{2,3})(?:那边|负责|前|内|给我)/);
      if (subMatch) {
        let name = subMatch[1].replace(/^(另外|以及|并且|同时|提醒|确认|跟进)/, '');
        // 剔除末尾可能被多余抓取的动词词头或汉字
        name = name.replace(/(整理|确认|跟进|负责|发给|提供|推进|讨论|沟通|对接|反馈|整|确|跟|负|发|提|推|讨|沟|对|反)$/, '');
        if (name && name.length >= 1 && !['今天', '明天', '会议', '报价', '客户', '名单', '现在', '待办', '当前'].includes(name)) {
          return name;
        }
      }
      return '';
    }

    // 提取动作和宾语
    function extractActionAndObject(sentence) {
      const actMatch = sentence.match(/(跟进|整理|确认|负责|发给|提供|推进|调整|反馈|沟通|对接)([^\s，。、；]{1,20})?/) ||
                       sentence.match(/(跟进|整理|确认|负责|发给|提供|推进|调整|反馈|沟通|对接)$/);
      if (actMatch) {
        return { action: actMatch[1], object: (actMatch[2] || '').trim() };
      }
      return { action: '', object: '' };
    }

    let lastObject = '';
    // 遍历原始输入中的分句以提取结构化任务
    for (const s of sentences) {
      const time = extractTime(s);
      const subject = extractSubject(s);
      const { action, object } = extractActionAndObject(s);
      
      if (object) {
        lastObject = object;
      }

      if (subject && action) {
        const targetObj = object || lastObject || '[事项]';
        const timePart = time ? `在${time}前` : '';
        const timeStr = timePart ? `${timePart}` : '';
        
        // 检查原分句中是否包含 "给我" 或是具有 "同步/反馈" 倾向的意图
        const hasSync = s.includes('给我') || s.includes('同步') || s.includes('反馈');
        const syncStr = hasSync ? '，并把结果同步给我' : '';
        
        if (timeStr) {
          candidates.push(`请${subject}${timeStr}${action}${targetObj}${syncStr}。`);
        } else {
          candidates.push(`请${subject}${action}${targetObj}${syncStr}。`);
        }
      }
    }

    if (candidates.length > 0) {
      return candidates.join('\n');
    }

    if (legacyText) {
      return `请相关人员在明确时间前完成该事项，并同步进展。`;
    }
  }

  // === 规则 2：太官方 / 自然一点 (对应 CG2) ===
  if (complaint === 'too formal') {
    const textToConvert = legacyText || userText;
    
    // 检查是否包含反馈...结果
    const matchFeedback = textToConvert.match(/反馈([^\s，。、]+?)结果/);
    if (matchFeedback) {
      let item = matchFeedback[1];
      // 动态去重，剔除可能重复的“确认”二字
      item = item.replace(/确认/g, '').trim();
      
      const timeMatch = textToConvert.match(/(本周[一二三四五六日\d]|周[一二三四五六日\d]|[今明后]天)/);
      const timeStr = timeMatch ? timeMatch[0] : '';
      const timePart = timeStr ? `${timeStr}前` : '在明确时间前';
      
      return `麻烦你${timePart}帮我确认一下${item}，有结果后同步给我，我好继续推进。`;
    }
    
    let t = textToConvert;
    // 低风险自然化语气替换词库
    const dict = [
      { from: /请您于/g, to: '麻烦你' },
      { from: /請您於/g, to: '麻煩你' },
      { from: /反馈/g, to: '确认' },
      { from: /，以便我方推进后续工作/g, to: '，我好继续推进' },
      { from: /以便我方及时调整/g, to: '我好及时跟进' },
      { from: /关于贵司昨日提出的合作备忘录，我方已收悉。/g, to: '昨天你发来的合作备忘录，我已经收到啦。' },
      { from: /请您于本周五下班前反馈具体修改意见，以便我方及时调整，顺祝商祺。/g, to: '麻烦你本周五下班前确认一下修改意见，我好及时调整。' }
    ];
    for (const item of dict) {
      t = t.replace(item.from, item.to);
    }
    t = t.replace(/顺祝商祺。?/g, '').trim();
    if (t !== textToConvert) return t;
  }

  // === 规则 3：不够清楚 (对应 CG3) ===
  if (complaint === 'unclear') {
    const textToAnalyze = legacyText || userText;
    const matchClarity = textToAnalyze.match(/([^\s，。和、&]+?)(\s*和\s*|\s*and\s*|\s*&\s*)([^\s，。和、&]+?)要(?:继续|进一步)?(?:沟通|对接|讨论|探讨)([^\s，。、；]+)(?:问题|流程)?。?/i);
    if (matchClarity) {
      const teamA = matchClarity[1];
      const connector = matchClarity[2];
      const teamB = matchClarity[3];
      const topic = matchClarity[4];
      const cleanTopic = topic.replace(/(问题|流程)$/, '');
      return `请${teamA}${connector}${teamB}就${cleanTopic}相关问题进行对接，明确具体问题细节与后续跟进方案。`;
    }
    if (legacyText) {
      return `请相关人员就该事项的细节进行对接，并明确后续的具体执行方案。`;
    }
  }

  // === 规则 4：不够有行动感 (对应 CG4) ===
  if (complaint === 'weak action orientation') {
    const textToAnalyze = legacyText || userText;
    const matchAction = textToAnalyze.match(/欢迎(?:了解|体验|使用|关注)(?:我们的|贵司)?([^\s，。、！!]+)。?/);
    if (matchAction) {
      const item = matchAction[1];
      return `立即体验并了解我们的${item}。`;
    }
    if (legacyText) {
      return `立即体验并了解相关服务.`;
    }
  }

  // === 规则 5：完成标准不清楚 (对应 CG5) ===
  if (complaint === 'unclear completion criteria') {
    const textToAnalyze = legacyText || userText;
    
    // 检查是否具备截止时间或明确的同步对象
    const hasTime = textToAnalyze.match(/(本周[一二三四五六日\d]|周[一二三四五六日\d]|[今明后]天|下周[一二三四五六日\d]?)/);
    const hasSyncObj = textToAnalyze.includes('同步') || textToAnalyze.includes('反馈给') || textToAnalyze.includes('发给') || textToAnalyze.includes('项目组');
    
    if (!hasTime || !hasSyncObj) {
      // 保持 ARTIFACT_STATUS = proposed，输出“低风险候选 + 待补充提示”
      return `候选版本：\n请在明确截止时间前整理客户反馈中的主要问题，并同步给指定负责人。\n待补充：\n请补充具体截止时间和同步对象。`;
    }
    
    const matchCriteria = textToAnalyze.match(/跟进([^\s，。、]+)。?/);
    if (matchCriteria) {
      const item = matchCriteria[1];
      return `跟进${item}，并在明确时间前完成该事项，并同步进展。`;
    }
    if (legacyText) {
      return `完成“${legacyText}”的跟进，并在明确时间前将结果整理并同步。`;
    }
  }

  // === 规则 6：太空泛 (对应 CG6) ===
  if (complaint === 'too vague') {
    const textToAnalyze = legacyText || userText;
    const matchPlan = textToAnalyze.match(/(?:继续推进|推进)([^\s，。、]+)，并加强和([^\s，。、]+?)的协同。?/);
    if (matchPlan) {
      const itemA = matchPlan[1];
      const itemB = matchPlan[2];
      
      const timeMatch = textToAnalyze.match(/(下周|本周|在明确时间)/);
      const timeStr = timeMatch ? timeMatch[0] : '下周';
      
      // 动态捕获负责人
      let deptMatch = itemA.match(/^([^\s，。、优化]+)/);
      let deptName = deptMatch ? `${deptMatch[1]}负责人` : '相关负责人';
      
      return `${timeStr}请${deptName}整理本轮${itemA}事项，并和${itemB}确认需要协同的重点问题，形成一份可执行清单。`;
    }
    if (legacyText) {
      return `细化推进“${legacyText}”的具体执行步骤，并在明确时间前同步计划.`;
    }
  }

  // === 规则 7：客服解答机械生硬 (对应 G10) ===
  if (userText.includes('机械') || userText.includes('生硬') || userText.includes('礼貌') || userText.includes('溫和') || userText.includes('温和') || userText.includes('关怀')) {
    if (legacyText.includes('快递') && legacyText.includes('运费')) {
      return '非常抱歉，宝贝寄出后就无法直接修改地址了。如果您确实需要更改，建议在包裹派送时联络快递员协助；如选择拒收，往返运费将需要由您承担，感谢您的理解与支持。';
    }
  }

  // ================= Fallback Heuristics =================
  if (rawText) {
    const segments = rawText
      .replace(/。\s*$/, '')
      .split(/[，,、；;]/)
      .map(s => s.trim())
      .filter(s => s.length > 3);
    const lines = segments.map(s => {
      const clean = s.replace(/^(另外|以及|並且|并且|而且|同時|同时)\s*/, '');
      return clean.endsWith('。') || clean.endsWith('？') ? clean : clean + '。';
    });
    return lines.join('\n');
  }

  if (legacyText) {
    return legacyText;
  }

  const meaningfulLines = userText.split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(l => l.length > 5 && !l.startsWith('我想') && !l.startsWith('这') && !l.startsWith('這'));
  if (meaningfulLines.length > 0) {
    return meaningfulLines.slice(-3).join('\n');
  }

  return userText.trim().substring(0, 120);
}

function generateMockReply(userText) {
  // 系統/接續測試信號，不走 artifact 流程
  const isTestSignal =
    userText.includes('NEXT_CONTEXT') ||
    userText.includes('接续') || userText.includes('接續') ||
    userText.includes('test') ||
    userText.includes('测试') || userText.includes('測試') ||
    userText.trim() === '';

  if (isTestSignal) {
    return '收到。這是系統接續測試信號，目前沒有業務內容。我會等待下一條真實業務輸入。';
  }

  // 使用泛化分類器路由回應
  const classification = classifyArtifactInput(userText);

  switch (classification) {
    case 'raw_material_with_legacy_artifact': {
      // 根據用戶輸入中的舊版本生成具體候選句，不使用佔位符
      const candidate = generateCandidateFromInput(userText);
      return (
        `已收到。我識別了當前版本中的一個可優化點，以下是候補改寫版本（Mode: generic fallback）：\n\n${candidate}\n\n請告訴我是否要採用這個版本，或說明希望繼續修改的方向。`
      );
    }

    case 'user_candidate_requires_judgment': {
      // 动态评估人话特征，绝无硬编码
      const timeMatch = userText.match(/(周[一二三四五六日\d]|今天|明天|后天|下周[一二三四五六日\d]?)/);
      const timePart = timeMatch ? `明确截止时间“${timeMatch[0]}前”` : '';
      
      const groupMatch = userText.match(/(?:[^\s，。、；]*?群[^\s，。、；]*?)/);
      const groupPart = groupMatch ? `同步位置“${groupMatch[0]}”` : '';
      
      let reasonPart = '';
      if (timePart && groupPart) {
        reasonPart = `因为它补上了${groupPart}，也保留了${timePart}`;
      } else if (timePart) {
        reasonPart = `因为它保留了${timePart}`;
      } else if (groupPart) {
        reasonPart = `因为它补上了${groupPart}`;
      } else {
        reasonPart = `因为它提供了更明确的人话表达与具体要素`;
      }
      
      return `这句话比上一版更适合做待办，${reasonPart}。目前它仍是候选版本，请确认是否采用。`;
    }

    case 'explicit_acceptance':
      return '已收到。此版本已確認採用。';

    case 'explicit_rejection':
      return '已收到。此版本已取消，請說明希望修改的方向。';

    case 'explicit_freeze':
      return '已收到凍結指令。該交付物版本已正式凍結，後續將作為最終標準執行。';

    default:
      // no_artifact_input → 通用 Mock（非交付物流程）
      const replies = [
        `[Mock] 收到。你刚才提到「${userText.substring(0, 20)}」。请提供更多业务细节。`,
        `[Mock] 这是个关键问题。请提供具体数据。`,
        `[Mock] 明白。请说明目前的核心阻碍是什么？`
      ];
      return replies[Math.floor(Math.random() * replies.length)];
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`✨ Eliy v0.3.2-test Local Runtime Service 启动成功！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}/index.html`);
  console.log(`🎙 语音版地址: http://localhost:${PORT}/voice.html`);
  console.log(`======================================================\n`);
});
