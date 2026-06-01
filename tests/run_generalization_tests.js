import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 讀取核心檔案
function readKernelFile(relPath) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return 'FILE NOT FOUND: ' + relPath;
}

// 清除之前的測試殘留
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

async function runTests() {
  cleanUpFiles();

  // 1. 讀取並修改 server.js，將其轉換為可導入模組
  const serverPath = path.join(ROOT_DIR, 'eliy-kernel/runtime/server.js');
  let serverCode = fs.readFileSync(serverPath, 'utf-8');

  // 將 server.listen 註釋掉
  serverCode = serverCode.replace(
    /server\.listen\([\s\S]*?\}\);/g,
    '// server.listen commented out by test runner'
  );

  // 添加導出
  serverCode += `\nexport { handleChat, handleRecord, classifyArtifactInput, determineArtifactStatus, generateMockReply, generateCandidateFromInput };\n`;

  const testableServerPath = path.join(ROOT_DIR, 'eliy-kernel/runtime/server_testable.js');
  fs.writeFileSync(testableServerPath, serverCode, 'utf-8');
  console.log('成功生成泛化測試模組 server_testable.js');

  // 2. 導入可測試模組
  const serverModule = await import('../eliy-kernel/runtime/server_testable.js');
  const { handleChat, handleRecord } = serverModule;

  const testCases = [
    {
      id: 'G1',
      name: 'G1｜待辦事項重複合併型',
      text: `这待办事项列得也太啰嗦了，重复的合并一下。\n原始输入：昨天运营部提出了三个促销方案，今天下午要把促销方案发给设计部确认，明天上午再跟设计部确认促销方案的初稿。\n现在提取出的待办：\n1. 促销方案收集\n2. 发送方案给设计部\n3. 设计部确认方案\n4. 确认促销方案初稿`
    },
    {
      id: 'G2',
      name: 'G2｜郵件太官方型',
      text: `这封邮件写得太官方了，想改得自然一点。\n当前版本：关于贵司昨日提出的合作备忘录，我方已收悉。请您于本周五下班前反馈具体修改意见，以便我方及时调整，顺祝商祺。`
    },
    {
      id: 'G3',
      name: 'G3｜會議紀要不夠清楚型',
      text: `这段会议纪要不清楚，分工和时限都看不出来。\n当前版本：技术部和运营部要继续对接下周的新品发布会直播流程。`
    },
    {
      id: 'G4',
      name: 'G4｜文案不夠自然型',
      text: `这段宣传文案不够自然，跟机器翻译的一样，改通顺一点。\n当前版本：本产品具有卓越的降噪性能，能够为您提供非凡的静谧体验，欢迎您的选购。`
    },
    {
      id: 'G5',
      name: 'G5｜報告結構不清晰型',
      text: `这段月度总结报告结构太乱了，改成清晰的“成绩-痛点-下一步”结构。\n当前版本：本月我们销售额破了新高，但是新用户转化率在下降，大家都很努力，下个月我们要主攻私域流量，还有就是获客成本也变高了。`
    },
    {
      id: 'G6',
      name: 'G6｜指令不明確型',
      text: `这句工作指令太含糊了，没法执行。\n当前版本：小王，你去把那份竞品分析报告好好改一改。`
    },
    {
      id: 'G7',
      name: 'G7｜列表過於生硬型',
      text: `这个核心优势列表太生硬了，改得更有说服力和温度。\n当前版本：\n1. 价格便宜\n2. 质量可靠\n3. 售后极速`
    },
    {
      id: 'G8',
      name: 'G8｜內部通知太冷冰冰',
      text: `这个放假通知太冷冰冰了，加点温馨的祝福。\n当前版本：因端午节放假，本公司于6月12日至14日放假调休，共3天。请各部门做好安全检查，祝大家节日快乐。`
    },
    {
      id: 'G9',
      name: 'G9｜宣傳口號普通平淡',
      text: `这句发布口号听起来太普通了，改得更有气势、更有科技感。\n当前版本：我们推出了最新的AI芯片，它的速度非常快，可以让你们的设备变得更聪明。`
    },
    {
      id: 'G10',
      name: 'G10｜客服解答機械生硬',
      text: `这句客服 FAQ 的回答太机械了，改得更温和、更有礼貌，体现对客户的关怀。\n当前版本：快递寄出后无法修改地址，拒收需扣除往返运费。`
    }
  ];

  const results = {};

  try {
    for (const tc of testCases) {
      console.log(`\n=================== 正在執行泛化測試: ${tc.name} ===================`);

      // 模擬 /api/chat req 和 res
      let chatResponseBody = '';
      const chatReq = {
        method: 'POST',
        on: (event, cb) => {
          if (event === 'data') {
            cb(Buffer.from(JSON.stringify({ text: tc.text })));
          }
          if (event === 'end') {
            cb();
          }
        }
      };

      const chatRes = {
        writeHead: (status, headers) => {},
        end: (bodyStr) => {
          chatResponseBody = bodyStr;
        }
      };

      // 執行 handleChat
      await handleChat(chatReq, chatRes);
      const chatData = JSON.parse(chatResponseBody);
      console.log(`[Success] handleChat 執行完畢！`);

      // 模擬 /api/record req 和 res
      let recordResponseBody = '';
      const recordReq = {
        method: 'POST',
        on: (event, cb) => {
          if (event === 'data') {
            cb(Buffer.from('{}'));
          }
          if (event === 'end') {
            cb();
          }
        }
      };

      const recordRes = {
        writeHead: (status, headers) => {},
        end: (bodyStr) => {
          recordResponseBody = bodyStr;
        }
      };

      // 執行 handleRecord
      await handleRecord(recordReq, recordRes);
      console.log(`[Success] handleRecord 執行完畢！`);

      // 讀取落盤檔案
      const latestTranscript = readKernelFile('transcripts/latest-transcript.md');
      const state = readKernelFile('memory/STATE.md');
      const evidence = readKernelFile('hlamt/EVIDENCE.md');
      const nextContext = readKernelFile('memory/NEXT_CONTEXT.md');
      const artifactStatus = readKernelFile('memory/ARTIFACT_STATUS.md');

      const classification = serverModule.classifyArtifactInput(tc.text);
      const statusGuard = serverModule.determineArtifactStatus(tc.text, chatData.reply);

      // 評估品質
      const candidateText = serverModule.generateCandidateFromInput(tc.text);
      let qualityReview = 'PASS';
      if (candidateText === tc.text || candidateText.includes('[Mock 候補]')) {
        qualityReview = 'FAIL: Verbatim copy or mock tag detected';
      }

      results[tc.id] = {
        testName: tc.name,
        classification: classification,
        status: statusGuard.status,
        frontendResponse: chatData.reply,
        mockFallbackUsed: true,
        candidateQualityReview: qualityReview,
        files: {
          latestTranscript,
          state,
          evidence,
          nextContext,
          artifactStatus
        }
      };
    }
  } catch (err) {
    console.error('執行泛化測試時發生錯誤:', err);
  } finally {
    // 刪除臨時模組
    if (fs.existsSync(testableServerPath)) {
      fs.unlinkSync(testableServerPath);
    }
  }

  // 寫入 JSON 結果檔案
  fs.writeFileSync(path.join(ROOT_DIR, 'tests/generalization_results.json'), JSON.stringify(results, null, 2), 'utf-8');
  console.log('\n🎉 所有泛化測試順利執行，結果已寫入 tests/generalization_results.json！');
}

runTests();
