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

const PORT = 3001;

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
async function handleChat(req, res) {
  try {
    const body = await parseJsonBody(req);
    const userText = body.text || '';
    const model = process.env.DEEPSEEK_MODEL || body.model || 'deepseek-v4-flash';

    console.log(`[API /api/chat] 收到消息: "${userText}" | 模型: ${model}`);

    // 读取所有的 HAC、HLAMT 和当前 State / Context 文件以构建交互上下文
    const flashGuardRules = readKernelFile('runtime/ELIY_V0.3.1_FLASH_RUNTIME_GUARD_RULES.md');
    const hacAgentRules = readKernelFile('hac/HAC_AGENT_RULES.md');
    const frontendRules = readKernelFile('hac/FRONTEND_AGENT_RULES.md');
    const hlamtFile = readKernelFile('hlamt/HLAMT.md');
    const stateFile = readKernelFile('memory/STATE.md');
    const nextContextFile = readKernelFile('memory/NEXT_CONTEXT.md');

    let reply = '';
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
      console.log('[API /api/chat] 检测到 DEEPSEEK_API_KEY，发起真实 LLM 调用...');
      try {
        const messages = [
          {
            role: 'system',
            content: `${flashGuardRules}\n\n${hacAgentRules}\n\n${frontendRules}\n\n${hlamtFile}\n\n当前状态:\n${stateFile}\n\n当前上下文:\n${nextContextFile}`
          },
          ...(body.history || [{ role: 'user', content: userText }])
        ];

        const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        if (response.ok) {
          const data = await response.json();
          reply = data.choices[0]?.message?.content || '';
        } else {
          const errText = await response.text();
          throw new Error(`LLM 接口返回错误: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.error('[API /api/chat] 真实 LLM 调用失败，降级使用 Mock:', err.message);
        reply = generateMockReply(userText);
      }
    } else {
      console.log('[API /api/chat] 未配置 API Key，直接使用极简 Mock 响应');
      reply = generateMockReply(userText);
    }

    // 写入本轮 user input + assistant response 到 transcripts/latest-transcript.md
    const transcriptContent = `# Latest Transcript - Eliy v0.3.1-test\n\n**User**: ${userText}\n\n**Assistant**: ${reply}\n`;
    writeKernelFile('transcripts/latest-transcript.md', transcriptContent);
    console.log('[API /api/chat] 成功落盘 transcripts/latest-transcript.md');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: reply }));
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
    /这个版本[：:]/.test(msg) || /這個版本[：:]/.test(msg)
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
    t === '接受' || t === '接受。'
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

    // 读取输入数据
    const latestTranscript = readKernelFile('transcripts/latest-transcript.md');

    // 解析出上一轮的用户输入与小助手回复 (支持多行完整匹配)
    const userMatch = latestTranscript.match(/\*\*User\*\*:\s*([\s\S]*?)(?=\n\n\*\*Assistant\*\*|$)/);
    const assistantMatch = latestTranscript.match(/\*\*Assistant\*\*:\s*([\s\S]*)$/);
    const userMsg = userMatch ? userMatch[1].trim() : '';
    const assistantMsg = assistantMatch ? assistantMatch[1].trim() : '';

    // === 使用泛化分類器統一驅動所有落盤邏輯 ===
    const classification = classifyArtifactInput(userMsg);
    const artifactGuard = determineArtifactStatus(userMsg, assistantMsg);

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

    // === 2. EVIDENCE.md（永遠空值格式，不推斷業務信息）===
    const newEvidenceContent =
      `# EVIDENCE.md\n\n` +
      `- Business Challenge: none detected.\n` +
      `- Capability Evidence: none inferred from this turn.\n`;
    writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);

    // === 3. NEXT_CONTEXT.md（保留可接續信息，不包含推薦行動詞）===
    const nextContextBodyMap = {
      'raw_material_with_legacy_artifact':
        `- Current artifact: ${artifactGuard.artifact}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: confirm, modify, or reject the proposed candidate artifact\n` +
        `- Do not infer unsupported workflow`,
      'user_candidate_requires_judgment':
        `- Current artifact: ${artifactGuard.artifact}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: user must confirm acceptance or rejection of the candidate version\n` +
        `- Do not infer unsupported workflow`,
      'explicit_acceptance':
        `- Current artifact: ${artifactGuard.artifact}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: none (artifact accepted)\n` +
        `- Do not infer unsupported workflow`,
      'explicit_rejection':
        `- Current artifact: ${artifactGuard.artifact}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: user may provide new direction or candidate version\n` +
        `- Do not infer unsupported workflow`,
      'explicit_freeze':
        `- Current artifact: ${artifactGuard.artifact}\n` +
        `- Current artifact status: ${artifactGuard.status}\n` +
        `- Awaiting user input: none (artifact frozen)\n` +
        `- Do not infer unsupported workflow`,
      'no_artifact_input':
        `- Current artifact: none\n` +
        `- Current artifact status: none\n` +
        `- Awaiting user input: no artifact workflow active\n` +
        `- Do not infer unsupported workflow`,
    };
    const nextContextBody = nextContextBodyMap[classification] || nextContextBodyMap['no_artifact_input'];
    const newNextContextContent =
      `# NEXT_CONTEXT.md\n\n` +
      `## Current Artifact Workflow\n` +
      `${nextContextBody}\n` +
      `- Timestamp: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);

    // === 4. ARTIFACT_STATUS.md ===
    const newArtifactStatus =
      `# ARTIFACT_STATUS.md\n` +
      `Artifact: ${artifactGuard.artifact}\n` +
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
    case 'raw_material_with_legacy_artifact':
      // Assistant 識別舊版本問題，主動提出候補，請用戶確認
      // 真實 LLM 模式下，DeepSeek 會根據具體內容生成具體的候補版本
      return (
        '[Mock] 已收到。我識別了當前版本中的一個可優化點，並提出以下候補版本：\n\n' +
        '[候補改寫版本]\n\n' +
        '請告訴我是否要採用這個版本，或說明希望繼續修改的方向。'
      );

    case 'user_candidate_requires_judgment':
      return '已收到。您提供了一個候補改寫版本。我已記錄，請問您是否要採用這個版本？';

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
  console.log(`✨ Eliy v0.3.1-test Local Runtime Service 启动成功！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}/index.html`);
  console.log(`🎙 语音版地址: http://localhost:${PORT}/voice.html`);
  console.log(`======================================================\n`);
});
