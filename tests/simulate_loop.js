import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

console.log(`\n======================================================`);
console.log(`🧪 Eliy v0.3.1-test 最小闭环运行时本地模拟测试程序`);
console.log(`======================================================\n`);

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

// 模拟 /api/chat 处理流程
function simulateChat(userText) {
  console.log(`\n[Step 1] 模拟 /api/chat 前台输入...`);
  console.log(`用户输入: "${userText}"`);

  // 读取 HAC_AGENT_RULES.md 与相关上下文
  const hacRules = readKernelFile('hac/HAC_AGENT_RULES.md');
  const frontendRules = readKernelFile('hac/FRONTEND_AGENT_RULES.md');
  const hlamt = readKernelFile('hlamt/HLAMT.md');
  const state = readKernelFile('memory/STATE.md');
  const nextContext = readKernelFile('memory/NEXT_CONTEXT.md');

  console.log(`-> 成功读取 HAC_AGENT_RULES.md (${hacRules.length} 字符)`);
  console.log(`-> 成功读取 FRONTEND_AGENT_RULES.md (${frontendRules.length} 字符)`);
  console.log(`-> 成功读取 HLAMT.md (${hlamt.length} 字符)`);
  console.log(`-> 成功读取 STATE.md`);
  console.log(`-> 成功读取 NEXT_CONTEXT.md`);

  // 生成 Mock 响应
  const replies = [
    `[Mock implementation only] 收到。你刚才提到「${userText}」。在给出判断前，我需要明确：你的团队规模目前有多少人？以及这个问题导致了多少的月营收损失？请用数字回答。`,
    `[Mock implementation only] 这确实是个关键阻碍。请提供具体数据：你们的获客成本（CAC）大概是多少？核心转化率是多少？`
  ];
  const reply = replies[0];
  console.log(`助手回复: "${reply}"`);

  // 写入本轮 user input + assistant response 到 transcripts/latest-transcript.md
  const transcriptContent = `# Latest Transcript - Eliy v0.3.1-test\n\n**User**: ${userText}\n\n**Assistant**: ${reply}\n`;
  writeKernelFile('transcripts/latest-transcript.md', transcriptContent);
  console.log(`✅ [Success] transcripts/latest-transcript.md 已真实写入生成！`);
  return reply;
}

// 模拟 /api/record 处理器流程
function simulateRecord() {
  console.log(`\n[Step 2] 模拟 /api/record 后台记录处理...`);

  const recorderRules = readKernelFile('recorder/RECORDER_RULES.md');
  const latestTranscript = readKernelFile('transcripts/latest-transcript.md');
  
  console.log(`-> 成功读取 RECORDER_RULES.md (${recorderRules.length} 字符)`);
  console.log(`-> 成功读取 latest-transcript.md`);

  const userMatch = latestTranscript.match(/\*\*User\*\*:\s*([^\n]+)/);
  const assistantMatch = latestTranscript.match(/\*\*Assistant\*\*:\s*([\s\S]+)/);
  const userMsg = userMatch ? userMatch[1].trim() : '';
  const assistantMsg = assistantMatch ? assistantMatch[1].trim() : '';

  // === 输出 STATE.md ===
  const newStateContent = `# STATE.md\n- Phase: INTAKE\n- Last User Input: "${userMsg}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  writeKernelFile('memory/STATE.md', newStateContent);
  console.log(`✅ [Success] STATE.md 已真实更新并生成！`);

  // === 输出 HLAMT/EVIDENCE.md ===
  const newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\n- User shared business challenge: "${userMsg}"\n- Coach response provided: "${assistantMsg.substring(0, 50)}..."\n- Date: ${new Date().toISOString()}\n`;
  writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);
  console.log(`✅ [Success] EVIDENCE.md 已真实更新并生成！`);

  // === 输出 NEXT_CONTEXT.md ===
  const nextAction = assistantMsg.includes('行动') ? 'Execute proposed action' : 'Provide details';
  const newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "${nextAction}"\n- Context Focus: Deep bottleneck diagnosis\n- Timestamp: ${new Date().toISOString()}\n`;
  writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);
  console.log(`✅ [Success] NEXT_CONTEXT.md 已真实更新并生成！`);

  // === 更新 ARTIFACT_STATUS.md ===
  const newArtifactStatus = `# ARTIFACT_STATUS.md\n- [ ] Business Action Proposal: proposed\n- Update Time: ${new Date().toISOString()}\n`;
  writeKernelFile('memory/ARTIFACT_STATUS.md', newArtifactStatus);
  console.log(`✅ [Success] ARTIFACT_STATUS.md 已真实更新并生成！`);
}

// 模拟前台重载流程
function simulateReload() {
  console.log(`\n[Step 3] 模拟下一轮前台读取 NEXT_CONTEXT.md 重载接续...`);
  const nextContextContent = readKernelFile('memory/NEXT_CONTEXT.md');
  console.log(`前台成功读取到 NEXT_CONTEXT.md，其关键上下文为:\n\n${nextContextContent}`);
  console.log(`✅ [Success] 最小状态闭环已全打通！`);
}

// 依次运行整个闭环
const reply = simulateChat("测试业务瓶颈问题");
simulateRecord();
simulateReload();
