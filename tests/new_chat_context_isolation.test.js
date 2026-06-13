import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');
const KERNEL_DIR = path.join(ROOT_DIR, 'eliy-kernel');
const TESTABLE_SERVER_PATH = path.join(KERNEL_DIR, 'runtime/server_testable_context_isolation.js');

const KERNEL_FILES = [
  'transcripts/latest-transcript.md',
  'memory/STATE.md',
  'hlamt/EVIDENCE.md',
  'memory/NEXT_CONTEXT.md',
  'memory/ARTIFACT_STATUS.md'
];

let originalFiles = new Map();
let originalMode;

function readKernelFile(relPath) {
  const filePath = path.join(KERNEL_DIR, relPath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function writeKernelFile(relPath, content) {
  const filePath = path.join(KERNEL_DIR, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function restoreKernelFiles() {
  for (const relPath of KERNEL_FILES) {
    const filePath = path.join(KERNEL_DIR, relPath);
    const original = originalFiles.get(relPath);
    if (original === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      writeKernelFile(relPath, original);
    }
  }
}

async function loadTestableServer() {
  let serverCode = fs.readFileSync(path.join(KERNEL_DIR, 'runtime/server.js'), 'utf-8');
  serverCode = serverCode.replace(
    /server\.listen\([\s\S]*?\}\);/g,
    '// server.listen commented out by context isolation test'
  );
  serverCode += '\nexport { handleChat, handleRecord };\n';
  fs.writeFileSync(TESTABLE_SERVER_PATH, serverCode, 'utf-8');

  const cacheBust = `${pathToFileURL(TESTABLE_SERVER_PATH).href}?t=${Date.now()}_${Math.random()}`;
  const serverModule = await import(cacheBust);
  process.env.CANDIDATE_GENERATION_MODE = 'generic_fallback';
  return serverModule;
}

function createJsonReq(payload) {
  return {
    on(event, cb) {
      if (event === 'data') cb(Buffer.from(JSON.stringify(payload)));
      if (event === 'end') cb();
    }
  };
}

function createJsonRes() {
  return {
    statusCode: null,
    body: '',
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end(body) {
      this.body = body || '';
    }
  };
}

async function callHandler(handler, payload) {
  const res = createJsonRes();
  await handler(createJsonReq(payload), res);
  return {
    statusCode: res.statusCode,
    data: JSON.parse(res.body || '{}')
  };
}

function seedSfocusContext() {
  writeKernelFile('memory/NEXT_CONTEXT.md', [
    '# NEXT_CONTEXT.md',
    '## SFOCUS Skill State',
    'CURRENT_SKILL: sfocus',
    'CURRENT_STEP: Step 4',
    'SYSTEM_UNDER_DISCUSSION: stale previous conversation',
    'CANDIDATE_BOTTLENECK: stale bottleneck',
    'CHOKE_THE_RELEASE_SIGNAL: stale signal',
    'MIN_ACTION_CARD_STATUS: proposed',
    ''
  ].join('\n'));
  writeKernelFile('memory/ARTIFACT_STATUS.md', [
    '# ARTIFACT_STATUS.md',
    'Artifact: next_action_card',
    'Status: proposed',
    'Reason: stale previous conversation',
    ''
  ].join('\n'));
  writeKernelFile('memory/STATE.md', [
    '# STATE.md',
    '- Current Focus: stale previous conversation',
    ''
  ].join('\n'));
}

describe('new chat context isolation', () => {
  beforeEach(() => {
    originalMode = process.env.CANDIDATE_GENERATION_MODE;
    process.env.CANDIDATE_GENERATION_MODE = 'generic_fallback';
    originalFiles = new Map(KERNEL_FILES.map(relPath => [relPath, readKernelFile(relPath)]));
  });

  afterEach(() => {
    restoreKernelFiles();
    if (fs.existsSync(TESTABLE_SERVER_PATH)) fs.unlinkSync(TESTABLE_SERVER_PATH);
    if (originalMode === undefined) {
      delete process.env.CANDIDATE_GENERATION_MODE;
    } else {
      process.env.CANDIDATE_GENERATION_MODE = originalMode;
    }
  });

  test('new conversation first turn ignores stale NEXT_CONTEXT skill state', async () => {
    seedSfocusContext();
    const { handleChat, handleRecord } = await loadTestableServer();

    const chat = await callHandler(handleChat, {
      text: '你好，这是一个新对话。',
      activeSkill: 'default',
      contextScope: 'new_conversation',
      conversationId: 'conv_new_1',
      history: [{ role: 'user', content: '你好，这是一个新对话。' }]
    });

    expect(chat.statusCode).toBe(200);
    expect(chat.data.debug_meta.triggerSource).toBe('none');
    expect(chat.data.debug_meta.skillModeObserved).toBe('default');
    expect(chat.data.debug_meta.sfocusInjected).toBe(false);

    const record = await callHandler(handleRecord, {
      contextScope: 'new_conversation',
      conversationId: 'conv_new_1',
      artifact: null
    });

    expect(record.statusCode).toBe(200);
    expect(readKernelFile('memory/NEXT_CONTEXT.md')).not.toContain('CURRENT_SKILL: sfocus');
  });

  test('existing conversation can still continue from NEXT_CONTEXT skill state', async () => {
    seedSfocusContext();
    const { handleChat } = await loadTestableServer();

    const chat = await callHandler(handleChat, {
      text: '请根据上一轮继续。',
      activeSkill: 'default',
      contextScope: 'existing_conversation',
      conversationId: 'conv_existing_1',
      history: [{ role: 'user', content: '请根据上一轮继续。' }]
    });

    expect(chat.statusCode).toBe(200);
    expect(chat.data.debug_meta.triggerSource).toBe('next_context');
    expect(chat.data.debug_meta.skillModeObserved).toBe('mixed_or_inferred');
    expect(chat.data.debug_meta.sfocusInjected).toBe(true);
  });

  test('new conversation records explicitly active skill as its own context', async () => {
    seedSfocusContext();
    const { handleChat, handleRecord } = await loadTestableServer();

    const chat = await callHandler(handleChat, {
      text: '我想用这个方法继续澄清。',
      activeSkill: 'sfocus',
      contextScope: 'new_conversation',
      conversationId: 'conv_new_sfocus_1',
      history: [{ role: 'user', content: '我想用这个方法继续澄清。' }]
    });

    expect(chat.statusCode).toBe(200);
    expect(chat.data.debug_meta.triggerSource).toBe('frontend_active_skill');
    expect(chat.data.debug_meta.skillModeObserved).toBe('sfocus');
    expect(chat.data.debug_meta.sfocusInjected).toBe(true);

    const record = await callHandler(handleRecord, {
      activeSkill: 'sfocus',
      contextScope: 'new_conversation',
      conversationId: 'conv_new_sfocus_1',
      artifact: null
    });

    expect(record.statusCode).toBe(200);
    expect(readKernelFile('memory/NEXT_CONTEXT.md')).toContain('CURRENT_SKILL: sfocus');
    expect(readKernelFile('memory/NEXT_CONTEXT.md')).not.toContain('stale previous conversation');
  });
});
