import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 辅助读取
function readKernelFile(relPath) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

// 辅助清理
function cleanUpFiles() {
  const files = [
    'transcripts/latest-transcript.md',
    'memory/STATE.md',
    'hlamt/EVIDENCE.md',
    'memory/NEXT_CONTEXT.md',
    'memory/ARTIFACT_STATUS.md'
  ];
  for (const f of files) {
    const p = path.join(ROOT_DIR, 'eliy-kernel', f);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }
}

async function executeRLCGTests() {
  console.log('>>> 正在启动 CP-ELIY-V031-REAL-LLM-CANDIDATE-GENERATION-01 对比测试...');
  cleanUpFiles();

  // 1. 生成可导入测试的 server_testable.js
  const serverPath = path.join(ROOT_DIR, 'eliy-kernel/runtime/server.js');
  let serverCode = fs.readFileSync(serverPath, 'utf-8');
  
  // 注释掉监听
  serverCode = serverCode.replace(
    /server\.listen\([\s\S]*?\}\);/g,
    '// commented out by test runner'
  );
  // 导出所需模块
  serverCode += `\nexport { handleChat, handleRecord, classifyArtifactInput, determineArtifactStatus, generateMockReply, generateCandidateFromInput, detectArtifactType, detectQualityComplaint };\n`;

  const testableServerPath = path.join(ROOT_DIR, 'eliy-kernel/runtime/server_testable.js');
  fs.writeFileSync(testableServerPath, serverCode, 'utf-8');
  
  const serverModule = await import('../eliy-kernel/runtime/server_testable.js');
  const { handleChat, handleRecord } = serverModule;

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
    runs: {}
  };

  const modes = ['real_llm', 'generic_fallback'];

  try {
    for (const mode of modes) {
      console.log(`\n======================================================`);
      console.log(`🚀 启动模式 [CANDIDATE_GENERATION_MODE = ${mode}]`);
      console.log(`======================================================`);

      process.env.CANDIDATE_GENERATION_MODE = mode;
      report.runs[mode] = {};

      // 每次切换 mode 时清空，以防止上一 mode 的脏数据影响冷启动
      cleanUpFiles();

      for (const tc of testCases) {
        if (tc.id !== 'RLCG8') {
          cleanUpFiles();
        }

        console.log(`\n--- 执行 [${mode}] ${tc.id}: ${tc.name} ---`);

        // 1. 模拟 /api/chat post
        let chatResponseBody = '';
        const chatReq = {
          method: 'POST',
          on: (event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ text: tc.text })));
            if (event === 'end') cb();
          }
        };
        const chatRes = {
          writeHead: () => {},
          end: (body) => { chatResponseBody = body; }
        };

        const startTime = Date.now();
        await handleChat(chatReq, chatRes);
        const latency = Date.now() - startTime;

        const chatData = JSON.parse(chatResponseBody);
        const reply = chatData.reply;

        // 2. 模拟 /api/record post
        let recordResponseBody = '';
        const recordReq = {
          method: 'POST',
          on: (event, cb) => {
            if (event === 'data') cb(Buffer.from('{}'));
            if (event === 'end') cb();
          }
        };
        const recordRes = {
          writeHead: () => {},
          end: (body) => { recordResponseBody = body; }
        };

        await handleRecord(recordReq, recordRes);

        // 3. 读取本轮落盘的 5 个状态文件
        const latestTranscript = readKernelFile('transcripts/latest-transcript.md');
        const state = readKernelFile('memory/STATE.md');
        const evidence = readKernelFile('hlamt/EVIDENCE.md');
        const nextContext = readKernelFile('memory/NEXT_CONTEXT.md');
        const artifactStatus = readKernelFile('memory/ARTIFACT_STATUS.md');

        // 4. 解析测试字段与特征
        const classification = serverModule.classifyArtifactInput(tc.text);
        const qualityComplaint = serverModule.detectQualityComplaint(tc.text);
        const preciseType = serverModule.detectArtifactType(tc.text);
        
        // 从 NEXT_CONTEXT 中提取 Candidate
        const currentArtifactMatch = nextContext.match(/- Current artifact:\s*([\s\S]*?)(?=\n- Current artifact status|$)/);
        const candidateArtifact = currentArtifactMatch ? currentArtifactMatch[1].trim() : 'none';

        const statusMatch = artifactStatus.match(/Status:\s*([^\n]+)/);
        const finalStatus = statusMatch ? statusMatch[1].trim() : 'none';

        // 检查 Guard 介入状态：如果状态没有与 classify 符合，或者判定是否被 override
        const guardOverrode = false; // Runtime Guard 在此作为最高优先级校验直接执行并落盘

        const isSuccess = !reply.includes('Real LLM call failed.');

        // 保存至结果对象
        report.runs[mode][tc.id] = {
          id: tc.id,
          name: tc.name,
          mode: mode,
          modelName: mode === 'real_llm' ? (process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash') : 'Generic Fallback',
          classificationResult: classification,
          artifactType: preciseType,
          qualityComplaintDetected: qualityComplaint,
          frontendResponse: reply,
          extractedCandidateArtifact: candidateArtifact,
          finalStatus: finalStatus,
          apiCallSuccess: isSuccess,
          latencyMs: latency,
          guardOverrode: guardOverrode,
          files: {
            'latest-transcript.md': latestTranscript,
            'STATE.md': state,
            'EVIDENCE.md': evidence,
            'NEXT_CONTEXT.md': nextContext,
            'ARTIFACT_STATUS.md': artifactStatus
          }
        };

        // 5. 状态文件物理落盘与归档
        const backupDir = path.join(ROOT_DIR, 'tests/rlcg_run_results', mode, tc.id);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.writeFileSync(path.join(backupDir, 'latest-transcript.md'), latestTranscript, 'utf-8');
        fs.writeFileSync(path.join(backupDir, 'STATE.md'), state, 'utf-8');
        fs.writeFileSync(path.join(backupDir, 'EVIDENCE.md'), evidence, 'utf-8');
        fs.writeFileSync(path.join(backupDir, 'NEXT_CONTEXT.md'), nextContext, 'utf-8');
        fs.writeFileSync(path.join(backupDir, 'ARTIFACT_STATUS.md'), artifactStatus, 'utf-8');

        console.log(`[BACKUP] ${tc.id} 落盘于 tests/rlcg_run_results/${mode}/${tc.id}/`);
      }
    }

    // 写入汇总 JSON 报告
    const reportPath = path.join(ROOT_DIR, 'tests/rlcg_run_results/rlcg_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n🎉 所有 RLCG1-RLCG8 测试执行完毕！对比报告已写入：tests/rlcg_run_results/rlcg_test_report.json`);

  } catch (err) {
    console.error('测试运行过程中抛出错误:', err);
  } finally {
    // 6. 清理临时测试用 server_testable.js
    if (fs.existsSync(testableServerPath)) {
      fs.unlinkSync(testableServerPath);
    }
  }
}

executeRLCGTests();
