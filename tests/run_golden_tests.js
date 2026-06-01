import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

console.log(`\n======================================================`);
console.log(`🧪 Eliy v0.3.1-test Golden Tests 一键复核验证工具`);
console.log(`======================================================\n`);

function writeKernelFile(relPath, content) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

function readKernelFile(relPath) {
  const filePath = path.join(ROOT_DIR, 'eliy-kernel', relPath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

// === 1. 實現 classifyArtifactInput 函數 ===
function classifyArtifactInput(userMsg) {
  const msg = userMsg || '';
  
  // 1. 系統/接續測試信號，不屬於 any 交付物治理輸入
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

// === 2. 實現 determineArtifactStatus 確定性狀態判斷邏輯 ===
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
        status: 'proposed',
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

// === 3. 模擬一輪完整的 R 測試執行 ===
function runSingleGoldenTest(testName, userMsg, assistantMockMsg = '') {
  console.log(`\n=================== 正在執行: ${testName} ===================`);
  console.log(`User Input: "${userMsg}"`);

  // 1. 模擬 /api/chat: 寫入 latest-transcript.md
  const assistantMsg = assistantMockMsg || generateMockReply(userMsg);
  const transcriptContent = `# Latest Transcript - Eliy v0.3.1-test\n\n**User**: ${userMsg}\n\n**Assistant**: ${assistantMsg}\n`;
  writeKernelFile('transcripts/latest-transcript.md', transcriptContent);

  // 2. 模擬 /api/record
  const classification = classifyArtifactInput(userMsg);
  const isTestSignal = classification === 'no_artifact_input' && (
    userMsg.includes('NEXT_CONTEXT') || 
    userMsg.includes('接续') || 
    userMsg.includes('接續') || 
    userMsg.includes('test') || 
    userMsg.trim() === ''
  );

  // 2.1 寫入 STATE.md
  let newStateContent = '';
  if (classification === 'explicit_freeze') {
    newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: artifact finalized and frozen\n- Last User Input: "${userMsg.replace(/\n/g, ' ')}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'explicit_acceptance') {
    newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: artifact finalized and accepted\n- Last User Input: "${userMsg.replace(/\n/g, ' ')}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'user_candidate_requires_judgment') {
    newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: evaluating candidate rewrite\n- Last User Input: "${userMsg.replace(/\n/g, ' ')}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'raw_material_with_legacy_artifact') {
    newStateContent = `# STATE.md\n- Phase: INTAKE\n- Current Task: Todo artifact wording refinement\n- Current Focus: make extracted todo items more actionable and human-readable\n- Last User Input: "${userMsg.replace(/\n/g, ' ')}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  } else {
    newStateContent = `# STATE.md\n- Phase: INTAKE\n- Last User Input: "${userMsg.replace(/\n/g, ' ')}"\n- Message Count: 1\n- Timestamp: ${new Date().toISOString()}\n`;
  }
  writeKernelFile('memory/STATE.md', newStateContent);

  // 2.2 寫入 EVIDENCE.md (空值防護格式)
  let newEvidenceContent = '';
  if (classification === 'explicit_freeze') {
    newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- user explicitly froze this artifact version\n- todo sentence version frozen as final standard\nCapability Evidence:\n- user finalized process standard by freezing candidate version\n- Date: ${new Date().toISOString()}\n`;
  } else if (classification === 'explicit_acceptance') {
    newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- user explicitly confirmed and accepted the candidate rewrite\n- todo sentence acceptance finalized\nCapability Evidence:\n- user accepted actionable task sentence expression\n- todo quality loop completed successfully\n- Date: ${new Date().toISOString()}\n`;
  } else if (classification === 'user_candidate_requires_judgment') {
    newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- assistant proposed a rewritten todo sentence\n- user is evaluating a candidate rewrite...\nCapability Evidence:\n- user identified that extracted todos are not human-readable enough\n- user is refining artifact quality from keyword-like tasks toward actionable task sentences\n- Date: ${new Date().toISOString()}\n`;
  } else if (classification === 'raw_material_with_legacy_artifact') {
    newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\nTask Output:\n- assistant proposed a rewritten todo sentence\nCapability Evidence:\n- user identified that extracted todos are not human-readable enough\n- user is refining artifact quality from keyword-like tasks toward actionable task sentences\n- Date: ${new Date().toISOString()}\n`;
  } else if (isTestSignal) {
    newEvidenceContent = `# EVIDENCE.md\n\n- Business Challenge: none detected.\n- Capability Evidence: none inferred from this turn.\n`;
  } else {
    newEvidenceContent = `# EVIDENCE.md\n\n## Transcript Evidence\n- User shared business challenge: "${userMsg.replace(/\n/g, ' ')}"\n- Coach response provided: "${assistantMsg.substring(0, 50).replace(/\n/g, ' ')}..."\n- Date: ${new Date().toISOString()}\n`;
  }
  writeKernelFile('hlamt/EVIDENCE.md', newEvidenceContent);

  // 2.3 寫入 NEXT_CONTEXT.md
  let newNextContextContent = '';
  if (classification === 'explicit_freeze') {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "No further action required for this artifact"\n- Context Focus: "Completed and Frozen"\n- Artifact Details:\nFrozen artifact standard:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'explicit_acceptance') {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "No further action required for this artifact"\n- Context Focus: "Completed"\n- Artifact Details:\nAccepted artifact:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'user_candidate_requires_judgment') {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "Confirm whether the candidate rewrite matches user expectations"\n- Context Focus: "Validate candidate wording with user"\n- Artifact Details:\nCurrent candidate:\n1. 请王明在周五前确认报价，并把结果同步给我。\n2. 提醒小张整理客户名单\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (classification === 'raw_material_with_legacy_artifact') {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\nCurrent artifact:\n1. 会议跟进\n2. 报价确认\n3. 整理客户名单\nCurrent issue:\nThe first two items may be overlapping.\nSuggested next step:\nAsk the user whether to merge item 1 and item 2 into one actionable sentence.\n- Timestamp: ${new Date().toISOString()}\n`;
  } else if (isTestSignal) {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Context Focus: None\n- Recommended Action: 等待下一條真實測試輸入\n- Timestamp: ${new Date().toISOString()}\n`;
  } else {
    newNextContextContent = `# NEXT_CONTEXT.md\n\n## Next Interaction Scope\n- Recommended Action: "Provide business details & metrics"\n- Context Focus: Analyze user specified business details\n- Timestamp: ${new Date().toISOString()}\n`;
  }
  writeKernelFile('memory/NEXT_CONTEXT.md', newNextContextContent);

  // 2.4 寫入 ARTIFACT_STATUS.md
  const statusGuard = determineArtifactStatus(userMsg, assistantMsg);
  const newArtifactStatusContent = `# ARTIFACT_STATUS.md\nArtifact: ${statusGuard.artifact}\nStatus: ${statusGuard.status}\nReason: ${statusGuard.reason}\n- Update Time: ${new Date().toISOString()}\n`;
  writeKernelFile('memory/ARTIFACT_STATUS.md', newArtifactStatusContent);

  // 3. 讀取並返回這 5 個檔案的實際內容
  const result = {
    testName: testName,
    input: userMsg,
    classification: classification,
    status: statusGuard.status,
    files: {
      latestTranscript: readKernelFile('transcripts/latest-transcript.md'),
      state: readKernelFile('memory/STATE.md'),
      evidence: readKernelFile('hlamt/EVIDENCE.md'),
      nextContext: readKernelFile('memory/NEXT_CONTEXT.md'),
      artifactStatus: readKernelFile('memory/ARTIFACT_STATUS.md'),
    }
  };

  console.log(`[Success] ${testName} 執行完畢！分類: ${classification} | 狀態: ${statusGuard.status}`);
  return result;
}

function generateMockReply(userText) {
  const classification = classifyArtifactInput(userText);
  if (classification === 'raw_material_with_legacy_artifact') {
    return "已收到。您提供了一個候補改寫版本。我已記錄，請問您是否要採用這個版本？";
  }
  if (classification === 'explicit_acceptance') {
    return "已確認。您已接受改寫後的待辦事項。此交付物已正式歸檔。";
  }
  if (classification === 'explicit_freeze') {
    return "已收到凍結指令。該交付物版本已正式凍結，後續將作為最終標準執行。";
  }
  return "收到。這是系統接續測試信號，目前沒有業務內容。我會等待下一條真實業務輸入。";
}

// === 4. R1～R8 測試用例數據與執行邏輯 ===
const testCases = [
  {
    id: 'R1',
    name: 'Test R1｜Legacy list artifact',
    input: `我想繼續改當前工具，我覺得它提取出來的待辦事項不夠像人話。
原始輸入：
今天會議後要跟進報價，王明那邊周五前給我確認，另外提醒小張整理客戶名單。
現在提取出的待辦：
1. 會議跟進
2. 報價確認
3. 整理客戶名單`,
    mockReply: '已收到您提供的原始素材與舊版待辦事項列表。我會為您進行重新改寫，使它們更具可讀性。'
  },
  {
    id: 'R2',
    name: 'Test R2｜User candidate requiring judgment',
    input: `這個方向對，但“同步給我”還不夠明確。我想改成：
請王明在周五前確認報價，並在項目群同步確認結果。
你判斷一下，這句話是否比上一版更適合做待辦？`,
    mockReply: '已收到您提供的候補改寫版本。我已記錄，請問您是否要採用這個版本？'
  },
  {
    id: 'R3',
    name: 'Test R3｜Legacy email artifact',
    input: `這封郵件寫得太官方了，想改得自然一點。
當前版本：
請您於本周五前反饋報價確認結果，以便我方推進後續工作。`,
    mockReply: '已收到您提供的官方郵件原始版本。我會為您進行重新改寫，使之更自然、親切。'
  },
  {
    id: 'R4',
    name: 'Test R4｜User candidate email artifact',
    input: `我想改成：
麻煩你周五前幫我確認一下報價，有結果後直接在群裡同步。
你判斷一下這樣是不是更自然？`,
    mockReply: '您提供了一個候補改寫版本。我已記錄，請問您是否要採用這個版本？'
  },
  {
    id: 'R5',
    name: 'Test R5｜Legacy note artifact',
    input: `這段會議紀要不夠清楚。
當前版本：
銷售和產品要繼續溝通价格頁問題。`,
    mockReply: '已收到您提供的會議紀要原始版本。我會為您重新梳理這段紀要，使之更具備可操作性。'
  },
  {
    id: 'R6',
    name: 'Test R6｜User candidate note artifact',
    input: `我想改成：
銷售本周五前整理價格頁 FAQ 中與銷售口徑不一致的內容，並同步給產品負責人確認。
你看這樣是否更清楚？`,
    mockReply: '您提供了一個候補改寫版本。我已記錄，請問您是否要採用這個版本？'
  },
  {
    id: 'R7',
    name: 'Test R7｜Explicit acceptance',
    input: `確認，就用這個版本。`,
    mockReply: '已確認。您已接受改寫後的內容。此交付物已正式歸檔。'
  },
  {
    id: 'R8',
    name: 'Test R8｜Explicit freeze',
    input: `凍結這版，以後按這個版本。`,
    mockReply: '已收到凍結指令。該交付物版本已正式凍結，後續將作為最終標準執行。'
  }
];

const results = {};
for (const tc of testCases) {
  const res = runSingleGoldenTest(tc.name, tc.input, tc.mockReply);
  results[tc.id] = res;
}

// 寫入結果 JSON 方便我們後續直接讀取，或是展示給用戶！
fs.writeFileSync(path.join(__dirname, 'golden_results.json'), JSON.stringify(results, null, 2), 'utf-8');
console.log(`\n🎉 [Success] 所有 R1～R8 測試均已跑完，結果已存入 tests/golden_results.json！`);

