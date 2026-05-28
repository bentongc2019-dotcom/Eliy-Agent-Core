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
    const model = body.model || 'deepseek-chat';

    console.log(`[API /api/chat] 收到消息: "${userText}" | 模型: ${model}`);

    // 读取所有的 HAC、HLAMT 和当前 State / Context 文件以构建交互上下文
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
            content: `${hacAgentRules}\n\n${frontendRules}\n\n${hlamtFile}\n\n当前状态:\n${stateFile}\n\n当前上下文:\n${nextContextFile}`
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

// === 5. /api/record 处理逻辑 ===
async function handleRecord(req, res) {
  try {
    console.log('[API /api/record] 触发后台记录模块...');

    // 读取输入数据
    const recorderRules = readKernelFile('recorder/RECORDER_RULES.md');
    const latestTranscript = readKernelFile('transcripts/latest-transcript.md');
    const artifactStatus = readKernelFile('memory/ARTIFACT_STATUS.md');

    // 解析出上一轮的用户输入与小助手回复
    const userMatch = latestTranscript.match(/\*\*User\*\*:\s*([^\n]+)/);
    const assistantMatch = latestTranscript.match(/\*\*Assistant\*\*:\s*([\s\S]+)/);
    const userMsg = userMatch ? userMatch[1].trim() : '';
    const assistantMsg = assistantMatch ? assistantMatch[1].trim() : '';

    // === 输出 STATE.md ===
    const newStateContent = `# STATE.md\n- Phase: INTAKE\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/STATE.md', newStateContent);

    // === 输出 HLAMT/EVIDENCE.md ===
    const newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\n- User shared business challenge: "${userMsg}"\n- Coach response provided: "${assistantMsg.substring(0, 50)}..."\n- Date: ${new Date().toISOString()}\n`;
    writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);

    // === 输出 NEXT_CONTEXT.md ===
    const nextAction = assistantMsg.includes('行动') || assistantMsg.includes('行动处方') 
      ? 'Execute assistant proposed action' 
      : 'Provide business details & metrics';
    
    const newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "${nextAction}"\n- Context Focus: Deep bottleneck diagnosis\n- Timestamp: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);

    // === 更新 ARTIFACT_STATUS.md ===
    const isProposed = assistantMsg.includes('行动') || assistantMsg.includes('处方');
    const newArtifactStatus = `# ARTIFACT_STATUS.md\n- [ ] Business Action Proposal: ${isProposed ? 'proposed' : 'pending'}\n- Update Time: ${new Date().toISOString()}\n`;
    writeKernelFile('memory/ARTIFACT_STATUS.md', newArtifactStatus);

    console.log('[API /api/record] 成功写入 STATE.md, EVIDENCE.md, NEXT_CONTEXT.md 与 ARTIFACT_STATUS.md');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Backend Recording completed successfully.' }));
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
  // 专业的主体型智能体回复生成器 (Mock implementation only)
  const replies = [
    `[Mock implementation only] 收到。你刚才提到「${userText.substring(0, 20)}」。在给出判断前，我需要明确：你的团队规模目前有多少人？以及这个问题导致了多少的月营收损失？请用数字回答。`,
    `[Mock implementation only] 这确实是个关键阻碍。但为了不做猜测，请提供具体数据：你们的获客成本（CAC）大概是多少？核心转化率是多少？`,
    `[Mock implementation only] 明白你的处境了。基于此，我们的初步行动建议是：本周立即暂停 ROI 最低的一个推广渠道，全力盯紧核心漏斗。你能做到吗？`
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
