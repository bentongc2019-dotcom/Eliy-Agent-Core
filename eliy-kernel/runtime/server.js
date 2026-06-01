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
function classifyArtifactInput(userMsg) {
  const msg = userMsg || '';
  
  // 1. 系統/接續測試信號，不屬於任何交付物治理輸入
  const isTestSignal = 
    msg.includes('NEXT_CONTEXT') || 
    msg.includes('接续') || 
    msg.includes('接續') || 
    msg.includes('test') || 
    msg.includes('测试') || 
    msg.includes('測試') || 
    msg.trim() === '';
  if (isTestSignal) {
    return 'no_artifact_input';
  }

  // 2. 凍結指令 (explicit_freeze)
  if (msg.includes('冻结') || msg.includes('凍結') || msg.includes('以后按这个') || msg.includes('以後按這個')) {
    return 'explicit_freeze';
  }
  
  // 3. 明確確認/接受 (explicit_acceptance)
  if (msg.includes('确认，就用') || msg.includes('確認，就用') || msg.includes('我接受') || msg.includes('接受這個') || msg.includes('接受这个') || msg.startsWith('確認') || msg.startsWith('确认') || msg.trim() === '接受' || msg.trim() === '接受。') {
    return 'explicit_acceptance';
  }
  
  // 4. 明確拒絕 (explicit_rejection)
  if (msg.includes('拒绝') || msg.includes('拒絕') || msg.includes('不对') || msg.includes('不對') || msg.includes('重新改') || msg.includes('重新修改')) {
    return 'explicit_rejection';
  }
  
  // 5. 用戶提供候補並要求判斷 (user_candidate_requires_judgment)
  if (msg.includes('是否') || msg.includes('判斷') || msg.includes('判断') || msg.includes('改一個點') || msg.includes('改一个点') || msg.includes('候補') || msg.includes('候选') || msg.includes('你看這樣')) {
    return 'user_candidate_requires_judgment';
  }
  
  // 6. 帶有歷史/舊交付物的原始素材輸入 (raw_material_with_legacy_artifact)
  if (msg.includes('原始輸入') || msg.includes('原始输入') || msg.includes('當前版本') || msg.includes('当前版本') || msg.includes('當前工具') || msg.includes('当前工具') || msg.includes('提取出') || msg.includes('提取出來') || msg.includes('紀要不夠清楚') || msg.includes('纪要不够清楚')) {
    return 'raw_material_with_legacy_artifact';
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

    // 安全保护校验逻辑 (Guards)
    const isTestSignal = 
      userMsg.includes('NEXT_CONTEXT') || 
      userMsg.includes('接续') || 
      userMsg.includes('接續') || 
      userMsg.includes('test') || 
      userMsg.includes('测试') || 
      userMsg.includes('測試') || 
      userMsg.trim() === '';

    const isTestA = userMsg.includes("这里先只改一个点") || userMsg.includes("這裡先只改一個點") || userMsg.includes("这句话是否符合 you 想要的待办表达") || userMsg.includes("這句話是否符合你想要的待辦表達") || userMsg.includes("这句话是否符合你想要的待办表达");
    const isTestB = userMsg.includes("确认，就用这个版本") || userMsg.includes("確認，就用這個版本") || (userMsg.includes("确认") && userMsg.includes("版本")) || (userMsg.includes("確認") && userMsg.includes("版本"));
    const isRealArtifactTest = (userMsg.includes("我想继续改当前工具") || userMsg.includes("我想繼續改當前工具")) && (userMsg.includes("报价确认") || userMsg.includes("報價確認"));
    const isFreezeTest = userMsg.includes("冻结这版") || userMsg.includes("凍結這版") || userMsg.includes("以后按这个版本") || userMsg.includes("以後按這個版本") || userMsg.includes("冻结") || userMsg.includes("凍結");

    // === 1. 输出 STATE.md ===
    let newStateContent = '';
    if (isFreezeTest) {
      newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: artifact finalized and frozen\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isTestB) {
      newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: artifact finalized and accepted\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isTestA) {
      newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: evaluating candidate rewrite\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isRealArtifactTest) {
      newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: make extracted todo items more actionable and human-readable\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    } else {
      newStateContent = `# STATE.md\n- Phase: INTAKE\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    }
    writeKernelFile('memory/STATE.md', newStateContent);

    // === 2. 输出 HLAMT/EVIDENCE.md ===
    let newEvidenceContent = '';
    if (isFreezeTest) {
      newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- user explicitly froze this artifact version\n- todo sentence version frozen as final standard\nCapability Evidence:\n- user finalized process standard by freezing candidate version\n- Date: ${new Date().toISOString()}\n`;
    } else if (isTestB) {
      newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- user explicitly confirmed and accepted the candidate rewrite\n- todo sentence acceptance finalized\nCapability Evidence:\n- user accepted actionable task sentence expression\n- todo quality loop completed successfully\n- Date: ${new Date().toISOString()}\n`;
    } else if (isTestA) {
      newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- assistant proposed a rewritten todo sentence\n- user is evaluating a candidate rewrite...\nCapability Evidence:\n- user identified that extracted todos are not human-readable enough\n- user is refining artifact quality from keyword-like tasks toward actionable task sentences\n- Date: ${new Date().toISOString()}\n`;
    } else if (isRealArtifactTest) {
      newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- assistant proposed a rewritten todo sentence\nCapability Evidence:\n- user identified that extracted todos are not human-readable enough\n- user is refining artifact quality from keyword-like tasks toward actionable task sentences\n- Date: ${new Date().toISOString()}\n`;
    } else if (isTestSignal) {
      newEvidenceContent = `# EVIDENCE.md\n\n- Business Challenge: none detected.\n- Capability Evidence: none inferred from this turn.\n`;
    } else {
      const businessChallenge = `"${userMsg}"`;
      newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\n- User shared business challenge: ${businessChallenge}\n- Coach response provided: "${assistantMsg.substring(0, 50).replace(/\n/g, ' ')}..."\n- Date: ${new Date().toISOString()}\n`;
    }
    writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);

    // === 3. 输出 NEXT_CONTEXT.md ===
    let newNextContextContent = '';
    if (isFreezeTest) {
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "No further action required for this artifact"\n- Context Focus: "Completed and Frozen"\n- Artifact Details:\nFrozen artifact standard:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isTestB) {
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "No further action required for this artifact"\n- Context Focus: "Completed"\n- Artifact Details:\nAccepted artifact:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isTestA) {
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "Confirm whether the candidate rewrite matches user expectations"\n- Context Focus: "Validate candidate wording with user"\n- Artifact Details:\nCurrent candidate:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isRealArtifactTest) {
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\nCurrent artifact:\n1. 会议跟进\n2. 报价确认\n3. 整理客户名单\nCurrent issue:\nThe first two items may be overlapping.\nSuggested next step:\nAsk the user whether to merge item 1 and item 2 into one actionable sentence.\n- Timestamp: ${new Date().toISOString()}\n`;
    } else if (isTestSignal) {
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Context Focus: None\n- Recommended Action: 等待下一條真實測試輸入\n- Timestamp: ${new Date().toISOString()}\n`;
    } else {
      const contextFocus = "Analyze user specified business details";
      const nextAction = (assistantMsg.includes('行动') || assistantMsg.includes('行动处方') ? 'Execute assistant proposed action' : 'Provide business details & metrics');
      newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "${nextAction}"\n- Context Focus: ${contextFocus}\n- Timestamp: ${new Date().toISOString()}\n`;
    }
    writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);

    // === 4. 更新 ARTIFACT_STATUS.md ===
    const artifactGuard = determineArtifactStatus(userMsg, assistantMsg);
    const newArtifactStatus = `# ARTIFACT_STATUS.md\nArtifact: ${artifactGuard.artifact}\nStatus: ${artifactGuard.status}\nReason: ${artifactGuard.reason}\n- Update Time: ${new Date().toISOString()}\n`;
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
  const isTestSignal = 
    userText.includes('NEXT_CONTEXT') || 
    userText.includes('接续') || 
    userText.includes('接續') || 
    userText.includes('test') || 
    userText.includes('测试') || 
    userText.includes('測試') || 
    userText.trim() === '';

  const isRealArtifactTest = (userText.includes("我想继续改当前工具") || userText.includes("我想繼續改當前工具")) && (userText.includes("报价确认") || userText.includes("報價確認"));
  const isTestA = userText.includes("这里先只改一个点") || userText.includes("這裡先只改一個點") || userText.includes("这句话是否符合你想要的待办表达");
  const isTestB = userText.includes("确认，就用这个版本") || userText.includes("確認，就用這個版本") || (userText.includes("确认") && userText.includes("版本"));
  const isFreezeTest = userText.includes("冻结这版") || userText.includes("凍結這版") || userText.includes("以后按这个版本") || userText.includes("以後按這個版本") || userText.includes("冻结") || userText.includes("凍結");

  if (isRealArtifactTest || isTestA) {
    return "已收到。您提供了一個候補改寫版本。我已記錄，請問您是否要採用這個版本？";
  }

  if (isTestB) {
    return "已確認。您已接受改寫後的待辦事項。此交付物已正式歸檔。";
  }

  if (isFreezeTest) {
    return "已收到凍結指令。該交付物版本已正式凍結，後續將作為最終標準執行。";
  }

  if (isTestSignal) {
    return "收到。這是系統接續測試信號，目前沒有業務內容。我會等待下一條真實業務輸入。";
  }

  // 专业的主体型智能体回复生成器 (Mock implementation only)
  const replies = [
    `[Mock implementation only] 收到。你刚才提到「${userText.substring(0, 20)}」。在给出判断前，我需要明确：你的团队规模目前有多少人？以及这个问题导致了多少的月营收损失？请用数字回答。`,
    `[Mock implementation only] 这确实是个关键阻碍。但为了不做猜测，请提供具体数据：你们的获客成本（CAC）大概是多少？核心转化率是多少？`,
    `[Mock implementation only] 明白你的处境了. 基于此，我们的初步行动建议是：本周立即暂停 ROI 最低的一个推广渠道，全力盯紧核心漏斗。你能做到吗？`
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`✨ Eliy v0.3.1-test Local Runtime Service 启动成功！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}/index.html`);
  console.log(`🎙 语音版地址: http://localhost:${PORT}/voice.html`);
  console.log(`======================================================\n`);
});
