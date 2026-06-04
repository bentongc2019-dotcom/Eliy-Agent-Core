import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

// 强制设置环境变量
process.env.CANDIDATE_GENERATION_MODE = 'real_llm';

function readKernelFile(relPath) {
  const filePath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

function cleanUpFiles() {
  const files = [
    'eliy-kernel/transcripts/latest-transcript.md',
    'eliy-kernel/memory/STATE.md',
    'eliy-kernel/hlamt/EVIDENCE.md',
    'eliy-kernel/memory/NEXT_CONTEXT.md',
    'eliy-kernel/memory/ARTIFACT_STATUS.md'
  ];
  for (const f of files) {
    const p = path.join(ROOT_DIR, f);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }
}

async function runRealLLMTests() {
  console.log('>>> 正在启动 Real LLM 强制测试 (向 http://localhost:3001 发送请求)...');
  cleanUpFiles();

  const testCases = [
    {
      id: 'RLCG1',
      name: 'RLCG1｜Legacy todo artifact｜不够像人话',
      text: `我想继续改当前工具，我觉得它提取出来的待办事项不够像人话。\n原始输入：\n今天会议后要跟进报价，王明那边周五前给我确认，另外提醒小张整理客户名单。\n现在提取出的待办：\n1. 会议跟进\n2. 报价确认\n3. 整理客户名单`
    },
    {
      id: 'RLCG2',
      name: 'RLCG2｜Legacy email artifact｜太官方',
      text: `这封邮件写得太官方了，想改得自然一点。\n当前版本：\n请您于本周五前反馈报价确认结果，以便我方推进后续工作。`
    },
    {
      id: 'RLCG3',
      name: 'RLCG3｜Legacy meeting note artifact｜不够清楚',
      text: `这段会议纪要不够清楚。\n当前版本：\n销售和产品要继续沟通价格页问题。`
    },
    {
      id: 'RLCG4',
      name: 'RLCG4｜Legacy copywriting artifact｜不够有行动感',
      text: `这句页面文案不够有行动感。\n当前版本：\n欢迎了解我们的服务。`
    },
    {
      id: 'RLCG5',
      name: 'RLCG5｜Legacy action item artifact｜完成标准不清楚',
      text: `这个待办做了也不知道算不算完成。\n当前版本：\n跟进客户反馈。`
    },
    {
      id: 'RLCG6',
      name: 'RLCG6｜Legacy short plan paragraph｜太空泛',
      text: `这段计划太空泛了，想改得更可执行。\n当前版本：\n下周继续推进产品优化，并加强和销售团队的协同。`
    },
    {
      id: 'RLCG7',
      name: 'RLCG7｜User candidate requiring judgment',
      text: `我想改成：\n请王明在周五前确认报价，并在项目群同步确认结果。\n你判断一下，这句话是否比上一版更适合做待办？`
    },
    {
      id: 'RLCG8',
      name: 'RLCG8｜Explicit acceptance',
      text: `确认，就用这个版本。`
    }
  ];

  const report = {
    testTime: new Date().toISOString(),
    mode: 'real_llm',
    modelName: 'deepseek-v4-flash',
    cases: {}
  };

  try {
    for (const tc of testCases) {
      // 除了 RLCG8 以外，其余全部冷启动清空文件
      if (tc.id !== 'RLCG8') {
        cleanUpFiles();
      }

      console.log(`\n=================== 执行 ${tc.id}: ${tc.name} ===================`);
      
      const startTime = Date.now();

      // 1. 调用 POST http://localhost:3001/api/chat
      let chatRes;
      try {
        chatRes = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: tc.text })
        });
      } catch (err) {
        console.error(`[FAIL] 连接 http://localhost:3001 失败: ${err.message}`);
        process.exit(1);
      }

      const latency = Date.now() - startTime;

      if (!chatRes.ok) {
        console.error(`[FAIL] /api/chat 返回错误状态码: ${chatRes.status}`);
        process.exit(1);
      }

      const chatData = await chatRes.json();
      const reply = chatData.reply || '';

      // API 调用失败的硬性检测（包含 "Real LLM call failed." 视为失败）
      if (reply.includes('Real LLM call failed.')) {
        console.error(`[FAIL] ${tc.id} 真实 LLM 调用失败！`);
        console.error(`原因:\n${reply}`);
        process.exit(1);
      }

      // 2. 调用 POST http://localhost:3001/api/record
      let recordRes;
      try {
        recordRes = await fetch('http://localhost:3001/api/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      } catch (err) {
        console.error(`[FAIL] 连接 /api/record 失败: ${err.message}`);
        process.exit(1);
      }

      if (!recordRes.ok) {
        console.error(`[FAIL] /api/record 返回错误状态码: ${recordRes.status}`);
        process.exit(1);
      }

      // 3. 读取本轮落盘文件内容
      const latestTranscript = readKernelFile('eliy-kernel/transcripts/latest-transcript.md');
      const state = readKernelFile('eliy-kernel/memory/STATE.md');
      const evidence = readKernelFile('eliy-kernel/hlamt/EVIDENCE.md');
      const nextContext = readKernelFile('eliy-kernel/memory/NEXT_CONTEXT.md');
      const artifactStatus = readKernelFile('eliy-kernel/memory/ARTIFACT_STATUS.md');

      // 4. 解析测试关键信息并输出
      const statusMatch = artifactStatus.match(/Status:\s*([^\n]+)/);
      const finalStatus = statusMatch ? statusMatch[1].trim() : 'none';

      const classMatch = state.match(/- Classification:\s*([^\n]+)/);
      const classification = classMatch ? classMatch[1].trim() : 'none';

      // 提取 Candidate
      const currentArtifactMatch = nextContext.match(/- Current artifact:\s*([\s\S]*?)(?=\n- Current artifact status|$)/);
      const candidateArtifact = currentArtifactMatch ? currentArtifactMatch[1].trim() : 'none';

      console.log(`[INFO] classification: ${classification} | status: ${finalStatus} | latency: ${latency}ms`);
      console.log(`[CANDIDATE] ${candidateArtifact}`);

      console.log('\n--- [FILE] transcripts/latest-transcript.md ---');
      console.log(latestTranscript.trim());
      console.log('\n--- [FILE] eliy-kernel/memory/STATE.md ---');
      console.log(state.trim());
      console.log('\n--- [FILE] eliy-kernel/memory/EVIDENCE.md ---');
      console.log(evidence.trim());
      console.log('\n--- [FILE] eliy-kernel/memory/NEXT_CONTEXT.md ---');
      console.log(nextContext.trim());
      console.log('\n--- [FILE] eliy-kernel/memory/ARTIFACT_STATUS.md ---');
      console.log(artifactStatus.trim());
      console.log('==================================================\n');

      report.cases[tc.id] = {
        id: tc.id,
        name: tc.name,
        classification: classification,
        status: finalStatus,
        latencyMs: latency,
        reply: reply,
        candidateArtifact: candidateArtifact,
        files: {
          latestTranscript,
          state,
          evidence,
          nextContext,
          artifactStatus
        }
      };

      // 备份物理文件至 tests/rlcg_run_results/real_llm/RLCGx/
      const backupDir = path.join(ROOT_DIR, 'tests/rlcg_run_results/real_llm', tc.id);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(path.join(backupDir, 'latest-transcript.md'), latestTranscript, 'utf-8');
      fs.writeFileSync(path.join(backupDir, 'STATE.md'), state, 'utf-8');
      fs.writeFileSync(path.join(backupDir, 'EVIDENCE.md'), evidence, 'utf-8');
      fs.writeFileSync(path.join(backupDir, 'NEXT_CONTEXT.md'), nextContext, 'utf-8');
      fs.writeFileSync(path.join(backupDir, 'ARTIFACT_STATUS.md'), artifactStatus, 'utf-8');
    }

    // 最终写入 report.json
    const reportDir = path.join(ROOT_DIR, 'tests/rlcg_run_results/real_llm');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(path.join(reportDir, 'rlcg_real_llm_report.json'), JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n🎉 Real LLM 强制测试执行成功！报告已写入：tests/rlcg_run_results/real_llm/rlcg_real_llm_report.json`);

  } catch (err) {
    console.error(`测试执行异常抛错: ${err.message}`);
    process.exit(1);
  }
}

runRealLLMTests();
